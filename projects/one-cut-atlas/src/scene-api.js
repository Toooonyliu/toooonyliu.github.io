/** Photo arena client: recognize a place, then paint and poll. No provider credential belongs here. */
import { apiBase } from './avatar.js';
import { TRAVEL_ZONES } from './region-presets.js';
import { ENVIRONMENTS, LIGHTINGS, STYLES } from './shared.js';
export const SETTINGS = ['exterior', 'interior'];
export const SCENE_PROMPT_PATTERN = /^[A-Za-z0-9 ,.;:'()\-]{20,300}$/;
export const PLACE_NAME_PATTERN = /^[A-Za-z0-9 ,.'()\-]{2,80}$/;
export const BACKDROP_DATA_URL = /^data:image\/(webp|png|jpeg);base64,[A-Za-z0-9+/]+=*$/;
const hex = value => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
const zoneIds = TRAVEL_ZONES.map(zone => zone.id);
const timeoutValue = (value, fallback) => Number.isFinite(value) && value > 0 ? Math.min(value, 300000) : fallback;
const publicError = (data, fallback) => typeof data?.error === 'string' && data.error.trim() ? data.error.slice(0, 240) : fallback;
const canceled = () => Object.assign(new Error('Canceled. Your preset arena is kept.'), { name: 'AbortError' });
const text = (value, max) => typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;

export function hasArenaApi() { return Boolean(apiBase()); }

/** The browser trusts nothing it did not check itself. */
export function validatePlace(value) {
  const bad = () => new Error('AI returned an unusable place. Preset arenas still work.');
  if (!value || typeof value !== 'object') throw bad();
  if (!zoneIds.includes(value.zone) || !SETTINGS.includes(value.setting) || !LIGHTINGS.includes(value.lighting) || !ENVIRONMENTS.includes(value.environment) || !STYLES.includes(value.opponentStyle)) throw bad();
  if (typeof value.scenePrompt !== 'string' || !SCENE_PROMPT_PATTERN.test(value.scenePrompt.trim())) throw bad();
  if (!['sky', 'accent', 'ambient'].every(key => hex(value.palette?.[key]))) throw bad();
  const recognized = value.recognized === true && typeof value.name === 'string' && value.name.trim() !== '';
  return {
    evidence: Array.isArray(value.evidence) ? value.evidence.filter(item => typeof item === 'string').map(item => item.trim().slice(0, 100)).filter(Boolean).slice(0, 6) : [],
    recognized, name: recognized ? text(value.name, 80) : null, city: recognized ? text(value.city, 60) : null, country: recognized ? text(value.country, 60) : null,
    latitude: recognized && Number.isFinite(value.latitude) && Number.isFinite(value.longitude) && Math.abs(value.latitude) <= 90 && Math.abs(value.longitude) <= 180 ? value.latitude : null,
    longitude: recognized && Number.isFinite(value.latitude) && Number.isFinite(value.longitude) && Math.abs(value.latitude) <= 90 && Math.abs(value.longitude) <= 180 ? value.longitude : null,
    zone: value.zone, setting: value.setting, lighting: value.lighting, environment: value.environment, opponentStyle: value.opponentStyle,
    confidence: Number.isFinite(value.confidence) ? Math.max(0, Math.min(1, value.confidence)) : 0,
    elements: Array.isArray(value.elements) ? value.elements.filter(item => typeof item === 'string').map(item => item.trim().slice(0, 40)).filter(Boolean).slice(0, 5) : [],
    palette: { sky: value.palette.sky.toLowerCase(), accent: value.palette.accent.toLowerCase(), ambient: value.palette.ambient.toLowerCase() },
    scenePrompt: value.scenePrompt.trim(),
    summary: text(value.summary, 120) || 'A place from your photo.'
  };
}

function bounded(signal) {
  const controller = new AbortController();
  let timer, timedOut = false;
  const cancel = () => controller.abort();
  signal?.addEventListener('abort', cancel, { once: true });
  return {
    signal: controller.signal,
    get timedOut() { return timedOut; },
    start(duration) { clearTimeout(timer); timer = setTimeout(() => { timedOut = true; controller.abort(); }, duration); },
    stop() { clearTimeout(timer); signal?.removeEventListener('abort', cancel); }
  };
}
const readJson = async response => { try { return await response.json(); } catch { throw new Error('AI is unavailable. Preset arenas still work.'); } };

/** Wakes the host, then sends one compressed photo for place recognition. */
export async function recognizePlace(image, { zone, gps, exclude, endpoint, healthEndpoint, signal, onStatus, fetcher = globalThis.fetch, startupTimeoutMs = 85000, analysisTimeoutMs = 30000 } = {}) {
  const base = apiBase();
  if (!endpoint && !base) throw new Error('AI is not connected. Preset arenas still work.');
  if (zone !== undefined && !zoneIds.includes(zone)) throw new Error('Choose a valid travel zone.');
  // Photo GPS is sent rounded to about 100 m; it is the strongest clue the recognizer can get.
  const coordinates = gps && Number.isFinite(gps.lat) && Number.isFinite(gps.lon) && Math.abs(gps.lat) <= 90 && Math.abs(gps.lon) <= 180 ? { lat: Math.round(gps.lat * 1000) / 1000, lon: Math.round(gps.lon * 1000) / 1000 } : undefined;
  const excluded = Array.isArray(exclude) ? exclude.filter(item => typeof item === 'string' && PLACE_NAME_PATTERN.test(item.trim())).map(item => item.trim()).slice(0, 3) : [];
  if (signal?.aborted) throw canceled();
  const guard = bounded(signal);
  let phase = 'startup';
  try {
    if (healthEndpoint || !endpoint) {
      onStatus?.('waking'); guard.start(timeoutValue(startupTimeoutMs, 85000));
      const response = await fetcher(healthEndpoint || `${base}/health`, { method: 'GET', cache: 'no-store', signal: guard.signal });
      const health = await readJson(response);
      if (!response.ok) throw new Error(publicError(health, 'AI is unavailable. Preset arenas still work.'));
      if (health?.placeRecognitionConfigured !== true) throw new Error('Photo arenas are not configured yet. Preset arenas still work.');
    }
    if (guard.signal.aborted) throw canceled();
    phase = 'analysis'; onStatus?.('recognizing'); guard.start(timeoutValue(analysisTimeoutMs, 30000));
    const response = await fetcher(endpoint || `${base}/api/recognize-place`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image, ...(zone ? { zone } : {}), ...(coordinates ? { gps: coordinates } : {}), ...(excluded.length ? { exclude: excluded } : {}) }), signal: guard.signal });
    const data = await readJson(response);
    if (!response.ok) throw new Error(publicError(data, 'AI is unavailable. Preset arenas still work.'));
    return validatePlace(data?.place);
  } catch (error) {
    if (guard.signal.aborted || error.name === 'AbortError') {
      if (guard.timedOut) throw new Error(phase === 'startup' ? 'AI startup timed out. Preset arenas still work.' : 'AI timed out. Preset arenas still work.');
      throw canceled();
    }
    if (error instanceof TypeError) throw new Error('Could not connect to AI. Preset arenas still work.');
    throw error;
  } finally { guard.stop(); }
}

const defaultWait = (ms, signal) => new Promise((resolve, reject) => {
  if (signal?.aborted) return reject(canceled());
  const timer = setTimeout(() => { signal?.removeEventListener('abort', onAbort); resolve(); }, ms);
  function onAbort() { clearTimeout(timer); reject(canceled()); }
  signal?.addEventListener('abort', onAbort, { once: true });
});

/** Submits exactly one billable painting request, then polls its job until it settles. */
export async function paintArena({ image, zone, scenePrompt, setting, lighting, placeName = null }, { endpoint, signal, onStatus, fetcher = globalThis.fetch, submitTimeoutMs = 30000, pollTimeoutMs = 15000, totalTimeoutMs = 180000, pollIntervalMs = 2500, wait = defaultWait } = {}) {
  const base = apiBase();
  if (!endpoint && !base) throw new Error('AI is not connected. Preset arenas still work.');
  if (!zoneIds.includes(zone) || !SETTINGS.includes(setting) || !LIGHTINGS.includes(lighting) || typeof scenePrompt !== 'string' || !SCENE_PROMPT_PATTERN.test(scenePrompt.trim())) throw new Error('This place description cannot be painted. Preset arenas still work.');
  if (signal?.aborted) throw canceled();
  const guard = bounded(signal), started = Date.now(), url = endpoint || `${base}/api/scenes`;
  const body = { image, zone, scenePrompt: scenePrompt.trim(), setting, lighting, ...(placeName && PLACE_NAME_PATTERN.test(placeName) ? { placeName } : {}) };
  let phase = 'submit';
  try {
    onStatus?.('submitting'); guard.start(timeoutValue(submitTimeoutMs, 30000));
    const submitted = await fetcher(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: guard.signal });
    const accepted = await readJson(submitted);
    if (!submitted.ok) throw new Error(publicError(accepted, 'Arena painting is unavailable. Preset arenas still work.'));
    const jobId = accepted?.jobId;
    if (typeof jobId !== 'string' || !/^[0-9a-f-]{36}$/.test(jobId)) throw new Error('Arena painting did not start. Preset arenas still work.');
    phase = 'poll'; onStatus?.('painting');
    for (;;) {
      if (Date.now() - started > timeoutValue(totalTimeoutMs, 180000)) throw new Error('Arena painting timed out. Preset arenas still work.');
      await wait(pollIntervalMs, guard.signal);
      guard.start(timeoutValue(pollTimeoutMs, 15000));
      const response = await fetcher(`${url}/${jobId}`, { method: 'GET', cache: 'no-store', signal: guard.signal });
      const job = await readJson(response);
      if (response.status === 404) throw new Error(publicError(job, 'This arena request expired. Paint it again.'));
      if (!response.ok) throw new Error(publicError(job, 'Arena painting is unavailable. Preset arenas still work.'));
      if (job?.status === 'failed') throw new Error(publicError(job, 'Arena painting failed. Preset arenas still work.'));
      if (job?.status === 'done') {
        if (typeof job.backdrop !== 'string' || job.backdrop.length > 6_000_000 || !BACKDROP_DATA_URL.test(job.backdrop)) throw new Error('Arena painting returned an unusable image. Preset arenas still work.');
        return { backdrop: job.backdrop, cached: job.cached === true };
      }
    }
  } catch (error) {
    if (guard.signal.aborted || error.name === 'AbortError') {
      if (guard.timedOut) throw new Error(phase === 'submit' ? 'Arena painting did not start in time. Preset arenas still work.' : 'Arena painting stopped responding. Preset arenas still work.');
      throw canceled();
    }
    if (error instanceof TypeError) throw new Error('Could not reach arena painting. Preset arenas still work.');
    throw error;
  } finally { guard.stop(); }
}

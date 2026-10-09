import { WORLD } from './shared.js';

const ROOT = new URL('../assets/classic/', import.meta.url);
const LAYERS = ['body', 'haka', 'robe', 'head', 'hat', 'arms', 'sleeves', 'sword'];
const FRAME_COUNTS = {
  idlehigh: 1, idlemid: 1, idlelow: 1,
  walkidlehigh: 16, walkidlemid: 16, walkidlelow: 16,
  attackhigh: 12, attackmid1: 13, attacklow: 13,
  walkattackmid: 16, shove: 8, shoved: 10,
  dodgehigh: 6, dodgemid: 6, dodgelow: 6,
  backstephigh: 6, backstepmid: 6, backsteplow: 6,
  die2: 25, clashhigh: 7, clashmid1: 7, clashlow: 7,
  blockhigh: 4, blockmid: 4, blocklow: 4,
};
const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, value));
const progress = fighter => clamp((fighter.timer || 0) / Math.max(.0001, fighter.stateDuration || 1), 0, .9999);
const line = fighter => {
  const attacking = fighter.state === 'windup' || fighter.state === 'active' ||
    fighter.state === 'recovery' && fighter.recoveryKind === 'attack';
  const direction = attacking ? fighter.attackDirection : fighter.stance;
  return ['high', 'mid', 'low'].includes(direction) ? direction : 'mid';
};
const named = (prefix, direction) => `${prefix}${direction === 'mid' && ['attack', 'clash'].includes(prefix) ? 'mid1' : direction}`;

/** Pure state-to-source-frame adapter. Kept DOM-free so animation continuity is regression-testable. */
export function resolveClassicAnimation(fighter, time = 0) {
  const state = fighter.dead ? 'dead' : fighter.state || 'idle';
  const direction = line(fighter);
  let name = `idle${direction}`, phase = 0;

  if (state === 'walk' || state === 'move') {
    name = `walkidle${direction}`;
    phase = ((time * 17) % FRAME_COUNTS[name]) / FRAME_COUNTS[name];
  } else if (state === 'charge') {
    name = 'walkattackmid';
    phase = .12 + clamp(fighter.charge ?? progress(fighter)) * .27;
  } else if (state === 'windup') {
    name = named('attack', direction);
    phase = progress(fighter) * .30;
  } else if (state === 'active') {
    name = named('attack', direction);
    phase = .30 + progress(fighter) * .42;
  } else if (state === 'recovery' && fighter.recoveryKind === 'attack') {
    name = named('attack', direction);
    phase = .72 + progress(fighter) * .2799;
  } else if (state === 'dodge') {
    name = `backstep${direction}`;
    phase = progress(fighter);
  } else if (state === 'duck') {
    name = `dodge${direction}`;
    phase = fighter.duckHeld && progress(fighter) > .45 ? .54 : progress(fighter);
  } else if (state === 'shove') {
    name = 'shove'; phase = progress(fighter);
  } else if (state === 'stunned') {
    name = 'shoved'; phase = progress(fighter);
  } else if (state === 'parry' || state === 'recovery' && fighter.recoveryKind === 'parry') {
    name = named('block', fighter.guardDirection || direction); phase = progress(fighter);
  } else if (state === 'dead') {
    name = 'die2'; phase = clamp((fighter.deathTimer ?? fighter.timer ?? 0) / 1.1, 0, .9999);
  }

  const count = FRAME_COUNTS[name] || 1;
  return { name, index: Math.min(count - 1, Math.floor(phase * count)), count };
}

let assets = null;
let textures = [];
let loading = null;
const frameCache = new Map();
const CACHE_WIDTH = 112, CACHE_HEIGHT = 96, CACHE_PIVOT_X = 52, CACHE_PIVOT_Y = 55;

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = async () => {
      try { await image.decode?.(); } catch { /* onload already guarantees a drawable image */ }
      resolve(image);
    };
    image.onerror = () => reject(new Error(`Classic fighter art unavailable: ${url}`));
    image.src = url;
  });
}

/** Decode only the three atlases referenced by the compact browser manifest. */
export function preloadClassicArt() {
  if (loading) return loading;
  loading = fetch(new URL('game-assets.json', ROOT))
    .then(response => {
      if (!response.ok) throw new Error('Classic fighter manifest unavailable');
      return response.json();
    })
    .then(async manifest => {
      const textureIds = new Set();
      for (const sprite of Object.values(manifest.sprites || {})) {
        for (const frame of sprite.frames || []) textureIds.add(frame.texture);
      }
      const loaded = await Promise.all([...textureIds].map(async id => [id, await loadImage(new URL(`texture-${String(id).padStart(2, '0')}.png`, ROOT).href)]));
      textures = Object.assign([], Object.fromEntries(loaded));
      assets = manifest;
      warmFrameCache();
      return true;
    })
    .catch(error => { loading = null; throw error; });
  return loading;
}

export const classicArtReady = () => Boolean(assets && textures.length);

function renderFrame(name, index, enemy) {
  const mapping = assets.animations?.[name];
  if (!mapping) return null;
  const output = document.createElement('canvas');
  output.width = CACHE_WIDTH; output.height = CACHE_HEIGHT;
  const context = output.getContext('2d');
  context.imageSmoothingEnabled = false;
  if (enemy) context.filter = 'sepia(.55) saturate(1.55) hue-rotate(330deg) brightness(.92)';
  for (const layer of LAYERS) {
    const spriteName = mapping[layer];
    if (spriteName === null) continue;
    const sprite = assets.sprites?.[spriteName || `spr_${layer}${name}`];
    if (!sprite?.frames?.length) continue;
    const frame = sprite.frames[Math.min(sprite.frames.length - 1, index)];
    const texture = textures[frame.texture];
    if (!texture) continue;
    context.drawImage(texture, frame.x, frame.y, frame.w, frame.h,
      CACHE_PIVOT_X - sprite.originX + frame.offsetX, CACHE_PIVOT_Y - sprite.originY + frame.offsetY,
      frame.targetW, frame.targetH);
  }
  return output;
}

/** Flatten layered 2048px atlas reads before play; the hot loop draws one 112×96 bitmap per fighter. */
function warmFrameCache() {
  frameCache.clear();
  for (const [name, mapping] of Object.entries(assets.animations || {})) {
    const spriteName = LAYERS.map(layer => mapping[layer]).find(Boolean);
    const count = spriteName ? assets.sprites?.[spriteName]?.frames?.length || FRAME_COUNTS[name] || 1 : 1;
    for (let index = 0; index < count; index++) {
      frameCache.set(`${name}:${index}:player`, renderFrame(name, index, false));
      frameCache.set(`${name}:${index}:enemy`, renderFrame(name, index, true));
    }
  }
}

/** Draws the supplied layered source animation without allocating inside the frame loop. */
export function drawClassicFighter(ctx, fighter, isPlayer, time = 0) {
  if (!classicArtReady() || !fighter) return false;
  const animation = resolveClassicAnimation(fighter, time);
  const picture = frameCache.get(`${animation.name}:${animation.index}:${isPlayer ? 'player' : 'enemy'}`);
  if (!picture) return false;
  const facing = fighter.facing === -1 ? -1 : 1;
  const scale = 2.6;
  const lunge = fighter.state === 'active' ? 5 * (1 - (1 - progress(fighter)) ** 2) : 0;

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(Math.round((fighter.x || 0) + facing * lunge), Math.round(WORLD.ground - 28 * scale));
  ctx.scale(facing, 1);
  ctx.drawImage(picture, -CACHE_PIVOT_X * scale, -CACHE_PIVOT_Y * scale, CACHE_WIDTH * scale, CACHE_HEIGHT * scale);
  ctx.restore();
  return true;
}

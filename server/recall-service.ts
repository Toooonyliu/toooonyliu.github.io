import { seedMeals, users, venues } from "../src/data.ts";
import { fieldValue, localRecall, recallPlan, validateModelResponse, type RecallEvidenceField, type RecallRecord, type RecallRequest, type RecallResponse } from "../src/recall/engine.ts";
import { SYSTEM_PROMPT, buildUserMessage, type PromptCandidate } from "./prompt.ts";
import type { Chat, ChatMessage } from "./llm.ts";

/**
 * Server side of "找那一餐".
 * 1. Authorize: friends' records come from the server's own copy, never from the
 *    browser. The browser may add only the demo user's own new posts.
 * 2. Hard rules in code (scope, named friend, negation, unsupported conditions).
 * 3. One model call reads the remaining candidates and returns IDs + verbatim
 *    evidence + a short reason.
 * 4. Every quote, ID and rule is verified before anything is returned.
 */
export const ME = "daniel";
const SERVER_FRIENDS = ["maya", "eric", "anika", "jordan"];
/** A pending request the demo user may accept in the UI. Accepting cannot invent others. */
const SERVER_INCOMING = ["priya"];
const MAX_CANDIDATES = 60;
const FIELDS: RecallEvidenceField[] = ["author", "food", "foodZh", "note", "noteZh", "type", "venue.name", "venue.area", "venue.cuisine"];

export type RecallBody = {
  query: unknown; scope: unknown; lang: unknown; today: unknown;
  records: unknown; network?: unknown;
};
export type RecallMeta = { engine: "platform" | "stand-in" | "none"; model?: string; elapsedMs: number; candidates: number; dropped: number };
export class RecallError extends Error {
  code: "bad_request" | "model_failed" | "timeout";
  constructor(code: "bad_request" | "model_failed" | "timeout", message: string) { super(message); this.code = code; }
}

const str = (value: unknown, max: number) => typeof value === "string" ? value.slice(0, max) : undefined;
const isDate = (value: unknown): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
const isTime = (value: unknown): value is string => typeof value === "string" && /^\d{2}:\d{2}$/.test(value);

function serverRecord(mealId: string, clientDate?: unknown, clientTime?: unknown): RecallRecord | null {
  const meal = seedMeals.find(item => item.id === mealId);
  if (!meal) return null;
  const venue = meal.type === "restaurant" ? venues.find(item => item.id === meal.venueId) : undefined;
  return {
    id: meal.id, authorId: meal.userId, author: users.find(user => user.id === meal.userId)?.name ?? meal.userId,
    food: meal.food, foodZh: meal.foodZh, note: meal.note, noteZh: meal.noteZh,
    // Demo dates are relative to "today"; the browser's local date wins so cards and evidence agree.
    date: isDate(clientDate) ? clientDate : meal.date, time: isTime(clientTime) ? clientTime : meal.time,
    type: meal.type, audience: meal.audience,
    ...(venue ? { venue: { id: venue.id, name: venue.name, area: venue.area, cuisine: venue.cuisine } } : {}),
  };
}

/** Rebuilds the record set on the server. Returns only what the demo user may read. */
export function authorize(body: RecallBody): RecallRequest {
  const query = str(body.query, 300)?.trim();
  if (!query) throw new RecallError("bad_request", "query is required");
  const scope = body.scope === "mine" || body.scope === "all" ? body.scope : "friends";
  const lang = body.lang === "en" ? "en" : "zh";
  const network = (typeof body.network === "object" && body.network) ? body.network as Record<string, unknown> : {};
  const declared = Array.isArray(network.friends) ? network.friends.filter((id): id is string => typeof id === "string") : [];
  const hidden = new Set(Array.isArray(network.hidden) ? network.hidden.filter((id): id is string => typeof id === "string") : []);
  // The browser can narrow friendships or accept a real pending request; it cannot add arbitrary people.
  const friends = new Set([...SERVER_FRIENDS.filter(id => declared.length === 0 || declared.includes(id)), ...SERVER_INCOMING.filter(id => declared.includes(id))]);
  const incoming = Array.isArray(body.records) ? body.records.slice(0, 400) : [];
  const records: RecallRecord[] = [];
  const seen = new Set<string>();
  for (const item of incoming) {
    if (!item || typeof item !== "object") continue;
    const raw = item as Record<string, unknown>;
    const id = str(raw.id, 80);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const known = serverRecord(id, raw.date, raw.time);
    if (known) {
      const mine = known.authorId === ME;
      if (!mine && (!friends.has(known.authorId) || hidden.has(known.authorId) || known.audience === "private")) continue;
      records.push(known);
    } else if (raw.authorId === ME) {
      // A post the demo user created in this browser (no accounts in the demo).
      const type = ["restaurant", "homemade", "delivery", "other"].includes(raw.type as string) ? raw.type as RecallRecord["type"] : "other";
      const venue = typeof raw.venue === "object" && raw.venue ? venues.find(item => item.id === (raw.venue as Record<string, unknown>).id) : undefined;
      records.push({
        id, authorId: ME, author: users.find(user => user.id === ME)?.name ?? ME,
        food: str(raw.food, 160) ?? "", foodZh: str(raw.foodZh, 160), note: str(raw.note, 400), noteZh: str(raw.noteZh, 400),
        date: isDate(raw.date) ? raw.date : "", time: isTime(raw.time) ? raw.time : "", type,
        audience: raw.audience === "private" ? "private" : "friends",
        ...(venue && type === "restaurant" ? { venue: { id: venue.id, name: venue.name, area: venue.area, cuisine: venue.cuisine } } : {}),
      });
    }
  }
  return { query, records, lang, scope, currentUserId: ME };
}

function toCandidate(record: RecallRecord): PromptCandidate {
  // No photos, URLs, addresses, audience flags or relationship data reach the model.
  const c: PromptCandidate = { id: record.id, author: record.author, food: record.food, date: record.date, time: record.time, type: record.type };
  if (record.foodZh) c.foodZh = record.foodZh;
  if (record.note) c.note = record.note;
  if (record.noteZh) c.noteZh = record.noteZh;
  if (record.venue) c.venue = { name: record.venue.name, area: record.venue.area, cuisine: record.venue.cuisine };
  return c;
}

export function parseModelJson(text: string): Record<string, unknown> | null {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = cleaned.indexOf("{"), end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const value = JSON.parse(cleaned.slice(start, end + 1));
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
  } catch { return null; }
}

/**
 * Keeps only what can be verified. A match with an unknown ID or no verbatim
 * evidence is dropped (counted in meta.dropped), never repaired by guessing.
 */
export function sanitize(raw: Record<string, unknown>, request: RecallRequest, candidates: RecallRecord[], ruleUnresolved: string[]): { response: RecallResponse; dropped: number } {
  const byId = new Map(candidates.map(record => [record.id, record]));
  const query = request.query.trim();
  let dropped = 0;
  const matches: RecallResponse["matches"] = [];
  for (const item of Array.isArray(raw.matches) ? raw.matches : []) {
    const match = item as Record<string, unknown>;
    const record = typeof match?.mealId === "string" ? byId.get(match.mealId) : undefined;
    if (!record || matches.some(existing => existing.mealId === record.id)) { dropped++; continue; }
    const evidence: { field: RecallEvidenceField; quote: string }[] = [];
    for (const ev of Array.isArray(match.evidence) ? match.evidence : []) {
      const field = (ev as Record<string, unknown>)?.field as RecallEvidenceField;
      const quote = (ev as Record<string, unknown>)?.quote;
      if (!FIELDS.includes(field) || typeof quote !== "string" || !quote.trim() || quote.length > 240) continue;
      if (!fieldValue(record, field).includes(quote) || evidence.some(existing => existing.field === field)) continue;
      evidence.push({ field, quote });
    }
    if (!evidence.length) { dropped++; continue; }
    const reason = typeof match.reason === "string" ? match.reason.replace(/\s+/g, " ").trim() : "";
    matches.push({ mealId: record.id, evidence: evidence.slice(0, 3), ...(reason && reason.length <= 60 && !/https?:|www\./i.test(reason) ? { reason } : {}) });
    if (matches.length === 5) break;
  }
  const modelUnresolved = (Array.isArray(raw.unresolved) ? raw.unresolved : [])
    .filter((item): item is string => typeof item === "string" && !!item.trim() && item.length <= 120 && query.includes(item));
  const unresolved = [...new Set([...ruleUnresolved, ...modelUnresolved])].slice(0, 12);
  const clarification = typeof raw.clarification === "string" ? raw.clarification.trim() : "";
  const status = matches.length ? "matches" : raw.status === "clarify" && clarification ? "clarify" : "empty";
  const response: RecallResponse = { mode: "model", status, query, matches, unresolved };
  if (status === "clarify") response.clarification = /[?？]$/.test(clarification) && clarification.length <= 60 ? clarification : (request.lang === "zh" ? "你还记得是谁、哪道菜，或当时说过的话吗？" : "Do you remember who posted it, a dish, or something they said?");
  return { response, dropped };
}

export async function runRecall(body: RecallBody, engine: { kind: "platform" | "stand-in"; chat: Chat }, signal?: AbortSignal): Promise<{ result: RecallResponse; meta: RecallMeta }> {
  const started = Date.now();
  const request = authorize(body);
  const today = isDate(body.today) ? body.today : new Date().toISOString().slice(0, 10);
  const plan = recallPlan(request);
  const candidates = [...plan.candidates].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)).slice(0, MAX_CANDIDATES);
  const base = { engine: engine.kind, candidates: candidates.length, dropped: 0 } as const;
  if (!candidates.length) {
    return { result: { mode: engine.kind === "platform" ? "model" : "local", status: "empty", query: plan.query, matches: [], unresolved: plan.unresolved }, meta: { ...base, elapsedMs: Date.now() - started } };
  }
  const appliedRules = [
    `scope=${request.scope}`,
    ...(plan.authorCriteria ? ["朋友名字已作为硬条件过滤"] : []),
    ...(plan.unresolved.length ? [`原帖没有记录、需列入 unresolved 的条件：${plan.unresolved.join("、")}`] : []),
  ];
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: buildUserMessage({ today, lang: request.lang, query: plan.query, appliedRules, candidates: candidates.map(toCandidate) }) },
  ];
  let parsed: Record<string, unknown> | null = null, model: string | undefined;
  for (let attempt = 0; attempt < 2 && !parsed; attempt++) {
    if (signal?.aborted) throw new RecallError("timeout", "aborted");
    const reply = await engine.chat(attempt ? [...messages, { role: "user", content: "上一次的输出不是合法 JSON。请只输出符合格式的 JSON 对象。" }] : messages, { signal });
    model = reply.model;
    parsed = parseModelJson(reply.text);
    if (process.env.MIBLY_DEBUG === "1") console.info("[recall] raw model output:", reply.text.slice(0, 2000));
  }
  if (!parsed) throw new RecallError("model_failed", "model did not return JSON");
  const { response, dropped } = sanitize(parsed, { ...request, query: plan.query }, candidates, plan.unresolved);
  if (engine.kind === "stand-in") response.mode = "local";
  const verifiedRequest = { ...request, records: candidates };
  if (response.mode === "model" && !validateModelResponse(response, verifiedRequest)) throw new RecallError("model_failed", "response failed verification");
  return { result: response, meta: { ...base, model, dropped, elapsedMs: Date.now() - started } };
}

/** Stand-in answer for local development: keyword rules dressed in the model's JSON format. */
export function standInAnswer(userMessage: string): string {
  const input = JSON.parse(userMessage) as { query: string; lang: "zh" | "en"; candidates: PromptCandidate[] };
  const records: RecallRecord[] = input.candidates.map(c => ({ ...c, authorId: c.author, type: c.type as RecallRecord["type"], ...(c.venue ? { venue: { id: c.venue.name, ...c.venue } } : {}) }));
  const local = localRecall({ query: input.query, records, lang: input.lang, scope: "all", currentUserId: "__none__" });
  return JSON.stringify({ status: local.status, matches: local.matches, unresolved: local.unresolved, clarification: local.clarification ?? null });
}

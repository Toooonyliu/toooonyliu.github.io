import { fieldValue, recallClarifications, recallPlan, type RecallEvidenceField, type RecallRecord, type RecallRequest, type RecallResponse } from "./engine.ts";

/**
 * On-device semantic recall. A real embedding model (bge-small-zh-v1.5, int8
 * ONNX) ranks the authorized candidates; deterministic code keeps every hard
 * rule. Output uses the same RecallResponse contract as a server model, so it
 * still passes validateModelResponse before anything is rendered.
 */
export type Embed = (texts: string[], signal?: AbortSignal) => Promise<Float32Array[]>;

/** bge retrieval instruction for short queries (from the model card). */
export const BGE_QUERY_PREFIX = "为这个句子生成表示以用于检索相关文章：";

/** Calibrated on the demo records (see tests/semantic-calibration). */
export const SEMANTIC = {
  minScore: 0.46,
  /** Keep results close to the best one, so one strong match is not padded. */
  margin: 0.05,
  ruleBoost: 0.12,
  /** A rule hit alone (e.g. "在家") is partial evidence; it still needs some similarity. */
  ruleMinScore: 0.42,
  maxResults: 5,
};

const typeZh: Record<RecallRecord["type"], string> = { restaurant: "在餐厅吃", homemade: "在家自己做的家常饭", delivery: "点的外卖", other: "日常一餐" };
/**
 * Literal translations of the catalog's English cuisine labels, so the Chinese
 * model can read them. Used only inside the model document, never quoted as evidence.
 */
const cuisineZh: [RegExp, string][] = [
  [/japanese/i, "日本料理"], [/sushi/i, "寿司"], [/brunch/i, "早午餐"], [/breakfast/i, "早餐"], [/gastropub/i, "西式餐吧"],
  [/american diner/i, "美式餐馆"], [/american/i, "美式"], [/chinese/i, "中餐"], [/noodles/i, "面条"], [/dumplings/i, "饺子 包子"],
  [/thai/i, "泰国菜"], [/vegan/i, "纯素"], [/european/i, "欧洲菜"], [/argentine/i, "阿根廷菜"], [/grill/i, "烧烤"],
];
export const translateCuisine = (cuisine = "") => cuisineZh.filter(([pattern]) => pattern.test(cuisine)).map(([, zh]) => zh).join(" ");

const textFields: RecallEvidenceField[] = ["foodZh", "food", "noteZh", "note", "venue.cuisine", "venue.name"];

function fieldTexts(record: RecallRecord): { field: RecallEvidenceField | null; text: string }[] {
  const out: { field: RecallEvidenceField | null; text: string }[] = [];
  for (const field of textFields) {
    const value = fieldValue(record, field).trim();
    if (value) out.push({ field, text: value.slice(0, 200) });
  }
  // A whole-record document lets the model combine clues across fields.
  const cuisine = translateCuisine(record.venue?.cuisine);
  // Translated cuisine scores as venue.cuisine evidence, but the quote stays the original label.
  if (cuisine) out.push({ field: "venue.cuisine", text: cuisine });
  out.push({ field: null, text: [record.foodZh || record.food, record.noteZh || record.note, cuisine, typeZh[record.type]].filter(Boolean).join("。") });
  return out;
}

const dot = (a: Float32Array, b: Float32Array) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };

/** Cache record vectors across searches; text → vector. */
const cache = new Map<string, Float32Array>();
async function vectors(texts: string[], embed: Embed, signal?: AbortSignal): Promise<Float32Array[]> {
  const missing = [...new Set(texts.filter(text => !cache.has(text)))];
  for (let i = 0; i < missing.length; i += 16) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const batch = missing.slice(i, i + 16);
    (await embed(batch, signal)).forEach((vector, index) => cache.set(batch[index], vector));
  }
  return texts.map(text => cache.get(text)!);
}
export function clearSemanticCache() { cache.clear(); }
/** Pre-computes record vectors while the user is still typing (first search stays fast). */
export async function warmRecords(records: RecallRecord[], embed: Embed) {
  await vectors(records.flatMap(record => fieldTexts(record).map(item => item.text)), embed);
}

export type ScoredRecord = { record: RecallRecord; score: number; similarity: number; best: { field: RecallEvidenceField; similarity: number }[] };

export async function scoreCandidates(request: RecallRequest, embed: Embed, signal?: AbortSignal) {
  const plan = recallPlan(request);
  if (!plan.semanticText) return { plan, scored: [] as ScoredRecord[], query: null as Float32Array | null };
  const [queryVector] = await embed([BGE_QUERY_PREFIX + plan.semanticText], signal);
  const scored: ScoredRecord[] = [];
  for (const record of plan.candidates) {
    const items = fieldTexts(record);
    const vecs = await vectors(items.map(item => item.text), embed, signal);
    const sims = items.map((item, index) => ({ field: item.field, similarity: dot(queryVector, vecs[index]) }));
    const similarity = Math.max(...sims.map(item => item.similarity));
    const best = sims.filter((item): item is { field: RecallEvidenceField; similarity: number } => item.field !== null)
      .sort((a, b) => b.similarity - a.similarity);
    scored.push({ record, similarity, best, score: similarity + (plan.ruleHits.has(record.id) ? SEMANTIC.ruleBoost : 0) });
  }
  scored.sort((a, b) => b.score - a.score || (b.record.date + b.record.time).localeCompare(a.record.date + a.record.time));
  return { plan, scored, query: queryVector };
}

export async function semanticRecall(request: RecallRequest, embed: Embed, signal?: AbortSignal): Promise<RecallResponse> {
  const query = request.query.trim();
  const base: RecallResponse = { mode: "model", status: "empty", query, matches: [], unresolved: [] };
  if (!query || query.length > 500) return { ...base, status: "clarify", clarification: recallClarifications[request.lang] };
  const { plan, scored } = await scoreCandidates(request, embed, signal);
  base.unresolved = plan.unresolved.slice(0, 12);

  if (!plan.semanticText) {
    // Only a friend's name (and maybe unsupported conditions): list that friend's latest posts.
    if (!plan.authorCriteria) return { ...base, status: "clarify", clarification: recallClarifications[request.lang] };
    const latest = [...plan.candidates].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)).slice(0, SEMANTIC.maxResults);
    base.matches = latest.map(record => ({ mealId: record.id, evidence: [{ field: "author", quote: record.author }] }));
    return { ...base, status: base.matches.length ? "matches" : "empty" };
  }

  const top = scored[0]?.score ?? 0;
  const kept = scored.filter(item => (item.similarity >= SEMANTIC.minScore || (plan.ruleHits.has(item.record.id) && item.similarity >= SEMANTIC.ruleMinScore)) && item.score >= top - SEMANTIC.margin)
    .slice(0, SEMANTIC.maxResults);
  base.matches = kept.map(({ record, best }) => {
    const fields: RecallEvidenceField[] = [];
    if (plan.authorCriteria) fields.push("author");
    for (const field of plan.ruleHits.get(record.id) ?? []) if (!fields.includes(field)) fields.push(field);
    // The most similar original field(s): quoted verbatim, never paraphrased.
    for (const item of best.filter(item => item.similarity >= best[0].similarity - 0.03).slice(0, 2)) if (!fields.includes(item.field)) fields.push(item.field);
    return { mealId: record.id, evidence: fields.slice(0, 5).map(field => ({ field, quote: fieldValue(record, field).slice(0, 240) })) };
  });
  base.status = base.matches.length ? "matches" : "empty";
  return base;
}

/**
 * A deliberately limited, deterministic frontend demo — not an AI model.
 * The caller must authorize records before passing them to this module.
 * A future server-side adapter may return RecallResponse; always validate it.
 * Never put a provider credential in this frontend or pass hidden records in.
 */
export type RecallRecord = {
  id: string;
  authorId: string;
  author: string;
  food: string;
  foodZh?: string;
  note?: string;
  noteZh?: string;
  date: string;
  time: string;
  type: "restaurant" | "homemade" | "delivery" | "other";
  venue?: { id: string; name: string; area: string; cuisine: string };
  photo?: string;
  audience?: "friends" | "private";
};

export type RecallRequest = {
  query: string;
  /** Already authorized by socialGraph.ts; never the whole unfiltered database. */
  records: RecallRecord[];
  lang: "zh" | "en";
  scope: "all" | "friends" | "mine";
  currentUserId: string;
};

export type RecallEvidenceField =
  | "author" | "food" | "foodZh" | "note" | "noteZh" | "date" | "time" | "type"
  | "venue.name" | "venue.area" | "venue.cuisine";
export type RecallResponse = {
  mode: "local" | "model";
  status: "matches" | "empty" | "clarify";
  query: string;
  matches: { mealId: string; evidence: { field: RecallEvidenceField; quote: string }[]; reason?: string }[];
  /** Unverified query fragments, not generated restaurant facts. */
  unresolved: string[];
  clarification?: string;
};

export type RecallAdapter = (request: RecallRequest, signal: AbortSignal) => Promise<unknown>;

/** Model output is limited to these clarification questions: no free-form advice. */
export const recallClarifications = {
  zh: "你还记得是谁、哪道菜或哪个区域吗？",
  en: "Do you remember who posted it, a dish, or the area?",
} as const;

const evidenceFields: RecallEvidenceField[] = [
  "author", "food", "foodZh", "note", "noteZh", "date", "time", "type",
  "venue.name", "venue.area", "venue.cuisine",
];

export function fieldValue(record: RecallRecord, field: RecallEvidenceField): string {
  if (field === "venue.name") return record.venue?.name ?? "";
  if (field === "venue.area") return record.venue?.area ?? "";
  if (field === "venue.cuisine") return record.venue?.cuisine ?? "";
  return record[field] ?? "";
}

/** Scope is defense in depth, not a replacement for relationship authorization. */
export function eligibleRecords(request: RecallRequest): RecallRecord[] {
  const seen = new Set<string>();
  return request.records.filter(record => {
    if (!record.id || seen.has(record.id)) return false;
    seen.add(record.id);
    const mine = record.authorId === request.currentUserId;
    if (record.audience === "private" && !mine) return false;
    return request.scope === "mine" ? mine : request.scope === "friends" ? !mine : true;
  });
}

type Concept = { aliases: string[]; recordAliases?: string[]; fields: RecallEvidenceField[] };
const foodFields: RecallEvidenceField[] = ["foodZh", "food", "venue.cuisine", "noteZh", "note"];
const concepts: Concept[] = [
  { aliases: ["日料", "日本料理", "日式", "japanese"], recordAliases: ["japanese", "sushi", "寿司", "日料", "日本料理", "日式"], fields: foodFields },
  { aliases: ["寿司", "sushi"], fields: foodFields },
  { aliases: ["刺身", "sashimi"], fields: foodFields },
  { aliases: ["小笼包", "小籠包", "汤包", "soup dumplings", "xiaolongbao"], fields: foodFields },
  { aliases: ["饺子", "饺", "dumplings", "dumpling"], fields: foodFields },
  { aliases: ["面条", "面馆", "noodles", "noodle"], fields: foodFields },
  { aliases: ["拉面", "ramen"], fields: foodFields },
  { aliases: ["早午餐", "brunch"], fields: foodFields },
  { aliases: ["早餐", "breakfast"], fields: foodFields },
  { aliases: ["泰国菜", "泰餐", "泰式", "thai"], fields: foodFields },
  { aliases: ["韩餐", "韩式", "韩国菜", "korean"], fields: foodFields },
  { aliases: ["中餐", "中国菜", "chinese"], fields: foodFields },
  { aliases: ["烧烤", "烤肉", "barbecue", "bbq"], fields: foodFields },
  { aliases: ["纯素", "vegan"], fields: foodFields },
  { aliases: ["意面", "意大利面", "pasta"], fields: foodFields },
  { aliases: ["牛排", "steak"], fields: foodFields },
  { aliases: ["咖啡", "coffee"], fields: foodFields },
  { aliases: ["市中心", "downtown"], recordAliases: ["downtown", "市中心"], fields: ["venue.area"] },
  { aliases: ["松鼠山", "squirrel hill"], recordAliases: ["squirrel hill", "松鼠山"], fields: ["venue.area"] },
  { aliases: ["南区", "south side"], recordAliases: ["south side", "南区"], fields: ["venue.area"] },
  { aliases: ["自己做", "家里做", "在家", "家常", "homemade", "home cooked", "at home"], recordAliases: ["homemade"], fields: ["type"] },
  { aliases: ["外卖", "delivery", "takeout"], recordAliases: ["delivery"], fields: ["type"] },
];

const zhFraming = ["帮我找回", "帮我找找", "帮我找", "我想找", "我记得", "还记得", "记不清", "忘记名字", "叫什么名字", "想不起来", "之前提到过", "之前推荐过", "之前发过", "之前吃过", "上次提过", "上次", "前阵子", "有一个朋友", "我的朋友", "我朋友", "朋友", "好友", "推荐过", "推荐的", "分享过", "提到过", "吃过的", "发过的", "吃的", "发的", "那家店", "那家", "一家", "那顿", "那个", "哪家", "哪个", "餐厅", "店名", "记录", "找一下", "找回", "找找", "找", "有没有", "好像是", "是不是", "好像", "记得", "以前", "之前", "不要", "不是", "不找", "排除", "除了", "别找", "我想", "想要", "可以", "给我", "一顿", "一餐", "那次", "的", "在", "了", "过", "有", "是", "和", "与", "我", "吗", "呢", "吧", "店", "做"];
const enFraming = /\b(?:please|help|me|find|remember|recall|look|for|that|the|a|an|some|place|restaurant|meal|dish|food|my|friend|friends|posted|shared|recommended|mentioned|ate|had|before|earlier|was|is|it|i|think|in|at|of|from|with|and|not|except|excluding|without|want|to|one|s)\b/gi;

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function occurrences(text: string, needle: string): { start: number; end: number }[] {
  if (!needle.trim()) return [];
  // Latin words do not match substrings: "Thai" must not match "Thailandish".
  const latinStart = /^[a-z0-9]/i.test(needle) ? "(?<![a-z0-9])" : "";
  const latinEnd = /[a-z0-9]$/i.test(needle) ? "(?![a-z0-9])" : "";
  return [...text.matchAll(new RegExp(latinStart + escapeRegExp(needle) + latinEnd, "gi"))]
    .map(match => ({ start: match.index!, end: match.index! + match[0].length }));
}

function isNegative(query: string, start: number): boolean {
  return /(?:不要|不是|不找|排除|除了|非|别找)\s*$|\b(?:not|except|excluding|without)\s+(?:the\s+|a\s+)?$/i.test(query.slice(Math.max(0, start - 24), start));
}

type Criterion = {
  negative: boolean;
  start: number;
  end: number;
  kind: "author" | "content";
  match: (record: RecallRecord) => RecallEvidenceField | undefined;
};
type Parsed = { criteria: Criterion[]; unresolved: string[]; unknown: string[]; unsupportedSpans: [number, number][] };

function parseQuery(query: string, records: RecallRecord[]): Parsed {
  const covered = new Set<number>();
  const criteria: Criterion[] = [];
  const unresolved: string[] = [];
  const unsupportedSpans: [number, number][] = [];
  const cover = (start: number, end: number) => { for (let i = start; i < end; i++) covered.add(i); };
  const uncovered = (start: number, end: number) => {
    for (let i = start; i < end; i++) if (covered.has(i)) return false;
    return true;
  };

  // Unsupported constraints stay visible verbatim; no inferred price, opening
  // hours, availability, walking distance, atmosphere or relative date filters.
  const unsupported = /(?:人均\s*[¥￥$]?\s*\d+(?:\s*(?:元|块|刀|美元|以内|以下|左右))?|预算\s*[¥￥$]?\s*\d+(?:\s*(?:元|块|刀|美元|以内|以下|左右))?|[¥￥$]\s*\d+(?:\.\d+)?|便宜|不贵|贵不贵|适合(?:两个人|约会|聚会|带娃)|今天(?:开门|营业)|现在(?:开门|营业)|附近|步行\s*\d+\s*分钟|昨天|前天|上周|上星期|上个月|\b(?:under\s*\$?\s*\d+|budget\s*\$?\s*\d+|cheap|affordable|romantic|date night|open now|near me|yesterday|last week|last month)\b)/gi;
  for (const match of query.matchAll(unsupported)) {
    unresolved.push(match[0]);
    unsupportedSpans.push([match.index!, match.index! + match[0].length]);
    cover(match.index!, match.index! + match[0].length);
  }

  const authors = [...new Map(records.map(record => [record.authorId, record])).values()];
  for (const author of authors) {
    const aliases = [...new Set([author.author, author.author.split(/\s+/)[0], author.authorId])].filter(alias => alias.length > 1).sort((a, b) => b.length - a.length);
    for (const alias of aliases) for (const found of occurrences(query, alias)) {
      if (!uncovered(found.start, found.end)) continue;
      cover(found.start, found.end);
      criteria.push({ negative: isNegative(query, found.start), start: found.start, end: found.end, kind: "author", match: record => record.authorId === author.authorId ? "author" : undefined });
    }
  }

  // Exact venue names win over a cuisine word contained in that name.
  const dynamic = new Map<string, { value: string; field: RecallEvidenceField }>();
  for (const record of records) {
    if (record.venue) {
      dynamic.set(`venue.name:${record.venue.name}`, { value: record.venue.name, field: "venue.name" });
      dynamic.set(`venue.area:${record.venue.area}`, { value: record.venue.area, field: "venue.area" });
    }
    dynamic.set(`date:${record.date}`, { value: record.date, field: "date" });
  }
  for (const item of [...dynamic.values()].sort((a, b) => b.value.length - a.value.length)) for (const found of occurrences(query, item.value)) {
    if (!uncovered(found.start, found.end)) continue;
    cover(found.start, found.end);
    criteria.push({ negative: isNegative(query, found.start), start: found.start, end: found.end, kind: "content", match: record => fieldValue(record, item.field).toLowerCase() === item.value.toLowerCase() ? item.field : undefined });
  }

  // Longest phrase first keeps "soup dumplings" one specific condition.
  const conceptAliases = concepts.flatMap(concept => concept.aliases.map(alias => ({ concept, alias }))).sort((a, b) => b.alias.length - a.alias.length);
  for (const { concept, alias } of conceptAliases) for (const found of occurrences(query, alias)) {
    if (!uncovered(found.start, found.end)) continue;
    cover(found.start, found.end);
    criteria.push({
      negative: isNegative(query, found.start), start: found.start, end: found.end, kind: "content",
      match: record => concept.fields.find(field => (concept.recordAliases ?? concept.aliases).some(term => occurrences(fieldValue(record, field), term).length > 0)),
    });
  }

  // Remove ordinary request framing, not meaningful unknown food/venue names.
  let residue = query.split("").map((character, index) => covered.has(index) ? " " : character).join("");
  for (const text of [...zhFraming].sort((a, b) => b.length - a.length)) residue = residue.replaceAll(text, " ");
  residue = residue.replace(enFraming, " ");
  const unknown = residue.match(/[\p{L}\p{N}]+/gu)?.filter(term => term.length > 1 || /\p{Script=Han}/u.test(term)) ?? [];
  return { criteria, unresolved: [...new Set(unresolved)], unknown: [...new Set(unknown)], unsupportedSpans };
}

function responseBase(request: RecallRequest): RecallResponse {
  return { mode: "local", status: "empty", query: request.query.trim(), matches: [], unresolved: [] };
}

export function localRecall(request: RecallRequest): RecallResponse {
  const response = responseBase(request);
  if (!response.query || response.query.length > 500) return { ...response, status: "clarify", clarification: recallClarifications[request.lang] };
  const eligible = eligibleRecords(request);
  // Parse known authors from the authorized input, even when a scope excludes
  // them, so "Maya" in Mine cannot degrade to a broad food-only search.
  const parsed = parseQuery(response.query, request.records);
  response.unresolved = [...parsed.unresolved, ...parsed.unknown].slice(0, 12);
  if (parsed.unknown.length) return response;
  const positives = parsed.criteria.filter(criterion => !criterion.negative);
  if (!positives.length) return { ...response, status: "clarify", clarification: recallClarifications[request.lang] };
  const negative = parsed.criteria.filter(criterion => criterion.negative);
  const results = eligible.filter(record => positives.every(criterion => criterion.match(record)) && !negative.some(criterion => criterion.match(record)));
  results.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time) || a.id.localeCompare(b.id));
  response.matches = results.slice(0, 5).map(record => {
    const fields = [...new Set(positives.map(criterion => criterion.match(record)!))];
    return { mealId: record.id, evidence: fields.slice(0, 5).map(field => ({ field, quote: fieldValue(record, field).slice(0, 240) })) };
  });
  response.status = response.matches.length ? "matches" : "empty";
  return response;
}

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const hasOnly = (value: Record<string, unknown>, keys: string[]) => Object.keys(value).every(key => keys.includes(key));

/**
 * Structural/provenance validation, NOT proof of semantic relevance. Unknown
 * fields, records, fabricated quotes, duplicated IDs and unsupported claims
 * are rejected. An invalid response must never be rendered as a model result.
 * Unresolved entries must be literal fragments of the user's query.
 */
export function validateModelResponse(raw: unknown, request: RecallRequest): RecallResponse | null {
  if (!isObject(raw) || !hasOnly(raw, ["mode", "status", "query", "matches", "unresolved", "clarification"])) return null;
  if (raw.mode !== "model" || typeof raw.status !== "string" || !["matches", "empty", "clarify"].includes(raw.status) || raw.query !== request.query.trim()) return null;
  if (!Array.isArray(raw.matches) || raw.matches.length > 5 || !Array.isArray(raw.unresolved) || raw.unresolved.length > 12) return null;
  if (raw.unresolved.some(item => typeof item !== "string" || !item.trim() || item.length > 120 || !request.query.includes(item))) return null;
  // A model may phrase its own short follow-up question; it cannot carry links or line breaks.
  const shortText = (value: unknown) => typeof value === "string" && !!value.trim() && value.length <= 60 && !/[\n\r]|https?:|www\./i.test(value);
  // The follow-up must be a question back to the user, not a claim about a place.
  if (raw.clarification !== undefined && (!shortText(raw.clarification) || !/[?？]\s*$/.test(raw.clarification as string))) return null;
  if (raw.status === "matches" ? raw.matches.length === 0 || raw.clarification !== undefined : raw.matches.length !== 0) return null;
  if (raw.status === "clarify" && raw.clarification === undefined) return null;
  const records = new Map(eligibleRecords(request).map(record => [record.id, record]));
  const seen = new Set<string>();
  const parsed = parseQuery(request.query, request.records);
  const hardCriteria = parsed.criteria.filter(criterion => criterion.kind === "author" || criterion.negative);
  for (const match of raw.matches) {
    if (!isObject(match) || !hasOnly(match, ["mealId", "evidence", "reason"]) || typeof match.mealId !== "string" || seen.has(match.mealId)) return null;
    if (match.reason !== undefined && !shortText(match.reason)) return null;
    const record = records.get(match.mealId);
    if (!record || hardCriteria.some(criterion => criterion.negative ? !!criterion.match(record) : !criterion.match(record))) return null;
    seen.add(match.mealId);
    if (!Array.isArray(match.evidence) || !match.evidence.length || match.evidence.length > 5) return null;
    const fields = new Set<string>();
    for (const evidence of match.evidence) {
      if (!isObject(evidence) || !hasOnly(evidence, ["field", "quote"]) || typeof evidence.field !== "string" || !evidenceFields.includes(evidence.field as RecallEvidenceField)) return null;
      if (fields.has(evidence.field) || typeof evidence.quote !== "string" || !evidence.quote.trim() || evidence.quote.length > 240) return null;
      fields.add(evidence.field);
      if (!fieldValue(record, evidence.field as RecallEvidenceField).includes(evidence.quote)) return null;
    }
  }
  return raw as RecallResponse;
}

/**
 * Deterministic preparation for the on-device semantic model. Hard rules stay
 * in code: authorization scope, named authors, negations and unsupported
 * conditions (price, hours, party size…) are never delegated to similarity.
 * What remains of the query is the fuzzy part the embedding model ranks.
 */
export type RecallPlan = {
  query: string;
  candidates: RecallRecord[];
  authorCriteria: number;
  /** Records hit by an exact concept/venue rule; used as a ranking signal only. */
  ruleHits: Map<string, RecallEvidenceField[]>;
  unresolved: string[];
  /** Fuzzy remainder sent to the embedding model; empty when nothing is left. */
  semanticText: string;
};

const negationWords = /(?:不要|不是|不找|排除|除了|非|别找|\bnot\b|\bexcept\b|\bexcluding\b|\bwithout\b)/gi;

export function recallPlan(request: RecallRequest): RecallPlan {
  const query = request.query.trim();
  const parsed = parseQuery(query, request.records);
  const authors = parsed.criteria.filter(criterion => criterion.kind === "author" && !criterion.negative);
  const negatives = parsed.criteria.filter(criterion => criterion.negative);
  const content = parsed.criteria.filter(criterion => criterion.kind === "content" && !criterion.negative);
  const candidates = eligibleRecords(request).filter(record =>
    authors.every(criterion => criterion.match(record)) && !negatives.some(criterion => criterion.match(record)));
  const ruleHits = new Map<string, RecallEvidenceField[]>();
  for (const record of candidates) {
    const fields = [...new Set(content.map(criterion => criterion.match(record)).filter((field): field is RecallEvidenceField => !!field))];
    if (fields.length) ruleHits.set(record.id, fields);
  }
  const blank = new Set<number>();
  const spans: [number, number][] = [...parsed.unsupportedSpans, ...authors.map(c => [c.start, c.end] as [number, number]), ...negatives.map(c => [c.start, c.end] as [number, number])];
  for (const [start, end] of spans) for (let i = start; i < end; i++) blank.add(i);
  let text = query.split("").map((ch, i) => blank.has(i) ? " " : ch).join("").replace(negationWords, " ");
  // Only multi-character framing is removed: single characters such as 在/做 carry meaning for the model.
  for (const phrase of zhFraming.filter(item => item.length > 1).sort((a, b) => b.length - a.length)) text = text.replaceAll(phrase, " ");
  text = text.replace(enFraming, " ").replace(/[\s\p{P}]+/gu, " ").trim().replace(/^的\s*/, "").trim();
  return { query, candidates, authorCriteria: authors.length, ruleHits, unresolved: parsed.unresolved, semanticText: text };
}

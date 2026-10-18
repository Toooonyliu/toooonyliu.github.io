import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowRight, ArrowCounterClockwise, BookmarkSimple, Check, MagnifyingGlass, Sparkle, X } from "@phosphor-icons/react";
import { BottomSheet, KeyboardTextarea, useKeyboard } from "../mobile";
import type { Lang } from "../data";
import { getModelState, loadModel, searchOnDevice, subscribeModel, warm, MODEL_INFO, type RecallMeta } from "./adapter.ts";
import { localRecall, validateModelResponse, type RecallRequest, type RecallResponse, type RecallRecord } from "./engine.ts";
import "./recall.css";

type Props = {
  open: boolean;
  covered: boolean;
  lang: Lang;
  currentUserId: string;
  records: RecallRecord[];
  network?: { friends: string[]; hidden: string[] };
  /** "mine" when opened from Memories (search your own meals). */
  defaultScope?: RecallRequest["scope"];
  saved: string[];
  onClose: () => void;
  onMeal: (id: string) => void;
  onVenue: (id: string) => void;
  onSave: (id: string) => void;
};

type Hit = { record: RecallRecord; evidence: RecallResponse["matches"][number]["evidence"]; reason?: string };
/** One restaurant = one card, even when several friends' meals point to it. Home meals stay single. */
type Group = { key: string; venue?: RecallRecord["venue"]; hits: Hit[] };

const TIMEOUT_MS = 20_000;
const EXAMPLES = [
  ["The place Maya took her parents", "Maya 带爸妈去的那家"],
  ["Where someone celebrated an offer", "有人庆祝拿到 offer 去吃的"],
  ["The soup when someone had a cold", "感冒的时候喝的那碗汤"],
] as const;

export default function RecallPanel({ open, covered, lang, currentUserId, records, network, defaultScope = "friends", saved, onClose, onMeal, onVenue, onSave }: Props) {
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<RecallRequest["scope"]>("friends");
  const [response, setResponse] = useState<RecallResponse | null>(null);
  const [meta, setMeta] = useState<RecallMeta | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const model = useSyncExternalStore(subscribeModel, getModelState, getModelState);
  const controller = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keyboard = useKeyboard();
  const t = (en: string, zh: string) => lang === "zh" ? zh : en;

  function cancel() {
    sequence.current += 1;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    controller.current?.abort();
    controller.current = null;
    setBusy(false);
  }
  useEffect(() => { cancel(); setResponse(null); setMeta(null); setError(""); }, [scope, records, lang, currentUserId]);
  useEffect(() => {
    if (!open) { cancel(); return; }
    setScope(defaultScope);
    // Start the one-time model download while the user is still typing.
    loadModel().catch(() => undefined);
  }, [open]);
  useEffect(() => {
    if (!open || model.status !== "ready") return;
    const visible = records.filter(r => r.authorId === currentUserId || r.audience !== "private").map(({ photo: _photo, ...r }) => r);
    warm(visible).catch(() => undefined);
  }, [open, model.status, records, currentUserId]);
  useEffect(() => () => { sequence.current += 1; controller.current?.abort(); if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  function buildRequest(value: string): RecallRequest {
    // Minimize before anything leaves this component. Photos are for rendering only.
    const scopedRecords = records.filter(record => {
      const mine = record.authorId === currentUserId;
      if (!mine && record.audience === "private") return false;
      return scope === "mine" ? mine : scope === "friends" ? !mine : true;
    }).map(({ photo: _photo, ...record }) => record);
    return { query: value, records: scopedRecords, lang, scope, currentUserId };
  }

  async function search(forceLocal = false) {
    const value = query.trim();
    if (!value) { setError(t("Add something you remember.", "写一点你还记得的线索。")); return; }
    cancel(); keyboard.hide(); setError(""); setResponse(null); setMeta(null);
    const request = buildRequest(value);
    if (forceLocal) { setResponse(localRecall(request)); return; }
    const id = ++sequence.current;
    const abort = new AbortController(); controller.current = abort;
    setBusy(true);
    try {
      // First use downloads the model; the search timeout starts after it is ready.
      await loadModel();
      if (id !== sequence.current) return;
      timeoutRef.current = setTimeout(() => abort.abort(new DOMException("timeout", "TimeoutError")), TIMEOUT_MS);
      const { raw, meta: nextMeta } = await searchOnDevice(request, abort.signal);
      if (id !== sequence.current) return;
      // Same provenance check as any model output: IDs must be records shown here, quotes verbatim.
      const checked = validateModelResponse(raw, request);
      if (!checked) throw new Error("evidence");
      setResponse(checked);
      setMeta(nextMeta);
    } catch (cause) {
      if (id !== sequence.current) return;
      const timedOut = abort.signal.reason instanceof DOMException && abort.signal.reason.name === "TimeoutError";
      const loadFailed = getModelState().status === "error";
      setError(timedOut ? t("This took too long. Retry, or use keyword search.", "这次查找超时了，可以重试或改用关键词检索。")
        : loadFailed ? t("The on-device model couldn't load in this browser. Retry, or use keyword search.", "这台设备暂时加载不了 AI 模型，可以重试或改用关键词检索。")
        : t("The result couldn't be verified against the posts. Try again.", "结果没能和原帖核对上，请重试。"));
      void cause;
    } finally {
      if (id === sequence.current) {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = null; controller.current = null; setBusy(false);
      }
    }
  }

  const byId = new Map(records.map(record => [record.id, record]));
  const hits: Hit[] = response?.matches.flatMap(match => {
    const record = byId.get(match.mealId);
    return record ? [{ record, evidence: match.evidence, reason: match.reason }] : [];
  }) || [];
  const groups: Group[] = [];
  for (const hit of hits) {
    const key = hit.record.venue ? `venue:${hit.record.venue.id}` : `meal:${hit.record.id}`;
    const existing = groups.find(group => group.key === key);
    if (existing) existing.hits.push(hit); else groups.push({ key, venue: hit.record.venue, hits: [hit] });
  }
  const isLocal = response?.mode === "local";
  const percent = model.status === "loading" ? Math.min(99, Math.round(model.loaded / Math.max(1, model.total) * 100)) : 0;
  const aiReady = model.status === "ready" && !isLocal;
  const chip = isLocal ? t("Keyword search", "关键词检索")
    : model.status === "ready" ? t("On-device AI", "AI 检索 · 本机运行")
    : model.status === "loading" ? t(`Loading AI ${percent}%`, `AI 模型加载中 ${percent}%`)
    : model.status === "error" ? t("AI unavailable", "AI 暂不可用") : "";
  /** The friend's own words that matched best (verbatim), shown as the AI's "why". */
  const whyLine = (hit: Hit) => {
    if (hit.reason) return hit.reason;
    const quote = hit.evidence.find(e => e.field === "noteZh" || e.field === "note")?.quote
      || (lang === "zh" ? hit.record.noteZh || hit.record.note : hit.record.note || hit.record.noteZh)
      || hit.evidence.find(e => e.field !== "author" && e.field !== "type")?.quote;
    return quote ? `“${quote.length > 34 ? quote.slice(0, 33) + "…" : quote}”` : "";
  };
  const title = (record: RecallRecord) => lang === "zh" && record.foodZh ? record.foodZh : record.food;
  const who = (record: RecallRecord) => record.authorId === currentUserId ? t("You", "你") : record.author;
  function leave() { cancel(); keyboard.hide(); onClose(); }

  const evidenceBlock = (hit: Hit) => <details className="recall-evidence">
    <summary>{t("See the original words", "看原帖原文")}</summary>
    <div>{hit.evidence.map((item, index) => <blockquote key={`${item.field}-${index}`}>{item.quote}</blockquote>)}</div>
  </details>;

  return <BottomSheet open={open && !covered} onOpenChange={value => { if (!value) leave(); }} title={t("Find that meal", "找那一餐")} snap={.94}>
    <div className="recall-panel">
      <button className="sheet-close" aria-label={t("Close search", "关闭查找")} onClick={leave}><X size={21}/></button>
      <form className="recall-form" onSubmit={event => { event.preventDefault(); void search(); }}>
        <label className="recall-input-label" htmlFor="recall-query">{t("What do you remember?", "还记得什么？")}</label>
        <div className="recall-input-wrap"><KeyboardTextarea id="recall-query" maxLength={300} rows={2} value={query}
          placeholder={t("A friend, a dish, something they said…", "一个朋友、一道菜，或当时说过的一句话…")}
          onChange={event => { cancel(); setQuery(event.target.value); setError(""); setResponse(null); setMeta(null); }}/>
          <button type="submit" className="recall-submit" disabled={busy || !query.trim()} aria-label={t("Find meal", "查找餐食")}><ArrowRight size={22}/></button></div>
        <div className="recall-scope" role="group" aria-label={t("Search in", "查找范围")}>
          {([['friends', 'Friends', '朋友'], ['mine', 'Mine', '自己'], ['all', 'Both', '全部']] as const).map(([value,en,zh]) =>
            <button key={value} type="button" aria-pressed={scope === value} onClick={() => { keyboard.hide(); setScope(value); }}>{t(en,zh)}</button>)}
          {chip && <span className={`recall-mode${aiReady ? " is-ai" : ""}`} title={`${MODEL_INFO.name} · ${MODEL_INFO.variant} · ${MODEL_INFO.runtime}`}>{aiReady && <Sparkle size={11} weight="fill"/>}{chip}</span>}
        </div>
      </form>

      {!response && !busy && !error && <div className="recall-start">
        <p>{t("Say it the way you remember it", "用你记得的方式说就好")}</p>
        {EXAMPLES.map(([en, zh]) => <button key={zh} className="recall-example" onClick={() => setQuery(t(en, zh))}><MagnifyingGlass size={17}/>{t(en, zh)}<ArrowRight size={16}/></button>)}
        <small>{t("The AI runs on this device and looks only at posts you can see. Nothing you type is uploaded.", "AI 在你的手机上运行，只在你有权查看的记录里查找，输入不会上传；找不到会直接告诉你。")}</small>
      </div>}

      {busy && <div className="recall-pending" role="status">
        {model.status === "loading" ? <div className="recall-load"><p><Sparkle size={14} weight="fill"/>{t("Preparing the on-device AI (first time only)…", "首次使用，正在准备本机 AI 模型…")}</p>
          <div className="recall-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><span style={{ width: `${percent}%` }}/></div>
          <small>{(model.loaded / 1048576).toFixed(1)} / {(model.total / 1048576).toFixed(1)} MB</small></div>
        : <p><Sparkle size={14} weight="fill"/>{t("Comparing your clues with friends' posts…", "AI 正在理解你的描述，并和朋友的记录比对…")}</p>}
        <button onClick={cancel}>{t("Cancel", "取消")}</button></div>}

      {error && <div className="recall-error" role="alert"><p>{error}</p><div>
        {<button onClick={() => void search()}><ArrowCounterClockwise size={16}/>{t("Retry", "重试")}</button>}
        <button onClick={() => void search(true)}>{t("Use keyword search", "改用关键词检索")}</button></div></div>}

      {response && <div className="recall-results" aria-live="polite">
        <div className="recall-result-label">
          <strong>{groups.length ? (groups.length < hits.length ? t(`${hits.length} posts · ${groups.length} places`, `${hits.length} 条记录 · ${groups.length} 个地方`) : t(`${hits.length} possible matches`, `${hits.length} 条可能的记录`))
            : response.status === "clarify" ? t("One more detail?", "再给一点线索？") : t("Didn't find that meal", "没找到这顿饭")}</strong>
          {meta && !isLocal && <small>{t(`On-device · ${meta.elapsedMs} ms`, `本机完成 · ${meta.elapsedMs} ms`)}</small>}
          {isLocal && <small>{t("Keywords only, no AI", "仅关键词匹配，未使用 AI")}</small>}
        </div>
        {response.clarification && <p className="recall-clarification">{response.clarification}</p>}
        {!groups.length && response.status !== "clarify" && <p className="recall-empty">{t("Nothing in the posts you can see matches this. Try a friend's name or a dish, or change the scope.", "你能看到的记录里没有符合的。可以补一个朋友的名字或菜名，或换个查找范围。")}</p>}
        {response.unresolved.length > 0 && groups.length > 0 && <div className="recall-unknown"><span>{t("Not in the posts, so not guessed", "原帖里没写，不做猜测")}</span><p>{response.unresolved.join(" · ")}</p></div>}

        {groups.map(group => group.venue && group.hits.length > 1
          ? <article className="recall-card recall-venue-card" key={group.key}>
              <button className="recall-venue-head" onClick={() => { keyboard.hide(); onVenue(group.venue!.id); }}>
                <span><strong>{group.venue.name}</strong><small>{group.venue.cuisine} · {group.venue.area}</small></span>
                <em>{t(`${group.hits.length} posts`, `${group.hits.length} 条朋友的记录`)}</em>
              </button>
              {group.hits.map(hit => <div className="recall-sub" key={hit.record.id}>
                <button className="recall-card-main" onClick={() => { keyboard.hide(); onMeal(hit.record.id); }}>
                  {hit.record.photo ? <img src={hit.record.photo} alt=""/> : <span className="recall-no-photo"><MagnifyingGlass size={22}/></span>}
                  <span><small>{who(hit.record)} · {hit.record.date}</small><strong>{title(hit.record)}</strong>{whyLine(hit) && <i className="recall-reason" title={t("In your friend's own words", "朋友的原话")}><Sparkle size={11} weight="fill"/>{whyLine(hit)}</i>}</span>
                </button>
                {evidenceBlock(hit)}
              </div>)}
              <div className="recall-card-actions"><button onClick={() => { keyboard.hide(); onVenue(group.venue!.id); }}>{t("Open restaurant", "查看餐厅")}<ArrowRight size={15}/></button>
                <button className="recall-save" aria-pressed={saved.includes(group.venue.id)} aria-label={saved.includes(group.venue.id) ? t("Saved restaurant", "已收藏餐厅") : t("Save restaurant", "收藏餐厅")} onClick={() => onSave(group.venue!.id)}>{saved.includes(group.venue.id) ? <Check size={18}/> : <BookmarkSimple size={18}/>}</button></div>
            </article>
          : group.hits.map(hit => <article className="recall-card" key={hit.record.id}>
              <button className="recall-card-main" onClick={() => { keyboard.hide(); onMeal(hit.record.id); }}>
                {hit.record.photo ? <img src={hit.record.photo} alt=""/> : <span className="recall-no-photo"><MagnifyingGlass size={24}/></span>}
                <span><small>{who(hit.record)} · {hit.record.date}</small><strong>{title(hit.record)}</strong>
                  {whyLine(hit) && <i className="recall-reason" title={t("In your friend's own words", "朋友的原话")}><Sparkle size={11} weight="fill"/>{whyLine(hit)}</i>}
                  <em>{hit.record.venue?.name || (hit.record.type === "homemade" ? t("Cooked at home · no location", "在家做的 · 不显示地点") : t("No restaurant attached", "没有关联餐厅"))}</em></span>
              </button>
              {evidenceBlock(hit)}
              <div className="recall-card-actions"><button onClick={() => { keyboard.hide(); onMeal(hit.record.id); }}>{t("Open original post", "查看原帖")}<ArrowRight size={15}/></button>
                {hit.record.venue && <><button onClick={() => { keyboard.hide(); onVenue(hit.record.venue!.id); }}>{t("Restaurant", "餐厅")}</button><button className="recall-save" aria-pressed={saved.includes(hit.record.venue.id)} aria-label={saved.includes(hit.record.venue.id) ? t("Saved restaurant", "已收藏餐厅") : t("Save restaurant", "收藏餐厅")} onClick={() => onSave(hit.record.venue!.id)}>{saved.includes(hit.record.venue.id) ? <Check size={18}/> : <BookmarkSimple size={18}/>}</button></>}
              </div>
            </article>))}
      </div>}
    </div>
  </BottomSheet>;
}

import { useEffect, useMemo, useRef, useState } from "react";
import { CaretRight, ChatCircleDots, Heart, PaperPlaneTilt, UserPlus, X } from "@phosphor-icons/react";
import { BottomSheet, KeyboardInput, useKeyboard } from "./mobile";
import { type Meal, type Lang, users, venues, localDay } from "./data";
import { PersonAvatar } from "./People";
import "./messages.css";

/**
 * 消息 (Messages): interactions on your meals + private threads with friends.
 * A thread can quote a meal, so conversations start from food, like replying to
 * a post on 小红书 or a BeReal. Demo data is fictional; the other side never
 * auto-replies. Your messages are saved in this browser only.
 */
export type ThreadMessage = { id: string; from: string; text: string; at: string; mealId?: string };
export type Threads = Record<string, ThreadMessage[]>;

const dayShift = (today: string, days: number) => { const d = new Date(`${today}T12:00:00`); d.setDate(d.getDate() + days); return localDay(d); };
/** Fictional conversation history for the demo circle. */
export function seedThreads(today: string): Threads {
  const at = (days: number, time: string) => `${dayShift(today, days)}T${time}`;
  return {
    maya: [
      { id: "seed-maya-1", from: "maya", text: "周末要不要一起去 Kura？上次叠的盘子还没破纪录 😂", at: at(-1, "20:14"), mealId: "maya-dumplings" },
      { id: "seed-maya-2", from: "daniel", text: "好啊！周六中午？", at: at(-1, "20:31") },
      { id: "seed-maya-3", from: "maya", text: "可以，我订位。", at: at(-1, "20:33") },
    ],
    jordan: [
      { id: "seed-jordan-1", from: "jordan", text: "实习 offer 拿到了！下次我请客", at: at(0, "17:02"), mealId: "jordan-noodles" },
    ],
    eric: [
      { id: "seed-eric-1", from: "daniel", text: "感冒好点没？", at: at(0, "09:40") },
      { id: "seed-eric-2", from: "eric", text: "好多了，喝了我妈教的蛋汤。做法很简单，回头发你", at: at(0, "10:25"), mealId: "eric-breakfast" },
    ],
  };
}

type Interaction = { id: string; from: string; kind: "react" | "comment" | "save"; text?: string; mealId: string; at: string };
function seedInteractions(today: string): Interaction[] {
  const at = (days: number, time: string) => `${dayShift(today, days)}T${time}`;
  return [
    { id: "i1", from: "maya", kind: "comment", text: "看起来好下饭！", mealId: "daniel-pasta", at: at(0, "12:05") },
    { id: "i2", from: "anika", kind: "react", mealId: "daniel-pasta", at: at(0, "11:30") },
    { id: "i3", from: "eric", kind: "save", mealId: "daniel-pasta", at: at(-1, "21:10") },
  ];
}

type Props = {
  lang: Lang;
  today: string;
  currentUserId: string;
  friends: string[];
  incoming: string[];
  meals: Meal[];
  threads: Threads;
  openThread: { friendId: string; quoteMealId?: string } | null;
  onOpenThread: (value: { friendId: string; quoteMealId?: string } | null) => void;
  onSend: (friendId: string, text: string, mealId?: string) => void;
  onMeal: (id: string) => void;
  onPeople: () => void;
};

export default function MessagesView({ lang, today, currentUserId, friends, incoming, meals, threads, openThread, onOpenThread, onSend, onMeal, onPeople }: Props) {
  const t = (en: string, zh: string) => lang === "zh" ? zh : en;
  const [seen, setSeen] = useState<Record<string, string>>({});
  const interactions = useMemo(() => seedInteractions(today).filter(i => meals.some(m => m.id === i.mealId)), [today, meals]);
  const when = (iso: string) => {
    const [date, time] = iso.split("T");
    if (date === today) return time.slice(0, 5);
    if (date === dayShift(today, -1)) return t("Yesterday", "昨天");
    return date.slice(5).replace("-", "/");
  };
  const name = (id: string) => id === currentUserId ? t("You", "你") : users.find(u => u.id === id)?.name.split(" ")[0] || id;
  const mealOf = (id?: string) => meals.find(m => m.id === id);
  const food = (m: Meal) => lang === "zh" && m.foodZh ? m.foodZh : m.food;

  const people = friends.map(id => ({ id, messages: threads[id] || [] }))
    .sort((a, b) => (b.messages.at(-1)?.at || "").localeCompare(a.messages.at(-1)?.at || ""));
  const unread = (id: string) => { const last = threads[id]?.at(-1); return !!last && last.from !== currentUserId && (seen[id] || "") < last.at; };
  useEffect(() => { if (openThread) setSeen(s => ({ ...s, [openThread.friendId]: threads[openThread.friendId]?.at(-1)?.at || "" })); }, [openThread, threads]);

  return <section className="messages">
    <h2 className="messages-section">{t("Activity", "互动")}</h2>
    <div className="messages-activity">
      {incoming.length > 0 && <button className="activity-row" onClick={onPeople}>
        <span className="activity-icon"><UserPlus size={18} weight="bold"/></span>
        <span className="activity-text"><strong>{t(`${incoming.length} friend request`, `${incoming.length} 个好友申请`)}</strong><small>{incoming.map(name).join("、")}{t(" wants to share meals with you", " 想和你互相看到每天的饭")}</small></span>
        <CaretRight size={16}/>
      </button>}
      {interactions.map(item => { const meal = mealOf(item.mealId)!; return <button key={item.id} className="activity-row" onClick={() => onMeal(item.mealId)}>
        <PersonAvatar id={item.from} className="activity-avatar"/>
        <span className="activity-text"><strong>{name(item.from)}<em>{item.kind === "comment" ? t(" commented", " 回应了你的一餐") : item.kind === "react" ? t(" liked", " 觉得看着好吃") : t(" saved", " 收藏了你的一餐")}</em></strong>
          <small>{item.text ? `“${item.text}” · ` : ""}{food(meal)} · {when(item.at)}</small></span>
        {meal.photo ? <img src={meal.photo} alt=""/> : <Heart size={18}/>}
      </button>; })}
    </div>

    <h2 className="messages-section">{t("Messages", "私信")}</h2>
    <div className="messages-list">
      {people.map(({ id, messages }) => { const last = messages.at(-1); const lastMeal = mealOf(last?.mealId); return <button key={id} className="thread-row" onClick={() => onOpenThread({ friendId: id })}>
        <span className="thread-avatar"><PersonAvatar id={id} className="chat-avatar"/>{unread(id) && <b aria-label={t("Unread", "未读")}/>}</span>
        <span className="thread-text"><strong>{users.find(u => u.id === id)?.name}</strong>
          <small>{last ? `${last.from === currentUserId ? t("You: ", "你：") : ""}${last.text}` : t("Say hi with a meal", "从一顿饭开始聊聊")}</small></span>
        <span className="thread-meta">{last && <time>{when(last.at)}</time>}{lastMeal?.photo && <img src={lastMeal.photo} alt=""/>}</span>
      </button>; })}
      {!people.length && <p className="empty">{t("Add friends to start a conversation.", "添加朋友后就可以私信聊天。")}</p>}
    </div>

    <ThreadSheet key={openThread?.friendId || "none"} lang={lang} today={today} currentUserId={currentUserId} thread={openThread}
      messages={openThread ? threads[openThread.friendId] || [] : []} meals={meals} when={when} name={name}
      onClose={() => onOpenThread(null)} onSend={onSend} onMeal={onMeal}/>
  </section>;
}

function ThreadSheet({ lang, today, currentUserId, thread, messages, meals, when, name, onClose, onSend, onMeal }: {
  lang: Lang; today: string; currentUserId: string; thread: Props["openThread"]; messages: ThreadMessage[]; meals: Meal[];
  when: (iso: string) => string; name: (id: string) => string; onClose: () => void;
  onSend: Props["onSend"]; onMeal: (id: string) => void;
}) {
  const t = (en: string, zh: string) => lang === "zh" ? zh : en;
  const keyboard = useKeyboard();
  const [text, setText] = useState("");
  const [quote, setQuote] = useState<string | undefined>(thread?.quoteMealId);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [messages.length]);
  if (!thread) return null;
  const friend = users.find(u => u.id === thread.friendId);
  const food = (m: Meal) => lang === "zh" && m.foodZh ? m.foodZh : m.food;
  const recent = meals.filter(m => m.userId === thread.friendId && m.audience === "friends").sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)).slice(0, 4);
  const card = (meal: Meal) => { const venue = venues.find(v => v.id === meal.venueId); return <button className="thread-meal" onClick={() => onMeal(meal.id)}>
    {meal.photo && <img src={meal.photo} alt=""/>}<span><strong>{food(meal)}</strong><small>{name(meal.userId)} · {venue?.name || (meal.type === "homemade" ? t("At home", "在家") : t("Meal", "一餐"))}</small></span></button>; };
  const send = () => {
    const value = text.trim(); if (!value) return;
    onSend(thread.friendId, value, quote); setText(""); setQuote(undefined); keyboard.hide();
  };
  return <BottomSheet open onOpenChange={open => { if (!open) { keyboard.hide(); onClose(); } }} title={friend?.name || ""} snap={.94}>
    <div className="thread">
      <button className="sheet-close" aria-label={t("Close", "关闭")} onClick={() => { keyboard.hide(); onClose(); }}><X size={21}/></button>
      <div className="thread-head"><PersonAvatar id={thread.friendId} className="thread-head-avatar"/><span><small>{t("Friends · sees your shared meals", "好友 · 能看到你分享的餐食")}</small></span></div>
      <div className="thread-body">
        {!messages.length && <p className="thread-empty"><ChatCircleDots size={26}/>{t("Start from a meal you both care about.", "从一顿饭聊起吧。")}</p>}
        {messages.map((m, i) => { const mine = m.from === currentUserId; const meal = meals.find(x => x.id === m.mealId); const showTime = i === 0 || messages[i - 1].at.slice(0, 13) !== m.at.slice(0, 13);
          return <div key={m.id} className={`bubble-row ${mine ? "mine" : ""}`}>
            {showTime && <time className="bubble-time">{m.at.startsWith(today) ? m.at.slice(11, 16) : `${when(m.at)} ${m.at.slice(11, 16)}`}</time>}
            {meal && card(meal)}
            <p className="bubble">{m.text}</p>
          </div>; })}
        <div ref={end}/>
      </div>
      <div className="thread-compose">
        {quote && (() => { const meal = meals.find(m => m.id === quote); return meal ? <div className="thread-quote"><span>{t("About", "聊这一餐")}</span>{card(meal)}<button aria-label={t("Remove", "移除")} onClick={() => setQuote(undefined)}><X size={15}/></button></div> : null; })()}
        {!quote && recent.length > 0 && <div className="thread-suggest"><span>{t(`Ask about ${name(thread.friendId)}'s meals`, `聊聊${name(thread.friendId)}最近吃的`)}</span>
          <div>{recent.map(m => <button key={m.id} onClick={() => setQuote(m.id)}>{m.photo && <img src={m.photo} alt=""/>}{food(m)}</button>)}</div></div>}
        <div className="thread-input">
          <KeyboardInput aria-label={t("Message", "消息")} placeholder={t("Message…", "发消息…")} maxLength={500} value={text}
            onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); send(); } }}/>
          <button aria-label={t("Send", "发送")} disabled={!text.trim()} onClick={send}><PaperPlaneTilt size={20} weight="fill"/></button>
        </div>
        <p className="thread-note">{t("Demo: messages stay in this browser. Friends don't reply automatically.", "演示：消息只保存在本机，对方不会自动回复。")}</p>
      </div>
    </div>
  </BottomSheet>;
}

import { useState } from "react";
import { ArrowUpRight, BookmarkSimple, CalendarBlank, CaretLeft, CaretRight, ChatCircle, ForkKnife, House, LockSimple, MagnifyingGlass, MapPin, Play, X } from "@phosphor-icons/react";
import { Carousel, KeyboardInput } from "./mobile";
import { type Meal, type Lang, users, venues, localDay, typeLabel } from "./data";
import { PersonAvatar } from "./People";

const foodName = (meal: Meal, lang: Lang) => lang === "zh" && meal.foodZh ? meal.foodZh : meal.food;
export function placeName(meal: Meal, lang: Lang) {
  const venue = venues.find(v => v.id === meal.venueId);
  if (meal.type === "restaurant") return venue?.name || (lang === "zh" ? "餐厅未分享" : "Restaurant not shared");
  if (meal.type === "homemade") return lang === "zh" ? "在家" : "At home";
  if (meal.place) return lang === "zh" && meal.placeZh ? meal.placeZh : meal.place;
  if (meal.type === "delivery") return lang === "zh" ? "外卖 · 地点未分享" : "Delivery · place not shared";
  return lang === "zh" ? "地点未分享" : "Place not shared";
}

type CommonProps = { meals: Meal[]; lang: Lang; onMeal: (meal: Meal) => void; today: string };

export function ChatView({ meals, lang, onMeal, replies, currentUserId }: Omit<CommonProps, "today"> & { replies: Record<string, { text: string }[]>; currentUserId: string }) {
  const [search, setSearch] = useState("");
  const t = (en: string, zh: string) => lang === "zh" ? zh : en;
  const visiblePeople=users.filter(user=>user.id!==currentUserId&&meals.some(meal=>meal.userId===user.id)&&user.name.toLowerCase().includes(search.toLowerCase()));
  return <section className="social-chat">
    <p className="screen-intro">{t("Good conversations start with a meal.", "从一餐开始，聊聊日常。")}</p>
    <label className="social-search"><MagnifyingGlass size={21}/><KeyboardInput aria-label={t("Search friends", "搜索朋友")} placeholder={t("Search friends", "搜索朋友")} value={search} onChange={e => setSearch(e.target.value)}/></label>
    <div className="chat-people">
      {visiblePeople.map(user => {
        const related = meals.filter(m => m.userId === user.id && m.audience === "friends");
        const meal = related.find(m => replies[m.id]?.length) || related[0];
        if (!meal) return null;
        const messages = replies[meal.id] || [];
        return <button className="chat-person" key={user.id} onClick={() => onMeal(meal)}>
          <PersonAvatar className="chat-avatar" id={user.id}/><span><strong>{user.name}</strong><small>{messages.length ? `${t("You: ", "你：")}${messages[messages.length - 1].text}` : foodName(meal, lang)}</small><em>{messages.length ? t("Continue the conversation", "继续聊天") : t("Ask about this meal", "聊聊这一餐")}</em></span>
          {meal.photo ? <img className="chat-food" src={meal.photo} alt=""/> : <ChatCircle size={22}/>}
        </button>;
      })}
      {!visiblePeople.length && <p className="empty">{search?t("No conversations found. Try another friend’s name.", "没有找到聊天，试试其他好友的名字。"):t("Conversations begin with a friend’s shared meal. Add friends with the button above.","从好友分享的一餐开始聊天，可通过右上角添加朋友。")}</p>}
    </div>
  </section>;
}

export function MemoriesView({ meals, lang, onMeal, today, view }: CommonProps & {view:"moments"|"calendar"|"recaps"}) {
  const [month, setMonth] = useState(today.slice(0,7));
  const [day, setDay] = useState(today);
  const [recap, setRecap] = useState<number | null>(null);
  const t = (en: string, zh: string) => lang === "zh" ? zh : en;
  const sorted = [...meals].sort((a,b) => (b.date+b.time).localeCompare(a.date+a.time));
  const months = [...new Set(sorted.map(m => m.date.slice(0,7)))];
  const monthMeals = sorted.filter(m => m.date.startsWith(month));
  const monthTitle = (value: string) => new Date(`${value}-01T12:00:00`).toLocaleDateString(lang === "zh" ? "zh-CN" : "en-US", {month:"long",year:"numeric"});
  const shift = (amount: number) => { const date = new Date(`${month}-01T12:00:00`); date.setMonth(date.getMonth()+amount); setMonth(localDay(date).slice(0,7)); setDay(localDay(date)); setRecap(null); };
  const first = new Date(`${month}-01T12:00:00`);
  const count = new Date(first.getFullYear(),first.getMonth()+1,0).getDate();
  const days: (string|null)[] = [...Array((first.getDay()+6)%7).fill(null),...Array.from({length:count},(_,i)=>`${month}-${String(i+1).padStart(2,"0")}`)];
  return <section className="social-memories">
    <p className="memory-privacy"><LockSimple size={12}/>{t("Your food diary. Just for you.", "你的美食日记，仅自己可见。")}</p>
    {view === "moments" ? months.map(value => <section key={value} className="memory-month"><h2>{monthTitle(value)}</h2><div className="moment-grid">{sorted.filter(m=>m.date.startsWith(value)).map(meal => <button key={meal.id} className="moment-tile" onClick={()=>onMeal(meal)} aria-label={`${foodName(meal,lang)}, ${meal.date}`}>
      {meal.photo ? <img src={meal.photo} alt=""/> : <span className="moment-no-photo"><ForkKnife size={26}/><small>{foodName(meal,lang)}</small></span>}
      <span className="moment-date">{Number(meal.date.slice(-2))}</span><span className="moment-context">{typeLabel(meal.type,lang)}</span>
    </button>)}</div></section>) : <>
      <div className="memory-month-picker"><button aria-label={t("Previous month","上个月")} onClick={()=>shift(-1)}><CaretLeft size={22}/></button><strong>{monthTitle(month)}</strong><button aria-label={t("Next month","下个月")} onClick={()=>shift(1)}><CaretRight size={22}/></button></div>
      {view === "calendar" ? <><div className="calendar-weekdays">{(lang==="zh"?["一","二","三","四","五","六","日"]:["M","T","W","T","F","S","S"]).map((d,i)=><span key={i}>{d}</span>)}</div><div className="social-calendar">{days.map((value,i)=>{
        if(!value)return <span key={`empty-${i}`}/>;
        const records=monthMeals.filter(m=>m.date===value);
        return <button key={value} className={`${value===day?"selected":""} ${records.length?"has-meals":""}`} aria-label={`${value}, ${records.length} ${t("meals","餐食")}`} aria-pressed={day===value} onClick={()=>setDay(value)}>{records[0]?.photo&&<img src={records[0].photo} alt=""/>}<span>{Number(value.slice(-2))}</span>{records.length>1&&<small>{records.length}</small>}</button>;
      })}</div><h3 className="selected-day-title">{new Date(`${day}T12:00:00`).toLocaleDateString(lang==="zh"?"zh-CN":"en-US",{month:"short",day:"numeric",weekday:"long"})}</h3>{monthMeals.filter(m=>m.date===day).map(meal=><button className="memory-meal-row" key={meal.id} onClick={()=>onMeal(meal)}>{meal.photo?<img src={meal.photo} alt=""/>:<ForkKnife size={30}/>}<span><strong>{foodName(meal,lang)}</strong><small>{placeName(meal,lang)} · {meal.time}</small></span><CaretRight size={18}/></button>)}{!monthMeals.some(m=>m.date===day)&&<p className="quiet-empty">{t("A little space for a food memory.","给美食回忆留一点空白。")}</p>}</> :
      <div className="recap-card">
        {monthMeals[recap??0]?.photo&&<img className="recap-bg" src={monthMeals[recap??0].photo} alt=""/>}
        <div className="recap-content"><span className="recap-brand">Mibly.</span>{recap===null?<><span className="recap-eyebrow">{t("YOUR MONTH, SERVED UP","这个月的美食回顾")}</span><h2>{monthTitle(month).replace(/ \d{4}$/,"")}<br/>{t("on your plate.","在你的餐桌上。")}</h2><div className="recap-stats"><span><strong>{monthMeals.length}</strong>{t("meals","餐食")}</span><span><strong>{new Set(monthMeals.map(m=>m.date)).size}</strong>{t("days remembered","留下回忆的日子")}</span></div><button className="recap-play" disabled={!monthMeals.length} onClick={()=>setRecap(0)}><Play size={17} weight="fill"/>{t("Relive this month","回顾这个月")}</button></>:<><button className="recap-exit" aria-label={t("Close recap","关闭回顾")} onClick={()=>setRecap(null)}><X size={22}/></button><span className="recap-position">{recap+1} / {monthMeals.length}</span><h2>{foodName(monthMeals[recap],lang)}</h2><p>{placeName(monthMeals[recap],lang)} · {monthMeals[recap].date.slice(5)}</p><div className="recap-actions"><button aria-label={t("Previous memory","上一条回忆")} disabled={recap===0} onClick={()=>setRecap(recap-1)}><CaretLeft size={24}/></button><button onClick={()=>onMeal(monthMeals[recap])}>{t("Open memory","查看回忆")}</button><button aria-label={t("Next memory","下一条回忆")} disabled={recap===monthMeals.length-1} onClick={()=>setRecap(recap+1)}><CaretRight size={24}/></button></div></>}</div>
      </div>}
    </>}
    {!meals.length&&<p className="empty">{t("Your first meal starts your story.","从第一餐开始，记录你的故事。")}</p>}
  </section>;
}

export function ProfileView({ meals, lang, onMeal, today, onSaved, onPicks, onCompose, currentUserId, savedCount, friendCount, onFriends }: CommonProps & {onSaved:()=>void;onPicks:()=>void;onCompose:()=>void;currentUserId:string;savedCount:number;friendCount:number;onFriends:()=>void}) {
  const user=users.find(u=>u.id===currentUserId)!;
  const todayMeals=meals.filter(m=>m.date===today);
  const t=(en:string,zh:string)=>lang==="zh"?zh:en;
  return <section className="social-profile">
    <div className="profile-cover"><img src={user.avatar} alt={user.name}/><div><span className="profile-city"><MapPin size={13}/>Pittsburgh</span><h2>{user.name.split(" ")[0]}</h2><p>@{user.name.toLowerCase().replaceAll(" ","")} <LockSimple size={13}/></p></div></div>
    <p className="profile-bio">{t("Good food. Familiar faces. Little everyday stories.","好吃的食物，熟悉的朋友，日常的小故事。")}</p>
    <div className="profile-stats"><button onClick={onFriends}><strong>{friendCount}</strong>{t("friends","朋友")}</button><span><strong>{meals.length}</strong>{t("memories","回忆")}</span><span><strong>{savedCount}</strong>{t("saved places","收藏地点")}</span></div>
    <h3>{t("Today’s meals","今天的餐食")}</h3>
    <Carousel ariaLabel={t("Your meals today","你今天的餐食")} className="profile-today-rail" contentClassName="profile-today-track">{todayMeals.map(meal=><button className="profile-today-card" key={meal.id} onClick={()=>onMeal(meal)}>{meal.photo?<img src={meal.photo} alt=""/>:<ForkKnife size={28}/>}<span><strong>{foodName(meal,lang)}</strong><small>{placeName(meal,lang)}</small><em>{meal.time}</em></span><ChatCircle size={19}/></button>)}</Carousel>
    {!todayMeals.length&&<button className="profile-add" onClick={onCompose}><ForkKnife size={23}/>{t("What’s on your plate today?","今天吃了什么？")}</button>}
    <h3>{t("Your food world","你的美食世界")}</h3><button className="profile-link" onClick={onSaved}><BookmarkSimple size={23}/><span><strong>{t("Saved places","收藏地点")}</strong><small>{t("For your next good meal","留给下一次好好吃饭")}</small></span><CaretRight size={20}/></button><button className="profile-link" onClick={onPicks}><ForkKnife size={23}/><span><strong>{t("Help me pick a place","帮我选一家")}</strong><small>{t("Ideas from your circle","来自朋友们的灵感")}</small></span><ArrowUpRight size={20}/></button>
  </section>;
}

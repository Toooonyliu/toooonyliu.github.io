import { useEffect, useMemo, useRef, useState, type PointerEvent, type CSSProperties } from "react";
import { ArrowUpRight, CaretRight, Crosshair, ForkKnife, House, MapPin, Minus, Plus, X } from "@phosphor-icons/react";
import { type Meal, type Lang, users, localDay } from "./data";
import { Carousel } from "./mobile";
import { placeName } from "./SocialViews";
import { PersonAvatar } from "./People";
import type { Circle } from "./socialGraph";
import "./map.css";

type Props = { lang: Lang; meals: Meal[]; today: string; currentUserId: string; onMeal: (meal: Meal) => void; focusMealId?: string | null; scope:Circle;onPerson:(id:string)=>void;onFeed:()=>void };
type Camera = { x: number; y: number; zoom: number };
const positions: Record<string, [number, number]> = {
  kura_sushi: [590, 485], speckled_egg: [330, 410], meat_potatoes: [450, 640],
  everyday_noodles: [590, 485], apteka: [330, 410], pamelas_strip: [335, 620],
  pusadees_garden: [520, 330], noodlehead: [650, 420], gaucho: [510, 560],
  maya: [590, 485], eric: [610, 275], anika: [330, 410], jordan: [450, 640], daniel: [690, 675],
};
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export default function FriendsMap({ lang, meals, today, currentUserId, onMeal, focusMealId, scope,onPerson,onFeed }: Props) {
  const t = (en: string, zh: string) => lang === "zh" ? zh : en;
  const [dayOffset, setDayOffset] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(focusMealId || null);
  useEffect(()=>{if(focusMealId){setSelectedId(focusMealId);setDayOffset(0);}},[focusMealId]);
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, zoom: 1 });
  const [width, setWidth] = useState(390);
  const canvas = useRef<HTMLDivElement>(null);
  const cameraRef = useRef(camera);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ center: {x:number;y:number}; distance: number; camera: Camera; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const base = width / 680;
  const date = new Date(`${today}T12:00:00`); date.setDate(date.getDate() + dayOffset);
  const day = localDay(date);
  const dayMeals = useMemo(() => meals.filter(meal => meal.date === day && meal.audience === "friends").sort((a,b)=>b.time.localeCompare(a.time)), [meals,day]);
  const selected = dayMeals.find(meal=>meal.id===selectedId);
  const friendCount = new Set(dayMeals.filter(m=>m.userId!==currentUserId).map(m=>m.userId)).size;
  const locatedMeals = dayMeals.filter(meal => meal.type === "homemade" || (meal.type === "restaurant" && meal.venueId) || meal.place);
  const pins = locatedMeals.map((meal,index) => {
    const placeKey = meal.type === "restaurant" && meal.venueId ? meal.venueId : meal.userId;
    const [x,y] = positions[placeKey] || [420+index*30,420+index*45];
    const earlier = locatedMeals.slice(0,index).filter(m => (m.type === "restaurant" && m.venueId ? m.venueId : m.userId) === placeKey).length;
    return {meal, x:x+earlier*95, y:y+earlier*24};
  });
  const setView = (next: Camera) => {
    const zoom = clamp(next.zoom,0.82,2.7);
    const height = canvas.current?.clientHeight || 840;
    const maxX = Math.max(0, (2200*base*zoom-width)/2);
    const maxY = Math.max(0, (2200*base*zoom-height)/2-height*.05);
    const value = { x:clamp(next.x,-maxX,maxX),y:clamp(next.y,-maxY,maxY),zoom };
    cameraRef.current=value;setCamera(value);
  };
  useEffect(()=>{
    const element=canvas.current; if(!element)return;
    const observer=new ResizeObserver(()=>setWidth(element.clientWidth)); observer.observe(element);
    const wheel=(event:WheelEvent)=>{event.preventDefault(); const old=cameraRef.current; const zoom=clamp(old.zoom*Math.exp(-event.deltaY*.002),.82,2.7); setView({...old,zoom});};
    element.addEventListener("wheel",wheel,{passive:false});
    return ()=>{observer.disconnect();element.removeEventListener("wheel",wheel);};
  }, [base]);
  const pointsInfo = () => {
    const points=[...pointers.current.values()];
    return {center:{x:points.reduce((sum,p)=>sum+p.x,0)/points.length,y:points.reduce((sum,p)=>sum+p.y,0)/points.length},distance:points.length>1?Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y):0};
  };
  const begin=(event:PointerEvent<HTMLDivElement>)=>{
    pointers.current.set(event.pointerId,{x:event.clientX,y:event.clientY});
    const info=pointsInfo();gesture.current={...info,camera:cameraRef.current,moved:false};
    suppressClick.current=false;
  };
  const move=(event:PointerEvent<HTMLDivElement>)=>{
    if(!pointers.current.has(event.pointerId)||!gesture.current)return;
    pointers.current.set(event.pointerId,{x:event.clientX,y:event.clientY});
    const info=pointsInfo(),start=gesture.current;
    const dx=info.center.x-start.center.x,dy=info.center.y-start.center.y;
    if(Math.hypot(dx,dy)>5||pointers.current.size>1){start.moved=true;suppressClick.current=true;event.currentTarget.setPointerCapture(event.pointerId);}
    if(start.moved){
      const rect=event.currentTarget.getBoundingClientRect();const screenScale=rect.width/event.currentTarget.clientWidth;
      setView({x:start.camera.x+dx/screenScale,y:start.camera.y+dy/screenScale,zoom:info.distance&&start.distance?start.camera.zoom*info.distance/start.distance:start.camera.zoom});
    }
  };
  const end=(event:PointerEvent<HTMLDivElement>)=>{
    pointers.current.delete(event.pointerId);
    if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
    if(pointers.current.size)gesture.current={...pointsInfo(),camera:cameraRef.current,moved:true};else gesture.current=null;
  };
  const select=(id:string,recenter=false)=>{
    setSelectedId(id);
    if(recenter){const pin=pins.find(pin=>pin.meal.id===id); if(pin)setView({x:-(pin.x-500)*base,y:-(pin.y-500)*base,zoom:1});}
  };
  const title=(meal:Meal)=>lang==="zh"&&meal.foodZh?meal.foodZh:meal.food;
  const author=(meal:Meal)=>meal.userId===currentUserId?t("You","你"):users.find(user=>user.id===meal.userId)?.name.split(" ")[0]||t("Friend","朋友");
  const time=(meal:Meal)=>lang==="zh"?meal.time:new Date(`${meal.date}T${meal.time}:00`).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"});
  return <section className="friends-map" aria-label={t("Your friends’ food map","朋友的美食地图")}>
    <div className="map-canvas" ref={canvas} tabIndex={0} aria-label={t("Interactive map. Use arrows to pan and plus or minus to zoom.","互动地图。方向键移动，加减号缩放。")} onPointerDown={begin} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onClickCapture={event=>{if(suppressClick.current){event.preventDefault();event.stopPropagation();suppressClick.current=false;}}} onKeyDown={event=>{
      const delta:Record<string,[number,number]>={ArrowLeft:[35,0],ArrowRight:[-35,0],ArrowUp:[0,35],ArrowDown:[0,-35]};
      if(delta[event.key]){event.preventDefault();setView({...camera,x:camera.x+delta[event.key][0],y:camera.y+delta[event.key][1]});}
      if(event.key==="+"||event.key==="="||event.key==="-"){event.preventDefault();setView({...camera,zoom:camera.zoom+(event.key==="-"?-.2:.2)});}
    }}>
      <div className="map-world" data-zoom={camera.zoom.toFixed(2)} style={{transform:`translate(${camera.x}px,${camera.y}px) scale(${base*camera.zoom})`}}>
        <img className="map-world-art" src="/assets/food/pittsburgh-world.png" alt="" draggable={false}/>
        {pins.map(({meal,x,y})=>{
          const user=users.find(user=>user.id===meal.userId)||users[0];
          const Icon=meal.type==="homemade"?House:meal.type==="restaurant"?ForkKnife:MapPin;
          return <button key={meal.id} className={`world-pin ${selected?.id===meal.id?"selected":""}`} style={{left:x,top:y,"--pin-scale":1/(base*camera.zoom)} as CSSProperties} aria-label={`${author(meal)} · ${placeName(meal,lang)} · ${title(meal)}`} aria-pressed={selected?.id===meal.id} onClick={()=>select(meal.id)}>
            <span className="world-food"><img src={meal.photo||user.avatar} alt="" draggable={false}/><span className="world-kind"><Icon size={12} weight="fill"/></span></span>
            <PersonAvatar className="world-avatar" id={user.id}/>
            <span className="world-person">{author(meal)}<span>{time(meal)}</span></span>
            <span className="world-place">{placeName(meal,lang)}</span>
          </button>;
        })}
      </div>
    </div>
    <div className="map-top-controls"><div className="map-day-picker">{[0,-1].map(offset=><button key={offset} aria-pressed={dayOffset===offset} className={dayOffset===offset?"active":""} onClick={()=>{setDayOffset(offset);setSelectedId(null);setView({x:0,y:0,zoom:1});}}>{offset===0?t("Today","今天"):t("Yesterday","昨天")}</button>)}</div><span className="map-today-count"><span/>{friendCount} {scope==="friends"?t("friends ate","位朋友分享了餐食"):t("new faces","位新朋友分享")}</span></div>
    <div className="map-zoom-controls"><button aria-label={t("Zoom in","放大地图")} disabled={camera.zoom>=2.7} onClick={()=>setView({...camera,zoom:camera.zoom+.25})}><Plus size={20}/></button><button aria-label={t("Zoom out","缩小地图")} disabled={camera.zoom<=.82} onClick={()=>setView({...camera,zoom:camera.zoom-.25})}><Minus size={20}/></button><button aria-label={t("Recenter map","地图回到中心")} onClick={()=>setView({x:0,y:0,zoom:1})}><Crosshair size={20}/></button></div>
    <div className="map-bottom">
      {selected?<article className="map-moment-card"><button className="map-card-close" aria-label={t("Close meal preview","关闭餐食预览")} onClick={()=>setSelectedId(null)}><X size={17}/></button><button className="map-card-main" onClick={()=>onMeal(selected)}><img className="map-card-food" src={selected.photo||users.find(u=>u.id===selected.userId)?.avatar} alt=""/><span><small>{author(selected)} · {time(selected)}</small><strong>{title(selected)}</strong><em>{selected.type==="homemade"?<House size={13}/>:<MapPin size={13}/>} {placeName(selected,lang)}</em><span className="map-card-cta">{t("Open food story","查看这一餐")}<ArrowUpRight size={14}/></span></span></button><button className="map-all-posts" onClick={()=>onPerson(selected.userId)}>{t(`See all ${author(selected)}’s posts`,`查看${author(selected)}的全部动态`)}<CaretRight size={14}/></button></article>:dayMeals.length===0?<button className="map-invitation" onClick={onFeed}><strong>{t("No meals here today","今天还没有餐食分享")}</strong><span>{t("Browse more food stories","浏览更多餐食动态")}<CaretRight size={14}/></span></button>:null}
      <Carousel className="map-friend-rail" contentClassName="map-friend-track" ariaLabel={t("Friends on the map","地图上的朋友")}>
        {users.filter(u=>dayMeals.some(m=>m.userId===u.id)).map(user=>{
          const userMeals=dayMeals.filter(m=>m.userId===user.id); return <button className={`map-friend ${selected?.userId===user.id?"active":""}`} key={user.id} onClick={()=>select(userMeals[0].id,true)}><span><PersonAvatar id={user.id} className="rail-avatar"/>{userMeals.length>1&&<b>{userMeals.length}</b>}</span><small>{user.id===currentUserId?t("You","你"):user.name.split(" ")[0]}</small></button>;
        })}
      </Carousel>
    </div>
  </section>;
}

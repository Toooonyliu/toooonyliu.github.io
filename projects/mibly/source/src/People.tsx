import { useState } from "react";
import { Check, Clock, MagnifyingGlass, UserCircle, UserPlus, X, EyeSlash } from "@phosphor-icons/react";
import { KeyboardInput } from "./mobile";
import { users, type Lang } from "./data";
import { SELF, mutualFriends, relationship, type Network, updateConnection } from "./socialGraph";

export function PersonAvatar({id,className="avatar"}:{id:string;className?:string}) {
  const person=users.find(user=>user.id===id);
  return person?.avatar?<img className={className} src={person.avatar} alt={person.name} draggable={false}/>:<span className={`${className} default-avatar`} role="img" aria-label={person?.name||"Profile"}><UserCircle size={32} weight="duotone"/></span>;
}
export function ConnectionButton({id,network,onChange,lang}:{id:string;network:Network;onChange:(value:Network)=>void;lang:Lang}) {
  const t=(en:string,zh:string)=>lang==="zh"?zh:en,status=relationship(id,network);
  if(status==="self")return null;
  if(status==="friend")return <span className="connection-state"><Check size={14}/>{t("Friends","已是好友")}</span>;
  return <div className="connection-buttons"><button className={`connection-button ${status==="pending"?"pending":""}`} onClick={()=>onChange(updateConnection(network,id,status==="incoming"?"accept":status==="pending"?"cancel":"request"))}>
    {status==="pending"?<Clock size={15}/>:<UserPlus size={15}/>}{status==="incoming"?t("Accept","接受"):status==="pending"?t("Cancel request","撤回申请"):t("Add friend","加为好友")}
  </button>{status==="incoming"&&<button className="connection-dismiss" aria-label={t("Decline request from ","拒绝申请：")+users.find(u=>u.id===id)?.name} onClick={()=>onChange(updateConnection(network,id,"decline"))}><X size={18}/></button>}</div>;
}
export function MutualLabel({id,network,lang}:{id:string;network:Network;lang:Lang}) {
  const names=mutualFriends(id,network).map(id=>users.find(u=>u.id===id)?.name.split(" ")[0]).join(" & ");
  return <span className="mutual-label">{names?(lang==="zh"?`通过 ${names} 认识`:`Through ${names}`):(lang==="zh"?"Mibly 演示用户":"Mibly demo profile")}</span>;
}
export function PeopleCenter({network,onChange,lang,onPosts}:{network:Network;onChange:(value:Network)=>void;lang:Lang;onPosts:(id:string)=>void}) {
  const [search,setSearch]=useState("");
  const [view,setView]=useState<"discover"|"requests"|"friends">("discover");
  const t=(en:string,zh:string)=>lang==="zh"?zh:en;
  const filtered=users.filter(user=>user.id!==SELF&&user.name.toLowerCase().includes(search.trim().replace(/^@/,"").toLowerCase())&&(search.trim()|| (view==="friends"?network.friends.includes(user.id):view==="requests"?network.incoming.includes(user.id)||network.outgoing.includes(user.id):!network.friends.includes(user.id))));
  return <div className="people-center">
    <p className="people-intro">{t("A bigger table starts with a familiar face.","从熟悉的人开始，把餐桌变大一点。")}</p>
    <label className="people-search"><MagnifyingGlass size={21}/><KeyboardInput aria-label={t("Search people","搜索用户")} placeholder={t("Search by name…","输入名字搜索…")} value={search} onChange={event=>setSearch(event.target.value)}/></label>
    <div className="people-tabs">{(["discover","requests","friends"] as const).map(value=><button key={value} aria-pressed={view===value} className={view===value?"active":""} onClick={()=>setView(value)}>{value==="discover"?t("Discover","发现"):value==="requests"?`${t("Requests","申请")} ${network.incoming.length+network.outgoing.length}`:`${t("My friends","我的好友")} ${network.friends.length}`}</button>)}</div>
    {filtered.map(person=><article className="person-row" key={person.id}>
      <div className="person-identity"><PersonAvatar id={person.id}/><div><strong>{person.name}</strong>{network.friends.includes(person.id)?<small>{t("Your friend","你的好友")}</small>:<MutualLabel id={person.id} network={network} lang={lang}/>}</div></div>
      {network.outgoing.includes(person.id)&&<p className="request-note">{t("Request pending. Friends-only posts stay private until accepted.","申请待接受，对方的好友专属动态暂不可见。")}</p>}
      {network.incoming.includes(person.id)&&<p className="request-note">{t("Sent you a friend request · demo","向你发送了好友申请 · 演示")}</p>}
      <div className="person-actions"><ConnectionButton id={person.id} network={network} onChange={onChange} lang={lang}/><button className="person-posts" onClick={()=>onPosts(person.id)}>{t("View posts","查看动态")}</button></div>
      {network.hidden.includes(person.id)&&<button className="person-unhide" onClick={()=>onChange(updateConnection(network,person.id,"unhide"))}><EyeSlash size={14}/>{t("Hidden · Show posts again","已隐藏 · 重新显示动态")}</button>}
    </article>)}
    {!filtered.length&&<div className="people-empty"><UserPlus size={32}/><strong>{search?t("No matching person","没有找到这个人"):view==="requests"?t("No pending requests","暂时没有待处理的申请"):t("Your circle can start here","从这里认识新朋友")}</strong><p>{t("Try a different name or browse Discover.","试试其他名字，或浏览「发现」。")}</p></div>}
    <p className="people-demo-note">{t("Demo directory · requests are saved on this device, not sent to real people. Accept Priya’s sample request to try the full flow.","演示用户目录 · 申请仅保存在本机，不会发送给真人。可接受 Priya 的示例申请体验完整流程。")}</p>
  </div>;
}

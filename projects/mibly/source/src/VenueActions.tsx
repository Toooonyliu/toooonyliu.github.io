import { useState } from "react";
import { ArrowUpRight, Copy, DownloadSimple, MapPin, NavigationArrow, ShareNetwork } from "@phosphor-icons/react";
import { KeyboardTextarea } from "./mobile";
import type { Venue, Lang } from "./data";

export function VenueActions({venue,lang,compact=false}:{venue:Venue;lang:Lang;compact?:boolean}) {
  const [status,setStatus]=useState("");
  const [manual,setManual]=useState("");
  const [busy,setBusy]=useState(false);
  const t=(en:string,zh:string)=>lang==="zh"?zh:en;
  const text=`${venue.name}\n${venue.address}\n${venue.url}`;
  const copy=async(value:string)=>{
    try {await navigator.clipboard.writeText(value);setManual("");setStatus(t("Copied. Ready to paste.","已复制，可以直接粘贴。"));}
    catch {setManual(value);setStatus(t("Clipboard unavailable. Select and copy the text below.","无法自动复制，请选中下方文字手动复制。"));}
  };
  const share=async()=>{
    if(busy)return;
    if(!navigator.share){await copy(text);return;}
    setBusy(true);
    try{await navigator.share({title:venue.name,text:`${venue.name}\n${venue.address}`,url:venue.url});setStatus(t("Returned from sharing.","已返回餐厅卡片。"));}
    catch(error){if(error instanceof Error&&error.name==="AbortError")setStatus(t("Sharing canceled. Nothing else was sent or copied.","已取消分享，没有另外发送或复制内容。"));else {setManual(text);setStatus(t("Sharing unavailable. Copy the restaurant details below.","分享暂不可用，可复制下方餐厅信息。"));}}
    finally{setBusy(false);}
  };
  const exportAddress=()=>{
    const url=URL.createObjectURL(new Blob([text+"\n"],{type:"text/plain;charset=utf-8"}));
    const link=document.createElement("a");link.href=url;link.download=`${venue.id}-address.txt`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    setStatus(t("Address file download started.","已开始下载地址文件。"));
  };
  return <section className={`venue-actions-card ${compact?"compact":""}`} aria-label={t("Restaurant address and sharing","餐厅地址与分享")}>
    <div className="venue-address"><MapPin size={21}/><div><strong>{venue.name}</strong><p>{venue.address}</p></div></div>
    <div className="venue-primary-actions"><a href={venue.url} target="_blank" rel="noreferrer" className="maps-open"><MapPin size={18}/>{t("Open Google Maps","打开 Google Maps")}<ArrowUpRight size={15}/></a><button disabled={busy} onClick={()=>void share()}><ShareNetwork size={18}/>{t("Share restaurant","分享餐厅")}</button></div>
    <div className="venue-utility-actions"><button onClick={()=>void copy(venue.address)}><Copy size={17}/>{t("Copy address","复制地址")}</button><a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(venue.name+" "+venue.address)}`} target="_blank" rel="noreferrer"><NavigationArrow size={17}/>{t("Directions","路线")}</a>{!compact&&<button onClick={exportAddress}><DownloadSimple size={17}/>{t("Export address","导出地址")}</button>}</div>
    {status&&<p className="venue-action-status" role="status">{status}</p>}
    {manual&&<KeyboardTextarea aria-label={t("Copy restaurant details manually","手动复制餐厅信息")} readOnly value={manual} onFocus={event=>event.currentTarget.select()}/>}
    {!compact&&<p className="venue-share-note">{t("Shares the restaurant name, address and Google Maps link—not anyone’s post or home location.","仅分享餐厅名称、地址和 Google Maps 链接，不包含任何人的动态或住家位置。")}</p>}
  </section>;
}

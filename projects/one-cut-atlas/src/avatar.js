/** Palette customization is deterministic locally; semantic recognition is optional. */
export const DEFAULT_AVATAR={hair:'#28252c',skin:'#bd8d73',outfit:'#5d7779',accent:'#c9b587'};
const hex=value=>typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value);
const rgb=value=>[1,3,5].map(index=>parseInt(value.slice(index,index+2),16));
const mix=(a,b,t)=>'#'+rgb(a).map((value,index)=>Math.round(value*(1-t)+rgb(b)[index]*t).toString(16).padStart(2,'0')).join('');
export function validateAvatar(value={}){
 const palette=Object.fromEntries(Object.entries(DEFAULT_AVATAR).map(([key,fallback])=>[key,hex(value.palette?.[key])?value.palette[key]:fallback]));
 return {target:value.target==='player'?'player':'opponent',style:['kendo','suit','cowboy','traveler'].includes(value.style)?value.style:'traveler',palette,source:value.source==='ai'?'ai':'local',summary:typeof value.summary==='string'?value.summary.slice(0,240):'Photo colors. Yours to tune.'};
}
export function avatarFromPalette(palette,target='opponent',style='traveler'){
 const colors=Object.values(palette).filter(hex);
 const darkest=[...colors].sort((a,b)=>rgb(a).reduce((s,v)=>s+v,0)-rgb(b).reduce((s,v)=>s+v,0))[0]||DEFAULT_AVATAR.hair;
 return validateAvatar({target,style,palette:{hair:mix(darkest,'#151821',.4),skin:DEFAULT_AVATAR.skin,outfit:mix(palette.sky||DEFAULT_AVATAR.outfit,palette.accent||DEFAULT_AVATAR.accent,.3),accent:palette.accent},source:'local',summary:'Photo colors applied. Tune your fighter.'});
}
function avatarApiBase(){
 const value=globalThis.ONE_CUT_API_BASE||globalThis.document?.querySelector('meta[name="one-cut-api-base"]')?.content;
 return typeof value==='string'?value.trim().replace(/\/$/,''):'';
}
/** A static build must not advertise an API that has not been connected. */
export function hasAvatarApi(){return Boolean(avatarApiBase());}
export async function requestAvatar(image,{endpoint}={}){
 const base=avatarApiBase();
 if(!endpoint&&!base)throw new Error('AI is not connected. Photo colors still work.');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25000);
 try{
  const response=await fetch(endpoint||`${base}/api/analyze-avatar`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image}),signal:controller.signal});
  let data;try{data=await response.json();}catch{throw new Error('AI is unavailable. Photo colors are kept.');}
  if(!response.ok)throw new Error(data.error||'AI is unavailable. Photo colors are kept.');
  const value=data.avatar;
  if(!value||!['kendo','suit','cowboy','traveler'].includes(value.style)||!Object.keys(DEFAULT_AVATAR).every(key=>hex(value.palette?.[key])))throw new Error('AI returned an unsupported fighter. Photo colors are kept.');
  return validateAvatar({...value,source:'ai'});
 }catch(error){if(error.name==='AbortError')throw new Error('AI timed out. Your fighter is kept.');throw error;}finally{clearTimeout(timer);}
}

/** Palette customization is deterministic locally; semantic recognition is optional. */
export const DEFAULT_AVATAR={hair:'#28252c',skin:'#bd8d73',outfit:'#5d7779',accent:'#c9b587'};
const hex=value=>typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value);
const rgb=value=>[1,3,5].map(index=>parseInt(value.slice(index,index+2),16));
const mix=(a,b,t)=>'#'+rgb(a).map((value,index)=>Math.round(value*(1-t)+rgb(b)[index]*t).toString(16).padStart(2,'0')).join('');
export function validateAvatar(value={}){
 const palette=Object.fromEntries(Object.entries(DEFAULT_AVATAR).map(([key,fallback])=>[key,hex(value.palette?.[key])?value.palette[key]:fallback]));
 return {target:value.target==='player'?'player':'opponent',style:['kendo','suit','cowboy','traveler'].includes(value.style)?value.style:'traveler',palette,source:value.source==='ai'?'ai':'local',summary:typeof value.summary==='string'?value.summary.slice(0,240):'照片配色映射，可手动微调。'};
}
export function avatarFromPalette(palette,target='opponent',style='traveler'){
 const colors=Object.values(palette).filter(hex);
 const darkest=[...colors].sort((a,b)=>rgb(a).reduce((s,v)=>s+v,0)-rgb(b).reduce((s,v)=>s+v,0))[0]||DEFAULT_AVATAR.hair;
 return validateAvatar({target,style,palette:{hair:mix(darkest,'#151821',.4),skin:DEFAULT_AVATAR.skin,outfit:mix(palette.sky||DEFAULT_AVATAR.outfit,palette.accent||DEFAULT_AVATAR.accent,.3),accent:palette.accent},source:'local',summary:'已提取照片颜色并映射到角色；肤色与轮廓可手动修正。'});
}
export async function requestAvatar(image,{endpoint}={}){
 const base=globalThis.ONE_CUT_API_BASE||globalThis.document?.querySelector('meta[name="one-cut-api-base"]')?.content||'';
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25000);
 try{
  const response=await fetch(endpoint||`${base.replace(/\/$/,'')}/api/analyze-avatar`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image}),signal:controller.signal});
  let data;try{data=await response.json();}catch{throw new Error('AI 服务尚未接入；本地角色配色仍可使用。');}
  if(!response.ok)throw new Error(data.error||'AI 暂时不可用，本地配色已保留。');
  const value=data.avatar;
  if(!value||!['kendo','suit','cowboy','traveler'].includes(value.style)||!Object.keys(DEFAULT_AVATAR).every(key=>hex(value.palette?.[key])))throw new Error('AI 返回的角色配色无法使用，本地配色已保留。');
  return validateAvatar({...value,source:'ai'});
 }catch(error){if(error.name==='AbortError')throw new Error('AI 分析超时；本地角色配置已保留。');throw error;}finally{clearTimeout(timer);}
}

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
export function apiBase(){
 const value=globalThis.ONE_CUT_API_BASE||globalThis.document?.querySelector('meta[name="one-cut-api-base"]')?.content;
 if(typeof value!=='string'||!value.trim())return '';
 try{
  const base=new URL(value.trim());
  const local=['localhost','127.0.0.1','[::1]'].includes(base.hostname);
  if(base.username||base.password||base.search||base.hash||(base.protocol!=='https:'&&!(base.protocol==='http:'&&local)))return '';
  return base.href.replace(/\/+$/,'');
 }catch{return '';}
}
/** A static build must not advertise an API that has not been connected. */
export function hasAvatarApi(){return Boolean(apiBase());}
const timeoutValue=(value,fallback)=>Number.isFinite(value)&&value>0?Math.min(value,120000):fallback;
const publicError=(data,fallback)=>typeof data?.error==='string'&&data.error.trim()?data.error.slice(0,240):fallback;
const canceled=()=>Object.assign(new Error('AI canceled. Your fighter is kept.'),{name:'AbortError'});
/** Wake a sleeping host before sending a photo. Paid POST requests are never retried.
 * Explicit endpoint adapters skip warmup unless a healthEndpoint is provided.
 * Timeouts/fetcher are injectable for tests; no provider credential belongs here.
 */
export async function requestAvatar(image,{endpoint,healthEndpoint,signal,onStatus,fetcher=globalThis.fetch,startupTimeoutMs=85000,analysisTimeoutMs=30000}={}){
 const base=apiBase();
 if(!endpoint&&!base)throw new Error('AI is not connected. Photo colors still work.');
 if(signal?.aborted)throw canceled();
 const controller=new AbortController();
 let timer,phase='startup',timedOut=false;
 const cancel=()=>controller.abort();
 signal?.addEventListener('abort',cancel,{once:true});
 const startTimer=duration=>{clearTimeout(timer);timer=setTimeout(()=>{timedOut=true;controller.abort();},duration);};
 const readJson=async response=>{try{return await response.json();}catch{throw new Error('AI is unavailable. Photo colors are kept.');}};
 try{
  if(healthEndpoint||!endpoint){
   onStatus?.('waking');startTimer(timeoutValue(startupTimeoutMs,85000));
   const response=await fetcher(healthEndpoint||`${base}/health`,{method:'GET',cache:'no-store',signal:controller.signal});
   const health=await readJson(response);
   if(!response.ok)throw new Error(publicError(health,'AI is unavailable. Photo colors are kept.'));
   if(health?.avatarAnalysisConfigured!==true)throw new Error('AI is not configured yet. Photo colors still work.');
  }
  if(controller.signal.aborted)throw canceled();
  phase='analysis';onStatus?.('analyzing');startTimer(timeoutValue(analysisTimeoutMs,30000));
  const response=await fetcher(endpoint||`${base}/api/analyze-avatar`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image}),signal:controller.signal});
  const data=await readJson(response);
  if(!response.ok)throw new Error(publicError(data,'AI is unavailable. Photo colors are kept.'));
  const value=data?.avatar;
  if(!value||!['kendo','suit','cowboy','traveler'].includes(value.style)||!Object.keys(DEFAULT_AVATAR).every(key=>hex(value.palette?.[key])))throw new Error('AI returned an unsupported fighter. Photo colors are kept.');
  return validateAvatar({...value,source:'ai'});
 }catch(error){
  if(controller.signal.aborted||error.name==='AbortError'){
   if(timedOut)throw new Error(phase==='startup'?'AI startup timed out. Your fighter is kept.':'AI timed out. Your fighter is kept.');
   throw canceled();
  }
  if(error instanceof TypeError)throw new Error('Could not connect to AI. Photo colors are kept.');
  throw error;
 }finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);}
}

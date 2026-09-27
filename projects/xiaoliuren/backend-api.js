import {BACKEND_URL} from './backend-config.js';

const cache=new Map(),pending=new Map();
const knownErrors=new Set(['date','timeError','dst','input','format','network']);

async function request(path,{body,fetcher=fetch,timeout=75000,baseUrl=BACKEND_URL}={}){
  if(!baseUrl)throw new Error('backendConfig');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
  try{
    const response=await fetcher(baseUrl.replace(/\/$/,'')+path,{
      method:body?'POST':'GET',signal:controller.signal,
      ...(body?{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})
    });
    let data;try{data=await response.json();}catch{throw new Error('format');}
    if(!response.ok)throw new Error(knownErrors.has(data?.error?.code)?data.error.code:'network');
    return data;
  }catch(error){throw new Error(knownErrors.has(error.message)?error.message:'network');}
  finally{clearTimeout(timer);}
}

function validateLunar(lunar,date){
  if(!lunar||lunar.date!==date||!Number.isInteger(lunar.month)||lunar.month<1||lunar.month>12||
     !Number.isInteger(lunar.day)||lunar.day<1||lunar.day>30||typeof lunar.text!=='string'||
     typeof lunar.year!=='string'||typeof lunar.isLeap!=='boolean')throw new Error('format');
  return lunar;
}

export async function fetchLunar(date,options={}){
  const key=(options.baseUrl??BACKEND_URL)+'|'+date;
  if(cache.has(key))return cache.get(key);
  if(pending.has(key))return pending.get(key);
  const task=request('/api/calendar?date='+encodeURIComponent(date),options)
    .then(data=>{const lunar=validateLunar(data,date);cache.set(key,lunar);return lunar;})
    .finally(()=>pending.delete(key));
  pending.set(key,task);return task;
}

export async function fetchReading(clock,options={}){
  // Explicit allowlist: question text and account credentials are never sent here.
  const body={date:clock.date,clock:clock.clock,timeZone:clock.timeZone};
  const data=await request('/api/reading',{...options,body});
  validateLunar(data?.lunar,clock.date);
  const palace=n=>Number.isInteger(n)&&n>=0&&n<6;
  if(data.date!==clock.date||data.clock!==clock.clock||data.timeZone!==clock.timeZone||
     !Number.isInteger(data.hourIndex)||data.hourIndex<1||data.hourIndex>12||
     ![data.monthPalace,data.dayPalace,data.timePalace].every(palace)||
     !Array.isArray(data.stages)||data.stages.length!==3)throw new Error('format');
  const starts=[0,data.monthPalace,data.dayPalace],ends=[data.monthPalace,data.dayPalace,data.timePalace];
  const counts=[data.lunar.month,data.lunar.day,data.hourIndex];
  if(data.stages.some((s,i)=>!s||s.start!==starts[i]||s.end!==ends[i]||s.count!==counts[i]))throw new Error('format');
  return data;
}

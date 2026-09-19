export const NAMES = ['大安','留连','速喜','赤口','小吉','空亡'];
export const BRANCHES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
export const API_URL = 'https://data.weather.gov.hk/weatherAPI/opendata/lunardate.php';
const numbers = {'一':1,'二':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9,'十':10,'十一':11,'十二':12,'正':1,'冬':11,'腊':12,'臘':12};
export function parseLunar(text) {
  if(typeof text!=='string') throw new Error('format');
  const match=text.trim().match(/^([閏闰]?)(正|冬|腊|臘|十一|十二|十|[一二三四五六七八九])月(.+)$/);
  if(!match) throw new Error('format');
  const dayText=match[3];
  let day=numbers[dayText];
  if(dayText.startsWith('初')) day=numbers[dayText.slice(1)];
  else if(dayText.startsWith('十')&&dayText.length===2) day=10+numbers[dayText[1]];
  else if(dayText==='二十'||dayText==='廿') day=20;
  else if(dayText.startsWith('廿')) day=20+numbers[dayText.slice(1)];
  else if(dayText.startsWith('二十')&&dayText.length===3) day=20+numbers[dayText[2]];
  else if(dayText==='三十') day=30;
  if(!Number.isInteger(day)||day<1||day>30) throw new Error('format');
  return {month:numbers[match[2]],day,isLeap:!!match[1],text};
}
export function shichen(hour) {
  if(!Number.isInteger(hour)||hour<0||hour>23) throw new Error('time');
  return Math.floor(((hour+1)%24)/2)+1;
}
export function calculate(month,day,hourIndex) {
  for(const [n,max] of [[month,12],[day,30],[hourIndex,12]]) if(!Number.isInteger(n)||n<1||n>max) throw new Error('input');
  const monthPalace=(month-1)%6,dayPalace=(monthPalace+day-1)%6,timePalace=(dayPalace+hourIndex-1)%6;
  return {monthPalace,dayPalace,timePalace,stages:[{start:0,count:month,end:monthPalace},{start:monthPalace,count:day,end:dayPalace},{start:dayPalace,count:hourIndex,end:timePalace}]};
}
export function timeAt(instant,timeZone) {
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(instant).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
  return {date:`${parts.year}-${parts.month}-${parts.day}`,clock:`${parts.hour}:${parts.minute}`,hour:Number(parts.hour),timeZone};
}
export function validateDate(date,currentYear=new Date().getUTCFullYear()) {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('date');
  const d=new Date(date+'T12:00:00Z');
  if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==date||date<'2023-01-01'||Number(date.slice(0,4))>currentYear+2) throw new Error('date');
  return date;
}
const lunarCache=new Map();
export async function fetchLunar(date,{fetcher=fetch,timeout=10000}={}) {
  validateDate(date);
  if(lunarCache.has(date)) return lunarCache.get(date);
  const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),timeout);
  try {
    const response=await fetcher(`${API_URL}?date=${encodeURIComponent(date)}`,{signal:controller.signal});
    if(!response.ok) throw new Error('network');
    const data=await response.json();
    const parsed=parseLunar(data.LunarDate);
    const result={...parsed,year:typeof data.LunarYear==='string'?data.LunarYear:'',date};
    lunarCache.set(date,result);
    return result;
  } catch(error) {throw new Error(error.message==='format'?'format':'network');}
  finally {clearTimeout(timer);}
}

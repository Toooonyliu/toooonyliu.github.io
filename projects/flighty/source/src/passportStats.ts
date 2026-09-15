import {airports,totals,type Flight} from './domain.ts';

export const countryInfo:Record<string,{name:string;region:string}>={us:{name:'United States',region:'North America'},cn:{name:'China',region:'Asia'},hk:{name:'Hong Kong',region:'Asia'},jp:{name:'Japan',region:'Asia'},gb:{name:'United Kingdom',region:'Europe'}};
export const countryOf=(code:string)=>airports[code].country??'us';
export const localDay=(f:Flight)=>new Intl.DateTimeFormat('en-CA',{timeZone:airports[f.from].zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(f.departure));
export type Ranking={key:string;count:number;km:number;estimated:boolean;flights:Flight[]};
export function rankFlights(fs:Flight[],key:(f:Flight)=>string):Ranking[]{return [...new Set(fs.map(key))].map(k=>{const flights=fs.filter(f=>key(f)===k);return {key:k,count:flights.length,km:flights.reduce((n,f)=>n+f.km,0),estimated:flights.some(f=>f.distanceEstimated),flights};}).sort((a,b)=>b.count-a.count||a.key.localeCompare(b.key));}
export function passportStats(records:Flight[]){
 const fs=records.filter(f=>f.status==='flown'),base=totals(fs),known=fs.filter(f=>f.minutes!==null);
 const countries=[...new Set(fs.flatMap(f=>[countryOf(f.from),countryOf(f.to)]))].map(key=>({key,...countryInfo[key],count:fs.filter(f=>countryOf(f.from)===key||countryOf(f.to)===key).length})).sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name));
 const events=fs.flatMap(f=>[{code:f.from,at:Date.parse(f.departure),type:'departure',flight:f},{code:f.to,at:Date.parse(f.arrival),type:'arrival',flight:f}]);
 const airportVisits=[...new Set(events.map(e=>e.code))].map(key=>{const rows=events.filter(e=>e.code===key);let count=rows.length;const arrivals=rows.filter(e=>e.type==='arrival'&&!e.flight.dateOnly&&Number.isFinite(e.at)).sort((a,b)=>a.at-b.at);const departures=rows.filter(e=>e.type==='departure'&&!e.flight.dateOnly).sort((a,b)=>a.at-b.at);const used=new Set<string>();for(const a of arrivals){const d=departures.find(d=>!used.has(d.flight.id)&&d.flight.id!==a.flight.id&&d.at>=a.at&&d.at-a.at<8*3600000);if(d){count--;used.add(d.flight.id);}}return {key,count,km:0,estimated:false,flights:fs.filter(f=>f.from===key||f.to===key)};}).sort((a,b)=>b.count-a.count||a.key.localeCompare(b.key));
 const domestic=fs.filter(f=>countryOf(f.from)===countryOf(f.to)).length;
 return {...base,fs,countries,airportVisits,domestic,international:fs.length-domestic,longHaul:fs.filter(f=>f.km>=4000).length,airlines:rankFlights(fs,f=>f.carrier),routes:rankFlights(fs,f=>`${f.from}–${f.to}`),averageKm:base.count?Math.round(base.km/base.count):0,averageMinutes:known.length?Math.round(base.minutes/known.length):null,knownTimeCount:known.length,shortestKm:[...fs].sort((a,b)=>a.km-b.km),longestKm:[...fs].sort((a,b)=>b.km-a.km),shortestTime:[...known].sort((a,b)=>a.minutes!-b.minutes!),longestTime:[...known].sort((a,b)=>b.minutes!-a.minutes!)};
}
export function flightHistogram(records:Flight[],mode:'Year'|'Month'|'Weekday'){
 const fs=records.filter(f=>f.status==='flown');const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],weekdays=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
 const key=(f:Flight)=>mode==='Year'?localDay(f).slice(0,4):mode==='Month'?months[Number(localDay(f).slice(5,7))-1]:new Intl.DateTimeFormat('en',{weekday:'short',timeZone:airports[f.from].zone}).format(new Date(f.departure));
 const keys=mode==='Year'?[...new Set(fs.map(key))].sort():mode==='Month'?months:weekdays;return keys.map(label=>({label,count:fs.filter(f=>key(f)===label).length}));
}
export function tripInsights(records:Flight[]){
 const fs=records.filter(f=>f.status!=='canceled').sort((a,b)=>Date.parse(a.departure)-Date.parse(b.departure));const stats=passportStats(fs);
 const first=fs[0],last=fs.at(-1);const start=first?localDay(first):'';const end=last?new Intl.DateTimeFormat('en-CA',{timeZone:airports[first.from].zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(last.arrival||last.departure)):'';
 return {...stats,days:first?Math.max(1,Math.round((Date.parse(end)-Date.parse(start))/86400000)+1):0,planned:fs.filter(f=>f.status==='planned').length,canceled:records.filter(f=>f.status==='canceled').length,surfaceGaps:fs.filter((f,i)=>i>0&&fs[i-1].to!==f.from).length,earthPercent:stats.km/40075*100};
}

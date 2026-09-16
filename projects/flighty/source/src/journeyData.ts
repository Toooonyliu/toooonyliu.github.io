import {airports,type Flight} from './domain.ts';
export function journeyEvent(f:Flight,kind:'departure'|'arrival'){
 const airport=kind==='departure'?f.from:f.to,iso=f[kind];
 const known=!!iso&&Number.isFinite(Date.parse(iso));
 const day=known?new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:airports[airport].zone}).format(new Date(iso)):'';
 const clock=known&&!f.dateOnly?new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit',timeZoneName:'short',timeZone:airports[airport].zone}).format(new Date(iso)):'Time unavailable';
 return {airport,day:day||'Date unavailable',clock,known:known&&!f.dateOnly,label:f.status==='planned'?'Scheduled':f.dateOnly?'Date recorded':f.source==='reference'?'Recorded gate time':f.source==='manual'?'Entered time':f.source==='live'?'Reported time':'Sample time'};
}
export function journeyFor(records:Flight[]){
 const flights=records.filter(f=>f.status!=='canceled').sort((a,b)=>Date.parse(a.departure)-Date.parse(b.departure));
 return {flights,first:flights[0],last:flights.at(-1),canceled:records.filter(f=>f.status==='canceled').length,gaps:flights.flatMap((f,i)=>i&&flights[i-1].to!==f.from?[{before:f.id,from:flights[i-1].to,to:f.from}]:[])};
}

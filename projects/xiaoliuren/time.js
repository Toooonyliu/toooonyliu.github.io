import {timeAt,validateDate} from './core.js';

export function localStamp(date,zone){const p=timeAt(date,zone);return p.date+'T'+p.clock;}
function offsetMinutes(date,zone){const p=timeAt(date,zone);return Math.round((Date.parse(p.date+'T'+p.clock+':00Z')-Math.floor(date.getTime()/60000)*60000)/60000);}
export function offsetLabel(date,zone){const m=offsetMinutes(date,zone);return 'UTC'+(m<0?'−':'+')+String(Math.floor(Math.abs(m)/60)).padStart(2,'0')+':'+String(Math.abs(m)%60).padStart(2,'0');}
export function resolveWallTime(value,zone){
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))throw Error('timeError');
 validateDate(value.slice(0,10));
 const [hour,minute]=value.slice(11).split(':').map(Number);
 if(hour>23||minute>59)throw Error('timeError');
 const wall=Date.parse(value+':00Z');
 const offsets=[...new Set([-36,0,36].map(h=>offsetMinutes(new Date(wall+h*3600000),zone)))];
 const matches=offsets.map(m=>new Date(wall-m*60000)).filter(d=>localStamp(d,zone)===value).sort((a,b)=>a-b);
 if(!matches.length)throw Error('dst');
 return matches[0]; // Choose the earlier occurrence when daylight-saving time repeats an hour.
}

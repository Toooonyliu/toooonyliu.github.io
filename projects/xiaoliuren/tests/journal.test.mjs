import test from 'node:test';
import assert from 'node:assert/strict';
import {calculate} from '../core.js';
import {JOURNAL_KEY,readJournal,writeJournal,recordReading,questionKey} from '../journal.js';
const reading=()=>recordReading({question:'Will my interview go well?',date:'2026-09-20',clock:'12:00',hour:12,timeZone:'America/New_York',lunar:{month:8,day:10,text:'八月初十'},hourIndex:7,...calculate(8,10,7),category:'work',reflection:['原建议','Original reflection']},new Date('2026-09-20T16:00:00Z'));
test('history survives a storage round trip with original time and reflection intact',()=>{
 const map=new Map(),storage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)},r=reading();
 r.review={outcome:'partial',actualDate:'2026-09-28',note:'A later reply than expected.'};
 assert.equal(writeJournal(storage,[r]),true);
 assert.deepEqual(readJournal(storage),{entries:[r],error:false});
 assert.equal(questionKey('  WILL my Interview go well? '),questionKey(r.question));
 assert.equal(JSON.parse(map.get(JOURNAL_KEY)).version,1);
});
test('blocked storage and malformed records are reported rather than silently overwritten',()=>{
 const blocked={getItem(){throw new Error('blocked');},setItem(){throw new Error('quota');}};
 assert.equal(readJournal(blocked).error,true);assert.equal(writeJournal(blocked,[reading()]),false);
 let raw='{bad';const storage={getItem:()=>raw,setItem:(k,v)=>{raw=v;}};
 assert.equal(readJournal(storage).error,true);assert.equal(raw,'{bad');
 assert.equal(writeJournal(storage,[{...reading(),timePalace:9}]),false);
 raw=JSON.stringify({version:1,entries:[{...reading(),stages:[]}]});assert.equal(readJournal(storage).error,true);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {calculate,parseLunar,shichen,timeAt,validateDate,fetchLunar} from '../core.js';
test('worked examples match independent hand counts',()=>{
  assert.deepEqual(calculate(3,3,5).stages.map(s=>s.end),[2,4,2]);
  assert.deepEqual(calculate(4,5,11).stages.map(s=>s.end),[3,1,5]);
  assert.equal(calculate(1,1,1).timePalace,0);
  assert.equal(calculate(12,30,12).timePalace,3);
});
test('all valid inputs agree with inclusive iterative counting',()=>{
  for(let month=1;month<=12;month++)for(let day=1;day<=30;day++)for(let hour=1;hour<=12;hour++){
    let position=0;
    for(const count of [month,day,hour])for(let step=1;step<count;step++)position=(position+1)%6;
    assert.equal(calculate(month,day,hour).timePalace,position);
  }
});
test('lunar parser accepts official Chinese formats, including leap months',()=>{
  assert.deepEqual(parseLunar('八月初九'),{month:8,day:9,isLeap:false,text:'八月初九'});
  assert.equal(parseLunar('閏六月初一').isLeap,true);
  assert.equal(parseLunar('闰六月十一').day,11);
  assert.equal(parseLunar('正月廿一').day,21);
  assert.equal(parseLunar('十一月二十九').day,29);
  assert.equal(parseLunar('十二月三十').day,30);
  assert.equal(parseLunar('冬月二十').month,11);
  for(const input of ['',null,'八月三十一','not a lunar date'])assert.throws(()=>parseLunar(input));
});
test('time branches at midnight and two-hour boundaries',()=>{
  for(const [hour,index]of [[23,1],[0,1],[1,2],[2,2],[3,3],[7,5],[19,11],[21,12],[22,12]])assert.equal(shichen(hour),index);
  assert.throws(()=>shichen(24));
});
test('timezone conversion handles date boundaries and daylight saving',()=>{
  const instant=new Date('2026-09-20T03:30:00Z');
  assert.equal(timeAt(instant,'America/New_York').date,'2026-09-19');
  assert.equal(timeAt(instant,'America/New_York').hour,23);
  assert.equal(timeAt(instant,'Asia/Shanghai').date,'2026-09-20');
  assert.equal(timeAt(new Date('2026-01-01T12:00Z'),'America/New_York').hour,7);
});
test('invalid/out-of-range dates and algorithm inputs fail intentionally',()=>{
  for(const date of ['2026-02-30','2026-13-01','2022-12-31','2029-01-01','garbage'])assert.throws(()=>validateDate(date,2026));
  assert.equal(validateDate('2024-02-29',2026),'2024-02-29');
  assert.throws(()=>calculate(0,1,1));assert.throws(()=>calculate(1,31,1));
});
test('API response parsed and cached; failed requests are not cached',async()=>{
  let calls=0;
  const fetcher=async(url)=>{calls++;assert.ok(url.endsWith('date=2026-09-19'));return{ok:true,json:async()=>({LunarYear:'丙午年，馬',LunarDate:'八月初九'})};};
  const first=await fetchLunar('2026-09-19',{fetcher});
  assert.equal(first.day,9);await fetchLunar('2026-09-19',{fetcher});assert.equal(calls,1);
  await assert.rejects(fetchLunar('2026-09-20',{fetcher:async()=>{throw new Error('offline');}}),/network/);
  assert.equal((await fetchLunar('2026-09-20',{fetcher:async()=>({ok:true,json:async()=>({LunarDate:'八月初十'})})})).day,10);
  await assert.rejects(fetchLunar('2026-09-21',{fetcher:async()=>({ok:true,json:async()=>({LunarDate:'bad'})})}),/format/);
});

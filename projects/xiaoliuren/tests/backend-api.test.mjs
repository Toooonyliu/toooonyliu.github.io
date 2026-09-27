import test from 'node:test';
import assert from 'node:assert/strict';
import {fetchLunar,fetchReading} from '../backend-api.js';

const clock={date:'2026-09-19',clock:'09:30',timeZone:'America/New_York'};
const lunar={date:clock.date,month:8,day:9,isLeap:false,text:'八月初九',year:'丙午年，馬'};
const reading={...clock,lunar,hourIndex:6,monthPalace:1,dayPalace:3,timePalace:2,stages:[{start:0,count:8,end:1},{start:1,count:9,end:3},{start:3,count:6,end:2}]};

test('reading sends only time fields and uses backend animation stages',async()=>{
  const result=await fetchReading({...clock,question:'private text',accessToken:'not sent'}, {baseUrl:'https://backend.example',fetcher:async(url,options)=>{
    assert.equal(url,'https://backend.example/api/reading');
    assert.equal(options.method,'POST');
    assert.deepEqual(JSON.parse(options.body),clock);
    assert.deepEqual(options.headers,{'Content-Type':'application/json'});
    return {ok:true,json:async()=>reading};
  }});
  assert.deepEqual(result.stages,reading.stages);
});

test('calendar shares concurrent requests and caches successful results',async()=>{
  let calls=0,release;
  const options={baseUrl:'https://cache.example',fetcher:()=>{calls++;return new Promise(resolve=>release=resolve);}};
  const a=fetchLunar(clock.date,options),b=fetchLunar(clock.date,options);
  release({ok:true,json:async()=>lunar});
  assert.deepEqual(await a,await b);await fetchLunar(clock.date,options);assert.equal(calls,1);
});

test('calendar failures are retryable and never cached',async()=>{
  const options={baseUrl:'https://retry.example',fetcher:async()=>({ok:false,json:async()=>({error:{code:'network'}})})};
  await assert.rejects(fetchLunar(clock.date,options),/network/);
  options.fetcher=async()=>({ok:true,json:async()=>lunar});
  assert.deepEqual(await fetchLunar(clock.date,options),lunar);
});

test('bad and failed backend responses cannot create readings',async()=>{
  for(const data of [null,{}, {...reading,stages:[]},{...reading,timePalace:9},{...reading,stages:[...reading.stages.slice(0,2),{start:3,count:999,end:2}]}]){
    await assert.rejects(fetchReading(clock,{baseUrl:'https://bad.example',fetcher:async()=>({ok:true,json:async()=>data})}),/format/);
  }
  await assert.rejects(fetchReading(clock,{baseUrl:'https://bad.example',fetcher:async()=>({ok:false,json:async()=>({error:{code:'dst'}})})}),/dst/);
  await assert.rejects(fetchReading(clock,{baseUrl:'https://bad.example',fetcher:async()=>{throw Error('offline');}}),/network/);
  await assert.rejects(fetchReading(clock,{baseUrl:''}),/backendConfig/);
});

test('timeout aborts a slow request with a retryable error',async()=>{
  await assert.rejects(fetchReading(clock,{baseUrl:'https://slow.example',timeout:5,fetcher:(_url,{signal})=>new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(Error('aborted'))))}),/network/);
});

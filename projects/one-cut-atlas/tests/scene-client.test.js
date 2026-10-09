import test from 'node:test';
import assert from 'node:assert/strict';
import {recognizePlace,paintArena,validatePlace,hasArenaApi} from '../src/scene-api.js';

const image='data:image/jpeg;base64,dGVzdA==';
const json=(data,ok=true,status=ok?200:400)=>({ok,status,json:async()=>data});
const place=()=>({recognized:true,name:'Forbidden City',city:'Beijing',country:'China',zone:'east-asia',setting:'exterior',confidence:.96,elements:['red walls'],lighting:'day',environment:'traditional_street',opponentStyle:'kendo',palette:{sky:'#E8E9E7',accent:'#a85d32',ambient:'#555d5b'},scenePrompt:'Empty palace courtyard with red columns, orange glazed roof tiles and white stone railings under a pale sky.',summary:'Forbidden City courtyard, Beijing.'});
const request={image,zone:'east-asia',scenePrompt:place().scenePrompt,setting:'exterior',lighting:'day',placeName:'Forbidden City'};
const endpoints={endpoint:'https://backend.example.test/api/recognize-place',healthEndpoint:'https://backend.example.test/health'};
const stalled=(_url,{signal})=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(Object.assign(new Error('aborted'),{name:'AbortError'})),{once:true}));
const noWait=async()=>{};

test('place validation accepts the server shape and rejects anything unusable',()=>{
 const clean=validatePlace(place());
 assert.equal(clean.palette.sky,'#e8e9e7');assert.equal(clean.recognized,true);assert.equal(clean.confidence,.96);
 assert.equal(validatePlace({...place(),recognized:false,name:null}).name,null);
 assert.equal(validatePlace({...place(),confidence:9}).confidence,1);
 for(const broken of [null,{...place(),zone:'atlantis'},{...place(),scenePrompt:'<b>short</b>'},{...place(),palette:{sky:'red'}},{...place(),lighting:'noon'}])assert.throws(()=>validatePlace(broken),/unusable place/);
});

test('recognition wakes the host, requires the recognition flag and sends one POST with the zone hint',async()=>{
 const calls=[],statuses=[];
 const result=await recognizePlace(image,{...endpoints,zone:'east-asia',onStatus:status=>statuses.push(status),fetcher:async(url,options)=>{calls.push({url,...options});return json(options.method==='GET'?{placeRecognitionConfigured:true}:{place:place()});}});
 assert.deepEqual(statuses,['waking','recognizing']);assert.equal(calls.length,2);
 assert.equal(calls[0].method,'GET');assert.equal(calls[1].method,'POST');
 assert.deepEqual(JSON.parse(calls[1].body),{image,zone:'east-asia'});assert.equal(calls[1].headers.Authorization,undefined);
 assert.equal(result.city,'Beijing');
 let body;
 await recognizePlace(image,{...endpoints,gps:{lat:43.06183,lon:141.35449},exclude:['Dotonbori, Osaka','<b>bad</b>'],fetcher:async(url,options)=>{if(options.method==='POST')body=JSON.parse(options.body);return json(options.method==='GET'?{placeRecognitionConfigured:true}:{place:place()});}});
 assert.deepEqual(body,{image,gps:{lat:43.062,lon:141.354},exclude:['Dotonbori, Osaka']});
 await recognizePlace(image,{...endpoints,gps:{lat:99,lon:0},fetcher:async(url,options)=>{if(options.method==='POST')body=JSON.parse(options.body);return json(options.method==='GET'?{placeRecognitionConfigured:true}:{place:place()});}});
 assert.deepEqual(body,{image});
 assert.deepEqual(validatePlace({...place(),evidence:['red walls',7,'']}).evidence,['red walls']);
 assert.deepEqual([validatePlace({...place(),latitude:43.06,longitude:141.35}).latitude,validatePlace({...place(),latitude:43.06,longitude:141.35}).longitude],[43.06,141.35]);
 assert.equal(validatePlace({...place(),latitude:120,longitude:141.35}).latitude,null);
 assert.equal(validatePlace({...place(),recognized:false,name:null,latitude:43,longitude:141}).latitude,null);
 let posts=0;
 await assert.rejects(recognizePlace(image,{...endpoints,fetcher:async(url,options)=>options.method==='GET'?json({avatarAnalysisConfigured:true}):(posts++,json({place:place()}))}),/not configured/);
 assert.equal(posts,0);
 await assert.rejects(recognizePlace(image,{...endpoints,zone:'mars',fetcher:()=>assert.fail('invalid zone must not fetch')}),/valid travel zone/);
 await assert.rejects(recognizePlace(image,{...endpoints,fetcher:async(url,options)=>options.method==='GET'?json({placeRecognitionConfigured:true}):json({error:'Recognition limit reached.'},false)}),/Recognition limit/);
 await assert.rejects(recognizePlace(image,{...endpoints,analysisTimeoutMs:5,fetcher:(url,options)=>options.method==='GET'?Promise.resolve(json({placeRecognitionConfigured:true})):stalled(url,options)}),/timed out/);
});

test('painting submits exactly one request, polls until done and validates the image',async()=>{
 const calls=[],statuses=[];let polls=0;
 const result=await paintArena(request,{endpoint:'https://backend.example.test/api/scenes',wait:noWait,onStatus:status=>statuses.push(status),fetcher:async(url,options)=>{
  calls.push({url,method:options.method,body:options.body});
  if(options.method==='POST')return {ok:true,status:202,json:async()=>({jobId:'00000000-0000-4000-8000-000000000000',estimatedSeconds:40})};
  polls++;return json(polls<3?{status:'painting'}:{status:'done',backdrop:'data:image/webp;base64,AAAA',cached:false});
 }});
 assert.deepEqual(statuses,['submitting','painting']);
 assert.equal(calls.filter(call=>call.method==='POST').length,1);
 assert.deepEqual(JSON.parse(calls[0].body),request);
 assert.equal(calls[1].url,'https://backend.example.test/api/scenes/00000000-0000-4000-8000-000000000000');
 assert.deepEqual(result,{backdrop:'data:image/webp;base64,AAAA',cached:false});
 await assert.rejects(paintArena({...request,scenePrompt:'nope'},{endpoint:'/x',fetcher:()=>assert.fail('must not fetch')}),/cannot be painted/);
 await assert.rejects(paintArena({...request,placeName:'<script>'},{endpoint:'/x',wait:noWait,fetcher:async(url,options)=>{if(options.method==='POST'){assert.equal(JSON.parse(options.body).placeName,undefined);return {ok:true,status:202,json:async()=>({jobId:'00000000-0000-4000-8000-000000000000'})};}return json({status:'done',backdrop:'javascript:alert(1)'});}}),/unusable image/);
});

test('painting failures, expiry and cancellation never resend the paid request',async()=>{
 for(const [poll,pattern] of [[json({status:'failed',error:'Mock quota reached.'}),/Mock quota/],[json({error:'expired'},false,404),/expired/],[json({error:'Service down'},false,500),/Service down/]]){
  let posts=0;
  await assert.rejects(paintArena(request,{endpoint:'/scenes',wait:noWait,fetcher:async(url,options)=>options.method==='POST'?(posts++,{ok:true,status:202,json:async()=>({jobId:'00000000-0000-4000-8000-000000000000'})}):poll}),pattern);
  assert.equal(posts,1);
 }
 await assert.rejects(paintArena(request,{endpoint:'/scenes',wait:noWait,fetcher:async()=>json({error:'Today\'s arena painting budget is used up.'},false,429)}),/budget/);
 const controller=new AbortController();let posts=0;
 const pending=paintArena(request,{endpoint:'/scenes',signal:controller.signal,fetcher:(url,options)=>{posts++;return stalled(url,options);}});
 controller.abort();await assert.rejects(pending,/Canceled/);assert.equal(posts,1);
 await assert.rejects(paintArena(request,{endpoint:'/scenes',submitTimeoutMs:5,fetcher:stalled}),/did not start in time/);
 const previousDocument=globalThis.document;
 try{globalThis.document={querySelector:()=>null};delete globalThis.ONE_CUT_API_BASE;assert.equal(hasArenaApi(),false);await assert.rejects(paintArena(request,{fetcher:()=>assert.fail('unconfigured must not fetch')}),/not connected/);}
 finally{if(previousDocument===undefined)delete globalThis.document;else globalThis.document=previousDocument;}
});

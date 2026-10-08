import test from 'node:test';
import assert from 'node:assert/strict';
import {hasAvatarApi,requestAvatar,DEFAULT_AVATAR,validateAvatar} from '../src/avatar.js';

const image='data:image/jpeg;base64,dGVzdA==';
const avatar={palette:{...DEFAULT_AVATAR,outfit:'#aa3322'},style:'suit',summary:'A fictional fighter with warm clothes.'};
const json=(data,ok=true)=>({ok,json:async()=>data});
const endpoints={endpoint:'https://backend.example.test/api/analyze-avatar',healthEndpoint:'https://backend.example.test/health'};
const stalled=(_url,{signal})=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(Object.assign(new Error('aborted'),{name:'AbortError'})),{once:true}));

test('API config normalizes HTTPS and accepts only local HTTP without embedded credentials',async()=>{
 const previousBase=globalThis.ONE_CUT_API_BASE,previousDocument=globalThis.document;
 try{
  globalThis.document={querySelector:()=>({content:' https://backend.example.test/// '})};
  delete globalThis.ONE_CUT_API_BASE;assert.equal(hasAvatarApi(),true);
  const calls=[];
  await requestAvatar(image,{fetcher:async(url,options)=>{calls.push([url,options.method]);return json(options.method==='GET'?{avatarAnalysisConfigured:true}:{avatar});}});
  assert.deepEqual(calls,[['https://backend.example.test/health','GET'],['https://backend.example.test/api/analyze-avatar','POST']]);
  for(const base of ['not-a-url','http://backend.example.test','https://user:secret@backend.example.test','https://backend.example.test?key=bad','https://backend.example.test#bad']){globalThis.ONE_CUT_API_BASE=base;assert.equal(hasAvatarApi(),false);}
  globalThis.ONE_CUT_API_BASE='http://localhost:4173';assert.equal(hasAvatarApi(),true);
  globalThis.document={querySelector:()=>null};delete globalThis.ONE_CUT_API_BASE;
  await assert.rejects(requestAvatar(image,{fetcher:()=>assert.fail('Must not send an unconfigured photo')}),/not connected/);
 }finally{
  if(previousBase===undefined)delete globalThis.ONE_CUT_API_BASE;else globalThis.ONE_CUT_API_BASE=previousBase;
  if(previousDocument===undefined)delete globalThis.document;else globalThis.document=previousDocument;
 }
});

test('wakes the host before exactly one paid POST and reports separate phases',async()=>{
 const calls=[],statuses=[];
 const result=await requestAvatar(image,{...endpoints,onStatus:status=>statuses.push(status),fetcher:async(url,options)=>{
  calls.push({url,...options});return json(options.method==='GET'?{status:'ok',avatarAnalysisConfigured:true}:{avatar});
 }});
 assert.deepEqual(statuses,['waking','analyzing']);assert.equal(calls.length,2);
 assert.equal(calls[0].method,'GET');assert.equal(calls[0].body,undefined);assert.equal(calls[0].cache,'no-store');
 assert.equal(calls[1].method,'POST');assert.deepEqual(JSON.parse(calls[1].body),{image});
 assert.equal(calls[1].headers.Authorization,undefined);assert.equal(result.source,'ai');assert.equal(result.style,'suit');
});

test('unconfigured, failed, or unreadable health never sends a photo',async()=>{
 for(const health of [json({avatarAnalysisConfigured:false}),json({error:'Service unavailable'},false),{ok:true,json:async()=>{throw new Error('not JSON');}}]){
  const calls=[];
  await assert.rejects(requestAvatar(image,{...endpoints,fetcher:async(url,options)=>{calls.push(options.method);return health;}}));
  assert.deepEqual(calls,['GET']);
 }
});

test('paid POST failures are not retried and leave the local avatar unchanged',async()=>{
 const local=validateAvatar({target:'player',style:'cowboy'}),before=structuredClone(local);
 for(const failure of [json({error:'AI quota reached'},false),json({avatar:{...avatar,style:'invented'}}),{ok:true,json:async()=>{throw new Error('not JSON');}}]){
  let posts=0;
  await assert.rejects(requestAvatar(image,{...endpoints,fetcher:async(url,options)=>options.method==='GET'?json({avatarAnalysisConfigured:true}):(posts++,failure)}));
  assert.equal(posts,1);assert.deepEqual(local,before);
 }
 let posts=0;
 await assert.rejects(requestAvatar(image,{...endpoints,fetcher:async(url,options)=>{if(options.method==='GET')return json({avatarAnalysisConfigured:true});posts++;throw new TypeError('Failed to fetch');}}),/Could not connect/);
 assert.equal(posts,1);
});

test('startup timeout aborts without sending a paid POST',async()=>{
 let calls=0;
 await assert.rejects(requestAvatar(image,{...endpoints,startupTimeoutMs:5,fetcher:(...args)=>{calls++;return stalled(...args);}}),/startup timed out/);
 assert.equal(calls,1);
});

test('analysis timeout aborts one paid POST without retry',async()=>{
 let posts=0;
 await assert.rejects(requestAvatar(image,{...endpoints,analysisTimeoutMs:5,fetcher:(url,options)=>options.method==='GET'?Promise.resolve(json({avatarAnalysisConfigured:true})):(posts++,stalled(url,options))}),/AI timed out/);
 assert.equal(posts,1);
});

test('external cancellation aborts warmup and pre-canceled requests make no calls',async()=>{
 const controller=new AbortController();let calls=0;
 const pending=requestAvatar(image,{...endpoints,signal:controller.signal,fetcher:(...args)=>{calls++;return stalled(...args);}});
 controller.abort();await assert.rejects(pending,/canceled/);assert.equal(calls,1);
 await assert.rejects(requestAvatar(image,{...endpoints,signal:controller.signal,fetcher:()=>assert.fail('Canceled request must not fetch')}),/canceled/);
});

test('explicit adapter endpoints keep the established single-request behavior',async()=>{
 let calls=0;
 const result=await requestAvatar(image,{endpoint:'/test/avatar',fetcher:async(url,options)=>{calls++;assert.equal(url,'/test/avatar');assert.equal(options.method,'POST');return json({avatar});}});
 assert.equal(calls,1);assert.equal(result.style,'suit');
});

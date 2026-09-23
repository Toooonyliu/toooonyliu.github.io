import test from 'node:test';
import assert from 'node:assert/strict';
import {AccountStore} from '../account-store.js';
import {calculate} from '../core.js';
import {writeJournal,readJournal,recordReading} from '../journal.js';
const reading=id=>({...recordReading({question:'Question '+id,date:'2026-09-20',clock:'12:00',hour:12,timeZone:'America/New_York',lunar:{month:8,day:10,text:'八月初十'},hourIndex:7,...calculate(8,10,7),category:'work',reflection:['建议','Advice']}),id});
const storage=()=>{const m=new Map();return{getItem:k=>m.get(k),setItem:(k,v)=>m.set(k,v)};};
function fakeClient(){
 const rows=[],calls=[];let fail=false,hold=null;
 return {rows,calls,set fail(v){fail=v;},holdNext(){let release;hold=new Promise(r=>release=r);return release;},auth:{signOut:async()=>({error:null})},from(table){
  const q={kind:'select',filters:{},payload:null};
  const api={select(){return api;},eq(k,v){q.filters[k]=v;return api;},order(){return api;},range(){return api;},upsert(payload){q.kind='add';q.payload=payload;return api;},update(payload){q.kind='review';q.payload=payload;return api;},delete(){q.kind='delete';return api;},async then(resolve,reject){
   calls.push(structuredClone(q));const waiting=hold;hold=null;if(waiting)await waiting;if(fail)return resolve({error:new Error('offline')});
   const match=r=>Object.entries(q.filters).every(([k,v])=>r[k]===v);
   if(q.kind==='add'){if(!rows.some(r=>r.id===q.payload.id&&r.user_id===q.payload.user_id))rows.push(structuredClone(q.payload));return resolve({error:null});}
   if(q.kind==='review'){const found=rows.filter(match);found.forEach(r=>Object.assign(r,q.payload));return resolve({data:found.map(r=>({id:r.id})),error:null});}
   if(q.kind==='delete'){for(let i=rows.length-1;i>=0;i--)if(match(rows[i]))rows.splice(i,1);return resolve({error:null});}
   return resolve({data:structuredClone(rows.filter(match)),error:null});
  }};return api;
 }};
}
test('guest readings are not uploaded on login; deliberate import is idempotent',async()=>{
 const local=storage(),guest=reading('guest');writeJournal(local,[guest]);const client=fakeClient(),s=new AccountStore(local,client);
 await s.setUser({id:'A'});assert.deepEqual(s.entries,[]);assert.equal(client.rows.length,0);
 await s.importGuest();await s.importGuest();assert.equal(client.rows.length,1);assert.equal(client.rows[0].user_id,'A');assert.equal(readJournal(local).entries.length,1);
 await s.signOut();assert.equal(s.entries[0].id,'guest');assert.equal(s.pending.length,0);
});
test('account records and reviews never enter guest storage and do not leak when switching users',async()=>{
 const local=storage(),client=fakeClient(),s=new AccountStore(local,client);
 await s.setUser({id:'A'});await s.add(reading('private'));await s.review('private',{outcome:'matched',note:'private note'});
 assert.equal(readJournal(local).entries.length,0);assert.equal(client.rows[0].review.note,'private note');
 await s.setUser({id:'B'});assert.deepEqual(s.entries,[]);await s.add(reading('B-only'));
 assert.deepEqual(s.entries.map(r=>r.id),['B-only']);assert.equal(client.calls.filter(c=>c.kind==='review')[0].filters.user_id,'A');
 await s.setUser({id:'A'});assert.deepEqual(s.entries.map(r=>r.id),['private']);await s.remove('private');assert.deepEqual(client.rows.map(r=>r.id),['B-only']);
});
test('failed writes are visible, retryable, and preserve operation order',async()=>{
 const client=fakeClient(),s=new AccountStore(storage(),client);await s.setUser({id:'A'});client.fail=true;
 assert.equal(await s.add(reading('draft')),false);assert.equal(s.error,'sync_error');assert.equal(s.pending.length,1);
 await s.review('draft',{note:'new reflection',outcome:'partial'});assert.equal(s.pending.length,2);
 client.fail=false;assert.equal(await s.retry(),true);assert.equal(s.pending.length,0);assert.equal(client.rows[0].review.note,'new reflection');
});
test('stale account fetch cannot reveal old account data after sign-out',async()=>{
 const local=storage(),client=fakeClient(),s=new AccountStore(local,client);await s.setUser({id:'A'});await s.add(reading('secret'));
 const release=client.holdNext(),request=s.refresh();await s.setUser(null);release();await request;
 assert.equal(s.user,null);assert.deepEqual(s.entries,[]);assert.equal(s.loading,false);
});
test('a stale failed write cannot pollute the next account or its pending queue',async()=>{
 const client=fakeClient(),s=new AccountStore(storage(),client);await s.setUser({id:'A'});
 const release=client.holdNext(),request=s.add(reading('old'));await s.setUser({id:'B'});release();await request;
 assert.equal(s.user.id,'B');assert.deepEqual(s.entries,[]);assert.equal(s.pending.length,0);assert.equal(s.error,'');
});
test('failed cloud load does not silently display guest history',async()=>{
 const local=storage();writeJournal(local,[reading('guest')]);const client=fakeClient();client.fail=true;
 const s=new AccountStore(local,client);await s.setUser({id:'A'});assert.deepEqual(s.entries,[]);assert.equal(s.error,'load_error');
});
test('deleting a never-synced reading does not resurrect it on retry',async()=>{
 const client=fakeClient(),s=new AccountStore(storage(),client);await s.setUser({id:'A'});client.fail=true;
 await s.add(reading('discard'));await s.remove('discard');client.fail=false;await s.retry();assert.deepEqual(s.entries,[]);assert.deepEqual(client.rows,[]);
});

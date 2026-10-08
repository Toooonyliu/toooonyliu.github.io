import test from 'node:test';
import assert from 'node:assert/strict';
import {saveLevel,loadLevels} from '../src/storage.js';
import {validateAvatar} from '../src/avatar.js';
import {sceneForZone} from '../src/region-presets.js';

/** Minimal IndexedDB test double: operations complete after registered callbacks. */
function memoryIndexedDB(){
 const rows=new Map();
 const database={
  objectStoreNames:{contains:()=>true},close(){},
  transaction(){
   const transaction={};
   const requestFor=value=>{
    const request={};
    queueMicrotask(()=>{request.result=structuredClone(value);request.onsuccess?.();transaction.oncomplete?.();});
    return request;
   };
   transaction.objectStore=()=>({
    get:id=>requestFor(rows.get(id)),
    getAll:()=>requestFor([...rows.values()]),
    put:value=>rows.set(value.id,structuredClone(value))
   });
   return transaction;
  }
 };
 return {open(){const request={};queueMicrotask(()=>{request.result=database;request.onsuccess?.();});return request;}};
}

test('a saved custom fighter keeps its palette, target and silhouette after loading',async()=>{
 const originalIndexedDB=globalThis.indexedDB;
 globalThis.indexedDB=memoryIndexedDB();
 try{
  const avatar=validateAvatar({target:'player',style:'suit',palette:{hair:'#123456',skin:'#bba088',outfit:'#cc3311',accent:'#ddcc33'}});
  const level={id:'portrait-regression',name:'My custom duel',location:{name:'Kyoto',lat:35.0116,lon:135.7681},scene:sceneForZone('east-asia'),avatar,photo:'data:image/jpeg;base64,dGVzdA==',cleared:false,createdAt:'2026-10-07T00:00:00Z'};
  await saveLevel(level);
  const [restored]=await loadLevels();
  assert.deepEqual(restored.avatar,avatar);
  assert.equal(restored.name,level.name);
  assert.equal(restored.photo,level.photo);
  await saveLevel({...restored,cleared:true});
  await saveLevel({...restored,cleared:false});
  assert.equal((await loadLevels())[0].cleared,true);
 }finally{
  if(originalIndexedDB===undefined)delete globalThis.indexedDB;else globalThis.indexedDB=originalIndexedDB;
 }
});

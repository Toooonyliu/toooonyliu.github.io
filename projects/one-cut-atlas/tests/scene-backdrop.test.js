import test from 'node:test';
import assert from 'node:assert/strict';
import {validateScene,validatePlaceRecord,BACKDROP_MAX_LENGTH} from '../src/shared.js';
import {sceneForZone} from '../src/region-presets.js';
import {saveLevel,loadLevels} from '../src/storage.js';

const backdrop='data:image/webp;base64,UklGRiYAAABXRUJQVlA4TBoAAAAvAAAAAAfQ//73v/+BiOh/AAA=';

test('a scene keeps a valid painted backdrop and place name and drops anything else',()=>{
 const scene=validateScene({...sceneForZone('east-asia'),backdrop,placeName:'  Forbidden City  ',source:'ai'});
 assert.equal(scene.backdrop,backdrop);assert.equal(scene.placeName,'Forbidden City');assert.equal(scene.source,'ai');
 assert.equal(validateScene(sceneForZone('africa')).backdrop,null);
 assert.equal(validateScene({backdrop:'javascript:alert(1)'}).backdrop,null);
 assert.equal(validateScene({backdrop:'data:image/svg+xml;base64,AAAA'}).backdrop,null);
 assert.equal(validateScene({backdrop:`data:image/png;base64,${'A'.repeat(BACKDROP_MAX_LENGTH)}`}).backdrop,null);
 assert.equal(validateScene({placeName:'x'.repeat(100)}).placeName.length,80);
 assert.equal(validateScene({placeName:'   '}).placeName,null);
});

test('a photo stage keeps a validated place record and drops unusable ones',()=>{
 const record={name:'Susukino Crossing',scenePrompt:'Empty night crossing with tall neon billboards, wet asphalt and snow banks under a black sky.',setting:'exterior',lighting:'night',zone:'east-asia',environment:'modern_city'};
 assert.deepEqual(validatePlaceRecord(record),record);
 assert.equal(validatePlaceRecord({...record,scenePrompt:'<b>x</b>'}),null);
 assert.equal(validatePlaceRecord({...record,zone:'mars'}),null);
 assert.equal(validatePlaceRecord({...record,name:'<script>'}).name,null);
 assert.equal(validatePlaceRecord({...record,environment:'space'}).environment,'traditional_street');
 assert.equal(validatePlaceRecord(null),null);
});

function memoryIndexedDB(){
 const rows=new Map();
 const database={objectStoreNames:{contains:()=>true},close(){},transaction(){const transaction={};const requestFor=value=>{const request={};queueMicrotask(()=>{request.result=structuredClone(value);request.onsuccess?.();transaction.oncomplete?.();});return request;};transaction.objectStore=()=>({get:id=>requestFor(rows.get(id)),getAll:()=>requestFor([...rows.values()]),put:value=>rows.set(value.id,structuredClone(value))});return transaction;}};
 return {open(){const request={};queueMicrotask(()=>{request.result=database;request.onsuccess?.();});return request;}};
}

test('a painted photo arena survives save and reload with its backdrop',async()=>{
 const originalIndexedDB=globalThis.indexedDB;
 globalThis.indexedDB=memoryIndexedDB();
 try{
  const scene={...sceneForZone('east-asia'),stageId:null,backdrop,placeName:'Forbidden City',summary:'Forbidden City courtyard, Beijing.',source:'ai'};
  const place={name:'Forbidden City',scenePrompt:'Empty palace courtyard with red columns and yellow glazed roofs under a pale sky.',setting:'exterior',lighting:'day',zone:'east-asia',environment:'traditional_street'};
  await saveLevel({id:'arena-regression',name:'Forbidden City courtyard · Photo',location:{name:'Beijing',country:'China',lat:35.01,lon:135.77},scene,place,photo:'data:image/jpeg;base64,dGVzdA==',cleared:false,createdAt:'2026-10-08T00:00:00Z'});
  const [restored]=await loadLevels();
  assert.deepEqual(restored.place,place);
  assert.equal(restored.scene.backdrop,backdrop);assert.equal(restored.scene.placeName,'Forbidden City');assert.equal(restored.scene.stageId,null);assert.equal(restored.scene.source,'ai');
 }finally{if(originalIndexedDB===undefined)delete globalThis.indexedDB;else globalThis.indexedDB=originalIndexedDB;}
});

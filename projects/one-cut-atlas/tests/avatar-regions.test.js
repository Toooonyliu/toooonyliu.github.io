import test from 'node:test';
import assert from 'node:assert/strict';
import {avatarFromPalette,validateAvatar,requestAvatar,hasAvatarApi,DEFAULT_AVATAR} from '../src/avatar.js';
import {sceneForZone,zoneForCoordinates,createZoneLevels} from '../src/region-presets.js';
import {validateScene} from '../src/shared.js';

test('upload colors alter the avatar without replacing a regional stage',()=>{
 const stage=sceneForZone('east-asia'),before=structuredClone(stage);
 const warm=avatarFromPalette({sky:'#cc5544',accent:'#eeb533',ambient:'#552211'},'player','suit');
 const cool=avatarFromPalette({sky:'#2244dd',accent:'#66ccff',ambient:'#112233'},'player','suit');
 assert.notDeepEqual(warm.palette.outfit,cool.palette.outfit);
 assert.equal(warm.target,'player');assert.equal(warm.style,'suit');
 assert.equal(warm.palette.skin,DEFAULT_AVATAR.skin);
 assert.deepEqual(stage,before);
 assert.equal(validateScene(stage).stageId,'east-asia');
 assert.equal(validateScene({...stage,stageId:'https://untrusted.example/image'}).stageId,null);
});
test('zone presets cover eleven destinations and flagship geography matches locations',()=>{
 const levels=createZoneLevels();assert.equal(new Set(levels.map(level=>level.id)).size,11);
 assert.equal(levels.filter(level=>level.scene.stageId).length,3);
 for(const [lat,lon,id] of [[35,135,'east-asia'],[30,31,'africa'],[40,-74,'north-america'],[-34,151,'oceania'],[78,16,'arctic'],[-78,167,'antarctic']])assert.equal(zoneForCoordinates(lat,lon).id,id);
});
test('avatar boundary keeps invalid data out and failed AI leaves local config unchanged',async()=>{
 const local=validateAvatar({palette:{outfit:'url(javascript:bad)'},target:'script',style:'invalid'});
 assert.equal(local.palette.outfit,DEFAULT_AVATAR.outfit);assert.equal(local.target,'opponent');
 const before=structuredClone(local),originalFetch=globalThis.fetch;
 try{
  globalThis.fetch=async()=>({ok:false,json:async()=>({error:'AI service unavailable'})});
  await assert.rejects(requestAvatar('data:image/png;base64,test',{endpoint:'/test/avatar'}),/unavailable/);
  assert.deepEqual(local,before);
  globalThis.fetch=async()=>({ok:true,json:async()=>({avatar:{palette:DEFAULT_AVATAR,style:'invented'}})});
  await assert.rejects(requestAvatar('data:image/png;base64,test',{endpoint:'/test/avatar'}),/unsupported fighter/);
 }finally{globalThis.fetch=originalFetch;}
});
test('AI controls stay unavailable until an API base is explicitly configured',async()=>{
 const originalBase=globalThis.ONE_CUT_API_BASE,originalDocument=globalThis.document,originalFetch=globalThis.fetch;
 try{
  delete globalThis.ONE_CUT_API_BASE;delete globalThis.document;
  globalThis.fetch=()=>assert.fail('Unconfigured AI must not send a photo');
  assert.equal(hasAvatarApi(),false);
  await assert.rejects(requestAvatar('data:image/png;base64,test'),/not connected/);
  globalThis.document={querySelector:()=>({content:'   '})};
  assert.equal(hasAvatarApi(),false);
  globalThis.document={querySelector:()=>({content:'https://avatar.example.test/'})};
  assert.equal(hasAvatarApi(),true);
  globalThis.ONE_CUT_API_BASE='https://other.example.test';
  assert.equal(hasAvatarApi(),true);
 }finally{
  if(originalBase===undefined)delete globalThis.ONE_CUT_API_BASE;else globalThis.ONE_CUT_API_BASE=originalBase;
  if(originalDocument===undefined)delete globalThis.document;else globalThis.document=originalDocument;
  globalThis.fetch=originalFetch;
 }
});

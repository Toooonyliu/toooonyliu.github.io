import { CITIES, ENVIRONMENTS, LIGHTINGS, STYLES, ELEMENTS, LABELS, WORLD, defaultScene, validateScene } from './shared.js';
import { Globe } from './globe.js';
import { TRAVEL_ZONES, getZone, sceneForZone, createZoneLevels, zoneForCoordinates } from './region-presets.js';
import { DEFAULT_AVATAR, avatarFromPalette, validateAvatar, requestAvatar, hasAvatarApi } from './avatar.js';
import { recognizePlace, paintArena, hasArenaApi } from './scene-api.js';
import { pixelizeBackdrop } from './pixelize.js';
import { CombatAudio } from './combat-audio.js';
import { gamepadIndex, validateAssignments } from './controllers.js';
import { DuelInputs, normalizeSettings } from './duel-inputs.js';
import { createDuelSetup } from './duel-setup.js';
import { t, getLanguage, setLanguage, onLanguageChange, bindStaticTranslations, levelTitle } from './i18n.js';
const $ = id => document.getElementById(id);
bindStaticTranslations(document.body);
const globe = new Globe($('world-map'), {onSelect:id=>selectLevel(id), onCreate:point=>openCreator({point})});
const demos = createZoneLevels();
let levels=structuredClone(demos),selectedId=levels[0].id,modules=null,gameReady=false,land=null,draft=null,photoVersion=0,photoBusy=false,analysisBusy=false;
let analysisController=null,analysisPhase='waking';
let gate={busy:false,controller:null,pending:null,photo:null,apiImage:null,gps:null,excluded:[],image:null,scanRaf:0},forgeController=null,forgeTimer=0,forgeSkipped=false;
let engine=null,currentLevel=null,raf=0,previousTime=0,accumulator=0,resultHandled=false,toastTimer=0,firstLitId=null,audio=null,heard=new Set(),duelGeneration=0;
let bloodDecals=[],bloodSeen=new Set();
const hudCache=new Map();
const keys={left:false,right:false,attack:false,parry:false,dodge:false,duck:false,counter:false,shove:false};
let aim='mid',mouseLine=null,playerFree=true;
const SETTINGS_KEY='one-cut-atlas:controls:v1';
let settings=loadSettings(),activeSettings=null,duelInputs=null,setupLevel=null;
let resultCopy=null;
const duelSetup=createDuelSetup({
 onStart(config){saveSettings(config);const level=setupLevel;setupLevel=null;if(level)void forgeAndFight(level);},
 onSave(config){saveSettings(config);if(engine)launchDuel(currentLevel);else toast('Mode and controls saved.');}
});
function loadSettings(){try{return normalizeSettings(JSON.parse(localStorage.getItem(SETTINGS_KEY)));}catch{return normalizeSettings();}}
function saveSettings(config){settings=normalizeSettings(config);try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));}catch{toast('Settings apply now; this browser could not save them.');}updateModeMenu();}
function connectedPads(){try{return navigator.getGamepads?.()||[];}catch{return [];}}
function dialogOpen(){return Boolean(document.querySelector('dialog[open]'));}
function keyboardPlayer(){return activeSettings?.devices.slice(0,activeSettings.mode==='local'?2:1).indexOf('keyboard')??-1;}
function canKeyboardFight(){return Boolean(engine&&!engine.paused&&!dialogOpen()&&keyboardPlayer()>=0);}
function updateModeMenu(){
 $('menu-settings').textContent=t('Mode & Controls');
 $('menu-settings').title=t('Current mode: {mode}',{mode:t(settings.mode==='local'?'Local two-player':'Single player')});
 $('difficulty-select').disabled=settings.mode==='local';
 $('difficulty-select').closest('label').title=settings.mode==='local'?t('Difficulty applies to the computer opponent in single-player mode.'):'';
}
function startDuel(level){if(!level||!ensureReady())return;if(engine)togglePause(true);setupLevel=level;duelSetup.open(settings,{levelName:levelTitle(level),start:true});}
function openSettings(){if(engine)togglePause(true);duelSetup.open(settings,{levelName:levelTitle(currentLevel||selected()),playing:Boolean(engine)});}
const FREE_STATES=['idle','walk','charge','parry'];
function applyMouseLine(){if(mouseLine&&playerFree&&mouseLine!==aim)setAim(mouseLine);}
const stanceLabels={high:'High',mid:'Mid',low:'Low'};
const STAMP_NAMES={'east-asia':'E. Asia','south-asia':'S. Asia','southeast-asia':'SE Asia','west-central-asia':'C. Asia',europe:'Europe',africa:'Africa','north-america':'N. Amer','south-america':'S. Amer',oceania:'Oceania',arctic:'Arctic',antarctic:'Antarc.'};
function setAim(value){if(!stanceLabels[value])return;aim=value;document.querySelectorAll('[data-stance]').forEach(button=>{const active=button.dataset.stance===aim;button.setAttribute('aria-pressed',String(active));button.classList.toggle('active',active);});}
const escape = value => String(value ?? '').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
function toast(message){$('toast').textContent=t(message);$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,4300);}
function hudText(id,value){value=t(value);if(hudCache.get(id)===value)return;hudCache.set(id,value);$(id).textContent=value;}
function selected(){return levels.find(l=>l.id===selectedId)||levels[0];}
function renderMap(){globe.setLevels(levels,selectedId);}
function renderAtlas(){
 const count=levels.filter(l=>l.cleared).length;$('cleared-count').textContent=String(count).padStart(2,'0');$('progress-fill').style.width=`${count/Math.max(levels.length,1)*100}%`;
 $('progress-copy').textContent=count?t('{count} cleared',{count}):t('Your first cut awaits.');$('level-count').textContent=String(levels.length).padStart(2,'0');
 $('level-list').innerHTML=levels.map(l=>`<button class="level-item ${l.id===selectedId?'selected':''} ${l.cleared?'cleared':''}" data-level="${escape(l.id)}"><span class="level-dot">${l.cleared?'✦':'◇'}</span><span><b>${escape(l.isDemo?t(l.location.name):l.location.name)}</b><small>${escape(levelTitle(l))}${l.cleared?' · '+t('Cleared'):''}</small></span><span class="level-chevron">›</span></button>`).join('');
 $('level-list').querySelectorAll('button').forEach(btn=>btn.onclick=()=>selectLevel(btn.dataset.level));
 $('zone-list').innerHTML=TRAVEL_ZONES.map((zone,index)=>`<button class="zone-button ${selected()?.scene.travelZone===zone.id?'active':''}" data-zone="${zone.id}" style="--zone-color:${zone.color}" aria-pressed="${selected()?.scene.travelZone===zone.id}"><span>${String(index+1).padStart(2,'0')}</span>${escape(t(zone.label))}${zone.flagship?'<i>★</i>':''}</button>`).join('');
 $('zone-list').querySelectorAll('button').forEach(button=>button.onclick=()=>selectLevel(`zone-${button.dataset.zone}`));
 const stamped=new Set(levels.filter(level=>level.cleared).map(level=>level.scene.travelZone));
 $('zone-progress').textContent=t('{count} / {total} stamps',{count:stamped.size,total:TRAVEL_ZONES.length});
 const activeZone=selected()?.scene.travelZone;
 $('stamp-row').innerHTML=TRAVEL_ZONES.map(zone=>`<button class="stamp ${stamped.has(zone.id)?'inked':''} ${activeZone===zone.id?'active':''}" data-zone="${zone.id}" style="--zone-color:${zone.color}" title="${escape(t(zone.label))} · ${escape(t(zone.stage))}" aria-label="${escape(t(zone.label))}${stamped.has(zone.id)?', '+t('cleared'):''}" aria-pressed="${activeZone===zone.id}"><span class="stamp-art" aria-hidden="true"></span><span class="stamp-name">${escape(t(STAMP_NAMES[zone.id]||zone.label))}</span></button>`).join('');
 $('stamp-row').querySelectorAll('button').forEach(button=>button.onclick=()=>selectLevel(levels.find(level=>level.scene.travelZone===button.dataset.zone&&level.place)?.id||`zone-${button.dataset.zone}`));
 renderMap();renderSelected();
}
function drawPreview(canvas,scene,avatar=null){
 if(!modules)return;
 const ctx=canvas.getContext('2d');modules.drawScene(ctx,scene,0);
 modules.drawFighter(ctx,{x:360,facing:1,state:'idle',timer:0,stateDuration:1,dead:false},avatar?.target==='player'?avatar.style:'traveler',true,0,{wet:scene.environment!=='wilderness',palette:avatar?.target==='player'?avatar.palette:null});
 modules.drawFighter(ctx,{x:600,facing:-1,state:'idle',timer:0,stateDuration:1,dead:false},avatar?.target==='opponent'?avatar.style:scene.opponentStyle,false,0,{wet:scene.environment!=='wilderness',palette:avatar?.target==='opponent'?avatar.palette:null});
}
function renderSelected(){const l=selected();if(!l)return;const zone=getZone(l.scene.travelZone);$('selected-title').textContent=levelTitle(l);$('selected-region').textContent=`${t(zone.name).toUpperCase()} / ${l.isDemo?t(l.location.name):l.location.name}`;$('selected-description').textContent=l.scene.summary;$('selected-source').textContent=t(l.scene.backdrop?'Painted stage':l.place?'Photo stage':l.avatar?'Custom fighter':zone.flagship?'Signature arena':'Arena');$('selected-source').hidden=false;$('selected-tags').innerHTML=[zone.label,l.cleared?'Cleared':'Ready'].map(label=>`<span>${escape(t(label))}</span>`).join('');$('challenge-selected').textContent=t(l.cleared?'Play Again':'Fight');drawPreview($('selected-preview'),l.scene,l.avatar);}
function selectLevel(id){selectedId=id;renderAtlas();globe.focusLocation(selected().location);const drawer=$('journey-drawer');if(drawer)drawer.open=false;}
function ensureReady(){if(modules&&gameReady)return true;toast('Loading the arena…');return false;}
function restoreSavedLevel(level){
 const zone=level.scene.travelZone?getZone(level.scene.travelZone):zoneForCoordinates(level.location.lat,level.location.lon);
 const restored={...level,scene:{...level.scene,travelZone:zone.id}};
 // Refresh only shipped demo labels. Names written by players remain untouched.
 if(level.isDemo){const city=CITIES.find(city=>Math.abs(city.lat-level.location.lat)<.001&&Math.abs(city.lon-level.location.lon)<.001);restored.name=`${city?.name||zone.place} Duel`;restored.location={...level.location,name:city?.name||zone.place,country:city?.country||zone.country};restored.scene.summary=zone.summary;}
 return restored;
}
async function init(){
 try{const response=await fetch('./assets/world-land.geojson');if(!response.ok)throw new Error();land=await response.json();globe.setLand(land);renderMap();}catch{toast('Map unavailable. Choose a destination below.');}
 try{
  const [combat,render,photo,storage]=await Promise.all([import('./engine.js'),import('./render.js'),import('./photo.js'),import('./storage.js')]);
  modules={...combat,...render,...photo,...storage};
  audio=new CombatAudio();
  const soundReady=audio.preloadEffects().catch(()=>false);
  try{await Promise.all([modules.preloadArt(),soundReady]);}catch(error){console.error('Art loading failed',error);toast('Some art is missing. Backup arenas are ready.');}
  try{const saved=await modules.loadLevels();levels=[...structuredClone(demos).map(demo=>{const existing=saved.find(level=>level.id===demo.id);return existing?{...demo,...(existing.isDemo===false?{name:existing.name,isDemo:false}:{}),cleared:existing.cleared,avatar:existing.avatar,photo:existing.photo}:demo;}),...saved.filter(level=>!demos.some(d=>d.id===level.id)).map(restoreSavedLevel)];}catch{toast('Could not load your save. You can still play.');}
  try{await modules.preloadBackdrops(levels.map(level=>level.scene?.backdrop));}catch{/* Painted arenas fall back to preset art. */}
  gameReady=true;renderAtlas();for(const id of ['play-demo','challenge-selected','upload-open','edit-selected'])$(id).disabled=false;
 }catch(error){console.error('Module initialization failed',error);toast('Game unavailable. Refresh to try again.');}
}
function setupChoices(){
 $('zone-select').innerHTML=TRAVEL_ZONES.map(zone=>`<option value="${zone.id}">${t(zone.label)} · ${t(zone.stage)}</option>`).join('');
 $('location-select').innerHTML=CITIES.map(c=>`<option value="${c.id}">${escape(t(c.name))} · ${escape(t(c.country))}</option>`).join('')+`<option value="custom">${t('Custom location / Photo GPS')}</option>`;
 $('lighting-select').innerHTML=LIGHTINGS.map(x=>`<option value="${x}">${t(LABELS[x])}</option>`).join('');$('style-select').innerHTML=STYLES.map(x=>`<option value="${x}">${t(LABELS[x])}</option>`).join('');
 $('environment-options').innerHTML=ENVIRONMENTS.map(x=>`<button type="button" data-environment="${x}" aria-pressed="false">${t(LABELS[x])}</button>`).join('');
 $('element-options').innerHTML=ELEMENTS.map(x=>`<label><input type="checkbox" value="${x}">${t(LABELS[x])}</label>`).join('');
 $('environment-options').querySelectorAll('button').forEach(b=>b.onclick=()=>{draft.scene.environment=b.dataset.environment;draft.scene.elements=defaultScene(draft.scene.environment).elements;markManual();updateCreator();});
 $('element-options').querySelectorAll('input').forEach(input=>input.onchange=()=>{const choices=[...$('element-options').querySelectorAll('input:checked')].map(i=>i.value);if(choices.length>4){input.checked=false;toast('Choose up to four elements.');return;}draft.scene.elements=choices;markManual();updateCreator();});
}
function openCreator({level=null,point=null}={}){
 if(!ensureReady())return;
 analysisController?.abort();analysisController=null;
 const zone=point?zoneForCoordinates(point.lat,point.lon):getZone(selected()?.scene.travelZone);
 photoVersion++;draft=level?structuredClone(level):{id:crypto.randomUUID(),name:`${zone.stage} · Custom`,location:{name:zone.place,country:zone.country,lat:zone.lat,lon:zone.lon},scene:sceneForZone(zone.id),photo:null,cleared:false,createdAt:new Date().toISOString()};
 draft.avatar=validateAvatar(draft.avatar||{style:draft.scene.opponentStyle});draft.editing=Boolean(level);$('creator-title').textContent=t('Choose Your Fighter');$('level-name').value=draft.name;$('creator-error').hidden=true;$('gps-note').textContent=t('Regional arena. Your fighter.');$('photo-message').textContent=t(draft.photo?'Saved on this device.':'Use a photo to choose your colors.');
 const city=CITIES.find(c=>Math.abs(c.lat-draft.location.lat)<.001&&Math.abs(c.lon-draft.location.lon)<.001);$('location-select').value=city?city.id:'custom';$('custom-name').value=draft.location.name;$('custom-lat').value=draft.location.lat;$('custom-lon').value=draft.location.lon;updateLocationFields();
 $('photo-input').value='';photoBusy=false;analysisBusy=false;setBusy();updatePhotoPreview();updateCreator();$('creator').showModal();
}
function updatePhotoPreview(){const has=Boolean(draft.photo);$('photo-image').hidden=!has;$('photo-placeholder').hidden=has;$('photo-change').hidden=!has;if(has)$('photo-image').src=draft.photo;else $('photo-image').removeAttribute('src');$('palette-swatches').innerHTML=Object.values(draft.avatar.palette).map(x=>`<span style="background:${x}"></span>`).join('');}
function updateCreator(){
 $('zone-select').value=draft.scene.travelZone||'east-asia';$('avatar-target').value=draft.avatar.target;$('lighting-select').value=draft.scene.lighting;$('style-select').value=draft.avatar.style;
 for(const key of Object.keys(DEFAULT_AVATAR))$(`avatar-${key}`).value=draft.avatar.palette[key];
 $('environment-options').querySelectorAll('button').forEach(b=>{const active=b.dataset.environment===draft.scene.environment;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
 $('element-options').querySelectorAll('input').forEach(i=>i.checked=draft.scene.elements.includes(i.value));
 $('creator-mode').textContent=t(draft.avatar.source==='ai'?'AI colors':'Photo colors');drawPreview($('creator-preview'),draft.scene,draft.avatar);
}
function markManual(){draft.scene.source='manual';draft.scene.summary=`${LABELS[draft.scene.environment]} · ${LABELS[draft.scene.lighting]}.`;}
function updateLocationFields(){const custom=$('location-select').value==='custom';$('custom-location-fields').hidden=!custom;['custom-name','custom-lat','custom-lon'].forEach(id=>$(id).required=custom);}
function setBusy(){const busy=photoBusy||analysisBusy,apiReady=hasAvatarApi();$('save-start').disabled=busy;$('ai-analyze').hidden=!apiReady;$('ai-analyze').disabled=busy||!apiReady;$('ai-analyze').textContent=t(analysisBusy?(analysisPhase==='waking'?'Waking AI…':'Analyzing…'):'AI Colors');const privacy=$('photo-privacy');if(privacy)privacy.textContent=t(apiReady?'Only use photos you own or have permission to use. AI Colors sends a compressed photo; otherwise it stays here.':'Only use photos you own or have permission to use. Photos stay on this device.');}
function creatorError(message){$('creator-error').textContent=t(message);$('creator-error').hidden=false;}
async function pickPhoto(file){
 if(!file||!draft)return;analysisController?.abort();analysisController=null;const version=++photoVersion;analysisBusy=false;photoBusy=true;setBusy();$('creator-error').hidden=true;$('photo-message').textContent=t('Reading photo…');
 try{const result=await modules.preparePhoto(file);if(version!==photoVersion)return;draft.photo=result.thumbnail;draft.apiImage=result.dataUrl;draft.gps=result.gps||null;draft.avatar=avatarFromPalette(result.palette,draft.avatar.target,draft.avatar.style);updatePhotoPreview();updateCreator();$('photo-message').textContent=t('Colors applied. Tune your fighter.');}
 catch(error){if(version!==photoVersion)return;creatorError(error.message||'Could not read this photo. Try another.');$('photo-message').textContent=t(draft.photo?'Your previous photo is kept.':'Choose JPEG, PNG or WebP.');}
 finally{if(version===photoVersion){photoBusy=false;setBusy();}}
}
async function analyze(){
 if(photoBusy||analysisBusy)return;
 if(!hasAvatarApi()){creatorError('AI is not connected. Photo colors still work.');return;}
 if(!draft?.photo){creatorError('Choose a photo first.');return;}
 const version=photoVersion,controller=new AbortController();analysisController=controller;analysisBusy=true;analysisPhase='waking';setBusy();$('creator-error').hidden=true;$('photo-message').textContent=t('Waking AI… First use can take a minute.');
 try{const avatar=await requestAvatar(draft.apiImage||draft.photo,{signal:controller.signal,onStatus:phase=>{if(version!==photoVersion)return;analysisPhase=phase;setBusy();$('photo-message').textContent=t(phase==='waking'?'Waking AI… First use can take a minute.':'Finding your fighter’s colors…');}});if(version!==photoVersion)return;draft.avatar={...avatar,target:draft.avatar.target};updateCreator();updatePhotoPreview();$('photo-message').textContent=avatar.summary;}
 catch(error){if(version!==photoVersion)return;creatorError(error.message||'AI unavailable. Photo colors are kept.');$('photo-message').textContent=t('Your fighter is kept. Ready to fight.');}
 finally{if(analysisController===controller)analysisController=null;if(version===photoVersion){analysisBusy=false;setBusy();}}
}
async function saveAndPlay(event){
 event.preventDefault();if(photoBusy||analysisBusy)return;
 const name=$('level-name').value.trim();if(!name){creatorError('Name your duel.');return;}
 let location;if($('location-select').value==='custom'){const lat=Number($('custom-lat').value),lon=Number($('custom-lon').value),name=$('custom-name').value.trim();if(!name||!Number.isFinite(lat)||!Number.isFinite(lon)||lat< -85||lat>85||lon< -180||lon>180){creatorError('Enter a place, latitude −85 to 85 and longitude −180 to 180.');return;}location={name,lat,lon};}else location=CITIES.find(c=>c.id===$('location-select').value);
 const {editing,apiImage,...base}=draft;const level={...base,isDemo:false,name,location,scene:validateScene(draft.scene),avatar:validateAvatar(draft.avatar)};
 $('save-start').disabled=true;
 try{await modules.saveLevel(level);const index=levels.findIndex(l=>l.id===level.id);if(index<0)levels.unshift(level);else levels[index]=level;selectedId=level.id;$('creator').close();renderAtlas();startDuel(level);}
 catch(error){creatorError(t('Not saved: {error} Your photo is kept.',{error:t(error.message||'Device storage is unavailable.')}));}
 finally{$('save-start').disabled=false;}
}
/* Photo gate: a travel photo becomes a new stage. Scan → reveal on the globe → challenge → forge the arena → duel. */
function gateStatus(message='',state=''){const node=$('gate-status');node.dataset.message=message;node.textContent=t(message);node.dataset.state=state;}
function setGateBusy(busy){gate.busy=busy;$('photo-gate').classList.toggle('is-busy',busy);$('gate-input').disabled=busy;}
function loadPicture(src){return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('Could not show this photo.'));image.src=src;});}
function drawGate(block,scan){
 const canvas=$('gate-canvas'),ctx=canvas.getContext('2d'),image=gate.image;if(!image)return;
 const w=canvas.width,h=canvas.height,scale=Math.max(w/image.naturalWidth,h/image.naturalHeight),sw=w/scale,sh=h/scale,sx=(image.naturalWidth-sw)/2,sy=(image.naturalHeight-sh)/2;
 if(!image.naturalWidth||!image.naturalHeight||!(block>0))return;
 const small=document.createElement('canvas');small.width=Math.max(1,Math.round(w/block));small.height=Math.max(1,Math.round(h/block));
 small.getContext('2d').drawImage(image,sx,sy,sw,sh,0,0,small.width,small.height);
 ctx.imageSmoothingEnabled=false;ctx.drawImage(small,0,0,w,h);
 if(scan!==undefined){const y=Math.round(scan*h/4)*4;ctx.fillStyle='#10181bb0';ctx.fillRect(0,0,w,y);ctx.fillStyle='#f6dca0';ctx.fillRect(0,y,w,4);ctx.fillStyle='#f6dca055';ctx.fillRect(0,y+4,w,4);}
}
function startScan(){
 cancelAnimationFrame(gate.scanRaf);$('gate-canvas').hidden=false;$('photo-gate').classList.add('is-scanning');
 const started=performance.now();
 const step=now=>{const t=Math.max(0,(now-started)/1000);drawGate([20,14,10,7,5,7,10,14][Math.floor(t*5)%8]||10,(t*.7)%1);gate.scanRaf=requestAnimationFrame(step);};
 gate.scanRaf=requestAnimationFrame(step);
}
function stopScan(){cancelAnimationFrame(gate.scanRaf);gate.scanRaf=0;$('photo-gate').classList.remove('is-scanning');drawGate(4);}
async function gatePhoto(file){
 if(!file||gate.busy)return;if(!ensureReady())return;
 if(!hasArenaApi()){gateStatus('Photo stages need the online scout. Try again later.','error');return;}
 setGateBusy(true);gate.excluded=[];gate.pending=null;hideReveal();gateStatus('Reading photo…','busy');
 try{
  const result=await modules.preparePhoto(file);
  gate.photo=result.thumbnail;gate.apiImage=result.dataUrl;gate.gps=result.gps||null;gate.image=await loadPicture(result.thumbnail);
  $('photo-gate').classList.add('has-photo');
  await scanPlace();
 }catch(error){gateStatus(error.message||'Could not read this photo. Try another.','error');}
 finally{setGateBusy(false);}
}
async function scanPlace(){
 if(!gate.apiImage&&!gate.photo)return;
 const controller=new AbortController();gate.controller?.abort();gate.controller=controller;
 hideReveal();setGateBusy(true);startScan();gateStatus('Waking the scout…','busy');
 try{
  const hint=gate.gps?zoneForCoordinates(gate.gps.lat,gate.gps.lon).id:undefined;
  const place=await recognizePlace(gate.apiImage||gate.photo,{zone:hint,gps:gate.gps||undefined,exclude:gate.excluded,signal:controller.signal,onStatus:phase=>{if(gate.controller===controller)gateStatus(phase==='waking'?'Waking the scout… the first scan can take a minute.':'Reading the terrain…','busy');}});
  if(gate.controller!==controller)return;
  const coords=gate.gps||(Number.isFinite(place.latitude)&&Number.isFinite(place.longitude)?{lat:place.latitude,lon:place.longitude}:null);
  const zone=coords?zoneForCoordinates(coords.lat,coords.lon):getZone(place.zone);
  const location=coords?{name:(place.city||zone.place).slice(0,60),country:(place.country||zone.country).slice(0,60),lat:coords.lat,lon:coords.lon}:{name:zone.place,country:zone.country,lat:zone.lat,lon:zone.lon};
  const preset=sceneForZone(zone.id);
  const level={id:gate.pending?.id||crypto.randomUUID(),name:(place.recognized&&place.name?place.name:zone.stage).slice(0,60),isDemo:false,location,
   scene:validateScene({...preset,palette:{...place.palette},opponentStyle:place.opponentStyle,summary:place.summary,placeName:place.name,source:'manual'}),
   place:{name:place.name,scenePrompt:place.scenePrompt,setting:place.setting,lighting:place.lighting,zone:zone.id,environment:place.environment},
   photo:gate.photo,cleared:false,createdAt:gate.pending?.createdAt||new Date().toISOString()};
  const saved=await modules.saveLevel(level);
  const index=levels.findIndex(l=>l.id===saved.id);if(index<0)levels.unshift(saved);else levels[index]=saved;
  gate.pending=saved;if(place.recognized&&place.name&&!gate.excluded.includes(place.name))gate.excluded=[...gate.excluded,place.name].slice(-3);
  selectedId=saved.id;renderAtlas();stopScan();gateStatus('');
  globe.reveal(zone.id,location);showReveal(saved,place,zone);
 }catch(error){if(gate.controller!==controller)return;stopScan();gateStatus(error.name==='AbortError'?'':error.message||'The scout lost the trail. Try again.','error');}
 finally{if(gate.controller===controller){gate.controller=null;setGateBusy(false);}}
}
function stamp(node,text){node.textContent='';node.setAttribute('aria-label',text);text.split(' ').forEach((word,k)=>{if(k)node.append(' ');const span=document.createElement('span');span.textContent=word;span.setAttribute('aria-hidden','true');node.append(span);});}
function showReveal(level,place,zone){
 gate.reveal={level,place,zone};renderReveal();
 const panel=$('reveal');panel.hidden=false;panel.classList.remove('is-in');void panel.offsetWidth;panel.classList.add('is-in');
 $('reveal-challenge').focus({preventScroll:true});
}
function renderReveal(){
 if(!gate.reveal)return;const {place,zone}=gate.reveal;
 $('reveal-eyebrow').textContent=t(place.recognized?'New stage unlocked':'Uncharted stage unlocked');
 stamp($('reveal-title'),(place.recognized&&place.name?place.name:t('Somewhere in {zone}',{zone:t(zone.name)})).toUpperCase());
 $('reveal-sub').textContent=[place.recognized?place.city:null,place.recognized?place.country:null,t(zone.name)].filter(Boolean).join(' · ');
}
function hideReveal(){$('reveal').hidden=true;$('reveal').classList.remove('is-in');}
async function forgeAndFight(level){
 if(!level)return;if(!ensureReady())return;
 if(level.scene?.backdrop||!level.place||!hasArenaApi()){globe.clearReveal();launchDuel(level);return;}
 const controller=new AbortController(),started=Date.now();forgeController=controller;forgeSkipped=false;
 $('forge').hidden=false;$('challenge-selected').disabled=true;
 const tick=()=>{$('forge-time').textContent=`${Math.round((Date.now()-started)/1000)}s · ${level.location.name.toUpperCase()}`;};tick();clearInterval(forgeTimer);forgeTimer=setInterval(tick,1000);
 let ready=level;
 try{
  const image=gate.pending?.id===level.id&&gate.apiImage?gate.apiImage:level.photo;
  const {backdrop}=await paintArena({image,zone:level.place.zone,scenePrompt:level.place.scenePrompt,setting:level.place.setting,lighting:level.place.lighting,placeName:level.place.name},{signal:controller.signal});
  const pixel=await pixelizeBackdrop(backdrop);await modules.registerBackdrop(pixel);
  const painted={...level,scene:validateScene({...level.scene,stageId:null,environment:level.place.environment,lighting:level.place.lighting,elements:defaultScene(level.place.environment).elements,backdrop:pixel,source:'ai'})};
  ready=await modules.saveLevel(painted);
  const index=levels.findIndex(l=>l.id===ready.id);if(index>=0)levels[index]=ready;
 }catch(error){if(forgeController!==controller)return;if(!forgeSkipped)toast('The painter is resting. This duel uses the region’s stage.');}
 finally{clearInterval(forgeTimer);if(forgeController===controller){forgeController=null;$('forge').hidden=true;$('challenge-selected').disabled=false;}}
 if(forgeController!==null)return;
 globe.clearReveal();renderAtlas();launchDuel(ready);
}
function clearKeys(){Object.keys(keys).forEach(k=>keys[k]=false);document.querySelectorAll('[data-control]').forEach(b=>b.classList.remove('pressed'));}
function stopDuel(){mouseLine=null;playerFree=true;duelGeneration++;cancelAnimationFrame(raf);raf=0;engine=null;currentLevel=null;duelInputs=null;activeSettings=null;clearKeys();previousTime=0;accumulator=0;hudCache.clear();$('result-panel').hidden=true;$('duel-status').textContent='';}
function returnToMap(){stopDuel();document.body.classList.remove('is-dueling');$('duel-screen').hidden=true;$('atlas-screen').hidden=false;globe.setVisible(true);globe.resize();renderAtlas();$('world-map').focus({preventScroll:true});if(firstLitId){setTimeout(()=>{firstLitId=null;},1600);}}
function initAudio(){try{audio ||= new CombatAudio();void audio.start().then(()=>audio.event('begin')).catch(()=>{});}catch{/* Audio is decorative; the duel remains playable. */}}
function sound(type){audio?.event(type);}
function toggleSound(){audio ||= new CombatAudio();const enabled=audio.toggle();$('nav-sound').textContent=t(enabled?'Sound: On':'Sound: Off');$('nav-sound').setAttribute('aria-pressed',String(enabled));if(enabled&&engine)initAudio();}
function launchDuel(level){
 bloodDecals=[];bloodSeen=new Set();
 if(!ensureReady())return;
 const assignment=validateAssignments(settings.mode,settings.devices,connectedPads());
 if(!assignment.valid){toast(assignment.message);startDuel(level);return;}
 if(level.avatar?.palette)modules.warmAvatarPalette(level.avatar.style,level.avatar.palette);
 stopDuel();setAim('mid');activeSettings=normalizeSettings(settings);duelInputs=new DuelInputs(activeSettings);
 globe.setVisible(false);document.body.classList.add('is-dueling');currentLevel=level;
 if(level.scene?.backdrop&&!modules.hasBackdrop(level.scene.backdrop))modules.registerBackdrop(level.scene.backdrop).catch(()=>{});
 initAudio();engine=new modules.DuelEngine({seed:Date.now()%2147483647,difficulty:$('difficulty-select').value,mode:activeSettings.mode});resultHandled=false;heard=new Set();
 resultCopy=null;renderDuelLabels();
 const hasKeyboard=keyboardPlayer()>=0;
 $('keyboard-controls').hidden=!hasKeyboard;$('touch-controls').hidden=!hasKeyboard;
 $('atlas-screen').hidden=true;$('duel-screen').hidden=false;
 window.scrollTo({top:0,behavior:'instant'});$('duel-canvas').focus({preventScroll:true});previousTime=0;accumulator=0;raf=requestAnimationFrame(frame);
}
function renderDuelLabels(){
 if(!engine||!activeSettings)return;
 const local=activeSettings.mode==='local',deviceName=device=>device==='keyboard'?t('KEYS'):t('PAD {number}',{number:gamepadIndex(device)+1});
 $('player-label').textContent=`${local?'P1':t('YOU')} · ${deviceName(activeSettings.devices[0])}`;
 $('rival-label').textContent=local?`P2 · ${deviceName(activeSettings.devices[1])}`:t('AI RIVAL');
 $('keyboard-controls').setAttribute('aria-label',t('Player {player} sword stance',{player:keyboardPlayer()+1}));
 $('touch-controls').setAttribute('aria-label',t('Player {player} touch combat controls',{player:keyboardPlayer()+1}));
 $('duel-canvas').setAttribute('aria-label',t('Sword duel. Open Controls to view each player’s input bindings. Escape pauses.'));
 $('duel-title').textContent=levelTitle(currentLevel);
 $('duel-region').textContent=`${currentLevel.isDemo?t(currentLevel.location.name):currentLevel.location.name} / ${t(local?'LOCAL TWO-PLAYER':'SINGLE PLAYER')}`;
 $('pause-button').innerHTML=`${t(engine.paused?'Resume':'Pause')} <span class="key-mini">Esc</span>`;
 $('combat-tip').textContent=t(local?'Player 1 vs Player 2 · One clean hit wins':'You vs AI · One clean hit wins');
}
function drawDuel(snapshot){
 const ctx=$('duel-canvas').getContext('2d');ctx.clearRect(0,0,WORLD.width,WORLD.height);ctx.save();if(snapshot.shake){const amount=snapshot.shake*5;ctx.translate(Math.round(Math.sin(snapshot.time*117)*amount),Math.round(Math.cos(snapshot.time*89)*amount*.5));}modules.drawScene(ctx,currentLevel.scene,snapshot.time);
 for(const effect of snapshot.effects){if(bloodSeen.has(effect.id))continue;bloodSeen.add(effect.id);if(effect.type==='hit'||(effect.type==='slash'&&snapshot.phase==='postVictory'&&(snapshot.result==='victory'||snapshot.mode==='local'))){bloodDecals.push({x:effect.x,y:effect.type==='hit'?effect.y:WORLD.ground-90,facing:effect.facing||snapshot.player.facing,seed:effect.id,flick:effect.type==='slash'});if(bloodDecals.length>40)bloodDecals.shift();}}
 modules.drawBloodDecals(ctx,bloodDecals);
 const avatar=currentLevel.avatar;
 modules.drawFighter(ctx,snapshot.player,avatar?.target==='player'?avatar.style:'traveler',true,snapshot.time,{wet:currentLevel.scene.environment!=='wilderness',palette:avatar?.target==='player'?avatar.palette:null});modules.drawFighter(ctx,snapshot.opponent,avatar?.target==='opponent'?avatar.style:currentLevel.scene.opponentStyle,false,snapshot.time,{wet:currentLevel.scene.environment!=='wilderness',palette:avatar?.target==='opponent'?avatar.palette:null});modules.drawEffects(ctx,snapshot.effects,snapshot.time);ctx.restore();
 const keyboardFighter=keyboardPlayer()===1?snapshot.opponent:snapshot.player;
 const meter=$('charge-meter');if(meter){meter.value=keyboardFighter.charge||0;meter.hidden=keyboardFighter.state!=='charge';}
 playerFree=FREE_STATES.includes(keyboardFighter.state);if(canKeyboardFight())applyMouseLine();
 const fighterStatus=f=>f.counterReady?t('Counter ready'):`${t(stanceLabels[f.stance]||'Mid')}${f.guarding?' · '+t('Guard'):''}${f.state==='charge'?` · ${Math.round(f.charge*100)}%`:''}`;
 hudText('rival-stance',fighterStatus(snapshot.opponent));
 hudText('player-stance',fighterStatus(snapshot.player));
 document.querySelectorAll('[data-stance]').forEach(button=>{const active=button.dataset.stance===aim;if(button.getAttribute('aria-pressed')!==String(active)){button.setAttribute('aria-pressed',String(active));button.classList.toggle('active',active);}});
 const counterButton=document.querySelector('[data-control=counter]');if(counterButton)counterButton.classList.toggle('ready',Boolean(keyboardFighter.counterReady));
 // Stable compact status; avoid rebuilding live text on every animation frame.
 const text=snapshot.paused?'PAUSED':snapshot.phase==='countdown'?String(Math.max(1,Math.ceil(snapshot.countdown))):'';
 hudText('duel-status',text);
 if(snapshot.message&&snapshot.phase==='playing')hudText('combat-tip',snapshot.message);
 if(snapshot.phase==='postVictory')hudText('combat-tip',snapshot.mode==='local'?t('Player {player} wins · {seconds}s',{player:snapshot.result==='victory'?1:2,seconds:Math.ceil(snapshot.postVictoryRemaining)}):snapshot.result==='victory'?t('Free play · {seconds}s',{seconds:Math.ceil(snapshot.postVictoryRemaining)}):'');
 for(const effect of snapshot.effects){if(!heard.has(effect.id)){heard.add(effect.id);sound(effect.type);}}
}
function frame(now){
 if(!engine)return;if(!previousTime)previousTime=now;const delta=Math.min((now-previousTime)/1000,.1);previousTime=now;
 const pads=connectedPads(),assignment=validateAssignments(activeSettings.mode,activeSettings.devices,pads);
 if(!assignment.valid&&!engine.paused&&engine.phase!=='result'){togglePause(true);toast(t('{message} Duel paused; reconnect or open Controls.',{message:assignment.message}));}
 const input=duelInputs.sample(pads,{...keys,aim},{suspended:dialogOpen()||document.hidden,paused:engine.paused});
 if(input.pause)togglePause();
 if(input.rematch&&engine.phase==='result')retry();
 if(input.pause||input.rematch)accumulator=0;
 else {accumulator+=delta;while(accumulator>=1/60){engine.tick(1/60,input.players[0],input.players[1]);accumulator-=1/60;}}
 const state=engine.snapshot();drawDuel(state);if(state.phase==='result'&&!resultHandled){resultHandled=true;finishDuel(state.result);}raf=requestAnimationFrame(frame);
}
function togglePause(force){
 if(!engine||engine.phase==='result')return;
 const paused=typeof force==='boolean'?force:!engine.paused;
 if(!paused){const assignment=validateAssignments(activeSettings.mode,activeSettings.devices,connectedPads());if(!assignment.valid){toast(assignment.message);return;}}
 clearKeys();mouseLine=null;duelInputs?.suppress();engine.setPaused(paused);accumulator=0;previousTime=0;
 $('pause-button').innerHTML=`${t(paused?'Resume':'Pause')} <span class="key-mini">Esc</span>`;
 if(!paused)$('duel-canvas').focus({preventScroll:true});
}
function retry(){
 if(!engine)return;
 const assignment=validateAssignments(activeSettings.mode,activeSettings.devices,connectedPads());
 if(!assignment.valid){toast(assignment.message);openSettings();return;}
 bloodDecals=[];bloodSeen=new Set();duelGeneration++;clearKeys();mouseLine=null;setAim('mid');duelInputs.reset();engine.reset(Date.now()%2147483647);resultHandled=false;resultCopy=null;heard=new Set();hudCache.clear();$('result-panel').hidden=true;$('combat-tip').textContent=t('One clean hit wins');$('pause-button').innerHTML=`${t('Pause')} <span class="key-mini">Esc</span>`;accumulator=0;previousTime=0;$('duel-canvas').focus({preventScroll:true});
}
async function finishDuel(result){
 const level=currentLevel, generation=duelGeneration, activeEngine=engine;const victory=result==='victory',draw=result==='draw',local=activeSettings.mode==='local';let saveMessage='';
 if(!local&&victory&&!level.cleared){const completed={...level,cleared:true};try{await modules.saveLevel(completed);const index=levels.findIndex(l=>l.id===level.id);if(index>=0)levels[index]=completed;firstLitId=completed.id;if(engine===activeEngine&&duelGeneration===generation)currentLevel=completed;saveMessage='{place} cleared.';}catch{saveMessage='Victory! Progress not saved.';}}
 else if(!local&&victory)saveMessage='Already cleared.';
 await new Promise(resolve=>setTimeout(resolve,520));
 if(engine!==activeEngine||duelGeneration!==generation||engine.snapshot().phase!=='result')return;
 resultCopy={result,saveMessage};renderResult();
 $('result-primary').focus({preventScroll:true});
}
function renderResult(){
 if(!resultCopy||!engine)return;const {result,saveMessage}=resultCopy;
 const victory=result==='victory',draw=result==='draw',local=activeSettings.mode==='local';
 const title=draw?t('DRAW'):local?t('PLAYER {player} WINS',{player:victory?1:2}):t(victory?'VICTORY':'DEFEATED'),worldFirst=victory&&!local;
 const message=t(local?'Local duel · no travel stamps awarded.':victory?saveMessage:draw?'One more cut.':'Find your opening.',{place:currentLevel.isDemo?t(currentLevel.location.name):currentLevel.location.name});
 const panel=$('result-panel');panel.innerHTML=`<h2>${escape(title)}</h2><p>${escape(message)}</p><div class="result-actions"><button id="result-primary" class="button primary">${t(worldFirst?'World':'Rematch')}</button><button id="result-secondary" class="button secondary">${t(worldFirst?'Rematch':'World')}</button>${!local&&victory&&!currentLevel.cleared?`<button id="save-victory" class="button secondary">${t('Save Again')}</button>`:''}</div><p class="result-hint">${t('R / View / Share · rematch')}</p>`;panel.hidden=false;
 $('result-primary').onclick=worldFirst?returnToMap:retry;$('result-secondary').onclick=worldFirst?retry:returnToMap;if($('save-victory'))$('save-victory').onclick=()=>finishDuel('victory');
}
const keyMap={KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right',KeyJ:'attack',KeyK:'parry',Space:'dodge',KeyC:'duck',KeyL:'counter',KeyV:'shove'};
const stanceKeys={KeyW:'high',ArrowUp:'high',Digit1:'high',KeyX:'mid',Digit2:'mid',KeyS:'low',ArrowDown:'low',Digit3:'low'};
document.querySelectorAll('[data-stance]').forEach(button=>button.onclick=()=>{if(!canKeyboardFight())return;setAim(button.dataset.stance);$('duel-canvas').focus({preventScroll:true});});
/* Mouse: height over the arena sets the blade line, left button charges and strikes, right button evades. */
// The mouse line has hysteresis, and it only changes the stance while the fighter is free to: a hand drifting
// during a cut must not withdraw it as a feint. Keyboard line changes still feint on purpose.
{const canvas=$('duel-canvas');const HIGH=WORLD.ground-118,LOW=WORLD.ground-46,PAD=12;
 const lineAt=event=>{const rect=canvas.getBoundingClientRect();const y=(event.clientY-rect.top)/rect.height*WORLD.height;const current=mouseLine||'mid';
  if(current==='high')return y<HIGH+PAD?'high':y>LOW+PAD?'low':'mid';if(current==='low')return y>LOW-PAD?'low':y<HIGH-PAD?'high':'mid';return y<HIGH-PAD?'high':y>LOW+PAD?'low':'mid';};
 canvas.addEventListener('pointermove',event=>{if(!canKeyboardFight()||event.pointerType!=='mouse')return;mouseLine=lineAt(event);applyMouseLine();});
 canvas.addEventListener('pointerdown',event=>{if(!canKeyboardFight()||event.pointerType!=='mouse')return;event.preventDefault();canvas.focus({preventScroll:true});initAudio();if(event.button===0)keys.attack=true;else if(event.button===2)keys.dodge=true;});
 const releaseMouse=event=>{if(event.pointerType!=='mouse')return;if(event.button===0)keys.attack=false;else if(event.button===2)keys.dodge=false;};
 canvas.addEventListener('pointerup',releaseMouse);canvas.addEventListener('pointercancel',releaseMouse);canvas.addEventListener('pointerleave',event=>{if(event.pointerType==='mouse'){keys.attack=false;keys.dodge=false;}});
 canvas.addEventListener('contextmenu',event=>event.preventDefault());}
window.addEventListener('keydown',event=>{
 const editing=event.target?.matches?.('input,textarea,select,[contenteditable=true]');
 if(event.code==='KeyM'&&!event.repeat&&!editing){event.preventDefault();toggleSound();return;}
 if(!engine||dialogOpen()||editing)return;
 if(event.code==='Escape'&&!event.repeat){event.preventDefault();togglePause();return;}
 if(event.code==='KeyR'&&!event.repeat&&engine.phase==='result'){event.preventDefault();retry();return;}
 if(!canKeyboardFight())return;
 if(stanceKeys[event.code]){event.preventDefault();if(!event.repeat)setAim(stanceKeys[event.code]);}
 if(keyMap[event.code]){event.preventDefault();if(!event.repeat)keys[keyMap[event.code]]=true;}
});
window.addEventListener('keyup',event=>{if(keyMap[event.code]){keys[keyMap[event.code]]=false;if(engine)event.preventDefault();}});
window.addEventListener('blur',()=>{clearKeys();if(engine)togglePause(true);});document.addEventListener('visibilitychange',()=>{if(document.hidden){clearKeys();if(engine)togglePause(true);}});
document.querySelectorAll('[data-control]').forEach(button=>{const control=button.dataset.control;button.addEventListener('pointerdown',event=>{if(!canKeyboardFight())return;event.preventDefault();button.setPointerCapture(event.pointerId);keys[control]=true;button.classList.add('pressed');initAudio();});const release=()=>{keys[control]=false;button.classList.remove('pressed');};button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);});
function registerTools(){const context=document.modelContext;if(!context?.registerTool)return;const lifecycle=new AbortController();const tools=[{name:'read_atlas',description:'Read saved local levels and which stops have been cleared.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute(input){if(!input||typeof input!=='object'||Object.keys(input).length)throw new Error('Expected an empty object');return {levels:levels.map(l=>({id:l.id,name:l.name,location:l.location.name,cleared:l.cleared}))};}},{name:'start_duel',description:'Open mode and input selection for an existing local level. Confirm Start duel to play; winning requires gameplay.',inputSchema:{type:'object',properties:{levelId:{type:'string'}},required:['levelId'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){if(!input||Object.keys(input).some(k=>k!=='levelId')||typeof input.levelId!=='string')throw new Error('Expected a levelId string');const level=levels.find(l=>l.id===input.levelId);if(!level||!modules||!gameReady)throw new Error('Level unavailable');if(dialogOpen())throw new Error('Close the open dialog first');startDuel(level);return {levelId:level.id,phase:'setup'};}}];for(const tool of tools){try{Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}}window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});}
$('brand')?.addEventListener('click',returnToMap);document.querySelector('.brand').onclick=event=>{event.preventDefault();if(engine)returnToMap();};
$('upload-open').onclick=()=>openCreator({level:selected()?.isDemo?null:selected()});$('play-demo').onclick=()=>startDuel(levels.find(l=>l.id==='demo-maple')||selected());$('challenge-selected').onclick=()=>startDuel(selected());$('edit-selected').onclick=()=>openCreator({level:selected()});$('nav-map').onclick=()=>{if(engine)returnToMap();};$('nav-sound').onclick=toggleSound;$('menu-destinations').onclick=()=>{const drawer=$('journey-drawer');drawer.open=!drawer.open;if(drawer.open)drawer.querySelector('summary').focus({preventScroll:true});};
$('menu-settings').onclick=openSettings;$('duel-settings').onclick=openSettings;$('duel-bindings').onclick=openSettings;
function renderLanguage(){
 $('language-current').textContent=getLanguage()==='zh-CN'?'中':'EN';
 document.querySelectorAll('[data-language]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.language===getLanguage())));
 $('nav-sound').textContent=t($('nav-sound').getAttribute('aria-pressed')==='false'?'Sound: Off':'Sound: On');
}
for(const button of document.querySelectorAll('[data-language]'))button.onclick=()=>{
 if(button.dataset.language!==getLanguage()&&engine)togglePause(true);
 setLanguage(button.dataset.language);$('language-picker').open=false;$('language-toggle').focus();
};
document.addEventListener('pointerdown',event=>{if(!$('language-picker').contains(event.target))$('language-picker').open=false;});
$('language-picker').addEventListener('keydown',event=>{if(event.key==='Escape'){$('language-picker').open=false;$('language-toggle').focus();event.stopPropagation();}});
onLanguageChange(()=>{
 renderLanguage();updateModeMenu();renderAtlas();renderReveal();
 // Rebuild labels, not saved data. Preserve any in-progress creator choices.
 const location=$('location-select').value;
 setupChoices();if(draft){$('location-select').value=location;updateCreator();}
 setBusy();hudCache.clear();renderDuelLabels();renderResult();
 gateStatus($('gate-status').dataset.message||'',$('gate-status').dataset.state||'');
});
$('creator-close').onclick=()=>$('creator').close();$('creator').addEventListener('close',()=>{analysisController?.abort();analysisController=null;photoVersion++;photoBusy=false;analysisBusy=false;draft=null;});$('duel-back').onclick=returnToMap;$('pause-button').onclick=()=>togglePause();
$('photo-input').onchange=event=>pickPhoto(event.target.files[0]);$('photo-drop').addEventListener('dragover',event=>{event.preventDefault();$('photo-drop').classList.add('dragover');});$('photo-drop').addEventListener('dragleave',()=>$('photo-drop').classList.remove('dragover'));$('photo-drop').addEventListener('drop',event=>{event.preventDefault();$('photo-drop').classList.remove('dragover');pickPhoto(event.dataTransfer.files[0]);});
$('location-select').onchange=updateLocationFields;$('lighting-select').onchange=()=>{draft.scene.lighting=$('lighting-select').value;markManual();updateCreator();};$('style-select').onchange=()=>{draft.avatar.style=$('style-select').value;updateCreator();};$('ai-analyze').onclick=analyze;$('creator-form').onsubmit=saveAndPlay;
$('gate-input').onchange=event=>{gatePhoto(event.target.files[0]);event.target.value='';};$('photo-gate').addEventListener('dragover',event=>{event.preventDefault();$('photo-gate').classList.add('dragover');});$('photo-gate').addEventListener('dragleave',()=>$('photo-gate').classList.remove('dragover'));$('photo-gate').addEventListener('drop',event=>{event.preventDefault();$('photo-gate').classList.remove('dragover');gatePhoto(event.dataTransfer.files[0]);});$('reveal-challenge').onclick=()=>{const level=gate.pending;hideReveal();if(level)startDuel(level);};$('reveal-rescan').onclick=()=>scanPlace();$('reveal-close').onclick=()=>{hideReveal();globe.clearReveal();};$('forge-skip').onclick=()=>{forgeSkipped=true;forgeController?.abort();};
$('zone-select').onchange=()=>{const zone=getZone($('zone-select').value);draft.scene=sceneForZone(zone.id);draft.location={name:zone.place,country:zone.country,lat:zone.lat,lon:zone.lon};$('level-name').value=`${zone.stage} · Custom`;const city=CITIES.find(city=>city.name===zone.place);$('location-select').value=city?.id||'custom';$('custom-name').value=zone.place;$('custom-lat').value=zone.lat;$('custom-lon').value=zone.lon;updateLocationFields();updateCreator();};
$('avatar-target').onchange=()=>{draft.avatar.target=$('avatar-target').value;updateCreator();};
for(const key of Object.keys(DEFAULT_AVATAR))$(`avatar-${key}`).oninput=()=>{draft.avatar.palette[key]=$(`avatar-${key}`).value;draft.avatar.source='local';updatePhotoPreview();drawPreview($('creator-preview'),draft.scene,draft.avatar);};
window.addEventListener('pagehide',()=>{globe.destroy();duelSetup.destroy();},{once:true});
// ?debug exposes the live duel for automated playtests; it changes nothing else.
if(new URLSearchParams(location.search).has('debug'))window.__duel={get engine(){return engine;},get aim(){return aim;},get keys(){return {...keys};},get settings(){return structuredClone(activeSettings||settings);}};
setupChoices();setBusy();renderAtlas();updateModeMenu();renderLanguage();for(const id of ['play-demo','challenge-selected','upload-open','edit-selected'])$(id).disabled=true;registerTools();init();

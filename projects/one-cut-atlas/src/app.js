import { CITIES, ENVIRONMENTS, LIGHTINGS, STYLES, ELEMENTS, LABELS, WORLD, defaultScene, validateScene } from './shared.js';
import { Globe } from './globe.js';
import { TRAVEL_ZONES, getZone, sceneForZone, createZoneLevels, zoneForCoordinates } from './region-presets.js';
import { DEFAULT_AVATAR, avatarFromPalette, validateAvatar, requestAvatar } from './avatar.js';
const $ = id => document.getElementById(id);
const globe = new Globe($('world-map'), {onSelect:id=>selectLevel(id), onCreate:point=>openCreator({point})});
const demos = createZoneLevels();
let levels=structuredClone(demos),selectedId=levels[0].id,modules=null,gameReady=false,land=null,draft=null,photoVersion=0,photoBusy=false,analysisBusy=false;
let engine=null,currentLevel=null,raf=0,previousTime=0,accumulator=0,resultHandled=false,toastTimer=0,firstLitId=null,audio=null,heard=new Set(),duelGeneration=0;
let bloodDecals=[],bloodSeen=new Set();
const keys={left:false,right:false,attack:false,parry:false,dodge:false,duck:false,counter:false,shove:false};
let aim='mid';
const stanceLabels={high:'上劈',mid:'横斩',low:'下撩'};
function setAim(value){if(!stanceLabels[value])return;aim=value;document.querySelectorAll('[data-stance]').forEach(button=>{const active=button.dataset.stance===aim;button.setAttribute('aria-pressed',String(active));button.classList.toggle('active',active);});}
const escape = value => String(value ?? '').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,4300);}
function selected(){return levels.find(l=>l.id===selectedId)||levels[0];}
function renderMap(){globe.setLevels(levels,selectedId);}
function renderAtlas(){
 const count=levels.filter(l=>l.cleared).length;$('cleared-count').textContent=String(count).padStart(2,'0');$('progress-fill').style.width=`${count/Math.max(levels.length,1)*100}%`;
 $('progress-copy').textContent=count?`已走过 ${count} 站。下一站，由你决定。`:'第一刀，从这里开始。';$('level-count').textContent=String(levels.length).padStart(2,'0');
 $('level-list').innerHTML=levels.map(l=>`<button class="level-item ${l.id===selectedId?'selected':''} ${l.cleared?'cleared':''}" data-level="${escape(l.id)}"><span class="level-dot">${l.cleared?'✦':'◇'}</span><span><b>${escape(l.location.name)}</b><small>${escape(l.name)} · ${l.cleared?'已点亮':'可挑战'}</small></span><span class="level-chevron">›</span></button>`).join('');
 $('level-list').querySelectorAll('button').forEach(btn=>btn.onclick=()=>selectLevel(btn.dataset.level));
 $('zone-list').innerHTML=TRAVEL_ZONES.map((zone,index)=>`<button class="zone-button ${selected()?.scene.travelZone===zone.id?'active':''}" data-zone="${zone.id}" style="--zone-color:${zone.color}" aria-pressed="${selected()?.scene.travelZone===zone.id}"><span>${String(index+1).padStart(2,'0')}</span>${escape(zone.label)}${zone.flagship?'<i>★</i>':''}</button>`).join('');
 $('zone-list').querySelectorAll('button').forEach(button=>button.onclick=()=>selectLevel(`zone-${button.dataset.zone}`));
 $('zone-progress').textContent=`${TRAVEL_ZONES.filter(zone=>levels.some(level=>level.scene.travelZone===zone.id&&level.cleared)).length} / 11 ZONES CLEARED`;
 renderMap();renderSelected();
}
function drawPreview(canvas,scene,avatar=null){
 if(!modules)return;
 const ctx=canvas.getContext('2d');modules.drawScene(ctx,scene,0);
 modules.drawFighter(ctx,{x:360,facing:1,state:'idle',timer:0,stateDuration:1,dead:false},avatar?.target==='player'?avatar.style:'traveler',true,0,{wet:scene.environment!=='wilderness',palette:avatar?.target==='player'?avatar.palette:null});
 modules.drawFighter(ctx,{x:600,facing:-1,state:'idle',timer:0,stateDuration:1,dead:false},avatar?.target==='opponent'?avatar.style:scene.opponentStyle,false,0,{wet:scene.environment!=='wilderness',palette:avatar?.target==='opponent'?avatar.palette:null});
}
function renderSelected(){const l=selected();if(!l)return;const zone=getZone(l.scene.travelZone);$('selected-title').textContent=l.name;$('selected-region').textContent=`${zone.name.toUpperCase()} / ${l.location.name}`;$('selected-description').textContent=l.scene.summary;$('selected-source').textContent=l.avatar?'自定义角色':zone.flagship?'旗舰场景':'基础场景';$('selected-tags').innerHTML=[zone.label,l.cleared?'已点亮':'可挑战'].map(t=>`<span>${escape(t)}</span>`).join('');$('challenge-selected').textContent=l.cleared?'重游这站':'挑战这站';drawPreview($('selected-preview'),l.scene,l.avatar);}
function selectLevel(id){selectedId=id;renderAtlas();globe.focusLocation(selected().location);const drawer=$('journey-drawer');if(drawer)drawer.open=false;}
function ensureReady(){if(modules&&gameReady)return true;toast('场景正在准备，稍等一下再试。');return false;}
async function init(){
 try{const response=await fetch('./assets/world-land.geojson');if(!response.ok)throw new Error();land=await response.json();globe.setLand(land);renderMap();}catch{toast('地图轮廓暂时无法加载；你仍可从关卡列表开始。');}
 try{const [combat,render,photo,storage]=await Promise.all([import('./engine.js'),import('./render.js'),import('./photo.js'),import('./storage.js')]);modules={...combat,...render,...photo,...storage};try{await modules.preloadArt();}catch(error){console.error('Art loading failed',error);toast('部分美术未加载，已使用基础场景。');}try{const saved=await modules.loadLevels();levels=[...structuredClone(demos).map(demo=>{const existing=saved.find(level=>level.id===demo.id);return existing?{...demo,cleared:existing.cleared,avatar:existing.avatar,photo:existing.photo}:demo;}),...saved.filter(level=>!demos.some(d=>d.id===level.id)).map(level=>({...level,scene:{...level.scene,travelZone:level.scene.travelZone||zoneForCoordinates(level.location.lat,level.location.lon).id}}))];}catch{toast('这次无法读取设备存档。你仍可试玩，保存时会再次尝试。');}gameReady=true;renderAtlas();for(const id of ['play-demo','challenge-selected','upload-open','edit-selected'])$(id).disabled=false;}catch(error){console.error('Module initialization failed',error);toast('游戏模块尚未就绪，请刷新页面重试。');}
}
function setupChoices(){
 $('zone-select').innerHTML=TRAVEL_ZONES.map(zone=>`<option value="${zone.id}">${zone.label} · ${zone.stage}</option>`).join('');
 $('location-select').innerHTML=CITIES.map(c=>`<option value="${c.id}">${escape(c.name)} · ${escape(c.country)}</option>`).join('')+'<option value="custom">自定义坐标 / 照片 GPS</option>';
 $('lighting-select').innerHTML=LIGHTINGS.map(x=>`<option value="${x}">${LABELS[x]}</option>`).join('');$('style-select').innerHTML=STYLES.map(x=>`<option value="${x}">${LABELS[x]}</option>`).join('');
 $('environment-options').innerHTML=ENVIRONMENTS.map(x=>`<button type="button" data-environment="${x}" aria-pressed="false">${LABELS[x]}</button>`).join('');
 $('element-options').innerHTML=ELEMENTS.map(x=>`<label><input type="checkbox" value="${x}">${LABELS[x]}</label>`).join('');
 $('environment-options').querySelectorAll('button').forEach(b=>b.onclick=()=>{draft.scene.environment=b.dataset.environment;draft.scene.elements=defaultScene(draft.scene.environment).elements;markManual();updateCreator();});
 $('element-options').querySelectorAll('input').forEach(input=>input.onchange=()=>{const choices=[...$('element-options').querySelectorAll('input:checked')].map(i=>i.value);if(choices.length>4){input.checked=false;toast('场景最多保留四个元素。');return;}draft.scene.elements=choices;markManual();updateCreator();});
}
function openCreator({level=null,point=null}={}){
 if(!ensureReady())return;
 const zone=point?zoneForCoordinates(point.lat,point.lon):getZone(selected()?.scene.travelZone);
 photoVersion++;draft=level?structuredClone(level):{id:crypto.randomUUID(),name:`${zone.stage} · 我的决斗`,location:{name:zone.place,country:zone.country,lat:zone.lat,lon:zone.lon},scene:sceneForZone(zone.id),photo:null,cleared:false,createdAt:new Date().toISOString()};
 draft.avatar=validateAvatar(draft.avatar||{style:draft.scene.opponentStyle});draft.editing=Boolean(level);$('creator-title').textContent='为这一站，创造对手。';$('level-name').value=draft.name;$('creator-error').hidden=true;$('gps-note').textContent='关卡使用区域预设；角色配色独立于背景。';$('photo-message').textContent=draft.photo?'照片与角色配置保存在本机。':'上传你拥有或获准使用的人物照片；本地提取颜色，立即预览。';
 const city=CITIES.find(c=>Math.abs(c.lat-draft.location.lat)<.001&&Math.abs(c.lon-draft.location.lon)<.001);$('location-select').value=city?city.id:'custom';$('custom-name').value=draft.location.name;$('custom-lat').value=draft.location.lat;$('custom-lon').value=draft.location.lon;updateLocationFields();
 $('photo-input').value='';photoBusy=false;analysisBusy=false;setBusy();updatePhotoPreview();updateCreator();$('creator').showModal();
}
function updatePhotoPreview(){const has=Boolean(draft.photo);$('photo-image').hidden=!has;$('photo-placeholder').hidden=has;$('photo-change').hidden=!has;if(has)$('photo-image').src=draft.photo;else $('photo-image').removeAttribute('src');$('palette-swatches').innerHTML=Object.values(draft.avatar.palette).map(x=>`<span style="background:${x}"></span>`).join('')+'<small>角色配色</small>';}
function updateCreator(){
 $('zone-select').value=draft.scene.travelZone||'east-asia';$('avatar-target').value=draft.avatar.target;$('lighting-select').value=draft.scene.lighting;$('style-select').value=draft.avatar.style;
 for(const key of Object.keys(DEFAULT_AVATAR))$(`avatar-${key}`).value=draft.avatar.palette[key];
 $('environment-options').querySelectorAll('button').forEach(b=>{const active=b.dataset.environment===draft.scene.environment;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
 $('element-options').querySelectorAll('input').forEach(i=>i.checked=draft.scene.elements.includes(i.value));
 $('creator-mode').textContent=draft.avatar.source==='ai'?'AI 外观分析 · 可微调':'本地角色工坊';drawPreview($('creator-preview'),draft.scene,draft.avatar);
}
function markManual(){draft.scene.source='manual';draft.scene.summary=`${LABELS[draft.scene.lighting]}的${LABELS[draft.scene.environment]}，${draft.scene.elements.map(e=>LABELS[e]).join('、')||'空旷的决斗场'}。由你手动配置${draft.photo?'，沿用照片色调':''}。`;}
function updateLocationFields(){const custom=$('location-select').value==='custom';$('custom-location-fields').hidden=!custom;['custom-name','custom-lat','custom-lon'].forEach(id=>$(id).required=custom);}
function setBusy(){const busy=photoBusy||analysisBusy;$('save-start').disabled=busy;$('ai-analyze').disabled=busy;$('ai-analyze').textContent=analysisBusy?'正在分析照片…':'AI 外观分析（可选）';}
function creatorError(message){$('creator-error').textContent=message;$('creator-error').hidden=false;}
async function pickPhoto(file){
 if(!file||!draft)return;const version=++photoVersion;analysisBusy=false;photoBusy=true;setBusy();$('creator-error').hidden=true;$('photo-message').textContent='正在读取照片与色调…';
 try{const result=await modules.preparePhoto(file);if(version!==photoVersion)return;draft.photo=result.thumbnail;draft.apiImage=result.dataUrl;draft.avatar=avatarFromPalette(result.palette,draft.avatar.target,draft.avatar.style);updatePhotoPreview();updateCreator();$('photo-message').textContent='照片配色已应用到角色。当前是颜色提取；可修正肤色、服装和轮廓，再开始决斗。';}
 catch(error){if(version!==photoVersion)return;creatorError(error.message||'照片无法读取，请换一张照片。');$('photo-message').textContent=draft.photo?'原照片仍然保留，可以继续使用。':'请选择 JPEG、PNG 或 WebP 照片。';}
 finally{if(version===photoVersion){photoBusy=false;setBusy();}}
}
async function analyze(){
 if(!draft?.photo){creatorError('请先选择一张照片。');return;}
 const version=photoVersion,target=draft.avatar.target;analysisBusy=true;setBusy();$('creator-error').hidden=true;$('photo-message').textContent='正在分析人物外观；成功后将更新角色配色与轮廓。';
 try{const avatar=await requestAvatar(draft.apiImage||draft.photo);if(version!==photoVersion)return;draft.avatar={...avatar,target};updateCreator();updatePhotoPreview();$('photo-message').textContent=avatar.summary;}
 catch(error){if(version!==photoVersion)return;creatorError(error.message||'AI 暂时不可用；请继续本地配色。');$('photo-message').textContent='本地角色配置已保留，可以直接开始决斗。';}
 finally{if(version===photoVersion){analysisBusy=false;setBusy();}}
}
async function saveAndPlay(event){
 event.preventDefault();if(photoBusy||analysisBusy)return;
 const name=$('level-name').value.trim();if(!name){creatorError('请输入关卡名称。');return;}
 let location;if($('location-select').value==='custom'){const lat=Number($('custom-lat').value),lon=Number($('custom-lon').value),name=$('custom-name').value.trim();if(!name||!Number.isFinite(lat)||!Number.isFinite(lon)||lat< -85||lat>85||lon< -180||lon>180){creatorError('请填写地点名和有效坐标：纬度 -85 到 85，经度 -180 到 180。');return;}location={name,lat,lon};}else location=CITIES.find(c=>c.id===$('location-select').value);
 const {editing,apiImage,...base}=draft;const level={...base,name,location,scene:validateScene(draft.scene),avatar:validateAvatar(draft.avatar)};
 $('save-start').disabled=true;
 try{await modules.saveLevel(level);const index=levels.findIndex(l=>l.id===level.id);if(index<0)levels.unshift(level);else levels[index]=level;selectedId=level.id;$('creator').close();renderAtlas();startDuel(level);}
 catch(error){creatorError(`关卡未保存：${error.message||'设备存储不可用。'} 请重试，照片仍在面板中。`);}
 finally{$('save-start').disabled=false;}
}
function clearKeys(){Object.keys(keys).forEach(k=>keys[k]=false);document.querySelectorAll('[data-control]').forEach(b=>b.classList.remove('pressed'));}
function stopDuel(){duelGeneration++;cancelAnimationFrame(raf);raf=0;engine=null;currentLevel=null;clearKeys();previousTime=0;accumulator=0;$('result-panel').hidden=true;$('duel-status').textContent='';}
function returnToMap(){stopDuel();document.body.classList.remove('is-dueling');$('duel-screen').hidden=true;$('atlas-screen').hidden=false;globe.setVisible(true);globe.resize();renderAtlas();$('nav-map').focus();if(firstLitId){setTimeout(()=>{firstLitId=null;},1600);}}
function initAudio(){try{audio ||= new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();}catch{/* Audio is decorative; the duel remains playable. */}}
function sound(type){if(!audio||audio.state!=='running')return;const oscillator=audio.createOscillator(),gain=audio.createGain(),now=audio.currentTime;oscillator.type=type==='slash'?'sawtooth':'triangle';const freq={slash:280,parry:1100,clash:850,hit:100,evade:190,shove:80}[type]||250;oscillator.frequency.setValueAtTime(freq,now);oscillator.frequency.exponentialRampToValueAtTime(Math.max(35,freq*.3),now+.1);gain.gain.setValueAtTime(.035,now);gain.gain.exponentialRampToValueAtTime(.0001,now+.13);oscillator.connect(gain);gain.connect(audio.destination);oscillator.start(now);oscillator.stop(now+.14);}
function startDuel(level){
 bloodDecals=[];bloodSeen=new Set();
 if(!ensureReady())return;stopDuel();setAim('mid');globe.setVisible(false);document.body.classList.add('is-dueling');currentLevel=level;initAudio();engine=new modules.DuelEngine({seed:Date.now()%2147483647,difficulty:$('difficulty-select').value});resultHandled=false;heard=new Set();$('atlas-screen').hidden=true;$('duel-screen').hidden=false;$('duel-title').textContent=level.name;$('duel-region').textContent=`${level.location.name} / ONE CUT DUEL`;$('pause-button').innerHTML='暂停 <span class="key-mini">Esc</span>';$('combat-tip').textContent='选刀路，等破绽。按住 J 蓄力，松开出剑；按住 K 同向防御。';window.scrollTo({top:0,behavior:'instant'});$('duel-canvas').focus({preventScroll:true});previousTime=0;accumulator=0;raf=requestAnimationFrame(frame);
}
function drawDuel(snapshot){
 const ctx=$('duel-canvas').getContext('2d');ctx.clearRect(0,0,WORLD.width,WORLD.height);ctx.save();if(snapshot.shake){const amount=snapshot.shake*5;ctx.translate(Math.round(Math.sin(snapshot.time*117)*amount),Math.round(Math.cos(snapshot.time*89)*amount*.5));}modules.drawScene(ctx,currentLevel.scene,snapshot.time);
 for(const effect of snapshot.effects){if(bloodSeen.has(effect.id))continue;bloodSeen.add(effect.id);if(effect.type==='hit'||(effect.type==='slash'&&snapshot.phase==='postVictory'&&snapshot.result==='victory')){bloodDecals.push({x:effect.x,y:effect.type==='hit'?effect.y:WORLD.ground-90,facing:effect.facing||snapshot.player.facing,seed:effect.id,flick:effect.type==='slash'});if(bloodDecals.length>40)bloodDecals.shift();}}
 modules.drawBloodDecals(ctx,bloodDecals);
 const avatar=currentLevel.avatar;
 modules.drawFighter(ctx,snapshot.player,avatar?.target==='player'?avatar.style:'traveler',true,snapshot.time,{wet:currentLevel.scene.environment!=='wilderness',palette:avatar?.target==='player'?avatar.palette:null});modules.drawFighter(ctx,snapshot.opponent,avatar?.target==='opponent'?avatar.style:currentLevel.scene.opponentStyle,false,snapshot.time,{wet:currentLevel.scene.environment!=='wilderness',palette:avatar?.target==='opponent'?avatar.palette:null});modules.drawEffects(ctx,snapshot.effects,snapshot.time);ctx.restore();
 const meter=$('charge-meter');if(meter){meter.value=snapshot.player.charge||0;meter.hidden=snapshot.player.state!=='charge';}
 const rival=$('rival-stance');if(rival)rival.textContent=stanceLabels[snapshot.opponent.stance]||'横斩';
 $('player-stance').textContent=snapshot.player.counterReady?'回劈机会 · J / L':`${stanceLabels[snapshot.player.stance]||'横斩'}${snapshot.player.guarding?' · 防御':''}`;
 document.querySelectorAll('[data-stance]').forEach(button=>{const active=button.dataset.stance===aim;if(button.getAttribute('aria-pressed')!==String(active)){button.setAttribute('aria-pressed',String(active));button.classList.toggle('active',active);}});
 const counterButton=document.querySelector('[data-control=counter]');if(counterButton)counterButton.classList.toggle('ready',Boolean(snapshot.player.counterReady));
 // Stable compact status; avoid rebuilding live text on every animation frame.
 const text=snapshot.paused?'暂停':snapshot.phase==='countdown'?String(Math.max(1,Math.ceil(snapshot.countdown))):'';
 if($('duel-status').textContent!==text)$('duel-status').textContent=text;
 if(snapshot.message&&snapshot.phase==='playing')$('combat-tip').textContent=snapshot.message;
 if(snapshot.phase==='postVictory')$('combat-tip').textContent=snapshot.result==='victory'?`胜负已定 · 余韵 ${Math.ceil(snapshot.postVictoryRemaining)} 秒。继续移动，挥刀甩落血迹。`:'这一刀，留在此地。';
 for(const effect of snapshot.effects){if(!heard.has(effect.id)){heard.add(effect.id);sound(effect.type);}}
}
function frame(now){
 if(!engine)return;if(!previousTime)previousTime=now;const delta=Math.min((now-previousTime)/1000,.1);previousTime=now;
 accumulator+=delta;while(accumulator>=1/60){engine.tick(1/60,{...keys,aim});accumulator-=1/60;}
 const state=engine.snapshot();drawDuel(state);if(state.phase==='result'&&!resultHandled){resultHandled=true;finishDuel(state.result);}raf=requestAnimationFrame(frame);
}
function togglePause(force){if(!engine||engine.snapshot().phase==='result')return;const paused=typeof force==='boolean'?force:!engine.snapshot().paused;clearKeys();engine.setPaused(paused);accumulator=0;previousTime=0;$('pause-button').innerHTML=paused?'继续 <span class="key-mini">Esc</span>':'暂停 <span class="key-mini">Esc</span>';}
function retry(){if(!engine)return;bloodDecals=[];bloodSeen=new Set();duelGeneration++;clearKeys();setAim('mid');engine.reset(Date.now()%2147483647);resultHandled=false;heard=new Set();$('result-panel').hidden=true;$('combat-tip').textContent='选刀路，等破绽。按住 J 蓄力，松开出剑。';$('pause-button').innerHTML='暂停 <span class="key-mini">Esc</span>';accumulator=0;previousTime=0;$('duel-canvas').focus({preventScroll:true});}
async function finishDuel(result){
 const level=currentLevel, generation=duelGeneration, activeEngine=engine;const victory=result==='victory',draw=result==='draw';let saveMessage='';
 if(victory&&!level.cleared){const completed={...level,cleared:true};try{await modules.saveLevel(completed);const index=levels.findIndex(l=>l.id===level.id);if(index>=0)levels[index]=completed;firstLitId=completed.id;if(engine===activeEngine&&duelGeneration===generation)currentLevel=completed;saveMessage=`${level.location.name}已点亮。你的旅途多了一站。`;}catch{saveMessage='你赢了，但进度未保存。请使用“重试保存”再次尝试。';}}
 else if(victory)saveMessage='这一站已点亮。每次重游，都有新的刀光。';
 await new Promise(resolve=>setTimeout(resolve,520));
 if(engine!==activeEngine||duelGeneration!==generation||engine.snapshot().phase!=='result')return;
 const panel=$('result-panel');panel.innerHTML=`<p class="eyebrow">${victory?'A NEW LIGHT ON YOUR ATLAS':draw?'TWO BLADES, ONE MOMENT':'THE JOURNEY CONTINUES'}</p><h2>${victory?'VICTORY':draw?'DRAW':'DEFEATED'}</h2><p>${escape(victory?saveMessage:draw?'同时命中。再来一刀。':'收刀太慢，或距离太近。试着招架后反击。')}</p><div class="result-actions"><button id="result-primary" class="button primary">${victory?'返回地图':'再试一刀'}</button><button id="result-secondary" class="button secondary">${victory?'再战一次':'返回地图'}</button>${victory&&!currentLevel.cleared?'<button id="save-victory" class="button secondary">重试保存</button>':''}</div><p class="result-hint">${victory?'旅途尚未结束。':'按 R 即可立即重试，关卡会为你保留。'}</p>`;panel.hidden=false;
 $('result-primary').onclick=victory?returnToMap:retry;$('result-secondary').onclick=victory?retry:returnToMap;if($('save-victory'))$('save-victory').onclick=()=>finishDuel('victory');
 $('result-primary').focus({preventScroll:true});
}
const keyMap={KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right',KeyJ:'attack',KeyK:'parry',Space:'dodge',KeyC:'duck',KeyL:'counter',KeyV:'shove'};
const stanceKeys={KeyW:'high',ArrowUp:'high',Digit1:'high',KeyX:'mid',Digit2:'mid',KeyS:'low',ArrowDown:'low',Digit3:'low'};
document.querySelectorAll('[data-stance]').forEach(button=>button.onclick=()=>{setAim(button.dataset.stance);$('duel-canvas').focus({preventScroll:true});});
window.addEventListener('keydown',event=>{if(!engine||$('creator').open||$('help-dialog').open)return;if(stanceKeys[event.code]){event.preventDefault();if(!event.repeat)setAim(stanceKeys[event.code]);}if(keyMap[event.code]){event.preventDefault();if(!event.repeat)keys[keyMap[event.code]]=true;}if(event.code==='Escape'&&!event.repeat){event.preventDefault();togglePause();}if(event.code==='KeyR'&&!event.repeat&&engine.snapshot().phase==='result'){event.preventDefault();retry();}});
window.addEventListener('keyup',event=>{if(keyMap[event.code]){keys[keyMap[event.code]]=false;if(engine)event.preventDefault();}});
window.addEventListener('blur',()=>{clearKeys();if(engine)togglePause(true);});document.addEventListener('visibilitychange',()=>{if(document.hidden){clearKeys();if(engine)togglePause(true);}});
document.querySelectorAll('[data-control]').forEach(button=>{const control=button.dataset.control;button.addEventListener('pointerdown',event=>{if(!engine)return;event.preventDefault();button.setPointerCapture(event.pointerId);keys[control]=true;button.classList.add('pressed');initAudio();});const release=()=>{keys[control]=false;button.classList.remove('pressed');};button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);});
function openHelp(){if(engine)togglePause(true);$('help-dialog').showModal();}
function registerTools(){const context=document.modelContext;if(!context?.registerTool)return;const lifecycle=new AbortController();const tools=[{name:'read_atlas',description:'Read saved local levels and which stops have been cleared.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute(input){if(!input||typeof input!=='object'||Object.keys(input).length)throw new Error('Expected an empty object');return {levels:levels.map(l=>({id:l.id,name:l.name,location:l.location.name,cleared:l.cleared}))};}},{name:'start_duel',description:'Start the visible one-cut duel for an existing local level; winning requires gameplay.',inputSchema:{type:'object',properties:{levelId:{type:'string'}},required:['levelId'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){if(!input||Object.keys(input).some(k=>k!=='levelId')||typeof input.levelId!=='string')throw new Error('Expected a levelId string');const level=levels.find(l=>l.id===input.levelId);if(!level||!modules||!gameReady)throw new Error('Level unavailable');if($('creator').open||$('help-dialog').open)throw new Error('Close the open dialog first');startDuel(level);return {levelId:level.id,phase:engine.snapshot().phase};}}];for(const tool of tools){try{Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}}window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});}
$('brand')?.addEventListener('click',returnToMap);document.querySelector('.brand').onclick=event=>{event.preventDefault();if(engine)returnToMap();};
$('upload-open').onclick=()=>openCreator();$('play-demo').onclick=()=>startDuel(levels.find(l=>l.id==='demo-maple')||selected());$('challenge-selected').onclick=()=>startDuel(selected());$('edit-selected').onclick=()=>openCreator({level:selected()});$('nav-map').onclick=()=>{if(engine)returnToMap();};$('nav-help').onclick=openHelp;
$('creator-close').onclick=()=>$('creator').close();$('creator').addEventListener('close',()=>{photoVersion++;photoBusy=false;analysisBusy=false;draft=null;});$('help-close').onclick=()=>$('help-dialog').close();$('help-play').onclick=()=>{$('help-dialog').close();startDuel(selected());};$('duel-back').onclick=returnToMap;$('pause-button').onclick=()=>togglePause();
$('photo-input').onchange=event=>pickPhoto(event.target.files[0]);$('photo-drop').addEventListener('dragover',event=>{event.preventDefault();$('photo-drop').classList.add('dragover');});$('photo-drop').addEventListener('dragleave',()=>$('photo-drop').classList.remove('dragover'));$('photo-drop').addEventListener('drop',event=>{event.preventDefault();$('photo-drop').classList.remove('dragover');pickPhoto(event.dataTransfer.files[0]);});
$('location-select').onchange=updateLocationFields;$('lighting-select').onchange=()=>{draft.scene.lighting=$('lighting-select').value;markManual();updateCreator();};$('style-select').onchange=()=>{draft.avatar.style=$('style-select').value;updateCreator();};$('ai-analyze').onclick=analyze;$('creator-form').onsubmit=saveAndPlay;
$('zone-select').onchange=()=>{const zone=getZone($('zone-select').value);draft.scene=sceneForZone(zone.id);draft.location={name:zone.place,country:zone.country,lat:zone.lat,lon:zone.lon};$('level-name').value=`${zone.stage} · 我的决斗`;const city=CITIES.find(city=>city.name===zone.place);$('location-select').value=city?.id||'custom';$('custom-name').value=zone.place;$('custom-lat').value=zone.lat;$('custom-lon').value=zone.lon;updateLocationFields();updateCreator();};
$('avatar-target').onchange=()=>{draft.avatar.target=$('avatar-target').value;updateCreator();};
for(const key of Object.keys(DEFAULT_AVATAR))$(`avatar-${key}`).oninput=()=>{draft.avatar.palette[key]=$(`avatar-${key}`).value;draft.avatar.source='local';updatePhotoPreview();drawPreview($('creator-preview'),draft.scene,draft.avatar);};
window.addEventListener('pagehide',()=>globe.destroy(),{once:true});
setupChoices();renderAtlas();for(const id of ['play-demo','challenge-selected','upload-open','edit-selected'])$(id).disabled=true;registerTools();init();

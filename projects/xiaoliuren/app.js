import {palmMarkup,activateNode,cancelPalmMotion} from './palm.js?v=ask9';
import {localStamp,offsetLabel,resolveWallTime} from './time.js';
import {NAMES,BRANCHES,calculate,shichen,timeAt,fetchLunar,validateDate} from './core.js';
import {copy,meanings} from './content.js?v=ask9';
import {ui,verses,palettes,inferTopic,extraAdvice} from './experience.js?v=ask11';
import {readJournal,writeJournal,recordReading,questionKey,timing,journalCopy} from './journal.js?v=ask9';
const $=s=>document.querySelector(s);
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const preference=(key,fallback)=>{try{return localStorage.getItem(key)||fallback;}catch{return fallback;}};
const savePreference=(key,value)=>{try{localStorage.setItem(key,value);}catch{}};
let lang=preference('palm-language','zh');if(!copy[lang])lang='zh';
let zone=preference('palm-zone',Intl.DateTimeFormat().resolvedOptions().timeZone||'Asia/Shanghai');
try{timeAt(new Date(),zone);}catch{zone='Asia/Shanghai';}
let question='',category='daily',timeMode='now',recorded='',settingsOpen=false,result=null,busy=false,routeVersion=0,animationVersion=0,skipAnimation=false,exampleIndex=0;
const storage={getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)};
const journalState=readJournal(storage);let journal=journalState.entries,storageFailed=journalState.error;
const readings=new Map(journal.map(r=>[questionKey(r.question),r]));
const jc=()=>journalCopy[lang];
const outcomeKeys=['pending','matched','partial','missed','unclear'];
let speechWatchdog=null;
let lunarPreview={date:'',state:'idle'},previewVersion=0,recognition=null,speechVersion=0,listening=false;
const u=()=>ui[lang];
const t=()=>({...copy[lang],nav:[u().home,u().method,u().meanings,u().about,jc().history],footer:u().disclaimer}), li=()=>lang==='zh'?0:1;
const positionName=i=>lang==='zh'?NAMES[i]:`${NAMES[i]} · ${meanings[i].pinyin}`;
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const route=()=>location.hash.slice(1)||'/';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const exampleData=()=>exampleIndex===0?{month:3,day:3,hourIndex:5}:{month:4,day:5,hourIndex:11};
function clockData(){
 const instant=timeMode==='recorded'?resolveWallTime(recorded,zone):new Date();
 return {...timeAt(instant,zone),instant:instant.toISOString()};
}
function updateChrome(){
  document.documentElement.lang=lang==='zh'?'zh-CN':'en';
  const routes=['/','/method','/meanings','/rules','/history'];
  $('#navigation').innerHTML=routes.map((r,i)=>`<a href="#${r}" ${route()===r?'aria-current="page"':''}>${t().nav[i]}</a>`).join('');
  $('#language').textContent=lang==='zh'?'EN':'中文';
  $('#language').setAttribute('aria-label',lang==='zh'?'Switch to English':'切换至中文');
  $('#footer-note').textContent=route()==='/'?'':t().footer;
  document.title=`${t().nav[Math.max(0,routes.indexOf(route()))]} · ${jc().brand}`;
  $('.brand-name').textContent=jc().brand;$('.brand').setAttribute('aria-label',jc().brand);
}
function processMarkup(data=null){
  return `<div class="process-bar" aria-label="${lang==='zh'?'计算步骤':'Calculation steps'}">${t().steps.map((title,i)=>`<div class="process-step" data-step="${i}"><span class="step-num">0${i+1}</span><div><div class="step-title">${title}</div><div class="step-desc" data-step-description="${i}">${data?esc(positionName(data.stages[i].end)):t().stepDesc[i]}</div></div></div>`).join('')}</div>`;
}
function handPanel(){return `<div class="hand-panel">${palmMarkup(NAMES)}<div class="count-callout" id="count-callout" hidden><span class="count-label" id="count-label"></span><strong id="count-position"></strong><span class="count-detail" id="count-detail"></span></div><button type="button" class="skip-animation text-button" id="skip-animation" hidden>${t().skip}</button></div>`;}
function applyTheme(index=null){
 document.body.dataset.sign=index===null?'':String(index);
 document.body.classList.toggle('result-mode',index!==null);
 const p=index===null?null:palettes[index],bg=p?.color||'#faf8ef',ink=p?.ink||'#343a33';
 const darkText=ink==='#292D28'||index===null;
 const tokens={'--bg':bg,'--ink':ink,'--muted':index===null?'#656d62':ink,'--line':darkText?'#292d283d':'#fffaf047','--accent':ink};
 Object.entries(tokens).forEach(([k,v])=>document.body.style.setProperty(k,v));
 document.documentElement.style.backgroundColor=bg;
 document.querySelector('meta[name="theme-color"]').content=bg;
 document.querySelectorAll('[data-color]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.color)===index)));
}
function colorKey(){return `<div class="color-key" role="group" aria-label="${u().legend}">${palettes.map((p,i)=>`<button type="button" data-color="${i}" aria-pressed="${result?.timePalace===i}" title="${p.colorName[li()]} · ${p.emotion[li()]}"><i style="--swatch:${p.color}" aria-hidden="true"></i><span>${p.name}</span></button>`).join('')}</div>`;}
function timeMarkup(){return `<section class="time-region" aria-label="${u().moment}"><button id="time-settings" class="time-trigger" type="button" aria-haspopup="dialog" aria-label="${lang==='zh'?'修改日期、时间和时区':'Edit date, time and time zone'}"><span class="clock-row"><time id="gregorian-date"></time><strong id="gregorian-clock"></strong><small>${lang==='zh'?'修改':'Edit'}</small></span><span id="time-zone"></span></button><div class="calendar-line lunar-line"><span>${u().lunar}</span><div><strong id="lunar-date">${u().load}</strong><span id="lunar-translation"></span><button class="text-button" id="retry-calendar" type="button" hidden>${u().retry}</button></div></div></section>`;}
function timeEditorMarkup(){return `<dialog id="time-dialog"><form id="time-form"><h2>${lang==='zh'?'选择起念的时间':'Choose a moment'}</h2><label for="datetime-input">${lang==='zh'?'日期与时间':'Date and time'}</label><input id="datetime-input" type="datetime-local" required step="60" min="2023-01-01T00:00" max="${new Date().getUTCFullYear()+2}-12-31T23:59"><label for="timezone-input">${t().zone}</label><select id="timezone-input"></select><p id="time-error" role="alert"></p><p class="time-note">${lang==='zh'?'夏令时结束的重复时刻，取较早的一次。':'A repeated time at the end of daylight saving uses the earlier occurrence.'}</p><div class="time-actions"><button type="button" id="time-now">${lang==='zh'?'回到此刻':'Use current time'}</button><button type="button" id="time-cancel">${lang==='zh'?'取消':'Cancel'}</button><button type="submit" id="time-save">${lang==='zh'?'应用':'Apply'}</button></div></form></dialog>`;}
function bindTimeEditor(){
 let draftZone=zone;
 const error=e=>{$('#time-error').textContent=e.message==='dst'?(lang==='zh'?'所选时区在这一刻发生夏令时跳时，请选择其他时间。':'This time does not exist because the clock moves forward. Choose another time.'):(lang==='zh'?'请输入有效的日期与时间。':'Enter a valid date and time.');};
 const apply=()=>{savePreference('palm-zone',zone);stopSpeech();result=null;$('#time-dialog').close();home();};
 $('#time-settings').onclick=()=>{
  if(busy)return;
  const c=result||clockData();draftZone=c.timeZone;
  const all=[...new Set([draftZone,'America/New_York','America/Los_Angeles','Asia/Shanghai','Asia/Hong_Kong','Asia/Taipei','Asia/Tokyo','Europe/London','UTC',...(Intl.supportedValuesOf?.('timeZone')||[])])];
  $('#timezone-input').innerHTML=all.map(z=>`<option value="${esc(z)}">${esc(z.replaceAll('_',' '))}</option>`).join('');
  $('#timezone-input').value=draftZone;$('#datetime-input').value=c.date+'T'+c.clock;$('#time-error').textContent='';$('#time-dialog').showModal();
 };
 $('#timezone-input').onchange=()=>{try{const instant=resolveWallTime($('#datetime-input').value,draftZone);draftZone=$('#timezone-input').value;$('#datetime-input').value=localStamp(instant,draftZone);$('#time-error').textContent='';}catch(e){$('#timezone-input').value=draftZone;error(e);}};
 $('#time-form').onsubmit=e=>{e.preventDefault();try{resolveWallTime($('#datetime-input').value,draftZone);}catch(err){error(err);return;}zone=draftZone;recorded=$('#datetime-input').value;timeMode='recorded';apply();};
 $('#time-now').onclick=()=>{zone=draftZone;timeMode='now';apply();};
 $('#time-cancel').onclick=()=>$('#time-dialog').close();
}
function verseMarkup(index,compact=false){
 const v=verses[index];
 const chinese=`${v.preambleZh?`<p class="classical-preamble" lang="zh-CN">${esc(v.preambleZh)}</p>`:''}<blockquote lang="zh-CN"><span class="verse-label">断曰</span>${v.zh.map(esc).join('<br>')}</blockquote>`;
 const english=`<p class="verse-translation">${esc(v.fullEn)}</p><p class="classical-preamble" lang="zh-Hant">${esc(v.sourceZh)}</p>`;
 const preview=lang==='zh'?`<blockquote class="verse-preview" lang="zh-CN">${v.zh.slice(0,2).map(esc).join('<br>')}</blockquote>`:'';
 return `<div class="classical-block compact-verse${compact?' home-verse':''}">${preview}<details class="verse-details"><summary>${lang==='zh'?'查看完整歌诀与解释':'Read the complete translation and Chinese text'}</summary><div class="verse-full">${lang==='en'?english:chinese}<p class="verse-source">${lang==='zh'?'原文与版本说明见':'Text and edition notes:'} <a href="#/rules">${lang==='zh'?'来源':'Sources'}</a></p></div></details></div>`;
}
function formMarkup(){return `<form id="reading-form" novalidate><h1><label for="question">${u().ask}</label></h1><div class="question-input"><textarea id="question" maxlength="300" required placeholder="${u().placeholder}" aria-describedby="question-status voice-status">${esc(question)}</textarea></div><div class="input-tools"><button class="voice-button" id="voice-input" type="button" aria-label="${u().voice}" aria-pressed="false" title="${u().voice}"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="2" width="8" height="13" rx="4"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/></svg><span id="voice-button-label">${u().voice}</span></button></div><div id="voice-status" class="voice-status" role="status" aria-live="polite"></div><div class="status" id="question-status" role="status" aria-live="polite"></div><button type="submit" id="submit-reading" class="primary">${u().begin}<span aria-hidden="true">↗</span></button></form>`;}
function resultMarkup(r){
 const m=meanings[r.timePalace],topic=r.category;
 const advice=r.reflection?.[li()]||(extraAdvice[topic]?.[r.timePalace]||m.advice[topic]||m.advice.daily)[li()];
 return `<div class="result-panel"><p class="result-question">${esc(r.question)}</p><div class="result-heading"><h1>${lang==='zh'?m.name:m.romanized}</h1>${lang==='en'?`<p class="sign-subtitle">${m.name} · ${m.en}</p>`:''}</div>${lang==='en'?`<p class="sign-summary">${m.summary}</p>`:''}${verseMarkup(r.timePalace,true)}<div class="modern-block"><span class="section-kicker">${u().modern}</span><p>${esc(advice)}</p></div><div class="result-actions"><button class="text-button" id="replay" type="button">${u().replay}</button><button class="text-button" id="new-question" type="button">${u().again}</button></div><div class="status" id="question-status" role="status">${storageFailed?jc().storageError:''}</div></div>`;
}
function home(){
 document.body.dataset.view='home';applyTheme(result?.timePalace??null);
 const showLabels=preference('ask-preview-labels','on')!=='off';
 $('#main').innerHTML=`<div class="home-screen"><section class="palm-region" aria-label="${u().left}">${handPanel()}<div class="palm-controls"><label class="label-control"><input id="toggle-labels" type="checkbox" ${showLabels?'checked':''}>${lang==='zh'?'标注卦象':'Label the six signs'}</label>${colorKey()}</div></section><div class="home-workspace">${timeMarkup()}<section class="question-region" aria-label="${result?u().result:u().ask}">${result?resultMarkup(result):formMarkup()}<p class="home-reminder">${u().reminder}</p></section></div></div>${timeEditorMarkup()}`;
 $('.palm-frame').classList.toggle('names-off',!showLabels);
 $('#palm-state').textContent=result?t().complete:u().left;activateNode(result?result.timePalace:null,true);
 $('#toggle-labels').onchange=e=>{$('.palm-frame').classList.toggle('names-off',!e.target.checked);savePreference('ask-preview-labels',e.target.checked?'on':'off');};
 const preview=i=>{if(busy)return;applyTheme(i);activateNode(i,reduced(),{duration:460});$('#palm-state').textContent=(lang==='zh'?'宫位预览：':'Position preview: ')+positionName(i);};
 document.querySelectorAll('[data-color]').forEach(b=>b.onclick=()=>preview(Number(b.dataset.color)));
 document.querySelectorAll('[data-node]').forEach(b=>{b.onclick=()=>preview(Number(b.dataset.node));b.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();preview(Number(b.dataset.node));}};});
 $('#skip-animation').onclick=()=>{skipAnimation=true;};
 $('#retry-calendar').onclick=()=>{let clock;try{clock=clockData();}catch{return;}ensureLunar(clock.date,true);};
 bindTimeEditor();
 if(result){$('#new-question').onclick=()=>{result=null;question='';home();$('#question').focus();};$('#replay').onclick=()=>replayResult();}
 else{$('#question').oninput=e=>{question=e.target.value;};$('#voice-input').onclick=toggleSpeech;$('#reading-form').onsubmit=e=>{e.preventDefault();beginReading();};}
 refreshTime();
}
function paintLunar(lunar,clock){
  if(!$('#lunar-date'))return;
  const branch=BRANCHES[shichen(clock.hour)-1];
  $('#lunar-date').textContent=`${lunar.text} · ${branch}时`;
  $('#lunar-translation').textContent=lang==='en'?`${lunar.isLeap?'Leap ':''}month ${lunar.month}, day ${lunar.day} · ${['Zǐ','Chǒu','Yín','Mǎo','Chén','Sì','Wǔ','Wèi','Shēn','Yǒu','Xū','Hài'][shichen(clock.hour)-1]} hour`:'';
  $('#retry-calendar').hidden=true;
}
function refreshTime(){
  if(route()!=='/'||!$('#gregorian-date'))return;
  let clock;try{clock=result||clockData();}catch{$('#lunar-date').textContent='—';return;}
  $('#gregorian-date').textContent=clock.date.replaceAll('-','.');
  const instant=clock.instant?new Date(clock.instant):resolveWallTime(clock.date+'T'+clock.clock,clock.timeZone);
  $('#time-zone').textContent=clock.timeZone+' · '+offsetLabel(instant,clock.timeZone);
  $('#gregorian-clock').textContent=clock.clock;
  if(result){paintLunar(result.lunar,result);return;}
  if(lunarPreview.date===clock.date&&lunarPreview.state==='ready'){paintLunar(lunarPreview.lunar,clock);return;}
  if(lunarPreview.date===clock.date&&lunarPreview.state==='error'){$('#lunar-date').textContent=u().calendarError;$('#lunar-translation').textContent='';$('#retry-calendar').hidden=false;return;}
  $('#lunar-date').textContent=u().load;$('#lunar-translation').textContent='';ensureLunar(clock.date);
}
async function ensureLunar(date,force=false){
  if(!force&&lunarPreview.date===date&&lunarPreview.state!=='idle')return;
  const version=++previewVersion;lunarPreview={date,state:'loading'};
  if($('#retry-calendar'))$('#retry-calendar').hidden=true;
  try{const lunar=await fetchLunar(date);if(version!==previewVersion)return;lunarPreview={date,state:'ready',lunar};}
  catch{if(version!==previewVersion)return;lunarPreview={date,state:'error'};}
  refreshTime();
}
function stopSpeech(){
  speechVersion++;clearTimeout(speechWatchdog);const old=recognition;recognition=null;listening=false;
  if(old){try{old.abort();}catch{}}
  const message=$('#voice-status');if(message)message.textContent='';
  resetVoiceButton();
}
function resetVoiceButton(){
  const button=$('#voice-input');if(button){button.classList.remove('listening');button.setAttribute('aria-pressed','false');button.setAttribute('aria-label',u().voice);$('#voice-button-label').textContent=u().voice;}
}
function toggleSpeech(){
  const label=$('#voice-status');
  if(recognition){try{recognition.stop();}catch{stopSpeech();}return;}
  const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!Speech){label.textContent=u().voiceUnsupported;$('#question').focus();return;}
  if(window.isSecureContext===false&&location.hostname!=='localhost'){label.textContent=jc().voiceTimeout;return;}
  const version=++speechVersion,base=$('#question').value.trim();let current,received=false;
  const finish=()=>{clearTimeout(speechWatchdog);listening=false;recognition=null;resetVoiceButton();};
  try{current=new Speech();recognition=current;}catch{label.textContent=u().voiceUnsupported;return;}
  current.lang=lang==='zh'?'zh-CN':'en-US';current.continuous=false;current.interimResults=true;current.maxAlternatives=1;
  label.textContent=jc().voiceStarting;delete label.dataset.error;
  $('#voice-input').setAttribute('aria-pressed','true');$('#voice-button-label').textContent=jc().voiceFinish;
  current.onstart=()=>{if(version!==speechVersion)return;clearTimeout(speechWatchdog);listening=true;$('#voice-input').classList.add('listening');$('#voice-input').setAttribute('aria-label',u().stop);label.textContent=`${u().listening} ${u().voiceNote}`;};
  current.onresult=event=>{if(version!==speechVersion||!$('#question'))return;const transcript=Array.from(event.results).map(r=>r[0].transcript).join(lang==='zh'?'':' ');received=!!transcript.trim();question=[base,transcript].filter(Boolean).join(' ').slice(0,300);$('#question').value=question;};
  current.onerror=event=>{if(version!==speechVersion)return;clearTimeout(speechWatchdog);label.dataset.error='true';label.textContent=['not-allowed','service-not-allowed','audio-capture'].includes(event.error)?u().voiceDenied:event.error==='no-speech'?u().voiceEmpty:event.error==='network'?jc().voiceNetwork:event.error==='language-not-supported'?jc().voiceLanguage:u().voiceError;finish();};
  current.onend=()=>{if(version!==speechVersion)return;finish();if(!label.dataset.error)label.textContent=received?jc().voiceReview:jc().voiceNoResult;};
  // Set feedback before start(), and start synchronously inside the user's tap (needed on mobile).
  speechWatchdog=setTimeout(()=>{if(version!==speechVersion||listening)return;stopSpeech();label.textContent=jc().voiceTimeout;},9000);
  try{current.start();}catch{stopSpeech();label.textContent=u().voiceError;}
}
function status(message,error=false){const el=$('#question-status');if(el){el.textContent=message;el.classList.toggle('error',error);}}
function lockForm(lock){
  busy=lock;document.body.classList.toggle('counting',lock);
  document.querySelectorAll('#reading-form button,#reading-form input,#reading-form select,#reading-form textarea,#replay,#new-question,#time-settings,[data-color]').forEach(el=>el.disabled=lock);
  $('#language').disabled=lock;
}
function showCallout(stage,count,total,index){
  const box=$('#count-callout');if(!box)return;box.hidden=false;
  $('#count-label').textContent=`0${stage+1} / ${t().steps[stage]}`;
  $('#count-position').textContent=positionName(index);
  $('#count-detail').textContent=`${t().count} ${count} ${t().of} ${total}`;
  document.querySelectorAll('[data-step]').forEach(el=>el.classList.toggle('active',Number(el.dataset.step)===stage));
  const desc=$(`[data-step-description="${stage}"]`);if(desc)desc.textContent=`${count}/${total} → ${positionName(index)}`;
}
async function animate(data){
 const version=++animationVersion;skipAnimation=reduced();
 $('#skip-animation').hidden=skipAnimation;
 const total=data.stages.reduce((n,s)=>n+s.count,0),stepDelay=Math.max(170,Math.min(560,7800/total));
 for(let stage=0;stage<3;stage++){
  const {start,count}=data.stages[stage];
  for(let j=0;j<count;j++){
   if(version!==animationVersion)return false;
   const n=(start+j)%6,retap=stage>0&&j===0,wait=retap?Math.max(460,stepDelay):stepDelay;
   if(!skipAnimation||j===count-1){activateNode(n,skipAnimation,{duration:Math.min(430,wait*.82),retap});showCallout(stage,j+1,count,n);}
   if(!skipAnimation)await sleep(wait);
  }
  if(!skipAnimation)await sleep(240);
 }
 if(version!==animationVersion)return false;
 $('#skip-animation').hidden=true;$('#count-callout').hidden=true;
 $('#palm-state').textContent=t().complete;return true;
}
async function beginReading(){
  if(busy)return;
  stopSpeech();
  question=$('#question').value.trim();
  if(!question){status(t().empty,true);$('#question').focus();return;}
  const key=questionKey(question);
  if(readings.has(key)){result=readings.get(key);home();status(t().repeat);return;}
  let clock;try{clock=clockData();}catch(error){status(t()[error.message]||t().timeError,true);return;}
  const version=routeVersion;
  lockForm(true);$('#submit-reading').textContent=t().preparing;status(t().loading);
  try{
    const lunar=await fetchLunar(clock.date);
    if(version!==routeVersion)return;
    const hourIndex=shichen(clock.hour),calculation=calculate(lunar.month,lunar.day,hourIndex);
    category=inferTopic(question);
    const reflection=extraAdvice[category]?.[calculation.timePalace]||meanings[calculation.timePalace].advice[category]||meanings[calculation.timePalace].advice.daily;
    const candidate=recordReading({...clock,lunar,hourIndex,...calculation,question,category,reflection:[...reflection]});
    paintLunar(lunar,clock);status('');
    $('#submit-reading').textContent=t().calculating;
    if(window.innerWidth<=760)$('.palm-region')?.scrollIntoView?.({behavior:reduced()?'instant':'smooth',block:'center'});
    if(await animate(calculation)){result=candidate;readings.set(key,candidate);journal.unshift(candidate);storageFailed=journalState.error||!writeJournal(storage,journal);home();if(window.innerWidth<=760)$('.question-region')?.scrollIntoView?.({behavior:'instant',block:'start'});}
  }catch(error){if(version===routeVersion){status(t()[error.message]||t().network,true);$('#submit-reading').innerHTML=`${u().begin}<span>↗</span>`;}}
  finally{if(version===routeVersion)lockForm(false);}
}
async function replayResult(){
  if(busy||!result)return;lockForm(true);const version=routeVersion;
  await animate(result);if(version===routeVersion)lockForm(false);
}
function method(){
  const e=exampleData(),calc=calculate(e.month,e.day,e.hourIndex);
  $('#main').innerHTML=`<section class="page-intro"><div class="eyebrow">${t().methodEye}</div><h1>${t().methodTitle}</h1><p>${t().methodIntro}</p></section><section class="method-workspace"><div class="method-controls"><span class="section-kicker">${t().demo}</span><div class="example-tabs" role="group" aria-label="${t().demo}">${t().examples.map((ex,i)=>`<button type="button" data-example="${i}" aria-pressed="${i===exampleIndex}">${ex}</button>`).join('')}</div><div class="method-step-list">${t().steps.map((title,i)=>`<button class="method-step" type="button" data-method-step="${i}"><span>0${i+1}</span><div><h2>${title}</h2><p>${t().methodSteps[i]}</p><strong>${calc.stages[i].count} ${lang==='zh'?'次计数':'counts'} → ${positionName(calc.stages[i].end)}</strong></div></button>`).join('')}</div><button class="primary" id="play-example" type="button">${t().play}<span>↗</span></button><p class="small-note">${t().sample}</p></div>${handPanel()}</section>${processMarkup()}<section class="explanation-section"><div><div class="eyebrow">01 → 06 → 01</div><h2>${t().formulaTitle}</h2><p>${t().formulaText}</p><div class="cycle-strip">${NAMES.map((name,i)=>`<span><b>${name}</b><small>${i}</small></span>`).join('')}</div></div><div><h2>${t().hoursTitle}</h2><p>${t().hoursIntro}</p><div class="hours-grid">${BRANCHES.map((b,i)=>`<div><span>${b} <small>${i+1}</small></span><strong>${String((i*2+23)%24).padStart(2,'0')}:00–${String((i*2+1)%24).padStart(2,'0')}:00</strong></div>`).join('')}</div></div></section>`;
  $('#palm-state').textContent=t().choose;activateNode(null,true);
  document.querySelectorAll('[data-example]').forEach(b=>b.onclick=()=>{animationVersion++;exampleIndex=Number(b.dataset.example);method();});
  document.querySelectorAll('[data-method-step]').forEach(b=>b.onclick=()=>{animationVersion++;const i=Number(b.dataset.methodStep),s=calc.stages[i];activateNode(s.end,reduced());showCallout(i,s.count,s.count,s.end);document.querySelectorAll('[data-method-step]').forEach(el=>el.classList.toggle('selected',el===b));});
  $('#skip-animation').onclick=()=>{skipAnimation=true;};
  $('#play-example').onclick=async()=>{if(busy)return;const version=routeVersion;busy=true;$('#language').disabled=true;document.querySelectorAll('.method-controls button').forEach(b=>b.disabled=true);await animate(calc);if(version===routeVersion){busy=false;$('#language').disabled=false;document.querySelectorAll('.method-controls button').forEach(b=>b.disabled=false);}};
}
function meaningsPage(){
  $('#main').innerHTML=`<section class="page-intro"><div class="eyebrow">${t().meaningsEye}</div><h1>${t().meaningsTitle}</h1><p>${t().meaningsIntro}</p></section><section class="meaning-grid">${meanings.map((m,i)=>`<article class="meaning-card" style="--sign-color:${palettes[i].color}"><div class="meaning-top"><span class="sign-swatch"></span><span>0${i+1}</span></div><div class="meaning-name"><h2>${lang==='zh'?m.name:m.romanized}</h2><span>${lang==='en'?m.name+' · ':''}${m.en}</span></div>${lang==='en'?`<p class="sign-summary">${m.summary}</p>`:''}${verseMarkup(i)}<div class="meaning-advice"><span class="section-kicker">${u().modern}</span><p>${m.advice.daily[li()]}</p></div></article>`).join('')}</section><p class="verse-context">${u().verseNote}</p><div class="page-end"><a class="secondary" href="#/">${t().return} ↗</a></div>`;
}
function rulesPage(){
  const links=[[lang==='zh'?'https://6ren.chaosxy.com/results/':'https://6ren.chaosxy.com/en/results/',u().methodSource],['https://babel.hathitrust.org/cgi/pt?id=uc1.$b466495&seq=35',lang==='zh'?'1896《中外提福》· 六壬时课（扫描第 35–36 页）':'1896 Zhongwai Tifu · Six Ren Time Lesson (scans 35–36)'],['https://www.bilibili.com/video/BV1im4y197mW/',u().courseSource],['https://data.gov.hk/tc-data/dataset/hk-hko-rss-gregorian-lunar-calendar-conversion-table',u().calendarSource],['https://www.karolortyl.com/',u().artSource]];
  $('#main').innerHTML=`<section class="page-intro"><div class="eyebrow">小六壬 / XIAO LIU REN</div><h1>${u().aboutTitle}</h1><p>${u().aboutText}</p><p>${u().aboutMore}</p></section><section class="rules-layout"><div class="rule-list">${t().rules.map(([title,body],i)=>`<article><span class="rule-number">0${i+1}</span><div><h2>${title}</h2><p>${body}</p></div></article>`).join('')}</div><aside class="conventions"><h2>${t().conventionsTitle}</h2><p>${t().conventionsText}</p>${t().conventions.map(([title,body])=>`<details><summary>${title}<span>+</span></summary><p>${body}</p></details>`).join('')}</aside></section>${timingSection()}${paletteSection()}<section class="sources-section"><h2>${u().sources}</h2><div class="sources-grid">${links.map(([url,title],i)=>`<a href="${url}" target="_blank" rel="noopener"><span>0${i+1} ↗</span><h3>${title}</h3><p>${new URL(url).hostname}</p></a>`).join('')}</div><div class="source-notes"><p>${u().verseNote}</p><p>${u().colorNote}</p><p>${u().modernNote}</p><p>${u().privacy}</p></div></section>`;
}
function paletteSection(){return `<section class="palette-section"><h2>${lang==='zh'?'六色，六种心境':'Six colors, six states of mind'}</h2><p>${u().colorNote}</p><div class="palette-grid">${palettes.map(p=>`<article style="--swatch:${p.color}"><i aria-hidden="true"></i><h3>${p.name} · ${p.colorName[li()]}</h3><strong>${p.emotion[li()]}</strong><p>${p.note[li()]}</p><a href="${p.sources[0]}" target="_blank" rel="noopener">${lang==='zh'?'色彩来源':'Color source'} ↗</a></article>`).join('')}</div></section>`;}
function historyPage(){
  $('#main').innerHTML=`<section class="page-intro"><div class="eyebrow">${jc().history}</div><h1>${jc().historyTitle}</h1><p>${jc().historyIntro}</p>${storageFailed?`<p role="status">${journalState.error?jc().corrupt:jc().storageError}</p>`:''}</section><section class="history-list">${journal.length?journal.map((r,i)=>`<article class="history-card" data-record="${i}" style="--sign-color:${palettes[r.timePalace].color}"><div class="history-summary"><div><p class="history-date">${esc(r.date)} · ${esc(r.clock)} · ${esc(r.timeZone)}</p><h2>${esc(r.question)}</h2><p class="history-sign">${NAMES[r.timePalace]} <span>${lang==='en'?palettes[r.timePalace].en:''}</span></p></div><button class="secondary" type="button" data-open="${i}">${jc().open} ↗</button></div><details><summary>${jc().outcome} · ${jc().outcomes[Math.max(0,outcomeKeys.indexOf(r.review?.outcome))]}</summary><form data-review="${i}"><label>${jc().outcome}<select name="outcome">${outcomeKeys.map((k,n)=>`<option value="${k}" ${r.review?.outcome===k?'selected':''}>${jc().outcomes[n]}</option>`).join('')}</select></label><label>${jc().actualDate}<input name="actualDate" type="date" value="${esc(r.review?.actualDate||'')}"></label><label class="note-label">${jc().note}<textarea name="note" maxlength="2000" placeholder="${jc().notePlaceholder}">${esc(r.review?.note||'')}</textarea></label><div class="review-actions"><button class="secondary" type="submit">${jc().save}</button><button class="text-button" type="button" data-delete="${i}">${jc().delete}</button><span class="review-status" role="status"></span></div></form></details></article>`).join(''):`<p>${jc().empty}</p><a class="secondary" href="#/">${jc().back} ↗</a>`}</section>`;
  document.querySelectorAll('[data-open]').forEach(button=>button.onclick=()=>{result=journal[Number(button.dataset.open)];question=result.question;location.hash='/';});
  document.querySelectorAll('[data-review]').forEach(form=>form.onsubmit=event=>{event.preventDefault();const r=journal[Number(form.dataset.review)];r.review={outcome:form.elements.outcome.value,actualDate:form.elements.actualDate.value,note:form.elements.note.value.trim()};storageFailed=journalState.error||!writeJournal(storage,journal);form.querySelector('.review-status').textContent=storageFailed?jc().storageError:jc().saved;form.closest('details').querySelector('summary').textContent=`${jc().outcome} · ${jc().outcomes[outcomeKeys.indexOf(r.review.outcome)]}`;});
  document.querySelectorAll('[data-delete]').forEach(button=>button.onclick=()=>{if(!window.confirm(jc().confirmDelete))return;const r=journal[Number(button.dataset.delete)],next=journal.filter(entry=>entry.id!==r.id);if(journalState.error||!writeJournal(storage,next)){button.closest('form').querySelector('.review-status').textContent=jc().storageError;return;}journal=next;readings.delete(questionKey(r.question));if(result?.id===r.id){result=null;question='';}historyPage();});
}
function timingSection(){return `<section class="timing-section"><h2>${jc().timingTitle}</h2><p>${jc().timingIntro}</p><div class="timing-grid">${timing.map((row,i)=>`<article><h3>${NAMES[i]}</h3><strong>${row[li()]}</strong><p>${row[li()+2]}</p></article>`).join('')}</div><p class="small-note">${jc().timingNote} <a href="https://www.shenjige.cn/details/I8TyiKp2X.html" target="_blank" rel="noopener">${lang==='zh'?'查阅整理原文':'Read the secondary summary'} ↗</a></p></section>`;}
function render(){
  stopSpeech();cancelPalmMotion();routeVersion++;animationVersion++;busy=false;document.body.classList.remove('counting');$('#language').disabled=false;document.body.dataset.view=route()==='/'?'home':'page';applyTheme();updateChrome();
  if(route()==='/method')method();else if(route()==='/meanings')meaningsPage();else if(route()==='/rules')rulesPage();else if(route()==='/history')historyPage();else home();
}
$('#language').onclick=()=>{lang=lang==='zh'?'en':'zh';savePreference('palm-language',lang);render();};
window.addEventListener('hashchange',()=>{render();window.scrollTo(0,0);});
render();
const clockTimer=setInterval(()=>{if(!busy)refreshTime();},1000);
window.addEventListener('pagehide',()=>{clearInterval(clockTimer);stopSpeech();});
// Preferences and history persist only in this browser. Voice audio is handled by its speech service.
if(document.modelContext?.registerTool){
  const lifecycle=new AbortController();
  const tool={name:'show_xiaoliuren_example',title:'Explore a Xiao Liu Ren example',description:'Navigate to the method page and show one of its two worked examples. Does not create a personal reading.',inputSchema:{type:'object',properties:{example:{type:'integer',enum:[1,2]}},required:['example'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:async input=>{if(!input||![1,2].includes(input.example))throw new Error('Example must be 1 or 2.');exampleIndex=input.example-1;if(route()!=='/method'){location.hash='/method';await new Promise(resolve=>window.addEventListener('hashchange',resolve,{once:true}));}else render();const e=exampleData(),c=calculate(e.month,e.day,e.hourIndex);activateNode(c.timePalace,true);showCallout(2,e.hourIndex,e.hourIndex,c.timePalace);return {example:input.example,month:e.month,day:e.day,hourIndex:e.hourIndex,result:NAMES[c.timePalace]};}};
  try{Promise.resolve(document.modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}
  window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}

import {palmMarkup,activateNode} from './palm.js';
import {NAMES,BRANCHES,calculate,shichen,timeAt,fetchLunar,validateDate} from './core.js';
import {copy,meanings} from './content.js';
import {ui,verses,palettes,inferTopic,extraAdvice} from './experience.js';
const $=s=>document.querySelector(s);
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const preference=(key,fallback)=>{try{return localStorage.getItem(key)||fallback;}catch{return fallback;}};
const savePreference=(key,value)=>{try{localStorage.setItem(key,value);}catch{}};
let lang=preference('palm-language','zh');if(!copy[lang])lang='zh';
let zone=preference('palm-zone',Intl.DateTimeFormat().resolvedOptions().timeZone||'Asia/Shanghai');
try{timeAt(new Date(),zone);}catch{zone='Asia/Shanghai';}
let question='',category='daily',timeMode='now',recorded='',settingsOpen=false,result=null,busy=false,routeVersion=0,animationVersion=0,skipAnimation=false,exampleIndex=0;
const readings=new Map();
let lunarPreview={date:'',state:'idle'},previewVersion=0,recognition=null,speechVersion=0,listening=false;
const u=()=>ui[lang];
const t=()=>({...copy[lang],nav:[u().home,u().method,u().meanings,u().about],footer:u().disclaimer}), li=()=>lang==='zh'?0:1;
const positionName=i=>lang==='zh'?NAMES[i]:`${NAMES[i]} · ${meanings[i].pinyin}`;
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const route=()=>location.hash.slice(1)||'/';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const exampleData=()=>exampleIndex===0?{month:3,day:3,hourIndex:5}:{month:4,day:5,hourIndex:11};
function clockData(){
  if(timeMode==='recorded'){
    if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(recorded))throw new Error('timeError');
    const [date,clock]=recorded.split('T'),hour=Number(clock.slice(0,2)),minute=Number(clock.slice(3));
    validateDate(date);if(hour>23||minute>59)throw new Error('timeError');
    return {date,clock,hour,timeZone:zone};
  }
  return timeAt(new Date(),zone);
}
function updateChrome(){
  document.documentElement.lang=lang==='zh'?'zh-CN':'en';
  const routes=['/','/method','/meanings','/rules'];
  $('#navigation').innerHTML=routes.map((r,i)=>`<a href="#${r}" ${route()===r?'aria-current="page"':''}>${t().nav[i]}</a>`).join('');
  $('#language').innerHTML=lang==='zh'?'中 <span>/ EN</span>':'EN <span>/ 中</span>';
  $('#language').setAttribute('aria-label',lang==='zh'?'Switch to English':'切换至中文');
  $('#footer-note').textContent=route()==='/'?'':t().footer;
  document.title=`${t().nav[Math.max(0,routes.indexOf(route()))]} · 掌间 Palm of Time`;
}
function processMarkup(data=null){
  return `<div class="process-bar" aria-label="${lang==='zh'?'计算步骤':'Calculation steps'}">${t().steps.map((title,i)=>`<div class="process-step" data-step="${i}"><span class="step-num">0${i+1}</span><div><div class="step-title">${title}</div><div class="step-desc" data-step-description="${i}">${data?esc(positionName(data.stages[i].end)):t().stepDesc[i]}</div></div></div>`).join('')}</div>`;
}
function handPanel(){return `<div class="hand-panel">${palmMarkup(NAMES)}<div class="count-callout" id="count-callout" hidden><span class="count-label" id="count-label"></span><strong id="count-position"></strong><span class="count-detail" id="count-detail"></span></div><button type="button" class="skip-animation text-button" id="skip-animation" hidden>${t().skip}</button></div>`;}
function applyTheme(index=null){
  document.body.dataset.sign=index===null?'':String(index);
  document.body.classList.toggle('result-mode',index!==null);
  const bg=index===null?'#f6f6f2':palettes[index].color;
  document.documentElement.style.backgroundColor=bg;
  document.querySelector('meta[name="theme-color"]').content=bg;
}
function colorKey(){return `<div class="color-key" role="list" aria-label="${u().legend}">${palettes.map((p,i)=>`<span role="listitem" class="color-key-item ${result?.timePalace===i?'is-result':''}" ${result?.timePalace===i?'aria-current="true"':''}><i style="--swatch:${p.color}" aria-hidden="true"></i><span>${p.name}</span></span>`).join('')}</div>`;}
function timeMarkup(){
  const zones=[...new Set([zone,'America/New_York','America/Los_Angeles','Europe/London','Asia/Shanghai','Asia/Hong_Kong','Asia/Taipei','Asia/Tokyo','Australia/Sydney','UTC'])];
  return `<section class="time-region" aria-label="${u().moment}"><div class="time-heading"><span>${result?u().frozen:u().moment}</span>${result?`<span>${esc(result.timeZone.split('/').pop().replaceAll('_',' '))}</span>`:`<button class="text-button" id="time-settings" type="button" aria-expanded="${settingsOpen}" aria-controls="time-controls">${zone.split('/').pop().replaceAll('_',' ')} ↗</button>`}</div><div class="calendar-line"><span>${u().gregorian}</span><div><time id="gregorian-date"></time><span id="gregorian-clock" class="clock-value"></span></div></div><div class="calendar-line lunar-line"><span>${u().lunar}</span><div><strong id="lunar-date">${u().load}</strong><span id="lunar-translation"></span><button class="text-button" id="retry-calendar" type="button" hidden>${u().retry} ↻</button></div></div>
  ${result?'':`<div id="time-controls" class="time-controls" ${settingsOpen?'':'hidden'}><label>${t().zone}<select id="timezone">${zones.map(z=>`<option value="${esc(z)}" ${z===zone?'selected':''}>${esc(z.replaceAll('_',' '))}</option>`).join('')}</select></label><label>${t().timeMode}<select id="time-mode"><option value="now" ${timeMode==='now'?'selected':''}>${t().now}</option><option value="recorded" ${timeMode==='recorded'?'selected':''}>${t().recorded}</option></select></label><label id="recorded-label" ${timeMode==='now'?'hidden':''}>${t().recordedLabel}<input id="recorded-time" type="datetime-local" min="2023-01-01T00:00" max="${new Date().getUTCFullYear()+2}-12-31T23:59" value="${esc(recorded)}"></label></div>`}</section>`;
}
function verseMarkup(index){return `<div class="classical-block"><span class="section-kicker">${u().original}</span><blockquote lang="zh-CN">${verses[index].zh.join('<br>')}</blockquote>${lang==='en'?`<div class="verse-translation"><span class="section-kicker">${u().translation}</span><p>${verses[index].en.join('<br>')}</p></div>`:''}</div>`;}
function formMarkup(){return `<form id="reading-form" novalidate><h1><label for="question">${u().ask}</label></h1><div class="question-input"><textarea id="question" maxlength="300" required placeholder="${u().placeholder}" aria-describedby="question-status voice-status">${esc(question)}</textarea><button class="voice-button" id="voice-input" type="button" aria-label="${u().voice}" aria-pressed="false" title="${u().voice}"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="2" width="8" height="13" rx="4"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/></svg><span class="sr-only">${u().voice}</span></button></div><div id="voice-status" class="voice-status" role="status" aria-live="polite"></div><div class="status" id="question-status" role="status" aria-live="polite"></div><button type="submit" id="submit-reading" class="primary">${u().begin}<span aria-hidden="true">↗</span></button></form>`;}
function resultMarkup(r){
  const m=meanings[r.timePalace],topic=r.category;
  const advice=(extraAdvice[topic]?.[r.timePalace]||m.advice[topic]||m.advice.daily)[li()];
  return `<div class="result-panel"><p class="result-question">${esc(r.question)}</p><div class="result-heading"><h1>${m.name}</h1><div><span>${m.pinyin}</span><span>${palettes[r.timePalace].en}</span></div></div>${verseMarkup(r.timePalace)}<div class="modern-block"><span class="section-kicker">${u().modern} <span class="topic-note">/ ${u().topics[topic]}</span></span><p>${advice}</p></div><div class="result-actions"><button class="text-button" id="replay" type="button">${u().replay} ↻</button><button class="text-button" id="new-question" type="button">${u().again} ↗</button></div><div class="status" id="question-status" role="status"></div></div>`;
}
function home(){
  document.body.dataset.view='home';applyTheme(result?.timePalace??null);
  $('#main').innerHTML=`<div class="home-screen"><section class="palm-region" aria-label="${u().left}">${handPanel()}<div class="palm-caption"><span>${u().left}</span><span>小六壬 / XIAO LIU REN</span></div>${colorKey()}</section>${timeMarkup()}<section class="question-region" aria-label="${result?u().result:u().ask}">${result?resultMarkup(result):formMarkup()}<p class="home-reminder">${u().reminder}</p></section></div>`;
  $('#palm-state').textContent=result?t().complete:u().left;activateNode(result?result.timePalace:null,true);
  $('#skip-animation').onclick=()=>{skipAnimation=true;};
  $('#retry-calendar').onclick=()=>{let clock;try{clock=clockData();}catch{return;}ensureLunar(clock.date,true);};
  if(result){
    $('#new-question').onclick=()=>{result=null;question='';render();$('#question').focus();};
    $('#replay').onclick=()=>replayResult();
  }else{
    $('#question').oninput=e=>{question=e.target.value;};
    $('#voice-input').onclick=toggleSpeech;
    $('#time-settings').onclick=()=>{settingsOpen=!settingsOpen;$('#time-controls').hidden=!settingsOpen;$('#time-settings').setAttribute('aria-expanded',String(settingsOpen));};
    $('#timezone').onchange=e=>{zone=e.target.value;savePreference('palm-zone',zone);stopSpeech();home();};
    $('#time-mode').onchange=e=>{timeMode=e.target.value;$('#recorded-label').hidden=timeMode==='now';refreshTime();};
    $('#recorded-time').oninput=e=>{recorded=e.target.value;refreshTime();};
    $('#reading-form').onsubmit=e=>{e.preventDefault();beginReading();};
  }
  refreshTime();
}
function paintLunar(lunar,clock){
  if(!$('#lunar-date'))return;
  const branch=BRANCHES[shichen(clock.hour)-1];
  $('#lunar-date').textContent=`${lunar.text} · ${branch}时`;
  $('#lunar-translation').textContent=lang==='en'?`${lunar.isLeap?'Leap ':''}month ${lunar.month}, day ${lunar.day} · ${['Zǐ','Chǒu','Yín','Mǎo','Chén','Sì','Wǔ','Wèi','Shēn','Yǒu','Xū','Hài'][shichen(clock.hour)-1]} hour`:lunar.year;
  $('#retry-calendar').hidden=true;
}
function refreshTime(){
  if(route()!=='/'||!$('#gregorian-date'))return;
  let clock;try{clock=result||clockData();}catch{$('#lunar-date').textContent='—';return;}
  $('#gregorian-date').textContent=clock.date.replaceAll('-',' / ');
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
  speechVersion++;const old=recognition;recognition=null;listening=false;
  if(old){try{old.abort();}catch{}}
  const message=$('#voice-status');if(message)message.textContent='';
  const button=$('#voice-input');if(button){button.classList.remove('listening');button.setAttribute('aria-pressed','false');button.setAttribute('aria-label',u().voice);}
}
function toggleSpeech(){
  const label=$('#voice-status');if(listening){recognition?.stop();return;}
  const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!Speech){label.textContent=u().voiceUnsupported;return;}
  const version=++speechVersion,base=$('#question').value.trim();
  recognition=new Speech();const current=recognition;
  current.lang=lang==='zh'?'zh-CN':'en-US';current.continuous=false;current.interimResults=true;current.maxAlternatives=1;
  current.onstart=()=>{if(version!==speechVersion)return;listening=true;$('#voice-input').classList.add('listening');$('#voice-input').setAttribute('aria-pressed','true');$('#voice-input').setAttribute('aria-label',u().stop);label.textContent=`${u().listening} ${u().voiceNote}`;};
  current.onresult=event=>{if(version!==speechVersion||!$('#question'))return;const transcript=Array.from(event.results).map(r=>r[0].transcript).join(lang==='zh'?'':' ');question=[base,transcript].filter(Boolean).join(' ').slice(0,300);$('#question').value=question;};
  current.onerror=event=>{if(version!==speechVersion)return;label.dataset.error='true';label.textContent=['not-allowed','service-not-allowed','audio-capture'].includes(event.error)?u().voiceDenied:event.error==='no-speech'?u().voiceEmpty:u().voiceError;};
  current.onend=()=>{if(version!==speechVersion)return;listening=false;recognition=null;const b=$('#voice-input');if(b){b.classList.remove('listening');b.setAttribute('aria-pressed','false');b.setAttribute('aria-label',u().voice);}if(!label.dataset.error)label.textContent='';};
  delete label.dataset.error;
  try{current.start();}catch{stopSpeech();label.textContent=u().voiceError;}
}
function status(message,error=false){const el=$('#question-status');if(el){el.textContent=message;el.classList.toggle('error',error);}}
function lockForm(lock){
  busy=lock;
  document.querySelectorAll('#reading-form button,#reading-form input,#reading-form select,#reading-form textarea,#replay,#new-question,#time-controls input,#time-controls select,#time-settings').forEach(el=>el.disabled=lock);
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
  for(let stage=0;stage<3;stage++){
    const {start,count}=data.stages[stage];
    for(let j=0;j<count;j++){
      if(version!==animationVersion)return false;
      const n=(start+j)%6;
      if(!skipAnimation||j===count-1){activateNode(n,skipAnimation);showCallout(stage,j+1,count,n);}
      if(!skipAnimation)await sleep(175);
    }
    if(!skipAnimation)await sleep(550);
  }
  if(version!==animationVersion)return false;
  $('#skip-animation').hidden=true;
  $('#palm-state').textContent=t().complete;
  $('#count-label').textContent=u().result;
  $('#count-detail').textContent='';
  return true;
}
async function beginReading(){
  if(busy)return;
  stopSpeech();
  question=$('#question').value.trim();
  if(!question){status(t().empty,true);$('#question').focus();return;}
  const key=question.toLocaleLowerCase().replace(/\s+/g,'');
  if(readings.has(key)){result=readings.get(key);home();status(t().repeat);return;}
  let clock;try{clock=clockData();}catch(error){status(t()[error.message]||t().timeError,true);return;}
  const version=routeVersion;
  lockForm(true);$('#submit-reading').textContent=t().preparing;status(t().loading);
  try{
    const lunar=await fetchLunar(clock.date);
    if(version!==routeVersion)return;
    const hourIndex=shichen(clock.hour),calculation=calculate(lunar.month,lunar.day,hourIndex);
    category=inferTopic(question);
    const candidate={...clock,lunar,hourIndex,...calculation,question,category};
    paintLunar(lunar,clock);status('');
    $('#submit-reading').textContent=t().calculating;
    if(await animate(calculation)){result=candidate;readings.set(key,candidate);home();}
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
  $('#main').innerHTML=`<section class="page-intro"><div class="eyebrow">${t().meaningsEye}</div><h1>${t().meaningsTitle}</h1><p>${t().meaningsIntro}</p></section><section class="meaning-grid">${meanings.map((m,i)=>`<article class="meaning-card" style="--sign-color:${palettes[i].color}"><div class="meaning-top"><span class="sign-swatch"></span><span>0${i+1}</span></div><div class="meaning-name"><h2>${m.name}</h2><span>${m.pinyin}<br>${palettes[i].en}</span></div>${verseMarkup(i)}<div class="meaning-advice"><span class="section-kicker">${u().modern}</span><p>${m.advice.daily[li()]}</p></div></article>`).join('')}</section><p class="verse-context">${u().verseNote}</p><div class="page-end"><a class="secondary" href="#/">${t().return} ↗</a></div>`;
}
function rulesPage(){
  const links=[['https://6ren.chaosxy.com/results/',u().methodSource],['https://www.bilibili.com/video/BV1im4y197mW/',u().courseSource],['https://data.gov.hk/tc-data/dataset/hk-hko-rss-gregorian-lunar-calendar-conversion-table',u().calendarSource],['https://www.karolortyl.com/',u().artSource]];
  $('#main').innerHTML=`<section class="page-intro"><div class="eyebrow">小六壬 / XIAO LIU REN</div><h1>${u().aboutTitle}</h1><p>${u().aboutText}</p><p>${u().aboutMore}</p></section><section class="rules-layout"><div class="rule-list">${t().rules.map(([title,body],i)=>`<article><span class="rule-number">0${i+1}</span><div><h2>${title}</h2><p>${body}</p></div></article>`).join('')}</div><aside class="conventions"><h2>${t().conventionsTitle}</h2><p>${t().conventionsText}</p>${t().conventions.map(([title,body])=>`<details><summary>${title}<span>+</span></summary><p>${body}</p></details>`).join('')}</aside></section><section class="sources-section"><h2>${u().sources}</h2><div class="sources-grid">${links.map(([url,title],i)=>`<a href="${url}" target="_blank" rel="noopener"><span>0${i+1} ↗</span><h3>${title}</h3><p>${new URL(url).hostname}</p></a>`).join('')}</div><div class="source-notes"><p>${u().verseNote}</p><p>${u().colorNote}</p><p>${u().modernNote}</p><p>${u().privacy}</p></div></section>`;
}
function render(){
  stopSpeech();routeVersion++;animationVersion++;busy=false;$('#language').disabled=false;document.body.dataset.view=route()==='/'?'home':'page';applyTheme();updateChrome();
  if(route()==='/method')method();else if(route()==='/meanings')meaningsPage();else if(route()==='/rules')rulesPage();else home();
}
$('#language').onclick=()=>{lang=lang==='zh'?'en':'zh';savePreference('palm-language',lang);render();};
window.addEventListener('hashchange',()=>{render();window.scrollTo(0,0);});
render();
const clockTimer=setInterval(()=>{if(!busy)refreshTime();},1000);
window.addEventListener('pagehide',()=>{clearInterval(clockTimer);stopSpeech();});
// Only preferences persist; questions and readings remain in this page's memory.
if(document.modelContext?.registerTool){
  const lifecycle=new AbortController();
  const tool={name:'show_xiaoliuren_example',title:'Explore a Xiao Liu Ren example',description:'Navigate to the method page and show one of its two worked examples. Does not create a personal reading.',inputSchema:{type:'object',properties:{example:{type:'integer',enum:[1,2]}},required:['example'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:async input=>{if(!input||![1,2].includes(input.example))throw new Error('Example must be 1 or 2.');exampleIndex=input.example-1;if(route()!=='/method'){location.hash='/method';await new Promise(resolve=>window.addEventListener('hashchange',resolve,{once:true}));}else render();const e=exampleData(),c=calculate(e.month,e.day,e.hourIndex);activateNode(c.timePalace,true);showCallout(2,e.hourIndex,e.hourIndex,c.timePalace);return {example:input.example,month:e.month,day:e.day,hourIndex:e.hourIndex,result:NAMES[c.timePalace]};}};
  try{Promise.resolve(document.modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}
  window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}

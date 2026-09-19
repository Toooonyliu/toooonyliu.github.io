import {palmMarkup,activateNode} from './palm.js';
import {NAMES,BRANCHES,calculate,shichen,timeAt,fetchLunar,validateDate} from './core.js';
import {copy,meanings} from './content.js';
const $=s=>document.querySelector(s), categories=['daily','study','creative','communication'];
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const preference=(key,fallback)=>{try{return localStorage.getItem(key)||fallback;}catch{return fallback;}};
const savePreference=(key,value)=>{try{localStorage.setItem(key,value);}catch{}};
let lang=preference('palm-language','zh');if(!copy[lang])lang='zh';
let zone=preference('palm-zone',Intl.DateTimeFormat().resolvedOptions().timeZone||'Asia/Shanghai');
try{timeAt(new Date(),zone);}catch{zone='Asia/Shanghai';}
let question='',category='daily',timeMode='now',recorded='',settingsOpen=false,result=null,busy=false,routeVersion=0,animationVersion=0,skipAnimation=false,exampleIndex=0;
const readings=new Map();
const t=()=>copy[lang], li=()=>lang==='zh'?0:1;
const positionName=i=>lang==='zh'?NAMES[i]:meanings[i].pinyin;
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
  $('#footer-note').textContent=t().footer;
  document.title=`${t().nav[Math.max(0,routes.indexOf(route()))]} · 掌间 Palm of Time`;
}
function processMarkup(data=null){
  return `<div class="process-bar" aria-label="${lang==='zh'?'计算步骤':'Calculation steps'}">${t().steps.map((title,i)=>`<div class="process-step" data-step="${i}"><span class="step-num">0${i+1}</span><div><div class="step-title">${title}</div><div class="step-desc" data-step-description="${i}">${data?esc(positionName(data.stages[i].end)):t().stepDesc[i]}</div></div></div>`).join('')}</div>`;
}
function handPanel(){return `<div class="hand-panel">${palmMarkup(lang==='zh'?NAMES:meanings.map(m=>m.pinyin))}<div class="count-callout" id="count-callout" hidden><span class="count-label" id="count-label"></span><strong id="count-position"></strong><span class="count-detail" id="count-detail"></span></div><button type="button" class="skip-animation text-button" id="skip-animation" hidden>${t().skip}</button></div>`;}
function formMarkup(){
  let clock;try{clock=clockData();}catch{clock=timeAt(new Date(),zone);}
  const zones=[...new Set([zone,'America/New_York','America/Los_Angeles','Europe/London','Asia/Shanghai','Asia/Hong_Kong','Asia/Taipei','Asia/Tokyo','Australia/Sydney','UTC'])];
  return `<div class="query-panel"><div class="eyebrow">${t().eyebrow}</div><h1>${t().hero}</h1><p class="intro">${t().intro}</p>
  <form id="reading-form" novalidate><label class="question-label" for="question">${t().question}<span>${t().one}</span></label><textarea id="question" maxlength="300" required placeholder="${t().placeholder}" aria-describedby="question-status">${esc(question)}</textarea>
  <div class="category-row" role="group" aria-label="${lang==='zh'?'问题类别':'Question topic'}">${categories.map((c,i)=>`<button class="category" type="button" data-category="${c}" aria-pressed="${category===c}">${t().categories[i]}</button>`).join('')}</div>
  <div class="time-surface"><div class="time-top"><span class="time-title">${t().time}</span><button class="text-button" id="time-settings" type="button" aria-expanded="${settingsOpen}" aria-controls="time-controls">${t().settings} ↗</button></div>
  <div class="time-data"><strong>${clock.date}</strong><i>/</i><span>${clock.clock}</span><i>/</i><span>${esc(zone.replaceAll('_',' '))}</span></div><p class="small-note">${t().calendarHint}</p>
  <div id="time-controls" class="time-controls" ${settingsOpen?'':'hidden'}><label>${t().zone}<select id="timezone">${zones.map(z=>`<option value="${esc(z)}" ${z===zone?'selected':''}>${esc(z.replaceAll('_',' '))}</option>`).join('')}</select></label><label>${t().timeMode}<select id="time-mode"><option value="now" ${timeMode==='now'?'selected':''}>${t().now}</option><option value="recorded" ${timeMode==='recorded'?'selected':''}>${t().recorded}</option></select></label><label id="recorded-label" ${timeMode==='now'?'hidden':''}>${t().recordedLabel}<input id="recorded-time" type="datetime-local" min="2023-01-01T00:00" max="${new Date().getUTCFullYear()+2}-12-31T23:59" value="${esc(recorded)}"></label><p class="small-note">${t().convention} <a href="#/rules">${lang==='zh'?'了解约定':'View conventions'}</a></p></div></div>
  <div class="status" id="question-status" role="status" aria-live="polite"></div><button type="submit" id="submit-reading" class="primary">${t().start}<span class="arrow">↗</span></button><p class="under-button">${t().quiet}</p></form></div>`;
}
function resultMarkup(r){
  const m=meanings[r.timePalace],advice=m.advice[r.category][li()];
  return `<div class="query-panel result-panel"><div class="eyebrow">${t().complete} / ${t().stepFinal}</div><p class="result-question">“${esc(r.question)}”</p><p class="result-overline">${t().result}</p><div class="result-heading"><h1>${m.name}</h1><div><span class="result-pinyin">${m.pinyin}</span><span class="result-kind">${m.kind[li()]}</span></div></div><p class="result-subtitle">${lang==='zh'?m.word[0]:m.en}</p><div class="result-metadata">${r.date} · ${r.clock} · ${esc(r.timeZone.replaceAll('_',' '))}<br>${t().calendar}：${esc(r.lunar.text)} · ${BRANCHES[r.hourIndex-1]}${lang==='zh'?'时':''}</div>
  <div class="interpretation"><span class="section-kicker">${t().traditional}</span><p>${m.traditional[li()]}</p></div><div class="advice-box"><span class="section-kicker">${t().advice}</span><p>${advice}</p><small>${t().adviceNote}</small></div>${r.lunar.isLeap?`<p class="small-note">${t().leap}</p>`:''}<p class="small-note">${t().resultNote}</p><div class="result-actions"><button class="primary" type="button" id="new-question">${t().newQuestion}<span>↗</span></button><button class="secondary" type="button" id="replay">${t().replay}</button></div><a class="source-link" href="https://data.gov.hk/tc-data/dataset/hk-hko-rss-gregorian-lunar-calendar-conversion-table" target="_blank" rel="noopener">${t().source}</a><div class="status" id="question-status" role="status"></div></div>`;
}
function home(){
  $('#main').innerHTML=`<section class="workspace">${result?resultMarkup(result):formMarkup()}${handPanel()}</section>${processMarkup(result)}<div class="below-links"><a href="#/method">${t().methodLink}</a><a href="#/rules">${t().learn}</a></div>`;
  $('#palm-state').textContent=result?t().complete:t().palm;
  activateNode(result?result.timePalace:null,true);
  if(result){
    $('#new-question').onclick=()=>{result=null;question='';render();$('#question').focus();};
    $('#replay').onclick=()=>replayResult();
    showCallout(2,result.stages[2].count,result.stages[2].count,result.timePalace);
  } else {
    $('#question').oninput=e=>{question=e.target.value;};
    document.querySelectorAll('[data-category]').forEach(b=>b.onclick=()=>{category=b.dataset.category;document.querySelectorAll('[data-category]').forEach(el=>el.setAttribute('aria-pressed',String(el===b)));});
    $('#time-settings').onclick=()=>{settingsOpen=!settingsOpen;$('#time-controls').hidden=!settingsOpen;$('#time-settings').setAttribute('aria-expanded',String(settingsOpen));};
    $('#timezone').onchange=e=>{zone=e.target.value;savePreference('palm-zone',zone);home();};
    $('#time-mode').onchange=e=>{timeMode=e.target.value;$('#recorded-label').hidden=timeMode==='now';};
    $('#recorded-time').oninput=e=>{recorded=e.target.value;};
    $('#reading-form').onsubmit=e=>{e.preventDefault();beginReading();};
  }
  $('#skip-animation').onclick=()=>{skipAnimation=true;};
}
function status(message,error=false){const el=$('#question-status');if(el){el.textContent=message;el.classList.toggle('error',error);}}
function lockForm(lock){
  busy=lock;
  document.querySelectorAll('#reading-form button,#reading-form input,#reading-form select,#reading-form textarea,#replay,#new-question').forEach(el=>el.disabled=lock);
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
  return true;
}
async function beginReading(){
  if(busy)return;
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
    const candidate={...clock,lunar,hourIndex,...calculation,question,category};
    status(`${t().calendar}：${lunar.text} · ${BRANCHES[hourIndex-1]}${lang==='zh'?'时':''}${lunar.isLeap?' · '+t().leap:''}`);
    $('#submit-reading').textContent=t().calculating;
    if(await animate(calculation)){result=candidate;readings.set(key,candidate);home();}
  }catch(error){if(version===routeVersion){status(t()[error.message]||t().network,true);$('#submit-reading').innerHTML=`${t().start}<span>↗</span>`;}}
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
  $('#main').innerHTML=`<section class="page-intro"><div class="eyebrow">${t().meaningsEye}</div><h1>${t().meaningsTitle}</h1><p>${t().meaningsIntro}</p></section><section class="meaning-grid">${meanings.map((m,i)=>`<article class="meaning-card"><div class="meaning-top"><span>0${i+1}</span><span>${m.kind[li()]}</span></div><div class="meaning-name"><h2>${m.name}</h2><span>${m.pinyin}<br>${m.en}</span></div><p>${m.traditional[li()]}</p><div class="meaning-advice"><span class="section-kicker">${t().advice}</span><p>${m.advice.daily[li()]}</p></div></article>`).join('')}</section><div class="page-end"><a class="secondary" href="#/">${t().return} ↗</a></div>`;
}
function rulesPage(){
  const links=['https://6ren.chaosxy.com/','https://www.bilibili.com/video/BV1im4y197mW/','https://data.gov.hk/tc-data/dataset/hk-hko-rss-gregorian-lunar-calendar-conversion-table'];
  $('#main').innerHTML=`<section class="page-intro"><div class="eyebrow">${t().rulesEye}</div><h1>${t().rulesTitle}</h1><p>${t().rulesIntro}</p></section><section class="rules-layout"><div class="rule-list">${t().rules.map(([title,body],i)=>`<article><span class="rule-number">0${i+1}</span><div><h2>${title}</h2><p>${body}</p></div></article>`).join('')}</div><aside class="conventions"><span class="section-kicker">${lang==='zh'?'透明的规则':'TRANSPARENT RULES'}</span><h2>${t().conventionsTitle}</h2><p>${t().conventionsText}</p>${t().conventions.map(([title,body])=>`<details><summary>${title}<span>+</span></summary><p>${body}</p></details>`).join('')}</aside></section><section class="sources-section"><h2>${t().sourcesTitle}</h2><div class="sources-grid">${t().sourceCards.map(([title,body],i)=>`<a href="${links[i]}" target="_blank" rel="noopener"><span>0${i+1} ↗</span><h3>${title}</h3><p>${body}</p></a>`).join('')}</div><p class="privacy-note">${t().privacy}</p></section>`;
}
function render(){
  routeVersion++;animationVersion++;busy=false;$('#language').disabled=false;updateChrome();
  if(route()==='/method')method();else if(route()==='/meanings')meaningsPage();else if(route()==='/rules')rulesPage();else home();
}
$('#language').onclick=()=>{lang=lang==='zh'?'en':'zh';savePreference('palm-language',lang);render();};
window.addEventListener('hashchange',()=>{render();window.scrollTo(0,0);});
render();
// Only preferences persist; questions and readings remain in this page's memory.
if(document.modelContext?.registerTool){
  const lifecycle=new AbortController();
  const tool={name:'show_xiaoliuren_example',title:'Explore a Xiao Liu Ren example',description:'Navigate to the method page and show one of its two worked examples. Does not create a personal reading.',inputSchema:{type:'object',properties:{example:{type:'integer',enum:[1,2]}},required:['example'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:async input=>{if(!input||![1,2].includes(input.example))throw new Error('Example must be 1 or 2.');exampleIndex=input.example-1;if(route()!=='/method'){location.hash='/method';await new Promise(resolve=>window.addEventListener('hashchange',resolve,{once:true}));}else render();const e=exampleData(),c=calculate(e.month,e.day,e.hourIndex);activateNode(c.timePalace,true);showCallout(2,e.hourIndex,e.hourIndex,c.timePalace);return {example:input.example,month:e.month,day:e.day,hourIndex:e.hourIndex,result:NAMES[c.timePalace]};}};
  try{Promise.resolve(document.modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}
  window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}

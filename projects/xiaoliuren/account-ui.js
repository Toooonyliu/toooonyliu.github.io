import {accountConfig} from './account-config.js?v=ask18';
import {googleSignIn} from './account-oauth.js?v=ask18';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const words={
 zh:{google:'通过 Google 登录',googleIntro:'使用 Google 账号登录，在不同设备上查看自己的记录。',authError:'登录未完成，请重试。',login:'登录',account:'账号',title:'把问过的事，带在身边。',intro:'使用邮箱验证码登录，在不同设备上查看自己的记录。首次登录会创建账号。',email:'邮箱',send:'发送验证码',code:'邮箱验证码',verify:'登录',resend:'重新发送',change:'更换邮箱',close:'关闭',sent:'验证码已发送，请查收邮件。',wait:'请稍候…',invalid:'验证码不正确或已过期，请重试。',sendError:'未能发送验证码，请稍后重试。',rate:'请求较频繁，请稍后再试。',network:'连接失败，请检查网络后重试。',guest:'继续以游客使用',signed:'已登录',logout:'退出登录',history:'查看我的记录',cloud:'账号记录会同步到你的其他设备。',local:'游客记录仅保存在当前浏览器。登录后可选择导入。',loading:'正在读取账号记录…',saving:'正在同步…',synced:'已同步',loadError:'账号记录暂时无法读取，请重试。',syncError:'有改动尚未同步，请保持页面打开并重试。',localError:'本机记录无法保存，请允许浏览器存储。',retry:'重试同步',refresh:'刷新记录',import:'导入本机记录',importConfirm:'将此浏览器中的游客记录复制到当前账号？原有本机记录会保留。共 ',importEnd:' 条。',pendingLeave:'还有记录尚未同步。退出会丢失未同步的改动，仍要退出吗？',privacy:'登录后的问题、卦象和复盘将保存至你的账号。游客记录仅在你主动导入时上传。',unavailable:'登录暂不可用，请稍后重试。'},
 en:{google:'Continue with Google',googleIntro:'Sign in with Google to revisit your readings on any device.',authError:'Sign-in did not complete. Please try again.',login:'Sign in',account:'Account',title:'Keep your questions with you.',intro:'Sign in with an email code to revisit your readings on any device. Your first sign-in creates an account.',email:'Email',send:'Send code',code:'Email code',verify:'Sign in',resend:'Send again',change:'Change email',close:'Close',sent:'Code sent. Check your inbox.',wait:'Please wait…',invalid:'This code is invalid or expired. Try again.',sendError:'Could not send a code. Please try again later.',rate:'Too many requests. Please wait and try again.',network:'Connection failed. Check your connection and retry.',guest:'Continue as a guest',signed:'Signed in',logout:'Sign out',history:'View my history',cloud:'Your account history syncs across your devices.',local:'Guest readings stay in this browser. Sign in to choose whether to import them.',loading:'Loading your account history…',saving:'Syncing…',synced:'Synced',loadError:'Could not load account history. Please retry.',syncError:'Some changes have not synced. Keep this page open and retry.',localError:'Could not save local history. Allow browser storage.',retry:'Retry sync',refresh:'Refresh history',import:'Import browser history',importConfirm:'Copy this browser’s guest readings to your current account? Local originals will remain. Readings: ',importEnd:'.',pendingLeave:'Some changes have not synced. Signing out will discard them. Sign out anyway?',privacy:'Signed-in questions, readings and reflections are stored in your account. Guest readings upload only when you choose to import them.',unavailable:'Sign-in is unavailable. Please try again later.'}
};
export const accountWords=lang=>words[lang]||words.en;
export function accountStatus(state,lang){const c=accountWords(lang);return state.loading?c.loading:state.error?({load_error:c.loadError,sync_error:c.syncError,local_error:c.localError}[state.error]||c.network):state.saving?c.saving:state.user?c.synced:'';}
export function accountHistoryMarkup(store,lang){
 const s=store.snapshot(),c=accountWords(lang);if(!s.enabled)return '';
 return `<div class="account-history"><p>${esc(s.user?c.cloud:c.local)}</p>${s.user?`<p class="account-email">${esc(s.user.email)}</p>`:''}<p role="status" class="account-sync-status">${esc(accountStatus(s,lang))}</p><div class="account-actions">${s.user?`<button class="text-button" data-account-refresh ${s.loading||s.saving?'disabled':''}>${s.error||s.pending?c.retry:c.refresh}</button>${store.guestEntries().length?`<button class="text-button" data-account-import ${s.loading||s.saving?'disabled':''}>${c.import}</button>`:''}`:`<button class="secondary" data-account-login ${s.loading?'disabled':''}>${c.login}</button>`}</div></div>`;
}
export function bindAccountHistory(store,lang,open,onUpdate){
 document.querySelector('[data-account-login]')?.addEventListener('click',open);
 document.querySelector('[data-account-refresh]')?.addEventListener('click',async()=>{await store.retry();onUpdate();});
 document.querySelector('[data-account-import]')?.addEventListener('click',async()=>{const c=accountWords(lang);if(!confirm(c.importConfirm+store.guestEntries().length+c.importEnd))return;await store.importGuest();onUpdate();});
}
export function createAccountUI(store,getLang){
 let dialog=null,pending=false,email='',step='email',nextSend=0,clock=null;
 const c=()=>accountWords(getLang());
 function close(){dialog?.close();}
 function status(message){const el=dialog?.querySelector('[role=status]');if(el)el.textContent=message;}
 function errorMessage(error,verify=false){return error?.status===429||String(error?.code||'').includes('rate_limit')?c().rate:verify?c().invalid:c().sendError;}
 function markup(){
  const s=store.snapshot(),w=c();
  return `<div class="account-dialog-head"><h2 id="account-title">${s.user?w.account:w.title}</h2><button class="text-button" type="button" data-close aria-label="${w.close}">×</button></div>${s.user?`<p>${w.signed}</p><p class="account-email">${esc(s.user.email)}</p><div class="account-actions"><a class="secondary" href="#/history" data-view-history>${w.history}</a><button class="text-button" data-logout>${w.logout}</button></div><p role="status"></p>`:`<p>${accountConfig.provider==='google'?w.googleIntro:w.intro}</p>${accountConfig.provider==='google'?`<button class="primary" type="button" data-google>${w.google}</button><p role="status" aria-live="polite"></p>`:`<form id="account-form"><label for="account-email">${w.email}</label><input id="account-email" type="email" required autocomplete="email" maxlength="254" value="${esc(email)}" ${step==='code'?'readonly':''}>${step==='code'?`<label for="account-code">${w.code}</label><input id="account-code" required type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6,10}" minlength="6" maxlength="10"><button class="primary" type="submit">${w.verify}</button><div class="account-actions"><button class="text-button" type="button" data-resend>${w.resend}</button><button class="text-button" type="button" data-change>${w.change}</button></div>`:`<button class="primary" type="submit">${w.send}</button>`}<p role="status" aria-live="polite"></p></form>`}<p class="account-privacy">${w.privacy}</p><button class="text-button" data-close>${w.guest}</button>`}`;
 }
 function tick(){const b=dialog?.querySelector('[data-resend]');if(b){const remaining=Math.ceil((nextSend-Date.now())/1000);b.disabled=pending||remaining>0;b.textContent=remaining>0?`${c().resend} (${remaining}s)`:c().resend;}}
 function draw(){
  dialog.innerHTML=markup();
  dialog.querySelectorAll('[data-close]').forEach(b=>b.onclick=close);
  dialog.querySelector('[data-view-history]')?.addEventListener('click',close);
  dialog.querySelector('[data-logout]')?.addEventListener('click',async()=>{
   if(store.snapshot().pending&&!confirm(c().pendingLeave))return;
   pending=true;lock(true);try{await store.signOut();close();}catch{status(c().network);}finally{pending=false;lock(false);}
  });
  dialog.querySelector('[data-google]')?.addEventListener('click',async()=>{if(pending)return;pending=true;lock(true);status(c().wait);try{const {error}=await googleSignIn(store.client,import.meta.url);if(error)throw error;}catch{status(c().authError);}finally{pending=false;lock(false);}});
  dialog.querySelector('[data-change]')?.addEventListener('click',()=>{step='email';draw();dialog.querySelector('input')?.focus();});
  dialog.querySelector('[data-resend]')?.addEventListener('click',send);
  dialog.querySelector('form')?.addEventListener('submit',async e=>{e.preventDefault();if(pending)return;if(step==='email'){email=dialog.querySelector('#account-email').value.trim();await send();}else await verify();});
  tick();
 }
 function lock(value){dialog?.querySelectorAll('input,button').forEach(el=>el.disabled=value);tick();}
 async function send(){
  if(pending)return;if(Date.now()<nextSend){status(c().rate);return;}
  pending=true;lock(true);status(c().wait);
  try{const {error}=await store.client.auth.signInWithOtp({email,options:{shouldCreateUser:true}});if(error)throw error;nextSend=Date.now()+60000;step='code';draw();status(c().sent);dialog.querySelector('#account-code')?.focus();}
  catch(error){status(errorMessage(error));}finally{pending=false;lock(false);}
 }
 async function verify(){
  const token=dialog.querySelector('#account-code').value.trim();pending=true;lock(true);status(c().wait);
  try{const {data,error}=await store.client.auth.verifyOtp({email,token,type:'email'});if(error)throw error;await store.setUser(data.user);close();}
  catch(error){status(errorMessage(error,true));}finally{pending=false;lock(false);}
 }
 function open(){
  if(!store.client)return;
  if(!dialog){dialog=document.createElement('dialog');dialog.id='account-dialog';dialog.setAttribute('aria-labelledby','account-title');document.body.append(dialog);dialog.addEventListener('close',()=>{clearInterval(clock);});}
  draw();dialog.showModal();clearInterval(clock);clock=setInterval(tick,1000);dialog.querySelector(step==='code'?'#account-code':'input')?.focus();
 }
 function update(){const b=document.querySelector('#account-button'),s=store.snapshot();if(b){b.hidden=!s.enabled;b.disabled=s.loading;b.textContent=s.user?c().account:c().login;b.onclick=open;}if(dialog?.open&&s.user&&!dialog.querySelector('[data-logout]'))draw();}
 return {open,update,close,showLoginError(){open();status(c().authError);}};
}

// Isolated-browser UI regression checks. Gamepads and the result screen are
// synthetic fixtures; this script does not certify physical controller support.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import net from 'node:net';

const target = new URL(process.argv[2] || 'http://127.0.0.1:4173/');
target.searchParams.set('debug', '1');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const server = net.createServer();
await new Promise((resolve, reject) => server.listen(0, '127.0.0.1', resolve).once('error', reject));
const port = server.address().port;
await new Promise(resolve => server.close(resolve));
const profile = await mkdtemp(join(tmpdir(), 'one-cut-language-'));
const chrome = spawn(process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank',
], { stdio: 'ignore' });
let socket;
const exceptions = [], screenshots = [];
try {
  let page;
  for (let attempt = 0; attempt < 100 && !page; attempt++) {
    try { page = (await fetch(`http://127.0.0.1:${port}/json`).then(r => r.json())).find(p => p.type === 'page'); } catch {}
    if (!page) await delay(100);
  }
  assert.ok(page, 'Chrome started');
  socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let serial = 0;
  const pending = new Map();
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (pending.has(message.id)) {
      const request = pending.get(message.id); pending.delete(message.id); clearTimeout(request.timer);
      if (message.error) request.reject(new Error(message.error.message)); else request.resolve(message.result);
    } else if (message.method === 'Runtime.exceptionThrown') {
      exceptions.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    }
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++serial;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Timeout: ${method}`)); }, 20000);
    pending.set(id, { resolve, reject, timer });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  };
  const waitFor = async (condition, label, timeout = 20000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      try { if (await evaluate(`Boolean(${condition})`)) return; }
      catch (error) { if (!/context.*destroyed|Cannot find context/i.test(error.message)) throw error; }
      await delay(50);
    }
    throw new Error(`Timed out waiting for ${label}`);
  };
  const ready = () => waitFor(`window.__duel && document.querySelector('#challenge-selected') && !document.querySelector('#challenge-selected').disabled`, 'game initialization');
  const click = async selector => {
    const point = await evaluate(`(()=>{
      const element=document.querySelector(${JSON.stringify(selector)});
      if(!element || element.disabled) return null;
      element.scrollIntoView({block:'center',inline:'nearest'});
      const r=element.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;
      const hit=document.elementFromPoint(x,y);
      return {x,y,hit:element===hit || element.contains(hit)};
    })()`);
    assert.ok(point?.hit, `Enabled and pointer-clickable: ${selector}`);
    for (const type of ['mousePressed', 'mouseReleased']) {
      await send('Input.dispatchMouseEvent', { type, x: point.x, y: point.y, button: 'left', clickCount: 1 });
    }
  };
  const shot = async name => {
    const path = join('/tmp', `one-cut-language-${name}.png`);
    const image = await send('Page.captureScreenshot', { format: 'png' });
    await writeFile(path, Buffer.from(image.data, 'base64'));
    screenshots.push(path);
  };
  const textOf = selector => evaluate(`document.querySelector(${JSON.stringify(selector)})?.textContent || ''`);
  const chooseLanguage = async language => {
    if (!await evaluate(`document.querySelector('#language-picker').open`)) await click('#language-toggle');
    await click(`[data-language="${language}"]`);
    await waitFor(`document.documentElement.lang===${JSON.stringify(language)}`, `${language} localization`);
  };
  const noOverflow = async label => {
    const pageFits = await evaluate(`document.documentElement.scrollWidth <= innerWidth`);
    if (!pageFits) {
      console.error(JSON.stringify(await evaluate(`({label:${JSON.stringify(label)},width:innerWidth,scrollWidth:document.documentElement.scrollWidth,offscreen:[...document.querySelectorAll('body *')].filter(e=>{
        const r=e.getBoundingClientRect();return r.width>0 && (r.left< -1 || r.right>innerWidth+1);
      }).slice(0,20).map(e=>({tag:e.tagName,id:e.id,class:e.getAttribute('class'),left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right}))})`), null, 2));
      await shot('overflow');
    }
    assert.equal(pageFits, true, `${label}: no horizontal page overflow`);
    assert.equal(await evaluate(`(()=>{const e=document.querySelector('#duel-setup');return !e.open || e.scrollWidth<=e.clientWidth+1})()`), true, `${label}: no horizontal dialog overflow`);
    assert.equal(await evaluate(`(()=>{const e=document.querySelector('#duel-setup');return !e.open || [...e.querySelectorAll('.setup-scroll,.setup-player')].every(node=>node.scrollWidth<=node.clientWidth+1)})()`), true, `${label}: device cards and scroll area do not overflow`);
  };
  const footerVisible = async () => {
    assert.equal(await evaluate(`['setup-validation','setup-cancel','setup-confirm'].every(id=>{
      const r=document.getElementById(id).getBoundingClientRect();
      return r.top>=0 && r.bottom<=innerHeight && r.left>=0 && r.right<=innerWidth;
    })`), true, 'Setup validation and action footer remain in viewport');
  };

  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `Object.defineProperty(navigator,'getGamepads',{value:()=>[]});` });
  await send('Page.navigate', { url: target.href });
  await ready();
  assert.equal(await evaluate('document.documentElement.lang'), 'en', 'Fresh profile defaults to English');
  assert.equal((await textOf('#challenge-selected')).trim(), 'Fight');
  assert.equal(await evaluate(`document.querySelector('#nav-help')===null && document.querySelector('#help-dialog')===null`), true, 'Old Help entry and dialog are removed');
  assert.equal(await evaluate(`document.querySelector('.atlas-menu label[for="gate-input"]')===null`), true, 'Duplicate left-menu postcard action is removed');
  assert.equal(await evaluate(`document.querySelector('#photo-gate #gate-input')?.type`), 'file', 'Original postcard upload remains');
  console.log('PASS English default and streamlined menu preserve postcard upload');

  await click('#language-toggle');
  assert.equal(await evaluate(`document.querySelector('#language-picker').open`), true);
  await shot('desktop-popup');
  await chooseLanguage('zh-CN');
  assert.equal(await evaluate(`localStorage.getItem('one-cut-atlas:language:v1')`), 'zh-CN');
  assert.match(await textOf('#challenge-selected'), /开始对战/);
  assert.match(await textOf('#menu-settings'), /模式与操作/);
  assert.match(await textOf('.journey-drawer > summary'), /目的地|旅人手记/);
  assert.match(await textOf('.log-heading'), /旅人手记/);
  assert.equal(await evaluate(`(async()=>{
    const loaded=await document.fonts.load('24px "Fusion Pixel"','中文');
    return loaded.length>0 && loaded.every(font=>font.status==='loaded') && document.fonts.check('24px "Fusion Pixel"','中文');
  })()`), true, 'Self-hosted Chinese pixel font successfully loads');
  await noOverflow('Desktop Chinese home');
  await shot('desktop-home-zh');
  console.log('PASS desktop language popup is clickable; Chinese menu and pixel font load');

  await click('#menu-settings');
  await waitFor(`document.querySelector('#duel-setup').open`, 'mode dialog');
  assert.match(await textOf('#duel-setup-title'), /模式与操作/);
  assert.match(await evaluate(`getComputedStyle(document.querySelector('#duel-setup-title')).fontFamily`), /Fusion Pixel/, 'Chinese dialog uses the pixel font');
  assert.equal(await evaluate(`Boolean(document.querySelector('#setup-diagram-1 .control-drawing--keyboard') && document.querySelector('#setup-diagram-1 .control-drawing--mouse'))`), true, 'Keyboard and mouse each have a pixel diagram');
  assert.match(await textOf('#setup-diagram-1'), /[\u3400-\u9fff]/, 'Keyboard diagram has Chinese explanations');
  assert.equal(await evaluate(`['A','D','J','K','L'].every(key=>[...document.querySelectorAll('#setup-diagram-1 svg text')].some(e=>e.textContent===key))`), true, 'Physical keyboard letter labels are preserved');
  await evaluate(`document.querySelector('#setup-diagram-1 .control-drawing--keyboard').scrollIntoView({block:'center'})`);
  await footerVisible();
  await shot('keyboard-zh');
  await click('[data-setup-mode="local"]');
  assert.equal(await evaluate(`document.querySelectorAll('#duel-setup .control-map').length`), 2, 'Both players have device maps');
  assert.match(await textOf('#setup-diagram-2'), /[\u3400-\u9fff]/, 'Gamepad diagram has Chinese explanations');
  assert.equal(await evaluate(`['A','B','X','Y','LB','RB'].every(key=>[...document.querySelectorAll('#setup-diagram-2 svg text')].some(e=>e.textContent===key))`), true, 'Xbox physical button labels are preserved');
  await noOverflow('Desktop Chinese local setup');
  await shot('local-zh');
  console.log('PASS Chinese keyboard and local gamepad maps preserve physical key labels');

  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
  await evaluate(`document.querySelector('.setup-scroll').scrollTop=0`);
  await delay(100);
  await noOverflow('Mobile Chinese setup');
  await footerVisible();
  await shot('mobile-setup-zh');
  await evaluate(`document.querySelector('#setup-diagram-1 .control-drawing--keyboard').scrollIntoView({block:'center'})`);
  await footerVisible();
  await shot('mobile-keyboard-zh');
  await evaluate(`document.querySelector('#setup-diagram-2 .control-drawing--gamepad').scrollIntoView({block:'center'})`);
  await footerVisible();
  await shot('mobile-gamepad-zh');
  await click('#setup-cancel');
  await noOverflow('Mobile Chinese home');
  await shot('mobile-home-zh');
  console.log('PASS mobile home and both device maps fit; setup footer remains reachable');

  await send('Page.reload');
  await delay(250); await ready();
  assert.equal(await evaluate('document.documentElement.lang'), 'zh-CN');
  assert.match(await textOf('#challenge-selected'), /开始对战/);
  console.log('PASS Chinese preference survives reload');

  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await click('#challenge-selected');
  await click('[data-setup-mode="solo"]');
  await click('[data-device-type="keyboard"][data-player="0"]');
  await click('#setup-confirm');
  await waitFor(`window.__duel.engine && !document.querySelector('#duel-screen').hidden`, 'solo duel');
  await click('#pause-button');
  await waitFor(`window.__duel.engine.paused`, 'paused duel');
  await waitFor(`document.querySelector('#duel-status').textContent.includes('暂停')`, 'translated pause HUD');
  assert.match(await textOf('#duel-status'), /暂停/);
  assert.match(await textOf('#pause-button'), /继续/);
  await shot('duel-paused-zh');
  // Render a deterministic draw without fighting or awarding a travel stamp.
  await evaluate(`(()=>{const engine=window.__duel.engine;engine.paused=false;engine.result='draw';engine.phase='result';engine.postVictoryRemaining=0;})()`);
  await waitFor(`!document.querySelector('#result-panel').hidden`, 'draw result');
  assert.match(await textOf('#result-panel'), /平局/);
  await shot('result-zh');
  await click('#duel-back');
  console.log('PASS Chinese pause and deterministic draw-result UI');

  await chooseLanguage('en');
  assert.equal(await evaluate(`localStorage.getItem('one-cut-atlas:language:v1')`), 'en');
  assert.equal((await textOf('#challenge-selected')).trim(), 'Fight');
  assert.equal((await textOf('#menu-settings')).trim(), 'Mode & Controls');
  await shot('desktop-home-en');
  await click('#menu-settings');
  assert.equal((await textOf('#duel-setup-title')).trim(), 'Mode & Controls');
  await evaluate(`document.querySelector('#setup-diagram-1 .control-drawing--keyboard').scrollIntoView({block:'center'})`);
  await shot('keyboard-en');
  await click('[data-setup-mode="local"]');
  await noOverflow('Desktop English local setup');
  await shot('local-en');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
  await evaluate(`document.querySelector('#setup-diagram-1 .control-drawing--keyboard').scrollIntoView({block:'center'})`);
  await noOverflow('Mobile English setup');
  await footerVisible();
  await shot('mobile-keyboard-en');
  await evaluate(`document.querySelector('#setup-diagram-2 .control-drawing--gamepad').scrollIntoView({block:'center'})`);
  await footerVisible();
  await shot('mobile-gamepad-en');
  await click('#setup-cancel');
  await send('Page.reload');
  await delay(250); await ready();
  assert.equal(await evaluate('document.documentElement.lang'), 'en');
  assert.equal((await textOf('#challenge-selected')).trim(), 'Fight');
  console.log('PASS switching back restores English in static and dynamic UI after reload');
  assert.deepEqual(exceptions, [], 'No uncaught browser exceptions');
  console.log(JSON.stringify({ screenshots, exceptions }, null, 2));
} finally {
  socket?.close();
  if (chrome.exitCode === null) { chrome.kill('SIGTERM'); await Promise.race([once(chrome, 'exit'), delay(3000)]); }
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
process.exit(0);

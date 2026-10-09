// The browser fixture reproduces an empty Gamepad API result, not real hardware.
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
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
await new Promise(resolve => server.close(resolve));
const profile = await mkdtemp(join(tmpdir(), 'one-cut-picker-'));
const chrome = spawn(process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-background-timer-throttling',
  `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank',
], { stdio: 'ignore' });
let socket;
const exceptions = [];
try {
  let page;
  for (let i = 0; i < 100 && !page; i++) {
    try { page = (await fetch(`http://127.0.0.1:${port}/json`).then(r => r.json())).find(p => p.type === 'page'); } catch {}
    if (!page) await delay(100);
  }
  assert.ok(page, 'Chrome started');
  socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let serial = 0;
  const pending = new Map();
  socket.onmessage = event => {
    const m = JSON.parse(event.data);
    if (pending.has(m.id)) {
      const p = pending.get(m.id); pending.delete(m.id); clearTimeout(p.timer);
      if (m.error) p.reject(new Error(m.error.message)); else p.resolve(m.result);
    } else if (m.method === 'Runtime.exceptionThrown') exceptions.push(m.params.exceptionDetails.text);
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++serial, timer = setTimeout(() => reject(new Error(`Timeout: ${method}`)), 20000);
    pending.set(id, { resolve, reject, timer }); socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  const click = async selector => {
    const point = await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e||e.disabled)return null;e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,h=document.elementFromPoint(x,y);return {x,y,hit:e===h||e.contains(h)}})()`);
    assert.ok(point?.hit, `Enabled and clickable: ${selector}`);
    for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, ...point, button: 'left', clickCount: 1 });
  };
  const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'png' }); await writeFile(`/tmp/one-cut-picker-${name}.png`, Buffer.from(r.data, 'base64')); };
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.__pads=[];window.__padError=false;
    window.__pad=(index,mapping='standard')=>({index,id:'Xbox test controller',connected:true,mapping,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))});
    Object.defineProperty(navigator,'getGamepads',{value:()=>{if(window.__padError)throw new DOMException('Denied','SecurityError');return window.__pads;}});
  ` });
  await send('Page.navigate', { url: target.href });
  await evaluate(`new Promise((resolve,reject)=>{let n=0;const poll=()=>{if(window.__duel&&!document.querySelector('#challenge-selected').disabled)return resolve();if(n++>400)return reject(new Error('Game not ready'));setTimeout(poll,50)};poll()})`);
  await click('#menu-settings');
  await click('[data-setup-mode="local"]');
  const selectable = await evaluate(`Boolean(document.querySelector('[data-device-type="gamepad"][data-player="0"]') || [...document.querySelector('#setup-device-1').options].some(o=>o.value.startsWith('gamepad:')&&!o.disabled))`);
  assert.equal(selectable, true, 'Player 1 can select gamepad intent even before a controller is detected');
  console.log('PASS gamepad choice exists without connected hardware');
  await shot('desktop');
  await click('[data-device-type="gamepad"][data-player="0"]');
  assert.equal(await evaluate(`document.querySelector('[data-device-type="gamepad"][data-player="0"]').getAttribute('aria-pressed')`), 'true');
  assert.equal(await evaluate(`document.querySelector('#setup-confirm').disabled`), false, 'Offline preferences can be saved');
  assert.equal(await evaluate(`document.querySelectorAll('.control-drawing').length`), 2, 'Both players get graphical device maps');
  await click('#setup-confirm');
  assert.deepEqual(await evaluate('window.__duel.settings.devices'), ['gamepad:1', 'gamepad:0']);
  assert.equal(await evaluate('window.__duel.engine'), null, 'Saving preferences never starts an unplayable duel');
  await send('Page.reload');
  await delay(250);
  await evaluate(`new Promise((resolve,reject)=>{let n=0;const poll=()=>{if(window.__duel&&!document.querySelector('#challenge-selected').disabled)return resolve();if(n++>400)return reject(new Error('Reload not ready'));setTimeout(poll,50)};poll()})`);
  assert.deepEqual(await evaluate('window.__duel.settings.devices'), ['gamepad:1', 'gamepad:0'], 'Offline choices survive a page reload');
  await click('#challenge-selected');
  assert.equal(await evaluate(`document.querySelector('#setup-confirm').disabled`), true, 'Starting still requires connected controllers');
  await click('[data-device-type="keyboard"][data-player="0"]');
  await evaluate(`window.__pads=[window.__pad(0,'')];window.dispatchEvent(new Event('gamepadconnected'))`);
  assert.match(await evaluate(`document.querySelector('#setup-device-2').textContent`), /Xbox test controller.*unsupported layout/);
  assert.match(await evaluate(`document.querySelector('#setup-device-status-2').textContent`), /Detected, but/);
  assert.equal(await evaluate(`document.querySelector('#setup-confirm').disabled`), true);
  console.log('PASS offline save is separate from start; raw controllers are shown, not hidden');
  await evaluate(`window.__pads=[null,null,window.__pad(2)];window.dispatchEvent(new Event('gamepadconnected'))`);
  await click('#setup-assign-2');
  await evaluate(`window.__pads[2].buttons[0]={pressed:true,value:1}`);
  await delay(220);
  assert.equal(await evaluate(`document.querySelector('#setup-device-2').value`), 'gamepad:2', 'Pressing A binds the actual sparse controller index');
  assert.equal(await evaluate(`document.querySelector('#setup-confirm').disabled`), false);
  await evaluate(`window.__pads[2].buttons[0]={pressed:false,value:0}`);
  await click('#setup-confirm');
  assert.equal(await evaluate(`window.__duel.engine.mode`), 'local');
  assert.deepEqual(await evaluate(`window.__duel.settings.devices`), ['keyboard', 'gamepad:2']);
  await click('#duel-back');
  console.log('PASS controller assignment enables a real local duel with the correct device');
  await click('#menu-settings');
  await evaluate(`window.__padError=true;window.dispatchEvent(new Event('gamepaddisconnected'))`);
  assert.match(await evaluate(`document.querySelector('#setup-controller-report').textContent`), /blocked/);
  assert.equal(await evaluate(`document.querySelector('#setup-confirm').disabled`), false, 'Browser denial does not lock preference editing');
  await click('#setup-cancel');
  await click('#challenge-selected');
  assert.equal(await evaluate(`document.querySelector('#setup-confirm').disabled`), true, 'Browser denial still blocks starting');
  assert.match(await evaluate(`document.querySelector('#setup-validation').textContent`), /blocked/);
  await evaluate(`window.__padError=false;window.__pads=[];window.dispatchEvent(new Event('gamepaddisconnected'))`);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
  await evaluate(`document.querySelector('.setup-scroll').scrollTop=0`);
  await delay(100);
  assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'), true);
  const visible = await evaluate(`['setup-confirm','setup-validation'].every(id=>{const r=document.getElementById(id).getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight})`);
  assert.equal(visible, true, 'Mobile validation and actions remain visible');
  await shot('mobile');
  await click('[data-device-type="gamepad"][data-player="0"]');
  await evaluate(`document.querySelector('#setup-diagram-1').scrollIntoView({block:'center'})`);
  await shot('mobile-gamepad');
  console.log('PASS browser denial is explicit; mobile selector, graphics and footer fit');
  assert.deepEqual(exceptions, []);
} finally {
  socket?.close();
  if (chrome.exitCode === null) { chrome.kill('SIGTERM'); await Promise.race([once(chrome, 'exit'), delay(3000)]); }
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
process.exit(0);

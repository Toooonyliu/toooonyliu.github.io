// Headless browser integration coverage with simulated standard Gamepad snapshots.
// This does not claim coverage of physical controllers or OS/browser drivers.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import net from 'node:net';

const target = new URL(process.argv[2] || 'http://127.0.0.1:4173/');
target.searchParams.set('debug', '1');
const outputPrefix = process.argv[3] || '/tmp/one-cut-local-duel';
const chromePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const checks = [], exceptions = [], screenshots = [];

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => server.listen(0, '127.0.0.1', resolve).once('error', reject));
  const { port } = server.address();
  await new Promise(resolve => server.close(resolve));
  return port;
}

const profile = await mkdtemp(join(tmpdir(), 'one-cut-local-chrome-'));
let chrome, socket;
try {
  const port = await freePort();
  chrome = spawn(chromePath, [
    '--headless=new', '--no-first-run', '--no-default-browser-check',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--window-size=1440,1000', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  let launchError;
  chrome.once('error', error => { launchError = error; });
  let page;
  for (let attempt = 0; attempt < 120; attempt++) {
    if (launchError) throw launchError;
    try {
      const pages = await fetch(`http://127.0.0.1:${port}/json`).then(response => response.json());
      page = pages.find(candidate => candidate.type === 'page');
      if (page) break;
    } catch { /* Chrome is starting. */ }
    await delay(100);
  }
  if (!page) throw new Error('Chrome debugging page did not start');
  socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let serial = 0;
  const pending = new Map();
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const request = pending.get(message.id);
      pending.delete(message.id);
      clearTimeout(request.timer);
      if (message.error) request.reject(new Error(message.error.message));
      else request.resolve(message.result);
    } else if (message.method === 'Runtime.exceptionThrown') {
      exceptions.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    }
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++serial;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 15000);
    pending.set(id, { resolve, reject, timer });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  };
  const until = async (expression, label, timeout = 10000) => {
    const start = Date.now();
    do {
      try { if (await evaluate(expression)) return; }
      catch (error) { if (!/context was destroyed|Cannot find context/i.test(error.message)) throw error; }
      await delay(50);
    } while (Date.now() - start < timeout);
    throw new Error(`Timed out waiting for ${label}`);
  };
  const click = async selector => {
    const point = await evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el||el.disabled)return null;el.scrollIntoView({block:'center',inline:'nearest'});const box=el.getBoundingClientRect();const x=box.left+box.width/2,y=box.top+box.height/2;const hit=document.elementFromPoint(x,y);return {x,y,visible:box.width>0&&box.height>0,receivesPointer:hit===el||el.contains(hit),hit:hit?.tagName+'#'+hit?.id}})()`);
    assert.ok(point?.visible, `Visible enabled element ${selector}`);
    assert.equal(point.receivesPointer, true, `${selector} must receive pointer events; center hits ${point.hit}`);
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1 });
  };
  const select = async (id, value) => {
    const player = Number(id.slice(-1)) - 1;
    const type = value === 'keyboard' ? 'keyboard' : 'gamepad';
    await click(`[data-player="${player}"][data-device-type="${type}"]`);
    const okay = await evaluate(`(()=>{const el=document.getElementById(${JSON.stringify(id)});if(!el||![...el.options].some(option=>option.value===${JSON.stringify(value)}))return false;el.value=${JSON.stringify(value)};el.dispatchEvent(new Event('change',{bubbles:true}));return true})()`);
    assert.equal(okay, true, `${id} has option ${value}`);
  };
  const key = (keyValue, code, type) => send('Input.dispatchKeyEvent', {
    type, key: keyValue, code, windowsVirtualKeyCode: keyValue.length === 1 ? keyValue.toUpperCase().charCodeAt(0) : undefined,
  });
  const snapshot = () => evaluate('window.__duel.engine.snapshot()');
  const assertSetupActionsVisible = async () => {
    const visible = await evaluate('(()=>{const el=document.querySelector("#setup-confirm"),box=el.getBoundingClientRect();const hit=document.elementFromPoint(box.left+box.width/2,box.top+box.height/2);return box.top>=0&&box.bottom<=innerHeight&&(el===hit||el.contains(hit))})()');
    assert.equal(visible, true, 'Setup confirmation stays visible and clickable without scrolling');
  };
  const assertSetupValidationVisible = async () => {
    const visible = await evaluate('(()=>{const el=document.querySelector("#setup-validation"),box=el.getBoundingClientRect();return box.height>0&&box.top>=0&&box.bottom<=innerHeight})()');
    assert.equal(visible, true, 'Setup validation stays visible without scrolling');
  };
  const neutralPads = () => evaluate('window.__testPads.filter(Boolean).forEach(pad=>{pad.axes.fill(0);pad.buttons.forEach(button=>{button.pressed=false;button.value=0})})');
  const padAxis = (index, x) => evaluate(`window.__testPads[${index}].axes[0]=${x}`);
  const padButton = (index, button, pressed) => evaluate(`Object.assign(window.__testPads[${index}].buttons[${button}],{pressed:${pressed},value:${pressed ? 1 : 0}})`);
  const openSetup = async (selector = '#challenge-selected') => {
    await click(selector);
    await until('document.querySelector("#duel-setup").open', 'setup dialog');
  };
  const configure = async (mode, devices) => {
    await click(`[data-setup-mode="${mode}"]`);
    for (let index = 0; index < devices.length; index++) await select(`setup-device-${index + 1}`, devices[index]);
  };
  const start = async () => {
    await click('#setup-confirm');
    await until('!document.querySelector("#duel-setup").open && window.__duel?.engine?.snapshot().phase === "playing"', 'playing duel');
  };
  const mark = label => { checks.push(label); console.log(`PASS ${label}`); };
  const screenshot = async suffix => {
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const path = `${outputPrefix}-${suffix}.png`;
    await writeFile(path, Buffer.from(shot.data, 'base64'));
    screenshots.push(path);
  };

  await send('Runtime.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.__makeTestPad=(index)=>({index,id:'Simulated Standard Pad '+(index+1),connected:true,mapping:'standard',timestamp:0,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))});
    window.__testPads=[window.__makeTestPad(0),null,window.__makeTestPad(2)];
    Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>window.__testPads});
  ` });
  await send('Page.navigate', { url: target.href });
  await until('window.__duel && document.querySelector("#challenge-selected") && !document.querySelector("#challenge-selected").disabled', 'game ready', 30000);
  for (const height of [600, 720, 900]) {
    await send('Emulation.setDeviceMetricsOverride', { width: 1280, height, deviceScaleFactor: 1, mobile: false });
    await delay(80);
    const geometry = await evaluate('(()=>{const menu=document.querySelector(".atlas-menu").getBoundingClientRect();const card=document.querySelector("#selected-level").getBoundingClientRect();return {height:innerHeight,menuBottom:menu.bottom,cardTop:card.top,gap:card.top-menu.bottom}})()');
    console.log(`HOME ${JSON.stringify(geometry)}`);
    assert.ok(geometry.gap >= 0, `World menu must not overlap the postcard at 1280 × ${height}`);
    await screenshot(`home-${height}`);
  }

  await openSetup();
  assert.equal(await evaluate('document.querySelector("[data-setup-mode=solo]").getAttribute("aria-pressed")'), 'true');
  assert.equal(await evaluate('document.querySelector("#setup-device-1").value'), 'keyboard');
  assert.equal(await evaluate('document.querySelector("#setup-player-two-input").hidden'), true);
  assert.match(await evaluate('document.querySelector("#setup-bindings-1").textContent'), /Left click/);
  await start();
  let before = await snapshot();
  await key('d', 'KeyD', 'keyDown'); await delay(180); await key('d', 'KeyD', 'keyUp');
  assert.ok((await snapshot()).player.x > before.player.x + 10, 'Solo keyboard moves Player 1');
  mark('Fight opens setup; default solo starts and keyboard movement works');

  await click('#duel-back');
  await openSetup('#menu-settings');
  await configure('local', ['keyboard', 'gamepad:0']);
  assert.match(await evaluate('document.querySelector("#setup-bindings-2").textContent'), /A \/ Cross/);
  await click('#setup-cancel');
  await openSetup();
  assert.equal(await evaluate('document.querySelector("[data-setup-mode=solo]").getAttribute("aria-pressed")'), 'true');
  await configure('solo', ['gamepad:0']);
  await start();
  assert.equal((await snapshot()).mode, 'solo', 'Solo gamepad retains the AI game mode');
  before = await snapshot();
  await key('a', 'KeyA', 'keyDown'); await delay(150); await key('a', 'KeyA', 'keyUp');
  assert.ok(Math.abs((await snapshot()).player.x - before.player.x) < 0.1, 'Keyboard cannot control a solo gamepad player');
  await padAxis(0, -1); await delay(180); await neutralPads(); await delay(50);
  assert.ok((await snapshot()).player.x < before.player.x - 10, 'Gamepad moves the solo human player');
  mark('Solo gamepad controls Player 1 without keyboard leakage');
  await click('#duel-back');
  await openSetup();
  await configure('local', ['keyboard', 'gamepad:0']);
  await assertSetupActionsVisible();
  await assertSetupValidationVisible();
  await screenshot('desktop');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  await delay(80);
  await assertSetupActionsVisible();
  await assertSetupValidationVisible();
  await screenshot('desktop-720');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await start();
  await screenshot('local-arena');
  before = await snapshot();
  await key('a', 'KeyA', 'keyDown'); await delay(180); await key('a', 'KeyA', 'keyUp');
  let after = await snapshot();
  assert.ok(after.player.x < before.player.x - 10, 'Keyboard moves Player 1 left');
  assert.ok(Math.abs(after.opponent.x - before.opponent.x) < 0.1, 'Player 2 does not run AI or follow keyboard');
  before = after;
  await padAxis(0, 1); await delay(180); await neutralPads(); await delay(50);
  after = await snapshot();
  assert.ok(after.opponent.x > before.opponent.x + 10, 'Gamepad moves Player 2');
  assert.ok(Math.abs(after.player.x - before.player.x) < 0.1, 'Pad assigned to Player 2 cannot move Player 1');
  mark('Cancel discards edits; mixed keyboard/gamepad independently control local players');

  await padButton(0, 9, true); await until('window.__duel.engine.snapshot().paused', 'controller pause');
  await delay(150);
  assert.equal((await snapshot()).paused, true, 'Held menu button does not toggle pause repeatedly');
  await padButton(0, 9, false); await delay(80); await padButton(0, 9, true);
  await until('!window.__duel.engine.snapshot().paused', 'controller resume');
  await neutralPads();
  mark('Controller pause/resume is edge-triggered');

  await openSetup('#duel-settings');
  assert.equal((await snapshot()).paused, true, 'Settings pauses the duel');
  await configure('local', ['gamepad:0', 'keyboard']);
  await start();
  before = await snapshot();
  await key('d', 'KeyD', 'keyDown'); await delay(180); await key('d', 'KeyD', 'keyUp');
  after = await snapshot();
  assert.ok(after.opponent.x > before.opponent.x + 10, 'Swapped keyboard moves Player 2');
  assert.ok(Math.abs(after.player.x - before.player.x) < 0.1, 'Swapped keyboard cannot move Player 1');
  before = after;
  await padAxis(0, -1); await delay(180); await neutralPads(); await delay(50);
  after = await snapshot();
  assert.ok(after.player.x < before.player.x - 10, 'Swapped pad moves Player 1');
  assert.ok(Math.abs(after.opponent.x - before.opponent.x) < 0.1, 'Swapped pad cannot move Player 2');
  mark('In-duel settings restart safely; swapped gamepad/keyboard routing works');

  await openSetup('#duel-settings');
  await configure('local', ['gamepad:0', 'gamepad:2']);
  await start();
  before = await snapshot();
  await key('d', 'KeyD', 'keyDown'); await delay(180); await key('d', 'KeyD', 'keyUp');
  after = await snapshot();
  assert.ok(Math.abs(after.player.x - before.player.x) < 0.1 && Math.abs(after.opponent.x - before.opponent.x) < 0.1, 'Keyboard gameplay is disabled with two pads');
  await padAxis(0, -1); await padAxis(2, 1); await delay(180); await neutralPads(); await delay(50);
  after = await snapshot();
  assert.ok(after.player.x < before.player.x - 10, 'First pad moves Player 1');
  assert.ok(after.opponent.x > before.opponent.x + 10, 'Sparse-index second pad moves Player 2');
  mark('Two gamepads move independently; keyboard gameplay cannot leak into pad players');

  await openSetup('#duel-settings');
  await select('setup-device-2', 'gamepad:0');
  assert.equal(await evaluate('document.querySelector("#setup-confirm").disabled'), true, 'Duplicate pad disables confirmation');
  assert.ok(await evaluate('document.querySelector("#setup-validation").textContent.trim().length > 0'), 'Invalid setup explains why');
  await assertSetupValidationVisible();
  await click('#setup-cancel');
  await openSetup('#duel-settings');
  assert.equal(await evaluate('document.querySelector("#setup-device-2").value'), 'gamepad:2');
  await click('#setup-cancel');
  assert.equal((await snapshot()).paused, true, 'Cancel keeps the duel safely paused');
  await click('#pause-button');
  await until('!window.__duel.engine.snapshot().paused', 'explicit resume after settings cancel');
  await delay(80);
  mark('Duplicate assignment is blocked; cancel preserves active devices and awaits explicit resume');

  await padButton(0, 0, true);
  await until('window.__duel.engine.snapshot().player.state === "charge"', 'gamepad charging');
  await evaluate(`window.__testPads[0].connected=false;window.dispatchEvent(new Event('gamepaddisconnected'))`);
  await until('window.__duel.engine.snapshot().paused', 'disconnect safety pause');
  assert.notEqual((await snapshot()).player.state, 'windup', 'Disconnect cannot release a charged strike');
  await evaluate(`window.__testPads[0].connected=true;window.dispatchEvent(new Event('gamepadconnected'))`);
  await delay(600);
  assert.equal((await snapshot()).paused, true, 'Reconnection does not silently resume');
  await click('#pause-button');
  await delay(180);
  after = await snapshot();
  assert.ok(!['windup', 'active', 'charge'].includes(after.player.state), 'Held button is neutral-gated after disconnect');
  await padButton(0, 0, false); await delay(100);
  assert.ok(!['windup', 'active'].includes((await snapshot()).player.state), 'Releasing the stale charge cannot strike');
  if ((await snapshot()).paused) await click('#pause-button');
  await padButton(0, 0, true);
  await until('window.__duel.engine.snapshot().player.state === "charge"', 'fresh post-reconnect attack');
  await neutralPads();
  mark('Disconnect pauses; reconnect and stale held attack cannot cause a ghost strike');

  // Test-only terminal fixtures exercise the app result UI/persistence boundary;
  // actual hit resolution is covered by the engine tests.
  const clearedBefore = await evaluate(`import('./src/storage.js').then(module=>module.loadLevels()).then(levels=>levels.filter(level=>level.cleared).map(level=>level.id).sort())`);
  for (const [result, title] of [['victory', 'PLAYER 1 WINS'], ['defeat', 'PLAYER 2 WINS']]) {
    await evaluate(`(()=>{const engine=window.__duel.engine;const winner=${JSON.stringify(result)}==='victory'?engine._player:engine._opponent;const loser=winner===engine._player?engine._opponent:engine._player;engine._kill(loser,winner);engine.result=${JSON.stringify(result)};engine.phase='result';engine.paused=false})()`);
    await until('!document.querySelector("#result-panel").hidden', 'local result panel');
    assert.equal(await evaluate('document.querySelector("#result-panel h2").textContent'), title);
    assert.match(await evaluate('document.querySelector("#result-panel").textContent'), /no travel stamps awarded/);
    await padButton(0, 8, true);
    await until('window.__duel.engine.snapshot().phase === "countdown"', 'gamepad rematch');
    await neutralPads();
    await until('window.__duel.engine.snapshot().phase === "playing"', 'rematch playing');
  }
  const clearedAfter = await evaluate(`import('./src/storage.js').then(module=>module.loadLevels()).then(levels=>levels.filter(level=>level.cleared).map(level=>level.id).sort())`);
  assert.deepEqual(clearedAfter, clearedBefore, 'Local results do not change saved solo stamps');
  mark('Both local winner labels are correct; controller rematch works and no solo stamps are awarded');

  await send('Page.reload');
  await until('window.__duel && !document.querySelector("#challenge-selected").disabled', 'reload ready', 30000);
  await openSetup('#menu-settings');
  assert.equal(await evaluate('document.querySelector("[data-setup-mode=local]").getAttribute("aria-pressed")'), 'true');
  assert.equal(await evaluate('document.querySelector("#setup-device-1").value'), 'gamepad:0');
  assert.equal(await evaluate('document.querySelector("#setup-device-2").value'), 'gamepad:2');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
  await delay(150);
  assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true, 'Mobile viewport has no page-wide horizontal overflow');
  const modal = await evaluate('(()=>{const box=document.querySelector("#duel-setup").getBoundingClientRect();return {left:box.left,right:box.right,width:innerWidth}})()');
  assert.ok(modal.left >= 0 && modal.right <= modal.width, 'Mobile dialog fits viewport');
  await assertSetupActionsVisible();
  await assertSetupValidationVisible();
  await screenshot('mobile');
  await evaluate(`window.__testPads[2].connected=false;window.dispatchEvent(new Event('gamepaddisconnected'))`);
  await until('document.querySelector("#setup-device-status-2").textContent.includes("waiting")', 'missing mobile gamepad status');
  assert.equal(await evaluate('document.querySelector("#setup-confirm").disabled'), false, 'Missing pads do not prevent saving preferences');
  await assertSetupValidationVisible();
  assert.match(await evaluate('document.querySelector("#setup-validation").textContent'), /save this setup now/);
  await screenshot('mobile-missing-pad');
  await evaluate(`window.__testPads[2].connected=true;window.dispatchEvent(new Event('gamepadconnected'))`);
  await until('!document.querySelector("#setup-confirm").disabled', 'mobile gamepad reconnected');
  mark('Mode/device settings persist; 390 × 844 setup fits the viewport');
  assert.deepEqual(exceptions, [], 'No uncaught browser exceptions');
  console.log(JSON.stringify({ simulatedGamepads: true, checks, screenshots, exceptions }, null, 2));
} catch (error) {
  console.error(error.stack || error);
  console.error(JSON.stringify({ completedChecks: checks, exceptions }, null, 2));
  process.exitCode = 1;
} finally {
  socket?.close();
  if (chrome && chrome.exitCode === null) {
    chrome.kill('SIGTERM');
    await Promise.race([once(chrome, 'exit'), delay(3000)]);
  }
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
process.exit(process.exitCode || 0);

import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import net from 'node:net';

const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const target = process.argv[2] || 'http://127.0.0.1:4173/';
const screenshotPath = process.argv[3] || 'work/browser-smoke.png';
const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => server.listen(0, '127.0.0.1', resolve).once('error', reject));
  const { port } = server.address();
  await new Promise(resolve => server.close(resolve));
  return port;
}

const port = await freePort();
const profile = await mkdtemp(join(tmpdir(), 'one-cut-chrome-'));
const chrome = spawn(chromePath, [
  '--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding', '--window-size=1440,1000', `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`, target,
], { stdio: ['ignore', 'ignore', 'pipe'] });

let socket;
try {
  let page;
  for (let attempt = 0; attempt < 120; attempt++) {
    try {
      const pages = await fetch(`http://127.0.0.1:${port}/json`).then(response => response.json());
      page = pages.find(candidate => candidate.type === 'page');
      if (page) break;
    } catch { /* Chrome is still starting. */ }
    await delay(100);
  }
  if (!page) throw new Error('Chrome debugging page did not start');
  socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let serial = 0;
  const pending = new Map(), exceptions = [];
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id); pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message)); else resolve(message.result);
    } else if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails.text);
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++serial; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    for (let attempt = 0; attempt < 8; attempt++) {
      try {
        const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
        if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
        return result.result.value;
      } catch (error) {
        if (!/context was destroyed/i.test(error.message) || attempt === 7) throw error;
        await delay(250);
      }
    }
  };
  await send('Runtime.enable');
  await send('Page.enable');
  await evaluate(`new Promise((resolve,reject)=>{const start=performance.now();const poll=()=>{const button=document.querySelector('#challenge-selected');if(button&&!button.disabled&&typeof button.onclick==='function')return resolve(true);if(performance.now()-start>30000)return reject(new Error('Game did not become ready'));setTimeout(poll,50)};poll()})`);
  await evaluate(`document.querySelector('#challenge-selected').click()`);
  await evaluate(`document.querySelector('#setup-confirm')?.click()`);
  await evaluate(`new Promise(resolve=>setTimeout(resolve,2700))`);
  const sample = send('Runtime.evaluate', { expression: `new Promise(resolve=>{const gaps=[];let last=0;const step=now=>{if(last)gaps.push(now-last);last=now;if(gaps.length<180)requestAnimationFrame(step);else{const sorted=[...gaps].sort((a,b)=>a-b);resolve({mean:gaps.reduce((a,b)=>a+b,0)/gaps.length,p95:sorted[Math.floor(sorted.length*.95)],max:sorted.at(-1)})}};requestAnimationFrame(step)})`, awaitPromise: true, returnByValue: true });
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'd', code: 'KeyD', windowsVirtualKeyCode: 68 });
  await delay(650);
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'd', code: 'KeyD', windowsVirtualKeyCode: 68 });
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'j', code: 'KeyJ', windowsVirtualKeyCode: 74 });
  await delay(260);
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'j', code: 'KeyJ', windowsVirtualKeyCode: 74 });
  const metrics = (await sample).result.value;
  const muteCycle = [];
  const hasSoundControl = await evaluate(`Boolean(document.querySelector('#nav-sound'))`);
  for (let index = 0; hasSoundControl && index < 2; index++) {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'm', code: 'KeyM', windowsVirtualKeyCode: 77 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'm', code: 'KeyM', windowsVirtualKeyCode: 77 });
    muteCycle.push(await evaluate(`document.querySelector('#nav-sound').textContent`));
  }
  const screenshot = await send('Page.captureScreenshot', { format: 'png' });
  await writeFile(screenshotPath, Buffer.from(screenshot.data, 'base64'));
  const state = await evaluate(`({duelVisible:!document.querySelector('#duel-screen').hidden,canvas:[document.querySelector('#duel-canvas').width,document.querySelector('#duel-canvas').height],sound:document.querySelector('#nav-sound')?.textContent||null})`);
  console.log(JSON.stringify({ state, muteCycle, metrics, exceptions, screenshot: screenshotPath }, null, 2));
  if (!state.duelVisible || hasSoundControl && muteCycle.join('|') !== 'Sound: Off|Sound: On' || exceptions.length || metrics.max > 80) process.exitCode = 1;
} finally {
  socket?.close();
  if (chrome.exitCode === null) {
    chrome.kill('SIGTERM');
    await Promise.race([once(chrome, 'exit'), delay(3000)]);
  }
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
process.exit(process.exitCode || 0);

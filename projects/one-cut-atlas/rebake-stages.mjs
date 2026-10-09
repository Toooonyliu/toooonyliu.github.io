// Bakes the PNG stage originals (kept outside the repository) onto the game's 960×540
// grid with nearest sampling and a 48-color per-image palette, writing indexed PNGs.
// Uses headless Chrome for decoding so the repository needs no native image modules.
//   node rebake-stages.mjs --originals ../../../one-cut-atlas/assets/art --out assets/art
import { readFile, writeFile, mkdtemp, copyFile, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { deflateSync } from 'node:zlib';
import path from 'node:path';

const STAGES = ['zone-east-asia-v1', 'zone-africa-v1', 'zone-north-america-v1', 'forest-v2', 'street-v2', 'city-v2', 'wilderness-v2'];
const args = process.argv.slice(2);
const option = (name, fallback) => { const index = args.indexOf(`--${name}`); return index >= 0 ? args[index + 1] : fallback; };
const originals = path.resolve(option('originals', '../../../one-cut-atlas/assets/art'));
const outDir = path.resolve(option('out', 'assets/art'));
const chromePath = option('chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
const width = 960, height = 540, colors = 48;

const work = await mkdtemp(path.join(tmpdir(), 'one-cut-rebake-'));
await copyFile(new URL('./src/pixelize.js', import.meta.url), path.join(work, 'pixelize.js'));
for (const stage of STAGES) await copyFile(path.join(originals, `${stage}.png`), path.join(work, `${stage}.png`));
const server = createServer(async (request, response) => {
  const file = path.join(work, path.basename(decodeURIComponent(new URL(request.url, 'http://x').pathname)) || 'index.html');
  try {
    const body = request.url === '/' ? '<!doctype html><title>rebake</title>' : await readFile(file);
    response.writeHead(200, { 'Content-Type': request.url === '/' ? 'text/html' : file.endsWith('.js') ? 'text/javascript' : 'image/png' });
    response.end(body);
  } catch { response.writeHead(404); response.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;

const chrome = spawn(chromePath, ['--headless=new', '--disable-gpu', '--no-first-run', `--user-data-dir=${work}/profile`, '--remote-debugging-port=0', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
let port;
await new Promise(resolve => chrome.stderr.on('data', chunk => { const match = /DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)/.exec(String(chunk)); if (match && !port) { port = match[1]; resolve(); } }));
const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const ws = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl);
await new Promise(resolve => ws.addEventListener('open', resolve));
let id = 0; const pending = new Map();
ws.addEventListener('message', event => { const message = JSON.parse(event.data); if (message.id && pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); } });
const send = (method, params = {}) => new Promise(resolve => { const n = ++id; pending.set(n, resolve); ws.send(JSON.stringify({ id: n, method, params })); });
await send('Page.enable'); await send('Runtime.enable');
await send('Page.navigate', { url: `${base}/` });
await new Promise(resolve => setTimeout(resolve, 600));

// CRC and chunk helpers for a minimal indexed PNG writer.
const table = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc = bytes => { let c = -1; for (const byte of bytes) c = table[(c ^ byte) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const chunk = (type, data) => { const length = Buffer.alloc(4); length.writeUInt32BE(data.length); const body = Buffer.concat([Buffer.from(type, 'ascii'), data]); const sum = Buffer.alloc(4); sum.writeUInt32BE(crc(body)); return Buffer.concat([length, body, sum]); };
function indexedPng(rgba, palette) {
  const lookup = new Map(palette.map((color, index) => [color.join(','), index]));
  const rows = Buffer.alloc((width + 1) * height);
  for (let y = 0; y < height; y++) { rows[y * (width + 1)] = 0; for (let x = 0; x < width; x++) { const i = (y * width + x) * 4; rows[y * (width + 1) + 1 + x] = lookup.get(`${rgba[i]},${rgba[i + 1]},${rgba[i + 2]}`); } }
  const header = Buffer.alloc(13); header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 3; header[10] = 0; header[11] = 0; header[12] = 0;
  const plte = Buffer.from(palette.flat());
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('PLTE', plte), chunk('IDAT', deflateSync(rows, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

for (const stage of STAGES) {
  const result = await send('Runtime.evaluate', { awaitPromise: true, returnByValue: true, expression: `(async () => {
    const { extractPalette, quantize } = await import('/pixelize.js');
    const image = new Image(); image.src = '/${stage}.png'; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = ${width}; canvas.height = ${height};
    const ctx = canvas.getContext('2d', { willReadFrequently: true }); ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, 0, 0, ${width}, ${height});
    const data = ctx.getImageData(0, 0, ${width}, ${height});
    const palette = extractPalette([data], ${colors});
    const out = quantize(data, palette);
    let binary = ''; const bytes = out.data; for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return { source: [image.naturalWidth, image.naturalHeight], palette, rgba: btoa(binary) };
  })()` });
  const value = result.result?.result?.value;
  if (!value) throw new Error(`${stage}: ${JSON.stringify(result.result?.exceptionDetails || result).slice(0, 400)}`);
  const png = indexedPng(Buffer.from(value.rgba, 'base64'), value.palette);
  const target = path.join(outDir, `${stage}-960.png`);
  await writeFile(target, png);
  console.log(`${stage}: ${value.source.join('x')} → ${width}x${height}, ${value.palette.length} colors, ${(png.length / 1024).toFixed(0)} KB → ${path.relative(process.cwd(), target)}`);
}
ws.close(); chrome.kill(); server.close();
await rm(work, { recursive: true, force: true });

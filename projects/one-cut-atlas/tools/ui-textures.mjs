// Procedural pixel textures for the interface (desk, paper, stamp perforation, torn edge).
// Deterministic: rerun to regenerate assets/ui/*.png. No dependencies.
import { writeFile } from 'node:fs/promises';
const out = name => new URL(`../assets/ui/${name}`, import.meta.url);
import { deflateSync } from 'node:zlib';
const table = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc = bytes => { let c = -1; for (const b of bytes) c = table[(c ^ b) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const body = Buffer.concat([Buffer.from(type), data]); const sum = Buffer.alloc(4); sum.writeUInt32BE(crc(body)); return Buffer.concat([len, body, sum]); };
function png(width, height, pixel) {
  const rows = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) { rows[y * (width * 4 + 1)] = 0; for (let x = 0; x < width; x++) { const [r, g, b, a = 255] = pixel(x, y); const o = y * (width * 4 + 1) + 1 + x * 4; rows[o] = r; rows[o + 1] = g; rows[o + 2] = b; rows[o + 3] = a; } }
  const head = Buffer.alloc(13); head.writeUInt32BE(width, 0); head.writeUInt32BE(height, 4); head[8] = 8; head[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', head), chunk('IDAT', deflateSync(rows, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
let seed = 7; const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const hash = (x, y) => { let h = Math.imul(x * 374761393 + y * 668265263, 1274126177); h ^= h >>> 13; return ((Math.imul(h, 1274126177) ^ (h >>> 16)) >>> 0) / 4294967295; };
// Desk: dark slate with sparse lighter and darker specks (one texel = one screen pixel at 2x).
await writeFile(out('desk.png'), png(64, 64, (x, y) => { const n = hash(x, y); return n > .965 ? [38, 43, 52] : n < .03 ? [14, 16, 20] : n > .9 ? [30, 34, 41] : [24, 27, 33]; }));
// Paper: warm cream with grain and the odd fibre.
await writeFile(out('paper.png'), png(64, 64, (x, y) => { const n = hash(x + 99, y + 7); return n > .97 ? [205, 190, 160] : n > .88 ? [226, 214, 186] : n < .04 ? [244, 236, 214] : [236, 226, 200]; }));
// Stamp perforation, 9-slice: 4 px teeth on every edge, transparent notches.
await writeFile(out('stamp-edge.png'), png(12, 12, (x, y) => {
  const edge = x < 2 || x > 9 || y < 2 || y > 9;
  const notch = edge && ((x < 2 || x > 9) ? (y % 4 === 1 || y % 4 === 2) : (x % 4 === 1 || x % 4 === 2));
  return notch ? [0, 0, 0, 0] : [236, 226, 200, 255];
}));
// Torn paper edge, 9-slice: irregular 0-3 px bite on each side.
await writeFile(out('paper-edge.png'), png(24, 24, (x, y) => {
  const bite = (i) => Math.floor(hash(i, 3) * 3);
  const out = x < bite(y) || 23 - x < bite(y + 40) || y < bite(x + 80) || 23 - y < bite(x + 120);
  return out ? [0, 0, 0, 0] : [236, 226, 200, 255];
}));
// Rubber-stamp ink mask: mostly solid with dry-brush gaps.
await writeFile(out('ink-mask.png'), png(48, 48, (x, y) => { const n = hash(x + 311, y + 17), streak = hash(Math.floor(x / 3) + 900, y); return n > .86 || (streak > .93 && n > .5) ? [0, 0, 0, 0] : [0, 0, 0, 255]; }));
console.log('textures written');

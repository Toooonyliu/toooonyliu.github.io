// Remove metadata only. JPEG scan data and color profiles remain byte-for-byte intact.
// The prepared web copies have no EXIF orientation (verified with sips).
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const folder = new URL('../public/assets/meals/', import.meta.url);
for (const name of await readdir(folder)) {
  if (!name.endsWith('.jpg')) continue;
  const path = new URL(name, folder);
  const data = await readFile(path);
  if (data.readUInt16BE(0) !== 0xffd8) throw new Error(`Not a JPEG: ${name}`);
  const parts = [data.subarray(0, 2)];
  let position = 2, removed = 0;
  while (position < data.length) {
    const start = position;
    if (data[position++] !== 0xff) throw new Error(`Invalid marker: ${name}`);
    while (data[position] === 0xff) position++;
    const marker = data[position++];
    if (marker === 0xda || marker === 0xd9) { parts.push(data.subarray(start)); break; }
    const length = data.readUInt16BE(position);
    if (length < 2 || position + length > data.length) throw new Error(`Invalid segment: ${name}`);
    if ([0xe1, 0xed, 0xfe].includes(marker)) removed++;
    else parts.push(data.subarray(start, position + length));
    position += length;
  }
  if (removed) await writeFile(fileURLToPath(path), Buffer.concat(parts));
  console.log(`${name}: ${removed} EXIF/XMP/IPTC/comment segments removed; pixels unchanged`);
}

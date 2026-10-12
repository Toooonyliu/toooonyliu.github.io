// Build source first, then run: node export-demo.mjs
// Optional local input: node export-demo.mjs --from /absolute/path/to/dist/client
// Only generated output is rewritten; protected prototype source is never changed.
import assert from 'node:assert/strict';
import { cp, lstat, mkdir, mkdtemp, readdir, readFile, rename, rmdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const destination = path.join(root, 'demo');
const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== '--from')) {
  throw new Error('Usage: node export-demo.mjs [--from /absolute/path/to/dist/client]');
}
const input = args.length ? path.resolve(args[1]) : path.join(root, 'source', 'dist', 'client');
const assetPrefix = '/projects/mibly/demo/assets/';

// A slash after a path character belongs to an existing relative/absolute URL.
// This changes "/assets/a.jpg", but not "../assets/a.jpg", "./assets/a.jpg",
// "https://host/assets/a.jpg", or an already scoped portfolio asset.
const rebaseAssets = text => text.replace(/(?<![\w./~%:-])\/assets\//g, assetPrefix);
assert.equal(rebaseAssets('src="/assets/a.jpg"'), `src="${assetPrefix}a.jpg"`);
for (const sample of [
  '../assets/a.jpg', './assets/a.jpg', 'https://host/assets/a.jpg',
  '/projects/mibly/demo/assets/a.jpg', '//assets/a.jpg',
]) assert.equal(rebaseAssets(sample), sample);

if (path.basename(root) !== 'mibly' || path.basename(path.dirname(root)) !== 'projects') {
  throw new Error('Refusing export outside the expected projects/mibly directory.');
}
if (input === destination || input.startsWith(destination + path.sep)) {
  throw new Error('The generated demo cannot be its own source.');
}
for (const required of ['index.html', 'assets', 'slides/product.html', 'slides/process.html', 'slides/deck.js']) {
  const stat = await lstat(path.join(input, required));
  if (stat.isSymbolicLink()) throw new Error(`Refusing symlink build input: ${required}`);
}

await mkdir(root, { recursive: true });
const work = await mkdtemp(path.join(root, '.mibly-export-'));
const next = path.join(work, 'next');
const backup = path.join(work, 'previous-demo');
await cp(input, next, { recursive: true, dereference: false });

async function rewrite(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Refusing symlink in static export: ${file}`);
    if (entry.isDirectory()) await rewrite(file);
    else if (/\.(html|css|js)$/.test(file)) {
      const before = await readFile(file, 'utf8');
      const after = rebaseAssets(before);
      if (after !== before) await writeFile(file, after);
    }
  }
}
await rewrite(next);

// Portfolio branding belongs to the generated HTML wrapper, not runtime source.
const index = path.join(next, 'index.html');
const faviconLinks = [
  '<link rel="icon" href="/favicon.ico?v=tl2" sizes="16x16 32x32 48x48">',
  '<link rel="icon" href="/favicon-tl-32.png" type="image/png" sizes="32x32">',
  '<link rel="icon" href="/favicon-tl.svg" type="image/svg+xml" sizes="any">',
].join('\n    ');
await writeFile(index, (await readFile(index, 'utf8')).replace('</head>', `${faviconLinks}\n  </head>`));

let hadPrevious = false;
try {
  const existing = await lstat(destination);
  if (!existing.isDirectory() || existing.isSymbolicLink()) throw new Error('Expected a generated demo directory.');
  await rename(destination, backup);
  hadPrevious = true;
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
try {
  await rename(next, destination);
} catch (error) {
  if (hadPrevious) await rename(backup, destination);
  throw error;
}
if (hadPrevious) {
  const recoveryRoot = path.join(root, 'source', '.export-backups');
  await mkdir(recoveryRoot, { recursive: true });
  const recoveredWork = path.join(recoveryRoot, path.basename(work));
  await rename(work, recoveredWork);
  console.log(`Previous demo preserved for recovery: ${path.join(recoveredWork, 'previous-demo')}`);
} else await rmdir(work);
console.log(`Static Mibly demo exported to ${destination}`);
console.log('No repository commits, remote writes, or deployment performed.');

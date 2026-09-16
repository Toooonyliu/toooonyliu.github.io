// Run from this directory after building source: node export-demo.mjs
// Vite's runtime uses root-relative assets; scope all static asset URLs for GitHub Pages.
import {cp,readdir,readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.dirname(fileURLToPath(import.meta.url));
const destination=path.join(root,'demo');
// This directory contains only generated public output. Replace it to avoid stale chunks.
await rm(destination,{recursive:true,force:true});
await mkdir(destination,{recursive:true});
await cp(path.join(root,'source/dist/client'),destination,{recursive:true});
async function rewrite(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())await rewrite(file);else if(/\.(html|css|js)$/.test(file)){const text=await readFile(file,'utf8');await writeFile(file,text.replaceAll('/assets/','/projects/flighty/demo/assets/'));}}}
await rewrite(destination);
// Portfolio branding belongs to the published wrapper, not the standalone app.
const page=path.join(destination,'index.html');
const faviconLinks='<link rel="icon" href="/favicon.ico?v=tl2" sizes="16x16 32x32 48x48">\n<link rel="icon" href="/favicon-tl-32.png" type="image/png" sizes="32x32">\n<link rel="icon" href="/favicon-tl.svg" type="image/svg+xml" sizes="any">';
await writeFile(page,(await readFile(page,'utf8')).replace('</head>',faviconLinks+'\n</head>'));
console.log('GitHub Pages demo exported to projects/flighty/demo');

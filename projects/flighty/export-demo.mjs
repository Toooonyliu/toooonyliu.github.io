// Run from this directory after building source: node export-demo.mjs
// Vite's runtime uses root-relative assets; scope all static asset URLs for GitHub Pages.
import {cp,readdir,readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.dirname(fileURLToPath(import.meta.url));
const destination=path.join(root,'demo');
await mkdir(destination,{recursive:true});
await cp(path.join(root,'source/dist/client'),destination,{recursive:true});
async function rewrite(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())await rewrite(file);else if(/\.(html|css|js)$/.test(file)){const text=await readFile(file,'utf8');await writeFile(file,text.replaceAll('/assets/','/projects/flighty/demo/assets/'));}}}
await rewrite(destination);
console.log('GitHub Pages demo exported to projects/flighty/demo');

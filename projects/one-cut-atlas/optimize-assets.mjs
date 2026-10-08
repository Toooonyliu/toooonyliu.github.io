// Lossless WebP encoding; backgrounds use the renderer's logical pixel grid.
// Keep original generated PNGs in the workspace for provenance and iteration.
import { readdir,stat } from 'node:fs/promises';
const {default:sharp}=await import(process.env.SHARP_MODULE || 'sharp');
const directory=new URL('./assets/art/',import.meta.url);
for(const file of await readdir(directory)){
 if(!file.endsWith('.png'))continue;
 const input=new URL(file,directory),output=new URL(file.replace(/\.png$/,'.webp'),directory);
 const pipeline=sharp(input.pathname);
 // Backgrounds are sampled at this exact logical size by the game renderer.
 // Baking that pixel grid saves download/decode cost without changing layout.
 if(!file.startsWith('fighters'))pipeline.resize(480,270,{kernel:'nearest',fit:'fill'});
 await pipeline.webp({lossless:true,effort:6}).toFile(output.pathname);
 console.log(`${file}: ${(await stat(input)).size} → ${(await stat(output)).size} bytes`);
}

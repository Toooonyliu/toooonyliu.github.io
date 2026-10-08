import { mkdir,copyFile,cp,rm } from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});await mkdir('dist',{recursive:true});
await copyFile('index.html','dist/index.html');
await copyFile('presentation.html','dist/presentation.html');
await copyFile('README.md','dist/README.md');
await copyFile('prompt_log.md','dist/prompt_log.md');
await copyFile('submission-checklist.md','dist/submission-checklist.md');
await cp('src','dist/src',{recursive:true});await cp('assets','dist/assets',{recursive:true,filter:source=>!source.endsWith('.png')});
console.log('Static browser build ready in dist/. Real AI requires the server endpoint.');

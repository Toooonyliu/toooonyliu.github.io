/** Static frontend-only preview; the optional API lives in the backend repo. */
import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.geojson':'application/geo+json','.webp':'image/webp','.md':'text/plain; charset=utf-8'};
http.createServer(async(request,response)=>{
 try{
  if(!['GET','HEAD'].includes(request.method)){response.writeHead(405);return response.end();}
  const url=new URL(request.url,'http://localhost'),relative=decodeURIComponent(url.pathname).replace(/^\/+/,''),file=path.resolve(root,relative||'index.html');
  if(!file.startsWith(root+path.sep)||relative.split('/').some(part=>part.startsWith('.'))){response.writeHead(404);return response.end();}
  const info=await stat(file);if(!info.isFile()){response.writeHead(404);return response.end();}
  response.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});response.end(request.method==='HEAD'?undefined:await readFile(file));
 }catch{response.writeHead(404);response.end('Not found');}
}).listen(Number(process.env.PORT||4173),'127.0.0.1',()=>console.log(`One Cut Atlas frontend: http://127.0.0.1:${process.env.PORT||4173}`));

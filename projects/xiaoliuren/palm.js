// Left hand, palm facing the viewer: the thumb is on the viewer's right.
// Original loose contour drawing; markers and thumb share one animated coordinate space.
export const POINTS=[[382,336],[385,181],[301,112],[225,157],[237,340],[304,346]];
const labels=[[469,326],[476,155],[304,38],[147,129],[139,368],[296,441]];
export function palmMarkup(names){
 return `<div class="palm-frame"><svg class="palm-svg" viewBox="50 0 530 640" role="img" aria-label="Left hand, palm facing you; thumb on the right. 左手掌面。${names.join(' → ')}">
 <g class="hand-gesture"><g class="hand-lines">
 <path class="hand-outline" d="M187 611C198 577 185 548 165 522C143 494 119 467 114 430C111 404 112 384 107 359L93 267C90 246 95 227 112 226C129 224 136 239 139 258L161 339C164 349 175 345 173 334L173 184C171 163 168 140 179 124C188 111 210 108 223 119C240 133 239 155 239 177L250 324C251 334 263 334 265 322L266 125C265 105 262 76 278 64C290 53 307 57 318 69C330 82 327 101 328 122L338 321C338 332 349 331 350 319L357 187C358 167 357 146 370 136C383 126 400 134 407 147C417 164 410 185 411 202L410 351C409 377 424 407 418 434C410 471 385 497 374 532C366 558 371 583 365 610"/>
 <path class="palm-loop" d="M170 405C215 388 259 354 300 366C327 374 343 398 327 413C312 427 271 409 248 396C222 381 213 372 220 363C228 351 252 362 276 374C314 395 351 428 348 475C347 498 333 517 326 534"/>
 <path class="palm-fold" d="M169 462C208 440 232 453 265 480C286 498 302 505 321 500M193 557C228 570 294 574 365 553"/>
 <path class="finger-fold" d="M192 248C205 242 221 247 237 245M282 224C295 218 309 225 328 220M369 266C380 261 396 268 410 262M115 319C124 315 139 320 151 317"/>
 </g><g id="thumb" class="thumb"><path id="thumb-mask" class="thumb-mask"/><path id="thumb-line" class="thumb-line"/><path id="thumb-fold" class="thumb-fold"/></g>
 <g class="palm-nodes">${POINTS.map(([x,y],i)=>`<g class="palm-node" data-node="${i}" transform="translate(${x} ${y})"><circle class="node-halo" r="18"/><circle class="node-dot" r="3.5"/></g>`).join('')}</g>
 <g class="palm-labels">${labels.map(([x,y],i)=>`<g data-label="${i}"><text x="${x}" y="${y}" text-anchor="middle">${names[i]}</text></g>`).join('')}</g>
 <g class="stage-marks" id="stage-marks"></g></g></svg><span class="sr-only" id="palm-state"></span></div>`;
}
let motion=0,thumbPoint=[477,335];
export function moveThumb(target,duration=240){
 cancelAnimationFrame(motion);const from=[...thumbPoint],started=performance.now();
 const frame=now=>{
  const t=duration?Math.min(1,(now-started)/duration):1,e=t*t*(3-2*t);
  const x=from[0]+(target[0]-from[0])*e,y=from[1]+(target[1]-from[1])*e;thumbPoint=[x,y];
  const d=`M374 501C406 475 ${x+39} ${y+58} ${x+16} ${y+5}C${x+8} ${y-12} ${x-8} ${y-15} ${x-17} ${y-3}C${x-29} ${y+13} ${x-8} ${y+42} ${x-11} ${y+65}C${x+1} ${y+102} 333 443 337 482`;
  document.querySelector('#thumb-mask')?.setAttribute('d',d);
  document.querySelector('#thumb-line')?.setAttribute('d',d);
  document.querySelector('#thumb-fold')?.setAttribute('d',`M${x-14} ${y+33}Q${x} ${y+25} ${x+22} ${y+36}`);
  if(t<1)motion=requestAnimationFrame(frame);
 };
 motion=requestAnimationFrame(frame);
}
export function activateNode(index,reduced=false){
 document.querySelectorAll('[data-node]').forEach(el=>el.classList.toggle('active',Number(el.dataset.node)===index));
 document.querySelectorAll('[data-label]').forEach(el=>el.classList.toggle('active',Number(el.dataset.label)===index));
 moveThumb(index===null?[477,335]:POINTS[index],reduced?0:240);
}

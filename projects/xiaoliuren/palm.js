export const POINTS = [[350,326],[350,179],[278,119],[207,156],[207,326],[278,326]];
export function palmMarkup(names) {
  return `<div class="palm-frame"><div class="palm-caption"><span>六 宫 掌 诀</span><span>THE SIX POSITIONS</span></div>
  <svg class="palm-svg" viewBox="0 0 580 620" role="img" aria-label="${names.join(' → ')}"><defs><radialGradient id="palm-glow"><stop stop-color="#bbaf89" stop-opacity=".07"/><stop offset="1" stop-color="#bbaf89" stop-opacity="0"/></radialGradient></defs>
    <circle cx="285" cy="285" r="246" fill="url(#palm-glow)"/>
    <g class="orbit"><circle cx="285" cy="282" r="215"/><circle cx="285" cy="282" r="229" stroke-dasharray="1 14"/><path d="M285 44V61M285 504V521M49 282H66M504 282H521"/></g>
    <g class="hand-lines">
      <path class="hand-outline" d="M182 586C185 554 181 533 169 509C153 481 126 451 118 413L103 288C99 262 106 247 119 247C133 247 139 258 142 277L156 338C160 349 170 345 168 332L161 153C160 126 170 109 185 108C201 107 213 117 216 140L232 309C233 318 243 320 244 308L245 108C245 82 254 64 271 64C289 64 298 78 299 102L306 309C306 322 318 322 319 309L323 156C324 131 335 118 350 120C368 121 376 137 375 159L374 365C387 388 405 409 412 443C397 474 377 495 367 524C360 545 361 565 363 586"/>
      <path d="M198 578C203 548 200 527 188 505C167 471 142 445 137 404L120 286M182 151L201 307M269 110L273 297M350 162L346 302M194 384C222 355 267 346 317 354C342 360 355 373 361 392M180 423C227 411 256 436 292 460M190 435C227 425 251 444 271 459M334 409C317 450 313 494 319 549M230 518C240 530 252 535 264 535M186 557C234 572 308 571 361 557"/>
      <path class="fine" d="M173 185L212 181M176 194L211 190M180 248L218 245M184 257L219 254M250 152L298 152M251 160L298 160M252 228L302 228M253 237L302 237M324 209L373 211M324 217L372 219M322 275L372 278M322 284L372 286M109 301L143 298M114 343L153 339M201 352C239 330 283 329 316 343"/>
      <path d="M173 150C177 141 193 140 199 148M256 108C262 99 282 98 289 108M334 164C341 154 357 155 364 163M108 278C115 270 129 272 133 279"/>
    </g>
    <path class="cycle-path" d="M350 326L350 179L278 119L207 156L207 326L278 326Z"/>
    <g class="thumb" id="thumb"><path class="thumb-mask" id="thumb-mask"/><path class="thumb-line" id="thumb-line"/><ellipse class="thumb-nail" id="thumb-nail" rx="10" ry="16"/></g>
    <g class="palm-nodes">${POINTS.map(([x,y],i)=>`<g class="palm-node" data-node="${i}" transform="translate(${x} ${y})"><circle class="node-halo" r="25"/><circle class="node-ring" r="16"/><circle class="node-dot" r="4"/><text y="-30" text-anchor="middle">${String(i+1).padStart(2,'0')}</text></g>`).join('')}</g>
    <g class="palm-labels">${[[440,356,350,326,0],[441,165,350,179,1],[278,30,278,119,2],[115,136,207,156,3],[69,371,207,326,4],[278,410,278,326,5]].map(([x,y,px,py,i])=>`<g data-label="${i}"><path d="M${x} ${y+7}L${x} ${y+18}L${px} ${py}"/><text x="${x}" y="${y}" text-anchor="middle">${names[i]}</text></g>`).join('')}</g>
  </svg><div class="palm-bottom"><span id="palm-state"></span><span class="palm-direction">01 — 06 ↻</span></div></div>`;
}
let motion = 0;
let thumbPoint = [412,368];
export function moveThumb(target, duration=230) {
  cancelAnimationFrame(motion);
  const from=[...thumbPoint], started=performance.now();
  function frame(now) {
    const t=duration ? Math.min(1,(now-started)/duration) : 1;
    const ease=t*t*(3-2*t);
    const x=from[0]+(target[0]-from[0])*ease, y=from[1]+(target[1]-from[1])*ease;
    thumbPoint=[x,y];
    const d=`M362 481C400 452 ${x+51} ${y+61} ${x+15} ${y+5}C${x+5} ${y-14} ${x-15} ${y-11} ${x-17} ${y+5}C${x-19} ${y+27} ${x+12} ${y+51} ${x+15} ${y+70}C${x+42} ${y+120} 347 440 333 470`;
    document.querySelector('#thumb-mask')?.setAttribute('d',d);
    document.querySelector('#thumb-line')?.setAttribute('d',d);
    document.querySelector('#thumb-nail')?.setAttribute('cx',x+5);
    document.querySelector('#thumb-nail')?.setAttribute('cy',y+10);
    if(t<1) motion=requestAnimationFrame(frame);
  }
  motion=requestAnimationFrame(frame);
}
export function activateNode(index, reduced=false) {
  document.querySelectorAll('[data-node]').forEach(el=>el.classList.toggle('active',Number(el.dataset.node)===index));
  document.querySelectorAll('[data-label]').forEach(el=>el.classList.toggle('active',Number(el.dataset.label)===index));
  moveThumb(index===null?[412,368]:POINTS[index],reduced?0:210);
}

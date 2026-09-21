// Approved v7 flowing palm: screen-left thumb, soft open resting pose.
// Coordinates stay in one 1024 x 1536 drawing space; only the artwork is narrowed.
const REST_TIP=[310,443], REST_BEND=[0,0,0];
const DEFAULT_NAMES=['大安','留连','速喜','赤口','小吉','空亡'];
const LABEL_OFFSETS=Array.from({length:6},()=>[0,36,'middle']);
function labelText(name,x,y){return /^[A-Za-z ]+$/.test(name)?name.split(' ').map((word,i)=>`<tspan x="${x}" y="${y+i*34}">${esc(word)}</tspan>`).join(''):esc(name);}
let frame=0, generation=0, mount=0, target=-1, retaps=0;
let state={tip:[...REST_TIP],bend:[...REST_BEND],engage:0,pulse:0};
const lerp=(a,b,t)=>a+(b-a)*t;
const ease=t=>t*t*(3-2*t);
const clamp=v=>Math.max(0,Math.min(1,v));
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fingers=[
 {base:[492,624],tip:[397,269],contact:[442,527],bend:.60,
  contour:[['C',447,561,433,490,409,437],['C',391,393,368,328,359,284],['C',349,241,345,190,366,175],['C',391,151,416,194,439,229],['C',482,281,510,365,530,427],['C',547,479,548,543,557,591]],
  folds:[[374,316,395,336,425,329],[411,436,428,457,447,453]]},
 {base:[611,657],tip:[574,190],contact:[568,544],bend:.69,
  contour:[['C',572,555,568,509,553,449],['C',539,394,536,339,538,289],['C',530,243,516,195,532,146],['C',540,118,556,89,574,92],['C',595,91,594,130,608,164],['C',637,222,650,276,650,324],['C',653,381,679,416,681,472],['C',686,532,668,590,664,642]],
  folds:[[544,263,557,284,590,278],[559,420,577,441,604,441]]},
 {base:[749,732],tip:[737,309],contact:[689,616],bend:.69,
  contour:[['C',683,594,707,525,711,481],['C',714,425,701,380,693,330],['C',684,286,698,237,724,218],['C',746,202,766,235,779,277],['C',796,328,803,365,807,415],['C',815,466,796,514,783,563],['C',772,614,769,668,765,721]],
  folds:[[704,345,721,371,752,368],[718,475,736,495,757,492]]}
];
// A light width adjustment around the middle finger's own sloping axis.
// The base blends back to the unchanged palm and its marker/contact stay fixed.
function slenderPoint(x,y,f){
 if(f!==fingers[1])return [x,y];
 const progress=(f.base[1]-y)/(f.base[1]-f.tip[1]);
 const axis=lerp(f.base[0],f.tip[0],progress);
 const amount=.10*ease(clamp((f.base[1]-y)/160));
 return [axis+(x-axis)*(1-amount),y];
}
function warpPoint(x,y,f,b){
 [x,y]=slenderPoint(x,y,f);
 const t=clamp((f.base[1]-y)/(f.base[1]-f.tip[1]));
 return [x+(f.contact[0]-f.tip[0])*b*t,y+(f.contact[1]-f.tip[1])*b*t];
}
function contour(f,b){return f.contour.map(c=>c[0]+' '+c.slice(1).reduce((a,_,i,v)=>i%2?a:a.concat(warpPoint(v[i],v[i+1],f,b)),[]).join(' ')).join(' ');}
export function screenPoint([x,y]){return [512+(x-512)*.94,y];}
export function palmNodes(){
 const p=fingers.map((f,i)=>warpPoint(...f.tip,f,state.bend[i]));
 return [[485,635],p[0],p[1],p[2],[746,730],[617,677]].map(screenPoint);
}
export const POINTS=[[485,635],fingers[0].tip,fingers[1].tip,fingers[2].tip,[746,730],[617,677]].map(screenPoint);
function outline(){
 const b=state.bend;
 let d='M 385 1453 C 393 1340 378 1220 347 1161 C 302 1108 250 1060 227 983 M 331 747 C 385 737 421 677 439 616 ';
 d+=contour(fingers[0],b[0]);d+=' Q 560 605 563 584 '+contour(fingers[1],b[1]);d+=' Q 661 660 670 631 '+contour(fingers[2],b[2]);
 return d+' Q 772 736 785 707 C 821 657 846 603 859 553 C 876 504 858 459 878 432 C 898 407 920 398 929 413 C 942 444 943 477 941 518 C 946 575 932 625 905 675 C 874 741 840 799 810 861 C 779 930 756 992 714 1050 C 676 1104 663 1140 665 1203 C 670 1296 704 1391 733 1455';
}
function thumbPaths([x,y]){
 const rest=[227,983,205,922,192,866,191,795,188,699,x-77,y+125,x-29,y+24,x-12,y-18,x+18,y-23,x+35,y,x+55,y+29,x+20,y+72,x+10,y+122,x+12,y+190,284,737,331,747,331,747,331,747,331,747];
 const pinched=[330,970,282,948,248,912,242,864,232,816,x-60,y+98,x-26,y+20,x-16,y-16,x+19,y-25,x+35,y-1,x+55,y+28,x+14,y+62,x+9,y+106,x+18,y+172,338,798,388,868,418,912,368,958,344,964];
 const a=rest.map((v,i)=>lerp(v,pinched[i],state.engage));
 let d=`M${a[0]} ${a[1]}`;for(let i=2;i<a.length;i+=6)d+=' C'+a.slice(i,i+6).join(' ');
 return {d,fill:d+' Z'};
}
function currentSvg(){return typeof document==='undefined'?null:document.querySelector(`svg[data-palm-mount="${mount}"]`);}
function paint(){
 const svg=currentSvg();if(!svg)return false;
 const q=s=>svg.querySelector(s),thumb=thumbPaths(state.tip);
 q('.hand-outline').setAttribute('d',outline());
 q('.palm-side').setAttribute('opacity',state.engage);
 q('.thumb-mask').setAttribute('d',thumb.fill);q('.thumb-line').setAttribute('d',thumb.d);
 palmNodes().forEach(([x,y],i)=>{
  const node=q(`[data-node="${i}"]`),label=q(`[data-label="${i}"]`),active=i===target;
  node.setAttribute('transform',`translate(${x} ${y})`);node.classList.toggle('active',active);node.setAttribute('aria-pressed',String(active));
  const dot=node.querySelector('.node-dot'),halo=node.querySelector('.node-halo');
  dot.style.setProperty('r',(active?6+state.pulse*3:4.5)+'px');
  halo.setAttribute('r',String(18+state.pulse*13));halo.style.opacity=active?String(.22+state.pulse*.6):'0';
  const [dx,dy,anchor]=LABEL_OFFSETS[i],text=label.querySelector('text');
  text.setAttribute('x',String(x+dx));text.querySelectorAll('tspan').forEach((span,j)=>{span.setAttribute('x',String(x+dx));span.setAttribute('y',String(y+dy+j*34));});text.setAttribute('y',String(y+dy));text.setAttribute('text-anchor',anchor);label.classList.toggle('active',active);
 });
 svg.dataset.pose=String(target);svg.dataset.tip=state.tip.map(v=>v.toFixed(2)).join(',');svg.dataset.bend=state.bend.map(v=>v.toFixed(3)).join(',');svg.dataset.retapCount=String(retaps);
 return true;
}
export function cancelPalmMotion(){
 generation++;
 if(frame&&typeof cancelAnimationFrame==='function')cancelAnimationFrame(frame);
 frame=0;state.pulse=0;
 const svg=currentSvg();if(svg){svg.dataset.animating='false';paint();}
}
export function palmMarkup(names=DEFAULT_NAMES){
 cancelPalmMotion();mount++;target=-1;retaps=0;state={tip:[...REST_TIP],bend:[...REST_BEND],engage:0,pulse:0};
 const labels=DEFAULT_NAMES.map((fallback,i)=>names[i]||fallback),thumb=thumbPaths(state.tip),nodes=palmNodes();
 return `<div class="palm-frame palm-v8"><style>
 .palm-v8 .palm-svg{overflow:visible}.palm-v8 .hand-gesture{transform-origin:512px 1050px}
 .palm-v8 .hand-lines,.palm-v8 .thumb-line{fill:none;stroke:var(--ink);stroke-width:4.2;stroke-linecap:round;stroke-linejoin:round}
 .palm-v8 .hand-outline{stroke-width:4.2}.palm-v8 .palm-fold{stroke-width:2.1;opacity:.85}
 .palm-v8 .thumb-mask{fill:var(--bg);stroke:none;transition:fill 1.4s}
 .palm-v8 .palm-node{cursor:pointer;outline:none}.palm-v8 .node-hit{fill:transparent;stroke:none;pointer-events:all}
 .palm-v8 .node-dot{fill:var(--ink)}.palm-v8 .node-halo{fill:none;stroke:var(--ink);stroke-width:1.8;opacity:0;transition:none}
 .palm-v8 .palm-node:focus-visible .node-halo{opacity:1!important;stroke-width:3}
 .palm-v8 .palm-labels{pointer-events:none}.palm-v8 .palm-labels text{fill:var(--ink);font:34px var(--serif,serif);letter-spacing:.02em;paint-order:stroke;stroke:var(--bg);stroke-width:5px;stroke-linejoin:round}
 .palm-v8.names-off .palm-labels{display:none!important}
 </style><svg class="palm-svg" viewBox="0 0 1024 1536" role="group" aria-label="${esc(labels.join(' → '))}" data-palm-mount="${mount}" data-pose="-1" data-tip="310.00,443.00" data-bend="0.000,0.000,0.000" data-retap-count="0" data-animating="false">
 <g class="hand-gesture"><g class="hand-art" transform="translate(512 0) scale(.94 1) translate(-512 0)" aria-hidden="true"><g class="hand-lines">
 <path class="hand-outline" d="${outline()}"/><path class="palm-side" opacity="0" d="M227 983 C204 911 204 826 227 780 C245 749 286 727 331 747"/>
 <path class="palm-fold" d="M 369 783 C 457 816 492 907 486 983 C 486 1045 465 1097 501 1152 M 506 711 C 567 776 647 819 724 840"/></g>
 <g class="thumb"><path id="thumb-mask" class="thumb-mask" d="${thumb.fill}"/><path id="thumb-line" class="thumb-line" d="${thumb.d}"/></g></g>
 <g class="palm-nodes">${nodes.map(([x,y],i)=>`<g class="palm-node" data-node="${i}" transform="translate(${x} ${y})" tabindex="0" role="button" aria-label="${esc(labels[i])}" aria-pressed="false"><circle class="node-hit" r="48"/><circle class="node-halo" r="18"/><circle class="node-dot" r="4.5"/></g>`).join('')}</g>
 <g class="palm-labels">${nodes.map(([x,y],i)=>{const [dx,dy,anchor]=LABEL_OFFSETS[i];return `<g data-label="${i}"><text x="${x+dx}" y="${y+dy}" text-anchor="${anchor}">${labelText(labels[i],x+dx,y+dy)}</text></g>`;}).join('')}</g>
 <g class="stage-marks" id="stage-marks"></g></g></svg><span class="sr-only" id="palm-state"></span></div>`;
}
export function activateNode(index,reduced=false,options={}){
 const next=Number.isInteger(index)&&index>=0&&index<6?index:-1;
 const again=Boolean(options.retap)&&next>=0&&target===next;
 cancelPalmMotion();target=next;if(again)retaps++;
 const svg=currentSvg();if(!svg)return;
 const run=generation,start=performance.now(),toBend=[0,0,0];
 if(next>=1&&next<=3)toBend[next-1]=1;
 const targets=[[485,635],fingers[0].contact,fingers[1].contact,fingers[2].contact,[746,730],[617,677]];
 const toTip=next<0?[...REST_TIP]:targets[next],toEngage=next<0?0:1;
 const from={tip:[...state.tip],bend:[...state.bend],engage:state.engage};
 const requested=Number(options.duration??430),duration=Number.isFinite(requested)?Math.max(0,Math.min(2000,requested)):430;
 const instant=reduced||duration===0||(typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches);
 const distance=Math.hypot(toTip[0]-from.tip[0],toTip[1]-from.tip[1]);
 const arc=again?24:Math.min(18,distance*.075);
 const flexFinger=next===0?0:next===4?2:next===5?1:next-1;
 svg.dataset.animating=String(!instant);
 function tick(now){
  if(run!==generation||!svg.isConnected)return;
  const t=instant?1:clamp((now-start)/duration),k=ease(t),pulse=t===1?0:Math.sin(Math.PI*t)**2;
  state.tip=t===1?[...toTip]:from.tip.map((n,i)=>lerp(n,toTip[i],k)-(i===1?arc*pulse:0));
  state.bend=from.bend.map((n,i)=>{
   const progress=Math.min(1,t*(toBend[i]>n?1.1:1));
   let value=progress===1?toBend[i]:lerp(n,toBend[i],ease(progress));
   if(again&&i===flexFinger)value+=(toBend[i]>.5?-.10:.10)*pulse;
   return value;
  });
  state.engage=t===1?toEngage:lerp(from.engage,toEngage,k);state.pulse=again?pulse:0;
  paint();if(t<1){frame=requestAnimationFrame(tick);}else{frame=0;svg.dataset.animating='false';}
 }
 tick(start);
}
if(typeof window!=='undefined'){
 window.addEventListener('pagehide',cancelPalmMotion);
 window.addEventListener('hashchange',cancelPalmMotion);
}

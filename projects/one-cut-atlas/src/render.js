import { WORLD } from './shared.js';
import { drawBackdrop, drawSprite } from './art.js';
export { preloadArt, registerBackdrop, preloadBackdrops, hasBackdrop } from './art.js';

/* Original, resolution-independent pixel art. All geometry is painted on a
 * two-pixel grid; the renderer never mutates a scene or the duel engine. */
const P = 2;
const snap = n => Math.round(n / P) * P;
const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const hash = n => { const x = Math.sin(n * 127.1 + 31.7) * 43758.5453; return x - Math.floor(x); };
function mix(a, b, amount) {
  const t = clamp(amount), av = parseInt(a.slice(1), 16), bv = parseInt(b.slice(1), 16);
  const channel = shift => Math.round(((av >> shift) & 255) * (1 - t) + ((bv >> shift) & 255) * t);
  return `rgb(${channel(16)},${channel(8)},${channel(0)})`;
}
// This version also accepts colors produced by mix(), keeping shade operations simple.
function blend(a, b, amount) {
  const rgb = color => color.startsWith('#')
    ? [16, 8, 0].map(s => (parseInt(color.slice(1), 16) >> s) & 255)
    : (color.match(/[\d.]+/g) || [0, 0, 0]).slice(0, 3).map(Number);
  const aa = rgb(a), bb = rgb(b), t = clamp(amount);
  return `rgb(${aa.map((n, i) => Math.round(n * (1 - t) + bb[i] * t)).join(',')})`;
}
function rect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(snap(x), snap(y), Math.max(P, snap(w)), Math.max(P, snap(h)));
}
function shape(ctx, points, color) {
  ctx.fillStyle = color; ctx.beginPath();
  points.forEach(([x, y], i) => i ? ctx.lineTo(snap(x), snap(y)) : ctx.moveTo(snap(x), snap(y)));
  ctx.closePath(); ctx.fill();
}
function pixelLine(ctx, x0, y0, x1, y1, color, width = P) {
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) / P));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    rect(ctx, x0 + (x1 - x0) * t - width / 2, y0 + (y1 - y0) * t - width / 2, width, width, color);
  }
}
function disk(ctx, x, y, radius, color) {
  for (let yy = -radius; yy <= radius; yy += P) {
    const half = Math.sqrt(Math.max(0, radius * radius - yy * yy));
    rect(ctx, x - half, y + yy, half * 2, P, color);
  }
}
function cloud(ctx, x, y, size, color) {
  const s = size;
  shape(ctx, [[x,y+20*s],[x+16*s,y+20*s],[x+16*s,y+8*s],[x+40*s,y+8*s],
    [x+40*s,y],[x+68*s,y],[x+68*s,y+8*s],[x+96*s,y+8*s],[x+96*s,y+20*s],
    [x+124*s,y+20*s],[x+124*s,y+32*s],[x,y+32*s]], color);
}
function colors(scene) {
  const p = scene?.palette || {}, sky = p.sky || '#604359', accent = p.accent || '#e6b66e', ambient = p.ambient || '#243442';
  const night = scene?.lighting === 'night', day = scene?.lighting === 'day';
  return {
    sky, accent, ambient, night, day,
    top: mix(sky, night ? '#081326' : day ? '#d5e5ec' : '#241f41', night ? .52 : day ? .48 : .16),
    horizon: mix(sky, night ? ambient : accent, night ? .3 : day ? .28 : .56),
    distant: mix(ambient, sky, night ? .19 : .48),
    middle: mix(ambient, sky, night ? .09 : .27),
    near: mix(ambient, '#0a1019', night ? .46 : .16),
    light: mix(accent, '#fff3d7', .28),
  };
}

function paintSky(ctx, c, time) {
  for (let y = 0; y < 368; y += 8) rect(ctx, 0, y, WORLD.width, 8, blend(c.top, c.horizon, Math.pow(y / 368, .78)));
  // Quiet bands of atmospheric haze retain the palette of the uploaded photo.
  ctx.globalAlpha = c.night ? .08 : .14;
  rect(ctx, 0, 260, 960, 8, c.light); rect(ctx, 0, 300, 960, 12, c.light);
  ctx.globalAlpha = 1;
  if (c.night) {
    for (let i = 0; i < 48; i++) {
      const x = snap(hash(i + 80) * 960), y = snap(26 + hash(i + 180) * 202);
      ctx.globalAlpha = .25 + .5 * (Math.sin(time * .8 + i * 2.4) + 1) / 2;
      rect(ctx, x, y, i % 11 === 0 ? 8 : 4, 4, '#e5e8de');
      if (i % 11 === 0) rect(ctx, x + 4, y - 4, 4, 12, '#e5e8de');
    }
    ctx.globalAlpha = .08; disk(ctx, 744, 98, 72, c.light);
    ctx.globalAlpha = 1; disk(ctx, 744, 98, 40, mix(c.accent, '#f5f0d7', .68));
    disk(ctx, 756, 90, 32, c.top);
  } else {
    const sy = c.day ? 98 : 180, sr = c.day ? 34 : 52;
    ctx.globalAlpha = .09; disk(ctx, 708, sy, sr + 32, c.light);
    ctx.globalAlpha = .13; disk(ctx, 708, sy, sr + 16, c.light);
    ctx.globalAlpha = 1; disk(ctx, 708, sy, sr, c.light);
    if (!c.day) { rect(ctx, 654, sy + 12, 108, 4, c.horizon); rect(ctx, 650, sy + 28, 116, 8, c.horizon); }
  }
  ctx.globalAlpha = c.night ? .16 : .23;
  const drift = snap((time * 1.6) % 80);
  cloud(ctx, 92 + drift, 74, 1.05, c.light);
  cloud(ctx, 420 + drift * .5, 146, .7, c.light);
  cloud(ctx, 820 + drift * .3, 62, .8, c.light);
  ctx.globalAlpha = 1;
}

function paintMountains(ctx, c, environment) {
  const desert = environment === 'wilderness';
  const far = desert ? blend(c.distant, c.accent, .22) : c.distant;
  shape(ctx, [[0,310],[0,268],[52,268],[52,248],[104,248],[104,224],[136,224],[136,200],
    [168,200],[168,184],[196,184],[196,216],[228,216],[228,248],[264,248],[264,232],
    [296,232],[296,260],[336,260],[336,280],[388,280],[388,240],[428,240],[428,212],
    [464,212],[464,188],[492,188],[492,160],[520,160],[520,184],[548,184],[548,208],
    [588,208],[588,236],[632,236],[632,276],[676,276],[676,252],[712,252],[712,228],
    [752,228],[752,208],[776,208],[776,228],[808,228],[808,256],[856,256],[856,276],
    [912,276],[912,260],[960,260],[960,366],[0,366]], far);
  if (!desert) {
    const snow = blend(far, c.light, .3);
    shape(ctx, [[464,212],[464,188],[492,188],[492,160],[520,160],[520,184],[548,184],[548,208],
      [528,208],[528,196],[516,196],[516,188],[504,188],[504,208],[480,208],[480,224]], snow);
  }
  shape(ctx, [[0,352],[0,300],[72,300],[72,280],[124,280],[124,296],[176,296],[176,320],
    [232,320],[232,300],[284,300],[284,284],[332,284],[332,308],[388,308],[388,328],
    [448,328],[448,304],[488,304],[488,276],[528,276],[528,252],[556,252],[556,280],
    [588,280],[588,300],[628,300],[628,332],[704,332],[704,300],[748,300],[748,280],
    [788,280],[788,304],[840,304],[840,292],[876,292],[876,320],[928,320],[928,304],
    [960,304],[960,374],[0,374]], desert ? blend(c.middle, c.accent, .13) : c.middle);
  // A few straight erosion / ridge marks, never across the dueling platform.
  ctx.globalAlpha = .23;
  pixelLine(ctx, 516, 208, 568, 292, c.light, 4);
  pixelLine(ctx, 180, 236, 212, 276, c.light, 4);
  ctx.globalAlpha = 1;
}

function paintCity(ctx, c) {
  for (let i = 0; i < 20; i++) {
    const x = i * 52 - 8, h = snap(52 + hash(i + 222) * 132), w = 32 + (i % 3) * 8;
    rect(ctx, x, 342 - h, w, h, blend(c.distant, c.ambient, .18));
    if (i % 3 === 0) rect(ctx, x + w / 2, 322 - h, 4, 20, c.distant);
  }
  const towers = [[-20,112,228],[116,72,180],[208,88,248],[328,56,136],[552,72,152],[652,88,240],[776,64,184],[856,112,272]];
  towers.forEach(([x, w, h], i) => {
    const y = 358 - h, wall = blend(c.middle, c.ambient, .24);
    rect(ctx, x, y, w, h, wall);
    rect(ctx, x, y, w, 8, blend(wall, c.light, .14));
    rect(ctx, x + w - 12, y + 8, 12, h - 8, blend(wall, '#080f1e', .28));
    if (i === 2 || i === 5) { rect(ctx, x + 12, y - 12, w - 24, 12, wall); rect(ctx, x + w / 2 - 4, y - 36, 8, 28, wall); }
    for (let yy = y + 20; yy < 344; yy += 20) for (let xx = x + 12; xx < x + w - 16; xx += 16) {
      const lit = hash(xx * .3 + yy + i * 10) > (c.night ? .35 : .6);
      rect(ctx, xx, yy, 8, 8, lit ? blend(c.accent, c.light, hash(xx + yy) * .5) : blend(wall, c.sky, .18));
    }
    if (c.night) {
      ctx.globalAlpha = .45;
      rect(ctx, x + w - 8, y + 8, 4, h - 12, i % 2 ? '#6caea7' : c.accent);
      ctx.globalAlpha = 1;
    }
  });
}

function paintHouse(ctx, c, x, width, height, variation) {
  const base = 364, top = base - height;
  const wall = blend(c.ambient, c.accent, c.night ? .12 : .22);
  const beam = blend(c.near, '#382421', .28);
  const slat = blend(wall, c.light, .2);
  rect(ctx, x, top, width, height, wall);
  // Tiled hip roof with a rising, stepped silhouette and deep overhanging eaves.
  shape(ctx, [[x-20,top+8],[x-20,top],[x-8,top],[x-8,top-8],[x+12,top-8],
    [x+12,top-16],[x+28,top-16],[x+28,top-32],[x+width-28,top-32],
    [x+width-28,top-16],[x+width-12,top-16],[x+width-12,top-8],[x+width+8,top-8],
    [x+width+8,top],[x+width+20,top],[x+width+20,top+8]], c.near);
  rect(ctx, x - 12, top + 4, width + 24, 8, beam);
  for (let r = 0; r < 3; r++) rect(ctx, x + 24 - r * 12, top - 28 + r * 12, width - 48 + r * 24, 4, blend(c.near, c.sky, .26));
  for (let xx = x + 12; xx < x + width; xx += 20) rect(ctx, xx, top + 16, 4, height - 16, slat);
  rect(ctx, x, top + 72, width, 12, beam);
  rect(ctx, x, top + 124, width, 8, beam);
  for (let xx = x + 16; xx < x + width - 20; xx += 60) {
    rect(ctx, xx, top + 24, 44, 40, beam);
    rect(ctx, xx + 4, top + 28, 36, 32, blend(c.light, wall, c.night ? .12 : .42));
    rect(ctx, xx + 20, top + 28, 4, 32, beam); rect(ctx, xx + 4, top + 44, 36, 4, beam);
  }
  // Front awning, cloth doorway and warm shop interior.
  const doorX = x + width * (variation ? .22 : .62);
  rect(ctx, doorX, base - 72, 48, 72, beam);
  rect(ctx, doorX + 8, base - 56, 32, 56, blend(c.light, beam, .68));
  rect(ctx, doorX - 12, base - 80, 72, 12, c.near);
  for (let k = 0; k < 3; k++) rect(ctx, doorX - 8 + k * 24, base - 68, 20, 28, blend(c.accent, c.ambient, .22));
  rect(ctx, doorX + 4, base - 68, 4, 16, c.light);
  for (let xx = x + 8; xx < x + width; xx += 32) rect(ctx, xx, base - 4, 20, 8, beam);
  rect(ctx, x - 4, base - 12, width + 8, 8, c.near);
}

function paintBuildings(ctx, c, environment) {
  // A quiet vanishing point in the middle leaves the fighters easy to read.
  if (environment === 'traditional_street') {
    paintHouse(ctx, c, 312, 112, 88, 1); paintHouse(ctx, c, 536, 104, 96, 0);
    rect(ctx, 458, 286, 12, 78, c.middle); rect(ctx, 494, 286, 12, 78, c.middle);
    rect(ctx, 442, 282, 80, 12, c.middle); rect(ctx, 450, 270, 64, 8, c.middle);
  }
  paintHouse(ctx, c, -12, 240, environment === 'traditional_street' ? 180 : 136, 0);
  paintHouse(ctx, c, 756, 228, environment === 'traditional_street' ? 212 : 152, 1);
}

function lantern(ctx, c, x, y, time, index) {
  pixelLine(ctx, x, y - 28, x, y - 4, c.near, 4);
  const warm = blend(c.accent, '#f27f45', .35), hot = blend(warm, '#ffe4a4', .3);
  ctx.globalAlpha = (c.night ? .12 : .05) + Math.sin(time * 2 + index) * .01;
  disk(ctx, x, y + 18, 36, warm); ctx.globalAlpha = 1;
  rect(ctx, x - 8, y, 16, 4, c.near);
  rect(ctx, x - 12, y + 4, 24, 8, warm); rect(ctx, x - 16, y + 12, 32, 20, warm);
  rect(ctx, x - 12, y + 32, 24, 8, warm); rect(ctx, x - 8, y + 40, 16, 4, c.near);
  rect(ctx, x - 4, y + 4, 8, 32, hot); rect(ctx, x + 8, y + 12, 4, 20, blend(warm, c.ambient, .4));
  rect(ctx, x, y + 44, 4, 12, warm);
  rect(ctx, x - 4, y + 52, 12, 4, warm);
}
function paintLanterns(ctx, c, time, hasHouses) {
  if (!hasHouses) {
    [100, 856].forEach(x => { rect(ctx, x, 208, 8, 156, c.near); rect(ctx, x - 28, 204, 64, 8, c.near); });
  }
  pixelLine(ctx, 112, 212, 292, 244, c.near, 4);
  pixelLine(ctx, 668, 244, 844, 200, c.near, 4);
  [[132,216],[268,244],[692,236],[832,208]].forEach(([x,y], i) => lantern(ctx,c,x,y,time,i));
}

function pine(ctx, c, x, bottom, height, color, lit = false) {
  rect(ctx, x - 4, bottom - height + 28, 8, height - 28, blend(color, c.near, .3));
  const top = bottom - height;
  for (let i = 0; i < 5; i++) {
    const y = top + i * height * .145, w = 12 + i * height * .15;
    shape(ctx, [[x,y],[x+8,y],[x+8,y+12],[x+w*.4,y+12],[x+w*.4,y+24],
      [x+w,y+24],[x+w,y+32],[x-w,y+32],[x-w,y+24],[x-w*.4,y+24],[x-w*.4,y+12],[x,y+12]], color);
    if (lit && i > 1) rect(ctx, x - w + 4, y + 24, w * .6, 4, blend(color, c.light, .15));
  }
}
function broadTree(ctx, c, x, bottom, height, mirror = false) {
  const leaf = blend(c.ambient, c.accent, .12), lit = blend(leaf, c.sky, .16);
  const top = bottom - height;
  rect(ctx, x - 8, top + 52, 16, height - 52, c.near);
  pixelLine(ctx, x, top + 112, x + (mirror ? -1 : 1) * 44, top + 64, c.near, 8);
  pixelLine(ctx, x, top + 132, x + (mirror ? 1 : -1) * 48, top + 88, c.near, 8);
  [[-44,44,48],[-12,24,52],[32,40,40],[-64,76,36],[8,72,60],[56,72,32]].forEach(([xx,yy,r],i) => {
    disk(ctx, x + xx, top + yy, r, i % 3 ? leaf : lit);
    rect(ctx, x + xx - r * .7, top + yy - r * .6, r * .6, 8, blend(lit, c.light, .12));
  });
}
function paintTrees(ctx, c, environment) {
  for (let i = 0; i < 19; i++) {
    const x = i * 56, h = 56 + hash(i + 312) * 60;
    pine(ctx, c, x, 354, h, blend(c.middle, c.distant, .38));
  }
  if (environment === 'forest') {
    [36,108,184,776,852,932].forEach((x,i) => pine(ctx,c,x,364,164+hash(i+441)*100,c.near,true));
    broadTree(ctx,c,-8,390,296); broadTree(ctx,c,962,388,308,true);
  } else {
    broadTree(ctx,c,58,370,204); broadTree(ctx,c,908,370,180,true);
  }
}

function rock(ctx, c, x, y, w, h, index) {
  const stone = blend(c.near, c.accent, .16);
  shape(ctx, [[x,y],[x+8,y-h*.6],[x+w*.3,y-h],[x+w*.7,y-h],[x+w-8,y-h*.6],[x+w,y],
    [x+w*.8,y+4],[x+8,y+4]], stone);
  shape(ctx, [[x+8,y-h*.6],[x+w*.3,y-h],[x+w*.7,y-h],[x+w*.53,y-h*.55],
    [x+w*.22,y-h*.45]], blend(stone,c.light,.2));
  pixelLine(ctx,x+w*.7,y-h+4,x+w*.53,y-h*.55,blend(stone,c.ambient,.5),4);
  if (index % 2) rect(ctx,x+w*.25,y-h*.2,w*.4,4,blend(stone,c.ambient,.3));
}
function paintRocks(ctx, c, environment) {
  if (environment === 'wilderness') {
    const mesa = blend(c.middle,c.accent,.19);
    shape(ctx, [[20,352],[20,276],[44,276],[44,248],[128,248],[128,268],[156,268],[156,352]],mesa);
    rect(ctx,44,248,84,8,blend(mesa,c.light,.15));
    shape(ctx, [[760,356],[760,300],[796,300],[796,260],[900,260],[900,280],[940,280],[940,356]],mesa);
    for (let i=0;i<4;i++) rect(ctx,792,288+i*16,116-i*12,4,blend(mesa,c.ambient,.22));
  }
  [[0,378,100,48],[92,376,52,28],[788,376,64,36],[864,382,116,68]].forEach((p,i)=>rock(ctx,c,...p,i));
}

function paintNeon(ctx, c, time) {
  const cyan = blend('#72cbd0', c.sky, .14), pink = blend('#ee729a', c.accent, .2);
  [[78,248,cyan],[244,284,pink],[800,228,pink]].forEach(([x,y,col],i)=>{
    rect(ctx,x-8,y-8,44,104,c.near);
    ctx.globalAlpha=.08+.02*Math.sin(time*2+i); rect(ctx,x-20,y-20,68,128,col); ctx.globalAlpha=1;
    rect(ctx,x,y,28,88,blend(c.near,col,.18));
    rect(ctx,x,y,28,4,col); rect(ctx,x,y+84,28,4,col);
    rect(ctx,x,y,4,88,col); rect(ctx,x+24,y,4,88,col);
    for(let k=0;k<3;k++) {
      const yy=y+12+k*24;
      rect(ctx,x+8,yy,12,4,col); rect(ctx,x+12,yy-4,4,16,col);
      rect(ctx,x+8,yy+8,12,4,col);
    }
    rect(ctx,x+12,y+92,4,40,c.near);
  });
  const x=620,y=296;
  rect(ctx,x,y,120,28,c.near); rect(ctx,x+4,y+4,112,4,cyan); rect(ctx,x+4,y+20,112,4,cyan);
  pixelLine(ctx,x+20,y+16,x+88,y+16,cyan,4);
  pixelLine(ctx,x+88,y+16,x+72,y+8,cyan,4); pixelLine(ctx,x+88,y+16,x+72,y+24,cyan,4);
}

function paintWater(ctx, c, time) {
  rect(ctx,0,352,960,40,blend(c.sky,c.ambient,.46));
  for(let i=0;i<37;i++) {
    const x=(hash(i+588)*960+time*(i%2?3:-2)+960)%960, y=356+(i%8)*4;
    ctx.globalAlpha=.12+hash(i+77)*.16;
    rect(ctx,x,y,12+hash(i+644)*64,4,c.light);
  }
  ctx.globalAlpha=1;
  rect(ctx,0,388,960,4,c.near);
}

function paintStage(ctx, c, environment, elements) {
  const street=environment==='traditional_street', city=environment==='modern_city', desert=environment==='wilderness';
  const floor=blend(c.ambient,c.accent,desert?.25:street?.17:.1);
  rect(ctx,0,364,960,58,blend(floor,c.sky,.14));
  // Wide open promenade. The decorative scenery is behind the playable plane.
  if(street || city) {
    for(let row=0;row<4;row++) {
      const y=368+row*12, offset=row%2?32:0;
      rect(ctx,0,y,960,4,blend(floor,c.near,.18));
      for(let x=-offset;x<960;x+=64) rect(ctx,x,y+4,4,8,blend(floor,c.near,.12));
    }
  } else {
    for(let i=0;i<54;i++) {
      const x=hash(i+98)*960, y=368+hash(i+228)*48;
      rect(ctx,x,y,4+(i%3)*4,4,blend(floor,i%2?c.light:c.near,.2));
    }
    if(elements.has('trees')) for(let x=8;x<960;x+=44) {
      if(x>268 && x<692) continue;
      rect(ctx,x,402,4,12,c.middle); rect(ctx,x+8,406,4,8,c.middle);
    }
  }
  rect(ctx,0,418,960,4,blend(floor,c.light,.34));
  rect(ctx,0,422,960,16,c.near);
  rect(ctx,0,438,960,4,blend(c.near,c.accent,.14));
  rect(ctx,0,442,960,98,blend(c.near,'#070d17',.26));
  // Stones and timber support on the foreground edge create actual depth.
  for(let i=0;i<20;i++) {
    const x=i*52+(i%2?8:0);
    rect(ctx,x,450+(i%3)*8,40,4,blend(c.near,c.light,.09));
    rect(ctx,x+32,454+(i%3)*8,4,16,blend(c.near,'#050b13',.22));
  }
  if(street) for(let x=28;x<960;x+=116) {
    rect(ctx,x,438,12,44,blend(c.near,c.accent,.12));
    rect(ctx,x,478,12,8,blend(c.near,c.accent,.19));
  }
  // Minimal, intentional landing markers help communicate fighting distance.
  [284,668].forEach(x=>{ rect(ctx,x,414,12,4,blend(floor,c.light,.28)); });
}

export function drawScene(ctx, scene, time = 0) {
  ctx.save(); ctx.imageSmoothingEnabled=false;
  const c=colors(scene), env=scene?.environment||'traditional_street';
  const elements=new Set(scene?.elements||[]);
  if (drawBackdrop(ctx, scene)) {
    // Animated atmosphere sits over original raster scenery; it remains quiet
    // enough for the katana silhouettes and anticipation poses to read clearly.
    const rain=env==='modern_city', leaves=elements.has('trees');
    const amount=rain?46:leaves?26:14;
    for(let i=0;i<amount;i++) {
      const x=(hash(i+771)*960+time*(rain?-15:leaves?11:4)+Math.sin(time*.55+i)*10+960)%960;
      const y=(hash(i+877)*440+time*(rain?185:leaves?16:3))%440;
      ctx.globalAlpha=rain?.16:leaves?.55:.20;
      rect(ctx,x,y,rain?2:leaves?4:2,rain?14:2,rain?'#b5c2e2':leaves?(i%3?'#bd5b6d':'#e7ad78'):c.light);
      if(leaves&&i%3===0)rect(ctx,x+2,y-2,2,2,'#e6aa81');
    }
    // Choices add atmosphere and embellishments to the environment's subject.
    if(elements.has('lanterns')&&env!=='traditional_street')paintLanterns(ctx,c,time,false);
    if(elements.has('neon_signs')&&env!=='modern_city')paintNeon(ctx,c,time);
    ctx.restore(); return;
  }
  paintSky(ctx,c,time);
  // Small low horizon even when the user removes the large landscape elements.
  rect(ctx,0,332,960,40,c.distant); rect(ctx,0,352,960,24,c.middle);
  if(elements.has('mountains')) paintMountains(ctx,c,env);
  if(elements.has('skyscrapers')) paintCity(ctx,c);
  if(elements.has('trees')) paintTrees(ctx,c,env);
  if(elements.has('wooden_buildings')) paintBuildings(ctx,c,env);
  if(elements.has('rocks')) paintRocks(ctx,c,env);
  if(elements.has('water')) paintWater(ctx,c,time);
  if(elements.has('neon_signs')) paintNeon(ctx,c,time);
  if(elements.has('lanterns')) paintLanterns(ctx,c,time,elements.has('wooden_buildings'));
  paintStage(ctx,c,env,elements);
  // Ambient dust, falling leaves, snow-like fireflies: low contrast and slow.
  const leaves=elements.has('trees'), amount=c.night?14:9;
  ctx.globalAlpha=c.night?.45:.22;
  for(let i=0;i<amount;i++) {
    const x=(hash(i+771)*960+time*(leaves?5:2)+Math.sin(time*.6+i)*6+960)%960;
    const y=140+(hash(i+877)*248+time*(leaves?8:2))%248;
    rect(ctx,x,y,leaves&&i%3===0?8:4,4,c.light);
  }
  ctx.restore();
}

const COSTUMES = {
  kendo: {cloth:'#d9d5bd',shade:'#969787',deep:'#333e49',belt:'#243745',trim:'#fff0c9',skin:'#d8a67c',hair:'#202736'},
  suit: {cloth:'#303747',shade:'#1b2636',deep:'#131d2d',belt:'#0e1724',trim:'#e2e4dc',skin:'#d8a67c',hair:'#202430'},
  cowboy: {cloth:'#a3784c',shade:'#70503c',deep:'#3b3233',belt:'#4b3430',trim:'#dab985',skin:'#d8a67c',hair:'#302c2c'},
  traveler: {cloth:'#608b88',shade:'#3b6668',deep:'#283e4d',belt:'#33464b',trim:'#b9d2b5',skin:'#d8a67c',hair:'#282b35'},
};
function fighterShadow(ctx, x, dead) {
  ctx.save(); ctx.globalAlpha=.36;
  rect(ctx,x-(dead?48:28),WORLD.ground-4,dead?96:56,8,'#080d18');
  rect(ctx,x-(dead?40:20),WORLD.ground+4,dead?80:40,4,'#080d18');
  ctx.restore();
}
function movementAccent(ctx, fighter, time) {
  const state = fighter.state, facing = fighter.facing === -1 ? -1 : 1;
  const progress = clamp((fighter.timer || 0) / (fighter.stateDuration || 1));
  ctx.save();
  if (state === 'charge') {
    const charge = clamp(fighter.charge || 0);
    for (let i = 0; i < 6; i++) {
      const phase = (time * (2 + charge * 3) + i * .19) % 1;
      ctx.globalAlpha = (1 - phase) * (.18 + charge * .32);
      rect(ctx, fighter.x + facing * (hash(i + 711) * 42 - 21), WORLD.ground - phase * 24, 2, 2, '#cdd8bd');
    }
    if (charge > .94) {
      ctx.globalAlpha = .6 + Math.sin(time * 11) * .2;
      rect(ctx, fighter.x + facing * 12, WORLD.ground - 108, 2, 8, '#eaf7df');
      rect(ctx, fighter.x + facing * 8, WORLD.ground - 105, 10, 2, '#eaf7df');
    }
  }
  if (fighter.dead && progress < .36 && fighter.timer > .06) {
    // Blood keeps dripping from the wound while the fighter staggers.
    const level = { high: 104, mid: 89, low: 29 }[fighter.hitDirection || fighter.hitLevel || 'mid'];
    for (let i = 0; i < 6; i++) {
      const start = .06 + i * .045, age = fighter.timer - start;
      if (age < 0 || age > .32) continue;
      ctx.globalAlpha = .9;
      rect(ctx, fighter.x - facing * 6 + Math.round((hash(i + 97) - .5) * 14), WORLD.ground - level + 8 + 400 * age * age, 2, i % 2 ? 4 : 2, i % 3 ? '#b4262b' : '#e04a46');
    }
  }
  if (fighter.counterReady && !fighter.dead) {
    ctx.globalAlpha = .5 + Math.sin(time * 14) * .18;
    rect(ctx, fighter.x - facing * 4, WORLD.ground - 151, 4, 4, '#b6e5d2');
    rect(ctx, fighter.x + facing * 2, WORLD.ground - 151, 2, 4, '#f0e8c7');
  }
  if ((state === 'walk' || state === 'dodge' || state === 'duck' || state === 'active') && !fighter.dead) {
    const travelling = state === 'walk' ? (time * 5) % 1 : progress;
    for (let i = 0; i < 4; i++) {
      const age = clamp(travelling + i * .08), distance = age * (state === 'dodge' ? 32 : 18);
      ctx.globalAlpha = (1 - age) * .30;
      rect(ctx, fighter.x - facing * (10 + distance + i * 3), WORLD.ground - Math.sin(age * Math.PI) * (4 + i * 2), i % 2 ? 2 : 4, 2, '#a59e86');
    }
  }
  ctx.restore();
}
function drawSword(ctx, grip, tip, state) {
  const dx=tip[0]-grip[0],dy=tip[1]-grip[1],length=Math.hypot(dx,dy)||1,ux=dx/length,uy=dy/length;
  const start=[grip[0]+ux*12,grip[1]+uy*12];
  pixelLine(ctx,grip[0]-ux*8,grip[1]-uy*8,start[0],start[1],'#594640',8);
  pixelLine(ctx,grip[0],grip[1],start[0],start[1],'#bfa17a',4);
  const guard=[grip[0]+ux*10,grip[1]+uy*10];
  pixelLine(ctx,guard[0]-uy*8,guard[1]+ux*8,guard[0]+uy*8,guard[1]-ux*8,'#d9b779',4);
  pixelLine(ctx,start[0],start[1],tip[0],tip[1],'#7c969f',8);
  pixelLine(ctx,start[0]-uy*2,start[1]+ux*2,tip[0]-uy*2,tip[1]+ux*2,'#eef3df',4);
  if(state==='active') pixelLine(ctx,tip[0]-ux*24,tip[1]-uy*24,tip[0],tip[1],'#fffce6',4);
}
function head(ctx, style, c, isPlayer) {
  const tag=isPlayer?'#8ac7bc':'#ee997c';
  rect(ctx,-12,-112,24,24,c.hair);
  rect(ctx,-8,-104,20,20,c.skin);
  rect(ctx,8,-100,8,12,c.skin);
  rect(ctx,-8,-84,16,8,blend(c.skin,'#66463b',.25));
  rect(ctx,4,-100,8,4,'#252c37'); rect(ctx,8,-88,4,4,blend(c.skin,'#f0d1a5',.4));
  rect(ctx,-12,-112,24,8,c.hair);
  rect(ctx,-12,-108,8,20,c.hair);
  if(style==='kendo') {
    rect(ctx,-8,-116,16,8,c.hair); rect(ctx,-20,-108,8,16,c.hair);
    rect(ctx,-28,-108,12,8,c.hair); rect(ctx,-32,-104,8,16,c.hair);
    rect(ctx,-12,-104,24,4,tag); rect(ctx,-28,-104,16,4,tag);
  } else if(style==='cowboy') {
    rect(ctx,-12,-124,24,12,'#9e784e'); rect(ctx,-16,-116,32,12,'#b18c5e');
    rect(ctx,-24,-108,52,8,'#c5a170'); rect(ctx,-12,-112,28,4,'#624735');
    rect(ctx,-8,-124,16,4,'#d2b17d');
  } else if(style==='traveler') {
    rect(ctx,-16,-116,28,12,c.cloth); rect(ctx,8,-108,16,4,c.shade);
    rect(ctx,-8,-116,12,4,c.trim);
  } else {
    rect(ctx,-12,-116,24,8,c.hair); rect(ctx,8,-112,8,8,c.hair);
    rect(ctx,-8,-108,12,4,blend(c.hair,'#8a8b84',.22));
  }
}

export function drawFighter(ctx, fighter, style = 'kendo', isPlayer = true, time = 0, options = {}) {
  if(!fighter) return;
  fighterShadow(ctx, Number(fighter.x) || 0, fighter.dead);
  if (fighter.state === 'dodge' || fighter.state === 'duck') {
    const facing = fighter.facing === -1 ? -1 : 1;
    const progress = clamp((fighter.timer || 0) / (fighter.stateDuration || 1));
    ctx.save(); ctx.globalAlpha = Math.sin(progress * Math.PI) * .15;
    drawSprite(ctx, { ...fighter, x: fighter.x + facing * (fighter.state === 'dodge' ? 14 : -10) }, style, isPlayer, time, { ...options, wet: false });
    ctx.restore();
  }
  if(drawSprite(ctx,fighter,style,isPlayer,time,options)) { movementAccent(ctx, fighter, time); return; }
  const x=Number(fighter.x)||0, facing=fighter.facing===-1?-1:1;
  const state=fighter.dead?'dead':fighter.state||'idle';
  const c={...(COSTUMES[style]||COSTUMES.kendo)};
  if(options.palette){c.hair=options.palette.hair;c.skin=options.palette.skin;c.cloth=options.palette.outfit;c.trim=options.palette.accent;}
  if(!isPlayer) { c.cloth=blend(c.cloth,'#c36d62',.24); c.trim=blend(c.trim,'#eab09a',.16); }
  const tag=isPlayer?'#8ac7bc':'#ee997c';
  const progress=clamp((fighter.timer||0)/(fighter.stateDuration||1));
  ctx.save(); ctx.imageSmoothingEnabled=false; ctx.translate(snap(x),WORLD.ground); ctx.scale(facing,1);
  if(state==='dead') {
    rect(ctx,-40,-16,56,16,c.deep); rect(ctx,-16,-24,44,16,c.cloth);
    rect(ctx,28,-20,20,16,c.skin); rect(ctx,40,-20,12,8,c.hair);
    rect(ctx,-44,-8,16,8,c.belt); rect(ctx,12,-20,4,16,tag);
    drawSword(ctx,[12,-8],[100,-4],'dead'); ctx.restore(); return;
  }
  const walking=state==='walk'||state==='move';
  const step=walking?Math.sin(time*13):0;
  const bob=walking?Math.abs(step)*4:Math.sin(time*2.7)*2;
  const lunge=state==='active'?8:state==='windup'?-4:0;
  const lean=state==='stunned'?-4:0;
  ctx.translate(lunge+lean,-snap(bob));
  // The silhouette is outlined by dark rear limbs and grounded tabi boots.
  const frontFoot=walking?snap(step*12):12,backFoot=walking?snap(-step*12):-12;
  pixelLine(ctx,-8,-40,backFoot,-8,c.deep,12);
  pixelLine(ctx,4,-40,frontFoot,-8,c.shade,12);
  rect(ctx,backFoot-8,-8,24,8,c.belt); rect(ctx,frontFoot-8,-8,24,8,c.belt);
  rect(ctx,frontFoot+4,-12,8,4,c.trim);
  // Belt and fabric block shapes make all four outfit choices distinct.
  if(style==='kendo') {
    shape(ctx,[[-16,-52],[16,-52],[24,-20],[12,-16],[0,-20],[-12,-16],[-24,-20]],c.deep);
    rect(ctx,-12,-48,4,28,c.shade); rect(ctx,0,-48,4,32,c.shade); rect(ctx,12,-44,4,24,c.shade);
  } else if(style==='cowboy') {
    rect(ctx,-16,-48,32,12,c.belt); rect(ctx,-4,-48,8,8,'#d6b779');
    rect(ctx,-16,-44,8,20,c.cloth); rect(ctx,12,-44,8,20,c.cloth);
  } else if(style==='traveler') {
    rect(ctx,-16,-56,32,16,c.shade); rect(ctx,-16,-40,12,8,c.deep);
    rect(ctx,-24,-76,12,36,'#344f58'); rect(ctx,-28,-72,8,24,'#657e71');
  } else {
    rect(ctx,-16,-48,32,12,c.deep); rect(ctx,-12,-40,8,16,c.cloth); rect(ctx,8,-40,8,16,c.cloth);
  }
  // Rear arm first; the lead arm and blade remain legible in every pose.
  pixelLine(ctx,-12,-76,-20,-52,c.shade,12); rect(ctx,-20,-52,8,8,c.skin);
  shape(ctx,[[-12,-84],[12,-84],[20,-72],[16,-48],[-16,-48],[-20,-72]],c.cloth);
  rect(ctx,-16,-76,8,24,c.shade); rect(ctx,-12,-52,28,8,c.belt);
  rect(ctx,4,-80,8,28,c.trim);
  if(style==='suit') {
    shape(ctx,[[-8,-84],[0,-76],[8,-84],[4,-60],[-4,-60]],'#ece8db');
    rect(ctx,0,-76,4,20,tag);
    pixelLine(ctx,-8,-80,-4,-64,c.deep,4); pixelLine(ctx,12,-80,8,-64,c.deep,4);
  } else if(style==='kendo') {
    pixelLine(ctx,-4,-84,8,-56,c.shade,4); pixelLine(ctx,8,-84,-4,-64,c.trim,4);
  } else if(style==='cowboy') {
    rect(ctx,-12,-80,8,28,c.shade); rect(ctx,8,-80,8,28,c.shade);
    rect(ctx,-4,-84,12,8,tag); shape(ctx,[[0,-76],[8,-76],[4,-60]],tag);
  } else {
    rect(ctx,-12,-84,28,8,tag); rect(ctx,-20,-80,12,20,tag);
    pixelLine(ctx,-16,-76,-28,-72,tag,4);
  }
  head(ctx,style,c,isPlayer);
  const poses={
    idle:[[12,-64],[64,-116]], walk:[[12,-64],[60,-108]], move:[[12,-64],[60,-108]],
    windup:[[8,-68],[-28,-144]], active:[[24,-60],[116,-82+progress*62]],
    recovery:[[16,-60],[100,-32]], parry:[[12,-64],[36,-132]],
    stunned:[[12,-52],[88,-24]], attackwindup:[[8,-68],[-28,-144]],
    attackactive:[[24,-60],[116,-82+progress*62]], attackrecovery:[[16,-60],[100,-32]],
  };
  const [grip,tip]=poses[state]||poses.idle;
  pixelLine(ctx,12,-76,grip[0]-8,grip[1],c.shade,12);
  pixelLine(ctx,12,-76,grip[0]-8,grip[1]-4,c.cloth,8);
  rect(ctx,grip[0]-4,grip[1]-4,8,8,c.skin);
  drawSword(ctx,grip,tip,state);
  if(state==='parry') {
    ctx.globalAlpha=.13;
    pixelLine(ctx,42,-122,52,-92,tag,8); pixelLine(ctx,52,-92,44,-52,tag,8);
    ctx.globalAlpha=1;
    rect(ctx,36,-112,4,12,'#e4eddb');
  }
  if(state==='windup') {
    ctx.globalAlpha=.7;
    rect(ctx,20,-108,8,4,'#f0b07d'); rect(ctx,24,-112,4,12,'#f0b07d');
    ctx.globalAlpha=1;
  }
  if(state==='stunned') {
    ctx.globalAlpha=.8; rect(ctx,-20,-132,8,4,'#f6d890'); rect(ctx,8,-140,8,4,'#f6d890'); ctx.globalAlpha=1;
  }
  ctx.restore();
}

const crescentBuffer = typeof document !== 'undefined' ? document.createElement('canvas') : null;
/** A broad arc that sweeps with the blade and lingers as it fades, drawn on the two-pixel grid. */
function drawCrescent(ctx, x, y, facing, direction, phase, fade, charged, counter) {
  if (!crescentBuffer) return;
  const size = 240; // half-resolution buffer: 480 world pixels
  if (crescentBuffer.width !== size) { crescentBuffer.width = size; crescentBuffer.height = size; }
  const b = crescentBuffer.getContext('2d');
  b.clearRect(0, 0, size, size);
  // Radii in half-resolution pixels: a broad, nearly solid arc as tall as the fighter, like the reference cut.
  const outer = charged ? 100 : 90, inner = outer - (charged ? 44 : 36);
  const arcs = { high: [-2.35, .85], mid: [-1.45, 1.45], low: [2.35, -.85] };
  let [from, to] = arcs[direction] || arcs.mid;
  if (counter) [from, to] = [to, from];
  const sweep = Math.min(1, phase / .55), lead = from + (to - from) * sweep, trail = from + (to - from) * Math.max(0, sweep - .62);
  const cx = size / 2 - 40, cy = size / 2;
  b.save(); b.translate(cx, cy); if (direction === 'mid') b.scale(1, .66);
  const band = (r0, r1, alpha, color) => {
    b.globalAlpha = alpha; b.fillStyle = color; b.beginPath();
    b.arc(0, 0, r1, Math.min(trail, lead), Math.max(trail, lead), to < from); b.arc(0, 0, r0, Math.max(trail, lead), Math.min(trail, lead), !(to < from)); b.closePath(); b.fill();
  };
  const linger = Math.pow(fade, .6);
  band(inner, outer, .42 * linger, '#d9e2dc');
  band(inner + 7, outer - 5, .72 * linger, '#f1f2e6');
  band(inner + 15, outer - 11, .96 * linger, '#fffdf3');
  // Speed lines trail the leading edge.
  b.globalAlpha = .55 * linger; b.strokeStyle = '#fffbee'; b.lineWidth = 2;
  for (let i = 1; i <= 3; i++) { const a = lead - (to > from ? 1 : -1) * i * .12, r = inner - 6 - i * 5; b.beginPath(); b.moveTo(Math.cos(a) * (r - 10), Math.sin(a) * (r - 10)); b.lineTo(Math.cos(a) * r, Math.sin(a) * r); b.stroke(); }
  b.restore();
  ctx.save(); ctx.imageSmoothingEnabled = false;
  ctx.translate(snap(x - facing * 70), snap(y)); ctx.scale(facing, 1);
  ctx.drawImage(crescentBuffer, -cx * 2, -cy * 2, size * 2, size * 2);
  ctx.restore();
}
/** Dark flakes thrown from a clash, falling under gravity. */
function drawDebris(ctx, x, y, age, duration, seed) {
  for (let i = 0; i < 10; i++) {
    const h = hash(seed * 31 + i), v = hash(seed * 17 + i * 7);
    const vx = (h - .5) * 260, vy = -90 - v * 150, life = .25 + h * .3;
    if (age > life) continue;
    ctx.globalAlpha = 1 - age / life;
    rect(ctx, snap(x + vx * age), snap(y + vy * age + 430 * age * age), i % 3 ? 2 : 4, 2, i % 2 ? '#1a1d22' : '#3a3f44');
  }
}
export function drawEffects(ctx, effects = [], time = 0) {
  ctx.save(); ctx.imageSmoothingEnabled=false;
  for(const e of effects) {
    const fade=1-clamp((e.age||0)/(e.duration||.3));
    if(fade<=0) continue;
    const x=Number(e.x)||0,y=Number(e.y)||365,facing=e.facing===-1?-1:1;
    ctx.globalAlpha=fade;
    if(e.type==='slash') {
      const direction = e.direction || 'mid', charged = e.attackKind === 'charged', counter = e.attackKind === 'counter';
      drawCrescent(ctx, x, y, facing, direction, clamp((e.age || 0) / (e.duration || .23)), fade, charged, counter);
      continue;
    } else if (e.type === 'slash-lines') {
      const direction = e.direction || 'mid', charged = e.attackKind === 'charged', counter = e.attackKind === 'counter';
      const paths = {
        high: [[10,-84],[44,-78],[82,-54],[108,-24],[118,12],[108,46]],
        mid: [[4,-24],[34,-24],[64,-18],[94,-10],[122,0],[128,12]],
        low: [[6,22],[36,18],[66,-2],[90,-26],[108,-52],[114,-82]],
      };
      const path = [...(paths[direction] || paths.mid)];
      if (counter) path.reverse();
      const phase = clamp((e.age || 0) / (e.duration || .18)), lead = Math.min(path.length - 1, Math.floor(phase * path.length));
      ctx.save();ctx.translate(snap(x - facing * 62),snap(y));ctx.scale(facing * (charged ? 1.16 : 1),1);
      const start = Math.max(0, lead - 3);
      for (let i = start; i <= lead; i++) {
        const point = path[i], previous = path[Math.max(0, i - 1)];
        ctx.globalAlpha = fade * (i === lead ? .8 : .18 + (i - start) * .10);
        pixelLine(ctx,previous[0],previous[1],point[0],point[1],i === lead ? '#fff6dc' : '#d3ddd1',charged ? 6 : 4);
        ctx.globalAlpha = fade * .10;
        shape(ctx,[[26,0],[previous[0],previous[1]],[point[0],point[1]]],counter ? '#b3decc' : '#e8e3c9');
      }
      const tip = path[lead]; ctx.globalAlpha = fade * .9;
      rect(ctx,tip[0]-2,tip[1]-2,4,4,'#fff8e9');
      if (charged) { ctx.globalAlpha = fade * .22; pixelLine(ctx,24,4,tip[0],tip[1],'#f4d89c',2); }
      ctx.restore();
    } else if(e.type==='parry'||e.type==='clash') {
      const col=e.type==='parry'?'#a7e9d0':'#ffe0a1';
      drawDebris(ctx, x, y, e.age || 0, e.duration || .42, e.id || 0);
      rect(ctx,x-4,y-16,8,32,'#fff6d6');rect(ctx,x-16,y-4,32,8,'#fff6d6');
      for(let i=0;i<12;i++) {
        const angle=i*Math.PI/6, dist=8+(1-fade)*46;
        const xx=x+Math.cos(angle)*dist,yy=y+Math.sin(angle)*dist;
        pixelLine(ctx,xx,yy,xx+Math.cos(angle)*12,yy+Math.sin(angle)*12,col,4);
      }
      ctx.globalAlpha=fade*.1;disk(ctx,x,y,28+(1-fade)*24,col);
    } else if(e.type==='hit') {
      for (let i = 0; i < 16; i++) {
        const h = hash((e.id || 0) * 13 + i), v = hash((e.id || 0) * 29 + i * 5);
        const vx = facing * (30 + h * 120) + (v - .5) * 40, vy = -(50 + v * 150), life = .35 + h * .35, age = e.age || 0;
        if (age > life) continue;
        ctx.globalAlpha = (1 - age / life) * .95;
        rect(ctx, snap(x + vx * age), snap(y + vy * age + 460 * age * age), i % 3 ? 2 : 4, i % 4 ? 2 : 4, i % 2 ? '#b4262b' : '#e04a46');
      }
      ctx.globalAlpha = fade;
      if ((e.age || 0) < .055) {
        ctx.globalAlpha = .055 * fade; rect(ctx,0,0,WORLD.width,WORLD.height,'#fff1cf');
        ctx.globalAlpha = fade; rect(ctx,x-4,y-14,8,28,'#fff8e0'); rect(ctx,x-14,y-4,28,8,'#fff8e0');
      }
      for(let i=0;i<14;i++) {
        const angle=i*2.4,dist=12+(1-fade)*46;
        const xx=x+Math.cos(angle)*dist*facing, yy=y+Math.sin(angle)*dist+(1-fade)*(1-fade)*24;
        ctx.globalAlpha = fade * (i % 3 ? .85 : .55);
        rect(ctx,xx,yy,i%2?2:4,2,i%3?'#aa383e':'#6d202e');
        if (i < 6) pixelLine(ctx,xx,yy,xx-Math.cos(angle)*6*facing,yy-Math.sin(angle)*6,'#bb4a48',2);
      }
    } else if(e.type==='evade') {
      for (let i=0;i<7;i++) {
        const distance=(1-fade)*38+i*5;
        ctx.globalAlpha=fade*.3;
        rect(ctx,x-facing*distance,y+(1-fade)*8-hash(i+80)*12,i%2?4:2,2,'#b7bba5');
      }
    } else if(e.type==='shove') {
      ctx.globalAlpha=fade*.55;
      pixelLine(ctx,x-facing*14,y-14,x+facing*14,y-10,'#b9d7c4',2);
      pixelLine(ctx,x-facing*14,y+14,x+facing*14,y+10,'#b9d7c4',2);
      for(let i=0;i<4;i++)rect(ctx,x+facing*(8+(1-fade)*28),y-12+i*8,4,2,'#e9edd3');
    }
  }
  ctx.restore();
}

/** Persistent, seeded pixel splashes on wall and ground, cleared on retry. */
export function drawBloodDecals(ctx,decals=[]){
 ctx.save();ctx.globalAlpha=.78;
 for(const decal of decals){
  const seed=Number(decal.seed)||1;
  const origin=decal.x+(decal.flick?decal.facing*64:0);
  for(let index=0;index<(decal.flick?15:28);index++){
   const random=hash(seed*17+index*13),spread=hash(seed+index*31);
   const x=origin+decal.facing*(random*95-22),y=decal.y+(spread-.6)*(decal.flick?60:100);
   rect(ctx,x,y,index%4===0?6:3,index%3===0?4:2,index%3?'#762632':'#a33c41');
   if(index%6===0)rect(ctx,x,y+3,2,12+spread*14,'#702332');
  }
  if(!decal.flick)for(let index=0;index<10;index++)rect(ctx,origin+(hash(seed+index)-.5)*100,WORLD.ground+2+hash(index+seed*9)*15,8+hash(seed+index*3)*13,2,'#782832');
 }
 ctx.restore();
}

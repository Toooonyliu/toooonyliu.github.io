import { WORLD } from './shared.js';

const backgrounds = new Map();
const variants = new Map();
let spriteAtlas = null;
let spriteFrames = [];
const motionFrames = new Map();
let contactFrames = new Map();
let loading;
const files = {
  'east-asia': 'zone-east-asia-v1.png',
  'africa': 'zone-africa-v1.png',
  'north-america': 'zone-north-america-v1.png',
  forest: 'forest-v2.png',
  traditional_street: 'street-v2.png',
  modern_city: 'city-v2.png',
  wilderness: 'wilderness-v2.png',
};
const rows = { kendo: 0, suit: 1, cowboy: 2, traveler: 3 };
const attackMotions = ['high', 'mid', 'low', 'counter'];
const defenseMotions = ['dodge', 'duck', 'charge', 'hit-high', 'hit-mid', 'hit-low'];
const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, value));

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const timeout = setTimeout(() => { image.onload = image.onerror = null; reject(new Error(`Art loading timed out: ${file}`)); }, 15000);
    image.onload = () => { clearTimeout(timeout); resolve(image); };
    image.onerror = () => { clearTimeout(timeout); reject(new Error(`Art unavailable: ${file}`)); };
    image.src = new URL(`../assets/art/${file.replace(/\.png$/,'.webp')}`, import.meta.url).href;
  });
}

function canvas(width, height) {
  const output = document.createElement('canvas');
  output.width = width;
  output.height = height;
  return output;
}

// Extract connected silhouettes instead of cutting a guessed grid: raised
// swords cross cell boundaries. Ignore faint background halos, retain the
// complete connected blade, and anchor all actions to the same standing pivot.
function prepareFrames(image) {
  if (image.naturalWidth !== 1536 || image.naturalHeight !== 1024) throw new Error('Unexpected fighter atlas dimensions');
  const sheet = canvas(image.naturalWidth, image.naturalHeight);
  const ctx = sheet.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, 0, 0);
  const width = sheet.width, height = sheet.height;
  const pixels = ctx.getImageData(0, 0, width, height).data;
  const seen = new Uint8Array(width * height), queue = new Int32Array(width * height);
  const frames = Array.from({ length: 4 }, () => Array(6));
  for (let start = 0; start < seen.length; start++) {
    if (seen[start] || pixels[start * 4 + 3] < 16) continue;
    let count = 1, head = 0, left = width, right = 0, top = height, bottom = 0;
    queue[0] = start; seen[start] = 1;
    while (head < count) {
      const index = queue[head++], x = index % width, y = Math.floor(index / width);
      left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if ((!dx && !dy) || x + dx < 0 || x + dx >= width || y + dy < 0 || y + dy >= height) continue;
        const neighbor = index + dy * width + dx;
        if (!seen[neighbor] && pixels[neighbor * 4 + 3] >= 16) { seen[neighbor] = 1; queue[count++] = neighbor; }
      }
    }
    if (count < 500) continue;
    const row = Math.floor(bottom / 256), column = Math.floor((left + right) / 512);
    if (row > 3 || column > 5 || frames[row][column]) throw new Error('Fighter silhouettes overlap');
    const picture = canvas(right - left + 1, bottom - top + 1), pictureCtx = picture.getContext('2d');
    const data = pictureCtx.createImageData(picture.width, picture.height);
    let footSum = 0, footCount = 0;
    for (let i = 0; i < count; i++) {
      const index = queue[i], x = index % width, y = Math.floor(index / width);
      const target = ((y - top) * picture.width + x - left) * 4;
      data.data.set(pixels.subarray(index * 4, index * 4 + 4), target);
      if (y >= bottom - 5 && pixels[index * 4 + 3] > 140) { footSum += x; footCount++; }
    }
    pictureCtx.putImageData(data, 0, 0);
    frames[row][column] = { picture, left, right, top, bottom, footX: footSum / Math.max(1, footCount) };
  }
  for (const row of frames) {
    if (row.includes(undefined)) throw new Error('Fighter atlas is missing an action');
    const standing = row[0], scale = 137 / (standing.bottom - standing.top);
    const anchor = standing.footX;
    row.forEach((frame, column) => {
      frame.scale = scale;
      frame.pivotX = (column === 5 ? (frame.left + frame.right) / 2 : column * 256 + anchor) - frame.left;
      // Visible active tip agrees with the engine's 18 + 105 pixel reach.
      frame.stretchX = column === 3 ? 116 / ((frame.picture.width - frame.pivotX) * scale) : 1;
      // Use the same two-world-pixel texture grid as the scenery. Preserve
      // authored dimensions and pivot so the visible blade keeps its reach.
      frame.width = frame.picture.width * scale * frame.stretchX;
      frame.height = frame.picture.height * scale;
      frame.anchorX = frame.pivotX * scale * frame.stretchX;
      const raster = canvas(Math.ceil(frame.width / 2), Math.ceil(frame.height / 2));
      const rasterCtx = raster.getContext('2d');
      rasterCtx.imageSmoothingEnabled = false;
      rasterCtx.drawImage(frame.picture, 0, 0, raster.width, raster.height);
      frame.picture = raster;
    });
  }
  return frames;
}

// A sheet is an authored sequence, not a set of transformed idle poses.
// Component masks retain swords that pass outside their nominal cell and
// discard the low-alpha studio glow without baking an opaque matte into play.
function prepareMotionFrames(image, names, settings = {}) {
  const width = image.naturalWidth, height = image.naturalHeight;
  const columnCount = settings.columns || 4;
  const cellWidth = width / columnCount, cellHeight = height / names.length;
  const sheet = canvas(width, height), context = sheet.getContext('2d', { willReadFrequently: true });
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, width, height).data;
  const seen = new Uint8Array(width * height), queue = new Int32Array(width * height);
  const groups = Array.from({ length: names.length }, () => Array.from({ length: columnCount }, () => []));
  for (let start = 0; start < seen.length; start++) {
    if (seen[start] || pixels[start * 4 + 3] < 16) continue;
    let count = 1, head = 0, left = width, right = 0, top = height, bottom = 0, sumX = 0, sumY = 0;
    queue[0] = start; seen[start] = 1;
    while (head < count) {
      const index = queue[head++], x = index % width, y = Math.floor(index / width);
      left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
      sumX += x; sumY += y;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if ((!dx && !dy) || x + dx < 0 || x + dx >= width || y + dy < 0 || y + dy >= height) continue;
        const neighbor = index + dy * width + dx;
        if (!seen[neighbor] && pixels[neighbor * 4 + 3] >= 16) { seen[neighbor] = 1; queue[count++] = neighbor; }
      }
    }
    if (count < 8) continue;
    const row = clamp(Math.floor(sumY / count / cellHeight), 0, names.length - 1);
    const column = clamp(Math.floor(sumX / count / cellWidth), 0, columnCount - 1);
    if (count > cellWidth * cellHeight * .8) throw new Error('Animation sheet has an opaque background');
    groups[row][column].push({ left, right, top, bottom, indices: queue.slice(0, count), count });
  }
  const frames = groups.map(row => row.map(parts => {
    const body = parts.reduce((largest, part) => !largest || part.count > largest.count ? part : largest, null);
    if (!body || body.count < 500) throw new Error('Animation sheet is missing a fighter frame');
    // Detached blade glints and fabric pixels belong to the same grid slot.
    const included = parts.filter(part => part.count >= 8);
    const left = Math.min(...included.map(part => part.left)), right = Math.max(...included.map(part => part.right));
    const top = Math.min(...included.map(part => part.top)), bottom = Math.max(...included.map(part => part.bottom));
    const picture = canvas(right - left + 1, bottom - top + 1), ctx = picture.getContext('2d');
    const data = ctx.createImageData(picture.width, picture.height);
    let footSum = 0, footCount = 0;
    for (const part of included) for (const index of part.indices) {
      const x = index % width, y = Math.floor(index / width);
      const target = ((y - top) * picture.width + x - left) * 4;
      data.data.set(pixels.subarray(index * 4, index * 4 + 4), target);
      if (y >= bottom - 4 && pixels[index * 4 + 3] > 140) { footSum += x; footCount++; }
    }
    ctx.putImageData(data, 0, 0);
    return { picture, left, right, top, bottom, footX: footSum / Math.max(1, footCount) };
  }));
  // Mid guard / first charging pose give a head-to-feet measure without an
  // overhead sword. One source scale and pivot are shared by the entire sheet.
  const referenceRow = names.includes('mid') ? names.indexOf('mid') : names.indexOf('charge');
  const reference = frames[Math.max(0, referenceRow)][0];
  const scale = settings.scale || 137 / (reference.bottom - reference.top + 1);
  const anchor = reference.footX;
  const contact = names.includes('mid') ? frames[names.indexOf('mid')][2] : null;
  const contactPivot = contact ? 2 * cellWidth + anchor - contact.left : 0;
  const stretch = contact ? clamp(117 / ((contact.picture.width - contactPivot) * scale), .6, 1.25) : 1;
  const result = new Map();
  frames.forEach((sequence, row) => {
    sequence.forEach((frame, column) => {
      const rowAnchor = settings.anchorPerRow ? sequence[0].footX : anchor;
      const pivot = column * cellWidth + rowAnchor - frame.left;
      const frameStretch = settings.reach ? settings.reach / ((frame.picture.width - pivot) * scale) : stretch;
      frame.scale = scale;
      frame.width = frame.picture.width * scale * frameStretch;
      frame.height = frame.picture.height * scale;
      frame.anchorX = pivot * scale * frameStretch;
      const raster = canvas(Math.ceil(frame.width / 2), Math.ceil(frame.height / 2));
      const rasterCtx = raster.getContext('2d');
      rasterCtx.imageSmoothingEnabled = false;
      rasterCtx.drawImage(frame.picture, 0, 0, raster.width, raster.height);
      frame.picture = raster;
    });
    result.set(names[row], sequence);
  });
  return result;
}

function fitContact(frame, reach) {
  const ratio = reach / (frame.width - frame.anchorX);
  const fitted = { ...frame, width: frame.width * ratio, anchorX: frame.anchorX * ratio };
  const raster = canvas(Math.ceil(fitted.width / 2), Math.ceil(fitted.height / 2));
  const context = raster.getContext('2d'); context.imageSmoothingEnabled = false;
  context.drawImage(frame.picture, 0, 0, raster.width, raster.height);
  fitted.picture = raster;
  return fitted;
}

export function preloadArt() {
  loading ||= Promise.all([
    ...Object.entries(files).map(async ([environment, file]) => backgrounds.set(environment, await loadImage(file))),
    loadImage('fighters-v2.png').then(image => { spriteFrames = prepareFrames(image); spriteAtlas = image; }),
    loadImage('fighters-v3-contact.png').then(image => {
      contactFrames = prepareMotionFrames(image, Object.keys(rows), { columns: 2, scale: 137 / (image.naturalHeight / 4 * .72), anchorPerRow: true, reach: 106 });
    }),
    ...Object.keys(rows).map(async style => {
      const [attacks, defense] = await Promise.all([
        loadImage(`fighters-v3-${style}-attacks.png`).then(image => prepareMotionFrames(image, attackMotions)),
        loadImage(`fighters-v3-${style}-defense.png`).then(image => prepareMotionFrames(image, defenseMotions)),
      ]);
      const actions = new Map([...attacks, ...defense]);
      actions.set('contact-low', [fitContact(defense.get('duck')[2], 106)]);
      motionFrames.set(style, actions);
    }),
  ]).catch(error => { loading = null; throw error; });
  return loading;
}

function backgroundVariant(scene) {
  const image = backgrounds.get(scene.stageId)||backgrounds.get(scene.environment);
  if (!image) return null;
  const key = JSON.stringify([scene.stageId,scene.environment, scene.lighting, scene.palette]);
  if (variants.has(key)) return variants.get(key);
  const output = canvas(480, 270), ctx = output.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const zoom = ['east-asia','africa'].includes(scene.stageId)?1.06:scene.stageId?1:scene.environment === 'wilderness' ? 1.067 : 1;
  ctx.drawImage(image, -(480 * zoom - 480) / 2, 0, 480 * zoom, 270 * zoom);
  // Flagship stages keep their authored regional palette.
  if(scene.stageId){variants.set(key,output);return output;}
  // Retain the textured value structure while letting photo colors influence
  // the scene. The bitmap is prepared once, rather than tinted every frame.
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = .22;
  ctx.fillStyle = scene.palette?.sky || '#da8496';
  ctx.fillRect(0, 0, 480, 270);
  ctx.fillStyle = scene.palette?.accent || '#e6b66e';
  ctx.globalAlpha = .12;
  ctx.fillRect(0, 80, 480, 130);
  ctx.globalCompositeOperation = 'source-over';
  if (scene.lighting === 'night' && scene.environment !== 'modern_city') {
    ctx.fillStyle = '#11192c'; ctx.globalAlpha = .53; ctx.fillRect(0, 0, 480, 270);
  } else if (scene.lighting === 'day' && scene.environment === 'modern_city') {
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = '#adc0be'; ctx.globalAlpha = .32; ctx.fillRect(0, 0, 480, 270);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  if (variants.size >= 32) variants.delete(variants.keys().next().value);
  variants.set(key, output);
  return output;
}

export function drawBackdrop(ctx, scene) {
  const image = backgroundVariant(scene);
  if (!image) return false;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, 0, 0, WORLD.width, WORLD.height);
  return true;
}

const avatarFrames=new WeakMap();
function recolorFrame(frame,palette){
 if(!palette)return frame.picture;
 let variants=avatarFrames.get(frame.picture);if(!variants){variants=new Map();avatarFrames.set(frame.picture,variants);}
 const key=JSON.stringify(palette);if(variants.has(key))return variants.get(key);
 const output=canvas(frame.picture.width,frame.picture.height),context=output.getContext('2d',{willReadFrequently:true});
 context.drawImage(frame.picture,0,0);
 const pixels=context.getImageData(0,0,output.width,output.height);
 const colors=Object.fromEntries(Object.entries(palette).map(([name,value])=>[name,[1,3,5].map(index=>parseInt(value.slice(index,index+2),16))]));
 // Color masks follow source pigment rather than screen bands, so limbs and
 // faces remain consistent across the authored animation frames.
 for(let index=0;index<pixels.data.length;index+=4){
  const data=pixels.data;if(data[index+3]<30)continue;
  const r=data[index],g=data[index+1],b=data[index+2],maximum=Math.max(r,g,b),minimum=Math.min(r,g,b);
  if(maximum>170&&maximum-minimum<40)continue; // retain steel highlights
  const pigment=r>g*1.13&&g>b*1.04&&r>80?'skin':maximum<58?'hair':maximum>135?'accent':'outfit';
  const color=colors[pigment];if(!color)continue;
  const shade=.48+maximum/255*.65;
  for(let channel=0;channel<3;channel++)data[index+channel]=Math.min(255,Math.round(color[channel]*shade));
 }
 context.putImageData(pixels,0,0);if(variants.size>=12)variants.delete(variants.keys().next().value);variants.set(key,output);return output;
}
export function drawSprite(ctx, fighter, style, isPlayer, time = 0, options = {}) {
  if (!spriteAtlas) return false;
  const state = fighter.dead ? 'dead' : fighter.state || 'idle';
  const walking = state === 'walk' || state === 'move';
  const columns = { idle: 0, walk: Math.floor(time * 9) % 2, move: Math.floor(time * 9) % 2,
    windup: 2, active: 3, recovery: 3, parry: 4, stunned: 0, dead: 5 };
  const row = rows[style] ?? rows.kendo;
  const authored = motionFrames.get(style) || motionFrames.get('kendo');
  const direction = ['high', 'mid', 'low'].includes(fighter.attackDirection) ? fighter.attackDirection : 'mid';
  const progress = clamp((fighter.timer || 0) / (fighter.stateDuration || 1));
  let sequence = null, index = 0;
  if ((state === 'idle' || state === 'walk' || state === 'move') && ['high', 'low'].includes(fighter.stance)) {
    sequence = authored?.get(fighter.stance); index = 0;
    if (fighter.stance === 'low' && contactFrames.has(style)) { sequence = contactFrames.get(style); index = 1; }
  }
  if (state === 'windup' || state === 'active' || (state === 'recovery' && (!fighter.recoveryKind || fighter.recoveryKind === 'attack'))) {
    sequence = authored?.get(fighter.attackKind === 'counter' ? 'counter' : direction);
    index = state === 'windup' ? (progress < .64 ? 0 : 1) : state === 'active' ? 2 : 3;
    if (state === 'active' && direction === 'high' && (progress < .68 || fighter.attackKind === 'counter')) {
      sequence = contactFrames.get(style) || contactFrames.get('kendo'); index = 0;
    } else if (state === 'active' && direction === 'low' && (progress < .65 || fighter.attackKind === 'counter')) {
      sequence = authored?.get('contact-low'); index = 0;
    }
  } else if (state === 'charge') {
    sequence = authored?.get('charge'); index = Math.min(3, Math.floor(clamp(fighter.charge ?? progress) * 4));
    // A loaded middle cut coils at the hip; a loaded rising cut stays low.
    // Aim changes during the hold therefore change the visible preparation.
    if ((fighter.charge ?? progress) >= .42 && direction !== 'high') { sequence = authored?.get(direction); index = 0; }
  } else if (state === 'dodge' || state === 'duck') {
    sequence = authored?.get(state); index = Math.min(3, Math.floor(progress * 4));
    if (state === 'duck' && fighter.duckHeld && progress >= .35) index = 2;
  } else if (state === 'shove') {
    sequence = authored?.get(fighter.shoveKind === 'pull' ? 'counter' : 'mid'); index = progress < .4 ? 0 : 1;
  } else if (state === 'dead') {
    const hitDirection = fighter.hitDirection || fighter.hitLevel || 'mid';
    sequence = authored?.get(`hit-${hitDirection}`) || authored?.get('hit-mid');
    index = Math.min(3, Math.floor(progress * 4));
  } else if (state === 'stunned') {
    sequence = authored?.get('hit-high'); index = progress < .55 ? 0 : 1;
  } else if (state === 'recovery' && ['dodge', 'duck'].includes(fighter.recoveryKind)) {
    sequence = authored?.get(fighter.recoveryKind); index = 3;
  }
  const guardDirection = fighter.guardDirection || fighter.stance || 'mid';
  let fallback = columns[state] ?? 0;
  if (state === 'idle' || state === 'parry' || state === 'shove' || (state === 'recovery' && fighter.recoveryKind && fighter.recoveryKind !== 'attack')) {
    fallback = guardDirection === 'high' ? 4 : guardDirection === 'low' ? 1 : 0;
  }
  const frame = sequence?.[index] || spriteFrames[row][fallback];
  const facing = fighter.facing === -1 ? -1 : 1;
  const bob = walking ? Math.abs(Math.sin(time * 12)) * 2 : Math.sin(time * 2.2) * .5;
  const chargeStrength = clamp(fighter.charge ?? 1);
  const lean = state === 'active' ? (fighter.attackKind === 'charged' ? 4 + 5 * chargeStrength : 4) : state === 'stunned' ? -4 : state === 'shove' ? progress * 7 : 0;
  const foot = WORLD.ground - (state === 'dead' || sequence ? 0 : Math.round(bob));
  const chargedStretch = fighter.attackKind === 'charged' && state === 'active' ? 1 + .14 * chargeStrength : 1;
  const picture=recolorFrame(frame,options.palette);
  const draw = () => ctx.drawImage(picture,
    -frame.anchorX * chargedStretch, -frame.height + (sequence ? 0 : frame.scale),
    frame.width * chargedStretch, frame.height);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(Math.round(fighter.x + facing * lean), foot);
  // Faint wet-ground reflection places the silhouette inside the scene.
  if(options.wet!==false){ctx.save(); ctx.translate(0, 10); ctx.scale(facing, -.40); ctx.globalAlpha = .17; draw(); ctx.restore();}
  ctx.scale(facing, 1);
  draw();
  ctx.restore();
  return true;
}

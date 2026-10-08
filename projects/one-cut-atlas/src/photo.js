import { ENVIRONMENTS, LIGHTINGS, STYLES, ELEMENTS, validateScene } from './shared.js';

export const MAX_PHOTO_BYTES = 12 * 1024 * 1024;
export const MAX_IMAGE_PIXELS = 40_000_000;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function validatePhotoFile(file) {
  if (!file || typeof file.arrayBuffer !== 'function') throw new Error('请选择一张照片。');
  if (!ALLOWED_TYPES.includes(file.type)) throw new Error('仅支持 JPEG、PNG 或 WebP。请先转换 HEIC 等其他格式。');
  if (!Number.isFinite(file.size) || file.size <= 0) throw new Error('这张照片是空文件。');
  if (file.size > MAX_PHOTO_BYTES) throw new Error('照片不能超过 12 MB。请先缩小后重试。');
}

export function detectImageMime(input) {
  const b = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length >= 8 && [137,80,78,71,13,10,26,10].every((v,i) => b[i] === v)) return 'image/png';
  if (b.length >= 12 && String.fromCharCode(...b.subarray(0,4)) === 'RIFF' && String.fromCharCode(...b.subarray(8,12)) === 'WEBP') return 'image/webp';
  return null;
}

/** Reads dimensions before decoding to reject unexpectedly large image buffers. */
export function readImageDimensions(input, mime = detectImageMime(input)) {
  const b = input instanceof Uint8Array ? input : new Uint8Array(input);
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  if (mime === 'image/png' && b.length >= 24 && String.fromCharCode(...b.subarray(12,16)) === 'IHDR') return { width:v.getUint32(16), height:v.getUint32(20) };
  if (mime === 'image/webp' && b.length >= 25) {
    const kind = String.fromCharCode(...b.subarray(12,16));
    if (kind === 'VP8X' && b.length >= 30) return { width:1 + b[24] + (b[25]<<8) + (b[26]<<16), height:1 + b[27] + (b[28]<<8) + (b[29]<<16) };
    if (kind === 'VP8 ' && b.length >= 30 && b[23] === 0x9d && b[24] === 0x01 && b[25] === 0x2a) return { width:v.getUint16(26,true)&0x3fff, height:v.getUint16(28,true)&0x3fff };
    if (kind === 'VP8L' && b[20] === 0x2f) return { width:1+b[21]+((b[22]&0x3f)<<8), height:1+(b[22]>>6)+(b[23]<<2)+((b[24]&0x0f)<<10) };
  }
  if (mime === 'image/jpeg') {
    for (const { marker, start, end } of jpegSegments(b)) {
      if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker) && end-start >= 5) return { width:v.getUint16(start+3), height:v.getUint16(start+1) };
    }
  }
  return null;
}

function* jpegSegments(b) {
  if (detectImageMime(b) !== 'image/jpeg') return;
  let offset = 2;
  while (offset + 4 <= b.length) {
    if (b[offset++] !== 0xff) return;
    while (offset < b.length && b[offset] === 0xff) offset++;
    const marker = b[offset++];
    if (marker === 0xda || marker === 0xd9 || marker === undefined) return;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > b.length) return;
    const length = (b[offset] << 8) | b[offset+1];
    if (length < 2 || offset + length > b.length) return;
    yield { marker, start:offset+2, end:offset+length };
    offset += length;
  }
}

/** Bounded, read-only JPEG EXIF GPS extraction; malformed or absent metadata is null. */
export function readExifGPS(input) {
  try {
    const b = input instanceof Uint8Array ? input : new Uint8Array(input);
    for (const segment of jpegSegments(b)) {
      const { marker, start, end } = segment;
      if (marker !== 0xe1 || end-start < 14 || String.fromCharCode(...b.subarray(start,start+6)) !== 'Exif\0\0') continue;
      const base = start+6;
      const v = new DataView(b.buffer,b.byteOffset+base,end-base);
      const order = v.getUint16(0);
      if (order !== 0x4949 && order !== 0x4d4d) continue;
      const le = order === 0x4949;
      const has = (p,n) => Number.isSafeInteger(p) && p >= 0 && p+n <= v.byteLength;
      const u16 = p => has(p,2) ? v.getUint16(p,le) : null;
      const u32 = p => has(p,4) ? v.getUint32(p,le) : null;
      if (u16(2) !== 42) continue;
      const entries = p => {
        const count = u16(p);
        if (count === null || count > 256 || !has(p+2,count*12+4)) return [];
        return Array.from({length:count},(_,i) => p+2+i*12);
      };
      const ifd = entries(u32(4));
      const gpsPointer = ifd.find(p => u16(p) === 0x8825 && u16(p+2) === 4 && u32(p+4) === 1);
      if (gpsPointer === undefined) continue;
      const gpsEntries = entries(u32(gpsPointer+8));
      const value = (tag,type,count) => {
        const p = gpsEntries.find(p => u16(p) === tag && u16(p+2) === type && u32(p+4) === count);
        if (p === undefined) return null;
        const size = type === 2 ? count : count*8;
        const pointer = size <= 4 ? p+8 : u32(p+8);
        if (!has(pointer,size)) return null;
        if (type === 2) return String.fromCharCode(v.getUint8(pointer));
        const values = [];
        for (let i=0;i<count;i++) {
          const denominator = u32(pointer+i*8+4);
          if (!denominator) return null;
          values.push(u32(pointer+i*8)/denominator);
        }
        return values;
      };
      const latRef = value(1,2,2), lonRef = value(3,2,2);
      const lat = value(2,5,3), lon = value(4,5,3);
      const valid = (parts,max) => parts && parts.every(Number.isFinite) && parts[0] >= 0 && parts[0] <= max && parts[1] >= 0 && parts[1] < 60 && parts[2] >= 0 && parts[2] < 60 && parts[0]+parts[1]/60+parts[2]/3600 <= max;
      if (!['N','S'].includes(latRef) || !['E','W'].includes(lonRef) || !valid(lat,90) || !valid(lon,180)) continue;
      return { lat:(lat[0]+lat[1]/60+lat[2]/3600)*(latRef === 'S' ? -1 : 1), lon:(lon[0]+lon[1]/60+lon[2]/3600)*(lonRef === 'W' ? -1 : 1) };
    }
  } catch { /* Corrupt metadata is not a reason to reject a decodable photo. */ }
  return null;
}

const hex = rgb => '#'+rgb.map(v => Math.round(Math.max(0,Math.min(255,v))).toString(16).padStart(2,'0')).join('');
/** Local color sampling only. This does not recognize buildings, plants or locations. */
export function extractPalette(pixels,width,height) {
  const top = [0,0,0], bottom = [0,0,0], buckets = new Map();
  let topCount=0, bottomCount=0;
  for (let y=0;y<height;y++) for (let x=0;x<width;x++) {
    const i=(y*width+x)*4;
    if (pixels[i+3] < 128) continue;
    const rgb=[pixels[i],pixels[i+1],pixels[i+2]];
    if (y < Math.max(1,Math.ceil(height*.35))) { rgb.forEach((v,c) => top[c]+=v); topCount++; }
    if (y >= Math.floor(height*.55)) { rgb.forEach((v,c) => bottom[c]+=v); bottomCount++; }
    const key=rgb.map(v=>Math.floor(v/32)).join(',');
    const bucket=buckets.get(key) || { rgb:[0,0,0], count:0, weight:0 };
    rgb.forEach((v,c)=>bucket.rgb[c]+=v); bucket.count++;
    const range=Math.max(...rgb)-Math.min(...rgb);
    bucket.weight+=1+range/64;
    buckets.set(key,bucket);
  }
  const ranked=[...buckets.values()].sort((a,b)=>b.weight-a.weight);
  const accent=ranked.length ? ranked[0].rgb.map(v=>v/ranked[0].count) : [230,182,110];
  return { sky:hex(topCount ? top.map(v=>v/topCount) : [96,67,89]), accent:hex(accent), ambient:hex(bottomCount ? bottom.map(v=>v/bottomCount*.45) : [36,52,66]) };
}

function canvasFor(image,maxEdge) {
  const width=image.width || image.naturalWidth, height=image.height || image.naturalHeight;
  const scale=Math.min(1,maxEdge/Math.max(width,height));
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(width*scale)); canvas.height=Math.max(1,Math.round(height*scale));
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  if (!ctx) throw new Error('浏览器无法处理图片。请换一个浏览器重试。');
  ctx.fillStyle='#ece9df'; ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(image,0,0,canvas.width,canvas.height);
  return {canvas,ctx};
}

async function decode(file) {
  if (typeof createImageBitmap === 'function') {
    try { return await createImageBitmap(file,{imageOrientation:'from-image'}); } catch { /* Older browsers can use Image. */ }
  }
  return new Promise((resolve,reject) => {
    const url=URL.createObjectURL(file), image=new Image();
    const timer=setTimeout(()=>{ image.src=''; URL.revokeObjectURL(url); reject(new Error('图片解码超时，请缩小照片后重试。')); },15000);
    image.onload=()=>{ clearTimeout(timer); URL.revokeObjectURL(url); resolve(image); };
    image.onerror=()=>{ clearTimeout(timer); URL.revokeObjectURL(url); reject(new Error('无法读取这张照片。请使用有效的 JPEG、PNG 或 WebP。')); };
    image.src=url;
  });
}

export async function preparePhoto(file) {
  validatePhotoFile(file);
  const bytes=new Uint8Array(await file.arrayBuffer());
  const mime=detectImageMime(bytes);
  if (mime !== file.type) throw new Error('图片内容与文件格式不一致，请重新导出照片。');
  const dimensions=readImageDimensions(bytes,mime);
  if (dimensions && (dimensions.width < 1 || dimensions.height < 1 || dimensions.width*dimensions.height > MAX_IMAGE_PIXELS)) throw new Error('图片分辨率过大（最多 4000 万像素），请缩小后重试。');
  const gps=mime === 'image/jpeg' ? readExifGPS(bytes) : null;
  const image=await decode(file);
  try {
    const width=image.width || image.naturalWidth, height=image.height || image.naturalHeight;
    if (!width || !height || width*height > MAX_IMAGE_PIXELS) throw new Error('图片分辨率不受支持，请缩小照片后重试。');
    const main=canvasFor(image,960), thumb=canvasFor(main.canvas,360), sample=canvasFor(main.canvas,64);
    const palette=extractPalette(sample.ctx.getImageData(0,0,sample.canvas.width,sample.canvas.height).data,sample.canvas.width,sample.canvas.height);
    return { dataUrl:main.canvas.toDataURL('image/jpeg',.84), thumbnail:thumb.canvas.toDataURL('image/jpeg',.76), palette, gps };
  } finally { if (typeof image.close === 'function') image.close(); }
}

function isScene(value) {
  return value && ENVIRONMENTS.includes(value.environment) && LIGHTINGS.includes(value.lighting) && STYLES.includes(value.opponentStyle) && Array.isArray(value.elements) && value.elements.length >= 1 && value.elements.length <= 4 && value.elements.every(x=>ELEMENTS.includes(x)) && ['sky','accent','ambient'].every(x=>/^#[0-9a-f]{6}$/i.test(value.palette?.[x] || '')) && typeof value.summary === 'string' && value.summary.length <= 240;
}

export async function requestScene(dataUrl) {
  if (typeof dataUrl !== 'string' || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(dataUrl) || dataUrl.length > 2_800_000) throw new Error('图片数据不受支持。请重新选择照片。');
  const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),28000);
  try {
    const response=await fetch('/api/analyze',{ method:'POST', credentials:'same-origin', headers:{'Content-Type':'application/json'}, body:JSON.stringify({image:dataUrl}), signal:controller.signal });
    let body;
    try { body=await response.json(); } catch { throw new Error('AI 接口不可用。你可以继续手动配置场景。'); }
    if (!response.ok) throw new Error(typeof body.error === 'string' ? body.error.slice(0,240) : 'AI 分析失败。你可以继续手动配置场景。');
    const scene=body.scene || body;
    if (!isScene(scene)) throw new Error('AI 返回了不支持的场景配置。请使用手动模式。');
    return validateScene({...scene,source:'ai'});
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('AI 分析超时。你可以继续手动配置场景。');
    if (error instanceof TypeError) throw new Error('无法连接 AI 接口。你可以继续手动配置场景。');
    throw error;
  } finally { clearTimeout(timer); }
}

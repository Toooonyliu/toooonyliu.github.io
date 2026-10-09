/** Turns a painted 16:9 image into the game's 480×270 grid with a small per-image palette.
 * Pure functions take {width,height,data} so they run in tests without a browser. */
export const BACKDROP_WIDTH = 960, BACKDROP_HEIGHT = 540, BACKDROP_COLORS = 48;

/** Nearest sampling at cell centers keeps the painted pixels crisp; box averaging is kept for tests and soft sources. */
export function nearestCenter(image, width = BACKDROP_WIDTH, height = BACKDROP_HEIGHT) {
  const out = new Uint8ClampedArray(width * height * 4), sx = image.width / width, sy = image.height / height;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const xx = Math.min(image.width - 1, Math.floor((x + .5) * sx)), yy = Math.min(image.height - 1, Math.floor((y + .5) * sy));
    const i = (yy * image.width + xx) * 4, o = (y * width + x) * 4;
    out[o] = image.data[i]; out[o + 1] = image.data[i + 1]; out[o + 2] = image.data[i + 2]; out[o + 3] = 255;
  }
  return { width, height, data: out };
}

/** Box-average each target cell; the palette snap afterwards restores hard pixel edges. */
export function downsample(image, width = BACKDROP_WIDTH, height = BACKDROP_HEIGHT) {
  const out = new Uint8ClampedArray(width * height * 4), sx = image.width / width, sy = image.height / height;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const x0 = Math.floor(x * sx), x1 = Math.min(image.width, Math.max(x0 + 1, Math.floor((x + 1) * sx)));
    const y0 = Math.floor(y * sy), y1 = Math.min(image.height, Math.max(y0 + 1, Math.floor((y + 1) * sy)));
    let r = 0, g = 0, b = 0, n = 0;
    for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) { const i = (yy * image.width + xx) * 4; r += image.data[i]; g += image.data[i + 1]; b += image.data[i + 2]; n++; }
    const o = (y * width + x) * 4;
    out[o] = r / n; out[o + 1] = g / n; out[o + 2] = b / n; out[o + 3] = 255;
  }
  return { width, height, data: out };
}

const range = (box, c) => { let lo = 255, hi = 0; for (const p of box) { if (p[c] < lo) lo = p[c]; if (p[c] > hi) hi = p[c]; } return hi - lo; };
const widestAxis = box => { const r = range(box, 0), g = range(box, 1), b = range(box, 2); return r >= g && r >= b ? 0 : g >= b ? 1 : 2; };
const priority = box => Math.max(range(box, 0), range(box, 1), range(box, 2)) * Math.log2(box.length + 1);
/** Median cut over sampled pixels; returns up to `size` [r,g,b] colors. */
export function extractPalette(images, size = BACKDROP_COLORS, step = 16) {
  const samples = [];
  for (const image of images) for (let i = 0; i < image.data.length; i += step) if (image.data[i + 3] > 0) samples.push([image.data[i], image.data[i + 1], image.data[i + 2]]);
  if (!samples.length) return [[0, 0, 0]];
  let boxes = [samples];
  while (boxes.length < size) {
    boxes.sort((a, b) => priority(b) - priority(a));
    const box = boxes[0];
    if (box.length < 2 || priority(box) === 0) break;
    boxes.shift();
    const axis = widestAxis(box);
    box.sort((a, b) => a[axis] - b[axis]);
    const mid = box.length >> 1;
    boxes.push(box.slice(0, mid), box.slice(mid));
  }
  return boxes.map(box => [0, 1, 2].map(c => Math.round(box.reduce((sum, p) => sum + p[c], 0) / box.length)));
}

/** Snap every pixel to its nearest palette color (perceptually weighted RGB distance). */
export function quantize(image, palette) {
  const out = new Uint8ClampedArray(image.data.length), cache = new Map();
  for (let i = 0; i < image.data.length; i += 4) {
    const r = image.data[i], g = image.data[i + 1], b = image.data[i + 2], key = (r >> 2) << 12 | (g >> 2) << 6 | (b >> 2);
    let best = cache.get(key);
    if (!best) {
      let distance = Infinity;
      for (const p of palette) { const d = (p[0] - r) ** 2 * 2 + (p[1] - g) ** 2 * 3 + (p[2] - b) ** 2; if (d < distance) { distance = d; best = p; } }
      cache.set(key, best);
    }
    out[i] = best[0]; out[i + 1] = best[1]; out[i + 2] = best[2]; out[i + 3] = 255;
  }
  return { width: image.width, height: image.height, data: out };
}

export function pixelize(image, { width = BACKDROP_WIDTH, height = BACKDROP_HEIGHT, colors = BACKDROP_COLORS, sampling = 'nearest' } = {}) {
  const small = (sampling === 'box' ? downsample : nearestCenter)(image, width, height);
  return quantize(small, extractPalette([small], colors));
}

function decode(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const timer = setTimeout(() => { image.src = ''; reject(new Error('The painted arena took too long to decode.')); }, 20000);
    image.onload = () => { clearTimeout(timer); resolve(image); };
    image.onerror = () => { clearTimeout(timer); reject(new Error('The painted arena could not be decoded.')); };
    image.src = dataUrl;
  });
}

/** Browser entry: painted data URL → 480×270 pixel data URL (WebP where the browser can encode it). */
export async function pixelizeBackdrop(dataUrl, options = {}) {
  const image = await decode(dataUrl);
  const width = image.naturalWidth, height = image.naturalHeight;
  if (!width || !height || width * height > 9_000_000) throw new Error('The painted arena has an unexpected size.');
  const source = document.createElement('canvas');
  source.width = width; source.height = height;
  const sourceContext = source.getContext('2d', { willReadFrequently: true });
  sourceContext.drawImage(image, 0, 0);
  const result = pixelize(sourceContext.getImageData(0, 0, width, height), options);
  const target = document.createElement('canvas');
  target.width = result.width; target.height = result.height;
  target.getContext('2d').putImageData(new ImageData(result.data, result.width, result.height), 0, 0);
  let encoded = target.toDataURL('image/webp', .95);
  if (!encoded.startsWith('data:image/webp')) encoded = target.toDataURL('image/png');
  return encoded;
}

// Original software-rendered globe. Geography is rasterized once from the
// bundled Natural Earth outline; the sphere is shaded on a two-pixel grid.
import { zoneForCoordinates, TRAVEL_ZONES } from './region-presets.js';
import { t, levelTitle } from './i18n.js';
const ZONE_RGB = TRAVEL_ZONES.map(zone => [1, 3, 5].map(index => parseInt(zone.color.slice(index, index + 2), 16)));
const zoneIndex = id => TRAVEL_ZONES.findIndex(zone => zone.id === id) + 1;
const TAU = Math.PI * 2;
const RAD = Math.PI / 180;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const wrap = angle => ((angle + Math.PI) % TAU + TAU) % TAU - Math.PI;
// 4×4 ordered dither: light falls off in hard pixel bands, like hand-shaded pixel art.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + .5) / 16);
const band = (value, x, y, steps) => Math.min(1, Math.floor(value * steps + BAYER[(y & 3) * 4 + (x & 3)]) / steps);
const grain = (x, y) => {
  let value = Math.imul(x ^ Math.imul(y, 374761393), 668265263);
  value = Math.imul(value ^ value >>> 13, 1274126177);
  return ((value ^ value >>> 16) >>> 0) / 4294967295;
};

export class Globe {
  constructor(canvas, { onSelect = () => {}, onCreate = null } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });
    this.onSelect = onSelect;
    this.onCreate = onCreate;
    this.levels = [];
    this.selectedId = null;
    this.clearedZones = new Set();
    this.highlightZone = null;
    this.zoomTarget = null;
    this.revealSince = 0;
    this.yaw = 128 * RAD;
    this.pitch = 20 * RAD;
    this.zoom = 1;
    this.velocity = { x: 0, y: 0 };
    this.pointers = new Map();
    this.projected = [];
    // Geography stays pixelated; small place names use the browser's
    // native text rasterizer so they remain readable at any display density.
    this.labels = canvas.parentElement.querySelector('#map-pins');
    this.labelNodes = new Map();
    if (this.labels) { this.labels.hidden = false; this.labels.setAttribute('aria-hidden', 'true'); }
    this.active = true;
    this.destroyed = false;
    this.lastFrame = 0;
    this.lastPaint = 0;
    this.target = null;
    this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.events = new AbortController();
    const signal = this.events.signal;
    canvas.tabIndex = 0;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', t('Pixel globe. Drag or use arrow keys to rotate; scroll, pinch, or use plus and minus to zoom. Press Enter to choose a destination, or use the region buttons.'));
    canvas.addEventListener('pointerdown', event => this.pointerDown(event), { signal });
    canvas.addEventListener('pointermove', event => this.pointerMove(event), { signal });
    canvas.addEventListener('pointerup', event => this.pointerUp(event), { signal });
    canvas.addEventListener('pointercancel', event => this.pointerUp(event, true), { signal });
    canvas.addEventListener('lostpointercapture', event => this.pointerUp(event, true), { signal });
    canvas.addEventListener('wheel', event => {
      event.preventDefault();
      this.zoomTarget = null;
      this.zoom = clamp(this.zoom * Math.exp(-event.deltaY * .0012), .8, 2.2);
      this.geometryDirty = true;
      this.wake();
    }, { signal, passive: false });
    canvas.addEventListener('keydown', event => this.keyDown(event), { signal });
    canvas.addEventListener('dblclick', event => {
      if (!this.onCreate || this.hitMarker(event.clientX, event.clientY)) return;
      const location = this.locationAt(event.clientX, event.clientY);
      if (location) this.onCreate(location);
    }, { signal });
    document.addEventListener('visibilitychange', () => this.wake(), { signal });
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(canvas);
    this.resize();
    this.wake();
  }

  setLand(geojson) {
    const texture = document.createElement('canvas');
    texture.width = 720;
    texture.height = 360;
    const context = texture.getContext('2d', { willReadFrequently: true });
    context.fillStyle = '#fff';
    for (const feature of geojson?.features || []) {
      const geometry = feature.geometry;
      if (!geometry || !['Polygon', 'MultiPolygon'].includes(geometry.type)) continue;
      const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
      for (const polygon of polygons) {
        context.beginPath();
        for (const ring of polygon) {
          ring.forEach(([lon, lat], index) => {
            const x = (lon + 180) * 2, y = (90 - lat) * 2;
            index ? context.lineTo(x, y) : context.moveTo(x, y);
          });
          context.closePath();
        }
        context.fill('evenodd');
      }
    }
    const pixels = context.getImageData(0, 0, 720, 360).data;
    this.landMask = new Uint8Array(720 * 360);
    for (let index = 0; index < this.landMask.length; index++) this.landMask[index] = pixels[index * 4 + 3] > 120 ? 1 : 0;
    // Travel zone per texel, computed once: drawing then needs no per-pixel zone lookup.
    this.zoneMask = new Uint8Array(this.landMask.length);
    for (let y = 0; y < 360; y++) for (let x = 0; x < 720; x++) {
      const index = y * 720 + x;
      if (this.landMask[index]) this.zoneMask[index] = zoneIndex(zoneForCoordinates(90 - (y + .5) / 2, (x + .5) / 2 - 180).id);
    }
    this.coastMask = new Uint8Array(this.landMask.length);
    for (let y = 1; y < 359; y++) for (let x = 0; x < 720; x++) {
      const index = y * 720 + x;
      if (this.landMask[index] && (!this.landMask[y * 720 + (x + 719) % 720] || !this.landMask[y * 720 + (x + 1) % 720] || !this.landMask[index - 720] || !this.landMask[index + 720])) this.coastMask[index] = 1;
    }
    this.wake();
  }

  setLevels(levels, selectedId) {
    this.levels = (levels || []).filter(level => Number.isFinite(level.location?.lat) && Number.isFinite(level.location?.lon));
    this.selectedId = selectedId;
    this.clearedZones = new Set(this.levels.filter(level => level.cleared && level.scene?.travelZone).map(level => level.scene.travelZone));
    this.wake();
  }

  /** Pulses one travel zone while the player decides; null clears it. */
  setHighlight(zoneId) {
    this.highlightZone = zoneId || null;
    this.wake();
  }

  /** Unlock moment: turn to the place, zoom in, and lift the zone with a glowing outline. */
  reveal(zoneId, location) {
    this.highlightZone = zoneId || null;
    this.revealSince = performance.now();
    this.focusLocation(location);
    this.zoomTarget = 1.85;
    this.keyboardStillUntil = performance.now() + 120000;
    this.wake();
  }

  clearReveal() {
    if (!this.highlightZone && this.zoomTarget === null && this.zoom <= 1.25) return;
    this.highlightZone = null;
    this.zoomTarget = 1;
    this.keyboardStillUntil = 0;
    this.wake();
  }

  focusLocation(location) {
    if (!Number.isFinite(location?.lon) || !Number.isFinite(location?.lat)) return;
    this.target = { yaw: location.lon * RAD, pitch: clamp(location.lat * RAD, -.85, .85) };
    this.velocity.x = this.velocity.y = 0;
    this.wake();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    const width = Math.max(1, Math.round(rect.width / 2));
    const height = Math.max(1, Math.round(rect.height / 2));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
      this.image = this.ctx.createImageData(width, height);
    }
    this.geometryDirty = true;
    this.wake();
  }

  setVisible(visible) {
    this.active = Boolean(visible);
    if (!this.active) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
      this.lastFrame = 0;
      for (const id of this.pointers.keys()) if (this.canvas.hasPointerCapture(id)) this.canvas.releasePointerCapture(id);
      this.pointers.clear();
      this.canvas.classList.remove('is-dragging');
    } else { this.resize(); this.wake(); }
  }

  visible(value) { this.setVisible(value); }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    this.events.abort();
    this.observer.disconnect();
    for (const id of this.pointers.keys()) if (this.canvas.hasPointerCapture(id)) this.canvas.releasePointerCapture(id);
    this.pointers.clear();
    this.canvas.classList.remove('is-dragging');
    for (const node of this.labelNodes.values()) node.remove();
    this.labelNodes.clear();
  }

  wake() {
    if (this.destroyed || !this.active || document.hidden || this.raf) return;
    this.raf = requestAnimationFrame(time => this.frame(time));
  }

  frame(time) {
    this.raf = 0;
    if (this.destroyed || !this.active || document.hidden) { this.lastFrame = 0; return; }
    const elapsed = this.lastFrame ? Math.min(.05, (time - this.lastFrame) / 1000) : 0;
    this.lastFrame = time;
    if (this.zoomTarget !== null) {
      const amount = this.reduceMotion.matches ? 1 : 1 - Math.exp(-elapsed * 3.2);
      this.zoom += (this.zoomTarget - this.zoom) * amount;
      if (Math.abs(this.zoomTarget - this.zoom) < .004) { this.zoom = this.zoomTarget; this.zoomTarget = null; }
      this.geometryDirty = true;
    }
    if (!this.pointers.size) {
      if (this.target) {
        const amount = this.reduceMotion.matches ? 1 : 1 - Math.exp(-elapsed * 5.5);
        const yawDelta = wrap(this.target.yaw - this.yaw);
        const pitchDelta = this.target.pitch - this.pitch;
        this.yaw += yawDelta * amount;
        this.pitch += pitchDelta * amount;
        if (Math.abs(yawDelta) + Math.abs(pitchDelta) < .004) this.target = null;
      } else {
        this.yaw += this.velocity.x * elapsed;
        this.pitch = clamp(this.pitch + this.velocity.y * elapsed, -1.05, 1.05);
        this.velocity.x *= Math.exp(-elapsed * 3.4);
        this.velocity.y *= Math.exp(-elapsed * 3.4);
        if (!this.reduceMotion.matches && !this.keyboardStillUntil && Math.abs(this.velocity.x) < .02) this.yaw += elapsed * .026;
      }
    }
    if (this.keyboardStillUntil && time > this.keyboardStillUntil) this.keyboardStillUntil = 0;
    if (time - this.lastPaint > 1000 / 25 || this.geometryDirty) {
      this.draw(time / 1000);
      this.lastPaint = time;
    }
    this.wake();
  }

  buildGeometry() {
    const width = this.canvas.width, height = this.canvas.height;
    const wide = width > 380;
    this.cx = Math.round(width * (wide ? .59 : .5));
    this.cy = Math.round(height * (wide ? .44 : .46));
    this.radius = Math.min(height * .36, width * (wide ? .25 : .40)) * this.zoom;
    this.normals = [];
    const radius = this.radius;
    for (let y = Math.max(0, Math.floor(this.cy - radius)); y <= Math.min(height - 1, Math.ceil(this.cy + radius)); y++) {
      const ny = (this.cy - y) / radius;
      for (let x = Math.max(0, Math.floor(this.cx - radius)); x <= Math.min(width - 1, Math.ceil(this.cx + radius)); x++) {
        const nx = (x - this.cx) / radius;
        const z2 = 1 - nx * nx - ny * ny;
        if (z2 >= 0) this.normals.push([x, y, nx, ny, Math.sqrt(z2), (y * width + x) * 4]);
      }
    }
    this.geometryDirty = false;
  }

  draw(time) {
    if (!this.image) return;
    if (this.geometryDirty) this.buildGeometry();
    const ctx = this.ctx, width = this.canvas.width, height = this.canvas.height;
    ctx.clearRect(0, 0, width, height);
    ctx.imageSmoothingEnabled = false;
    // A desk globe: brass stand and meridian behind the sphere, hidden while zoomed in on a reveal.
    const standAlpha = clamp((1.25 - this.zoom) / .2, 0, 1);
    if (standAlpha > 0) { ctx.globalAlpha = standAlpha; this.drawStand(); ctx.globalAlpha = 1; }

    const data = this.image.data;
    data.fill(0);
    const cosYaw = Math.cos(this.yaw), sinYaw = Math.sin(this.yaw), cosPitch = Math.cos(this.pitch), sinPitch = Math.sin(this.pitch);
    const selectedZone=zoneIndex(this.levels.find(level=>level.id===this.selectedId)?.scene.travelZone);
    const lit = zoneIndex(this.highlightZone);
    const cleared = new Set([...this.clearedZones].map(zoneIndex));
    const pulse = lit ? (this.reduceMotion.matches ? 1 : .6 + .4 * Math.sin(time * 4.2)) : 0;
    // The outline draws itself in over the first second of a reveal.
    const rise = lit ? clamp((performance.now() - this.revealSince) / 900, 0, 1) : 0;
    const zoneMask = this.zoneMask;
    for (const [x, y, nx, ny, nz, offset] of this.normals) {
      const forward = nz * cosPitch - ny * sinPitch;
      const wx = nx * cosYaw + forward * sinYaw;
      const wz = forward * cosYaw - nx * sinYaw;
      const wy = clamp(ny * cosPitch + nz * sinPitch, -1, 1);
      const lon = Math.atan2(wx, wz), lat = Math.asin(wy);
      const tx = clamp(Math.floor((lon / Math.PI + 1) * 360), 0, 719);
      const ty = clamp(Math.floor((.5 - lat / Math.PI) * 360), 0, 359);
      const index = ty * 720 + tx, land = this.landMask?.[index];
      const zoneHere = zoneMask ? zoneMask[index] : 0;
      const noise = grain(tx, ty), broad = (Math.sin(lon * 9 + Math.cos(lat * 13)) + Math.cos(lat * 17 - lon * 6)) * .5;
      const light = .34 + .66 * band(Math.max(0, nx * -.5 + ny * .52 + nz * .69), x, y, 5);
      const coast = this.coastMask?.[index] ? 13 : 0;
      let r, g, b;
      // Neighbouring texels decide outlines: the lit zone's border glows, its surroundings catch the light.
      const left = zoneMask ? zoneMask[ty * 720 + (tx + 719) % 720] : 0, right = zoneMask ? zoneMask[ty * 720 + (tx + 1) % 720] : 0;
      const up = zoneMask && ty > 0 ? zoneMask[index - 720] : 0, down = zoneMask && ty < 359 ? zoneMask[index + 720] : 0;
      const shadowSource = zoneMask && ty > 1 ? zoneMask[(ty - 2) * 720 + (tx + 718) % 720] : 0;
      if (land && zoneHere) {
        const zoneColor=ZONE_RGB[zoneHere - 1];
        const active=selectedZone===zoneHere, isCleared=cleared.has(zoneHere), isLit=lit===zoneHere;
        const edge = left !== zoneHere || right !== zoneHere || up !== zoneHere || down !== zoneHere;
        // Unlit zones sit back as dusty grey-green; cleared zones carry their full color and a warm lift.
        const grey = (zoneColor[0] * .3 + zoneColor[1] * .5 + zoneColor[2] * .2);
        // Unexplored land is a checker of its color and parchment fog; explored land is solid.
        const fog = !isCleared && !isLit && ((x + y) & 1);
        const keep = isCleared || isLit ? 1 : fog ? .18 : .55, tint = isCleared ? 1.08 : isLit ? 1.12 : 1;
        const boost=(active?14:0)+(isCleared?16:-6)+(isLit?(18+26*pulse)*rise:0);
        r = ((zoneColor[0] * keep + grey * (1 - keep) * .86) * tint + broad * 7 + noise * 9 + coast + boost) * light;
        g = ((zoneColor[1] * keep + grey * (1 - keep) * .9) * tint + broad * 7 + noise * 9 + coast * .6 + boost * (isLit ? .82 : 1)) * light;
        b = ((zoneColor[2] * keep + grey * (1 - keep) * .82) * tint + broad * 7 + noise * 9 + coast * .4 + boost * (isLit ? .5 : 1)) * light;
        if (edge && isLit) {
          // A bright rim that brightens with the pulse once the reveal has drawn in.
          const glow = rise * (.72 + .28 * pulse);
          r = r * (1 - glow) + 255 * glow; g = g * (1 - glow) + 236 * glow; b = b * (1 - glow) + 178 * glow;
        } else if (edge && isCleared) {
          r = r * .62 + 236 * .38; g = g * .62 + 196 * .38; b = b * .62 + 130 * .38;
        }
      } else {
        // Sea: flat ink bands with sparse wave glints.
        const glint = noise > .985 ? 26 : 0;
        r = (34 + glint) * light;
        g = (60 + glint) * light;
        b = (72 + glint * .8) * light;
      }
      if (lit && zoneHere !== lit) {
        if (left === lit || right === lit || up === lit || down === lit) {
          // Light spilling past the rim.
          const halo = rise * (.35 + .25 * pulse);
          r = r * (1 - halo) + 250 * halo; g = g * (1 - halo) + 214 * halo; b = b * (1 - halo) + 150 * halo;
        } else if (shadowSource === lit) {
          // A drop shadow down and to the right makes the zone sit above the globe.
          r *= 1 - .45 * rise; g *= 1 - .45 * rise; b *= 1 - .4 * rise;
        }
      }
      // Sunset strikes the upper-left limb, rather than outlining every coast.
      const rim = nz < .2 && (-nx + ny) > .35 ? .55 : 0;
      r += rim * 120; g += rim * 72; b += rim * 40;
      const shade = nz < .09 ? .55 : 1;
      data[offset] = Math.round(r * shade / 3) * 3;
      data[offset + 1] = Math.round(g * shade / 3) * 3;
      data[offset + 2] = Math.round(b * shade / 3) * 3;
      data[offset + 3] = 255;
    }
    // putImageData ignores the atmosphere already painted; use a scratch canvas
    // so the transparent pixels keep both the halo and floating-ground shadow.
    this.surface ||= document.createElement('canvas');
    if (this.surface.width !== width || this.surface.height !== height) { this.surface.width = width; this.surface.height = height; }
    this.surface.getContext('2d').putImageData(this.image, 0, 0);
    ctx.drawImage(this.surface, 0, 0);
    this.drawMarkers(time, cosYaw, sinYaw, cosPitch, sinPitch);
    this.drawLeaves(time);
  }

  /** Brass meridian ring and turned base, drawn on the same two-pixel grid as the sphere. */
  drawStand() {
    const ctx = this.ctx, cx = this.cx, cy = this.cy, r = this.radius;
    const brass = ['#5a3f22', '#8c6633', '#c19650', '#ecd08a'];
    const ring = r * 1.09, tilt = -.38;
    for (let a = -Math.PI * .93; a <= Math.PI * .02; a += 1 / ring) {
      const x = cx + Math.cos(a) * ring * Math.cos(tilt) - Math.sin(a) * ring * Math.sin(tilt) * .12;
      const y = cy + Math.sin(a) * ring;
      const lit = Math.sin(a) < -.35 && Math.cos(a) < .2;
      ctx.fillStyle = brass[0]; ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 4, 4);
      ctx.fillStyle = lit ? brass[3] : brass[2]; ctx.fillRect(Math.round(x), Math.round(y), 2, 2);
    }
    // Axle caps at the poles.
    ctx.fillStyle = brass[0]; ctx.fillRect(Math.round(cx - 3), Math.round(cy - ring - 3), 6, 6); ctx.fillStyle = brass[3]; ctx.fillRect(Math.round(cx - 1), Math.round(cy - ring - 1), 2, 2);
    const bottom = Math.round(cy + ring), neck = Math.max(6, Math.round(r * .16)), baseW = Math.round(r * .9), baseY = bottom + neck;
    ctx.fillStyle = brass[0]; ctx.fillRect(Math.round(cx - 4), bottom - 2, 8, neck + 2);
    ctx.fillStyle = brass[2]; ctx.fillRect(Math.round(cx - 2), bottom - 2, 2, neck + 2);
    // Stepped base: three tiers, lit from the upper left.
    const tiers = [[.35, 3], [.62, 3], [1, 5]];
    let y = baseY;
    for (const [w, h] of tiers) {
      const half = Math.round(baseW * w / 2);
      ctx.fillStyle = brass[0]; ctx.fillRect(Math.round(cx - half - 1), y - 1, half * 2 + 2, h + 2);
      ctx.fillStyle = brass[1]; ctx.fillRect(Math.round(cx - half), y, half * 2, h);
      ctx.fillStyle = brass[2]; ctx.fillRect(Math.round(cx - half), y, half * 2, 1);
      ctx.fillStyle = brass[3]; ctx.fillRect(Math.round(cx - half), y, Math.max(2, Math.round(half * .5)), 1);
      y += h;
    }
    // Flat stepped shadow on the desk.
    ctx.fillStyle = '#05090b'; ctx.globalAlpha *= .5;
    ctx.fillRect(Math.round(cx - baseW * .62), y + 1, Math.round(baseW * 1.24), 3);
    ctx.fillRect(Math.round(cx - baseW * .45), y + 4, Math.round(baseW * .9), 2);
    ctx.globalAlpha = Math.min(1, ctx.globalAlpha * 2);
  }

  drawMarkers(time, cosYaw, sinYaw, cosPitch, sinPitch) {
    const ctx = this.ctx, groups = new Map(), visibleLabels = new Set();
    this.projected = [];
    for (const level of this.levels) {
      const key = `${level.location.lat.toFixed(2)},${level.location.lon.toFixed(2)}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(level);
    }
    for (const [key, levels] of groups) {
      const level = levels.find(item => item.id === this.selectedId) || levels[0];
      const lon = level.location.lon * RAD, lat = level.location.lat * RAD;
      const wx = Math.sin(lon) * Math.cos(lat), wy = Math.sin(lat), wz = Math.cos(lon) * Math.cos(lat);
      const forward = wx * sinYaw + wz * cosYaw;
      const depth = wy * sinPitch + forward * cosPitch;
      if (depth < .12) continue;
      const x = Math.round(this.cx + this.radius * (wx * cosYaw - wz * sinYaw));
      const y = Math.round(this.cy - this.radius * (wy * cosPitch - forward * sinPitch));
      const selected = level.id === this.selectedId;
      const cleared = levels.some(item => item.cleared);
      // Pixel flag pins: a pole and a pennant; gold when cleared, rust when selected, bobbing gently.
      const lift = selected && !this.reduceMotion.matches ? Math.round(Math.sin(time * 4) * 1) : 0;
      const pole = selected ? 9 : 6, top = y - pole + lift;
      ctx.fillStyle = '#0a1214'; ctx.fillRect(x - 1, top - 1, 3, pole + 2);
      ctx.fillStyle = '#e8dcc0'; ctx.fillRect(x, top, 1, pole);
      const flag = cleared ? '#f0c27a' : selected ? '#d0583f' : '#b9b19a', w = selected ? 6 : 4, h = selected ? 4 : 3;
      ctx.fillStyle = '#0a1214'; ctx.fillRect(x, top - 1, w + 2, h + 2);
      ctx.fillStyle = flag; ctx.fillRect(x + 1, top, w, h);
      if (cleared) { ctx.fillStyle = '#fff3cf'; ctx.fillRect(x + 1 + Math.floor(w / 2) - 1, top + 1, 2, 1); }
      ctx.fillStyle = '#0a1214'; ctx.fillRect(x - 2, y, 5, 2); ctx.fillStyle = '#5d6b63'; ctx.fillRect(x - 1, y, 3, 1);
      this.projected.push({ id: level.id, x, y, depth, level, levels });
      if (selected) {
        this.placeLabel(`place:${key}`, level.isDemo ? t(level.location.name) : level.location.name, x, y, 'globe-place-label');
        visibleLabels.add(`place:${key}`);
      }
      if (levels.length > 1) {
        this.placeLabel(`count:${key}`, String(levels.length), x, y, 'globe-cluster-count');
        visibleLabels.add(`count:${key}`);
      }
    }
    for (const [key, node] of this.labelNodes) node.hidden = !visibleLabels.has(key);
  }

  placeLabel(key, text, x, y, className) {
    if (!this.labels) return;
    let node = this.labelNodes.get(key);
    if (!node) {
      node = document.createElement('span');
      node.className = className;
      this.labels.append(node);
      this.labelNodes.set(key, node);
    }
    if (node.textContent !== text) node.textContent = text;
    node.hidden = false;
    node.style.left = `${x / this.canvas.width * 100}%`;
    node.style.top = `${y / this.canvas.height * 100}%`;
  }

  selectMarker(marker) {
    const index = marker.levels.findIndex(level => level.id === this.selectedId);
    const next = marker.levels[(index + 1) % marker.levels.length];
    this.onSelect(next.id);
    this.keyboardStillUntil = performance.now() + 8000;
  }

  drawLeaves(time) {
    const ctx = this.ctx;
    for (let index = 0; index < 6; index++) {
      const phase = this.reduceMotion.matches ? index * 1.3 : time * .12 + index * 1.3;
      const x = Math.round(this.cx + Math.sin(phase + index) * this.radius * (1.13 + index * .04));
      const y = Math.round(this.cy + Math.cos(phase * .66 + index) * this.radius * 1.02);
      if (Math.hypot(x - this.cx, y - this.cy) < this.radius + 6) continue;
      ctx.fillStyle = index % 2 ? '#be756966' : '#c5a57266';
      ctx.fillRect(x, y, 3, 1); ctx.fillRect(x + 1, y - 1, 1, 3);
    }
  }

  canvasPoint(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    return { x: (clientX - rect.left) * this.canvas.width / rect.width, y: (clientY - rect.top) * this.canvas.height / rect.height };
  }

  hitMarker(clientX, clientY) {
    const point = this.canvasPoint(clientX, clientY);
    return this.projected.filter(marker => Math.hypot(marker.x - point.x, marker.y - point.y) < 11).sort((a, b) => Math.hypot(a.x - point.x, a.y - point.y) - Math.hypot(b.x - point.x, b.y - point.y))[0];
  }

  locationAt(clientX, clientY) {
    const point = this.canvasPoint(clientX, clientY);
    const nx = (point.x - this.cx) / this.radius, ny = (this.cy - point.y) / this.radius;
    if (nx * nx + ny * ny > 1) return null;
    const nz = Math.sqrt(1 - nx * nx - ny * ny), forward = nz * Math.cos(this.pitch) - ny * Math.sin(this.pitch);
    return { lon: Math.atan2(nx * Math.cos(this.yaw) + forward * Math.sin(this.yaw), forward * Math.cos(this.yaw) - nx * Math.sin(this.yaw)) / RAD, lat: Math.asin(clamp(ny * Math.cos(this.pitch) + nz * Math.sin(this.pitch), -1, 1)) / RAD };
  }

  pointerDown(event) {
    this.canvas.setPointerCapture(event.pointerId);
    this.canvas.focus({ preventScroll: true });
    this.target = null;
    this.velocity.x = this.velocity.y = 0;
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, time: event.timeStamp, moved: false });
    this.canvas.classList.add('is-dragging');
    if (this.pointers.size === 2) this.pinchDistance = this.pointerDistance();
  }

  pointerDistance() { const [a, b] = [...this.pointers.values()]; return Math.hypot(a.x - b.x, a.y - b.y); }

  pointerMove(event) {
    const pointer = this.pointers.get(event.pointerId);
    if (!pointer) {
      const marker = this.hitMarker(event.clientX, event.clientY);
      this.canvas.style.cursor = marker ? 'pointer' : 'grab';
      this.canvas.title = marker ? marker.levels.length > 1 ? t('{place} · {count} stages; click again to cycle', { place: marker.level.isDemo ? t(marker.level.location.name) : marker.level.location.name, count: marker.levels.length }) : `${marker.level.isDemo ? t(marker.level.location.name) : marker.level.location.name} · ${levelTitle(marker.level)}` : '';
      return;
    }
    const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y;
    const elapsed = Math.max(.008, (event.timeStamp - pointer.time) / 1000);
    pointer.x = event.clientX; pointer.y = event.clientY; pointer.time = event.timeStamp;
    if (Math.hypot(pointer.x - pointer.startX, pointer.y - pointer.startY) > 6) pointer.moved = true;
    if (this.pointers.size === 2) {
      const distance = this.pointerDistance();
      if (this.pinchDistance > 0) this.zoom = clamp(this.zoom * distance / this.pinchDistance, .8, 1.25);
      this.pinchDistance = distance; this.geometryDirty = true;
      for (const value of this.pointers.values()) value.moved = true;
    } else {
      const sensitivity = .0048 / this.zoom;
      this.yaw -= dx * sensitivity;
      this.pitch = clamp(this.pitch + dy * sensitivity, -1.05, 1.05);
      this.velocity.x = clamp(-dx * sensitivity / elapsed, -2.2, 2.2);
      this.velocity.y = clamp(dy * sensitivity / elapsed, -1.5, 1.5);
    }
    this.wake();
  }

  pointerUp(event, cancelled = false) {
    const pointer = this.pointers.get(event.pointerId);
    if (!pointer) return;
    this.pointers.delete(event.pointerId);
    if (!cancelled && !pointer.moved) {
      const marker = this.hitMarker(event.clientX, event.clientY);
      if (marker) this.selectMarker(marker);
      else {
        const point=this.locationAt(event.clientX,event.clientY);
        if(point){const index=clamp(Math.floor((90-point.lat)*2),0,359)*720+clamp(Math.floor((point.lon+180)*2),0,719);if(this.landMask?.[index]||Math.abs(point.lat)>=66.5){const id=`zone-${zoneForCoordinates(point.lat,point.lon).id}`;if(this.levels.some(level=>level.id===id))this.onSelect(id);}}
      }
    }
    if (!this.pointers.size) this.canvas.classList.remove('is-dragging');
    this.pinchDistance = 0;
    this.wake();
  }

  keyDown(event) {
    const actions = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', 'Enter', 'Home'];
    if (!actions.includes(event.key)) return;
    event.preventDefault();
    this.target = null;
    this.velocity.x = this.velocity.y = 0;
    this.keyboardStillUntil = performance.now() + 8000;
    if (event.key === 'ArrowLeft') this.yaw -= .12;
    if (event.key === 'ArrowRight') this.yaw += .12;
    if (event.key === 'ArrowUp') this.pitch = clamp(this.pitch + .10, -1.05, 1.05);
    if (event.key === 'ArrowDown') this.pitch = clamp(this.pitch - .10, -1.05, 1.05);
    if (event.key === '+' || event.key === '=') { this.zoom = clamp(this.zoom + .08, .8, 1.25); this.geometryDirty = true; }
    if (event.key === '-') { this.zoom = clamp(this.zoom - .08, .8, 1.25); this.geometryDirty = true; }
    if (event.key === 'Home') this.focusLocation(this.levels.find(level => level.id === this.selectedId)?.location || { lat: 20, lon: 128 });
    if (event.key === 'Enter') {
      const nearest = [...this.projected].sort((a, b) => b.depth - a.depth)[0];
      if (nearest) this.selectMarker(nearest);
    }
    this.wake();
  }
}

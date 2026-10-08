// Original software-rendered globe. Geography is rasterized once from the
// bundled Natural Earth outline; the sphere is shaded on a two-pixel grid.
import { zoneForCoordinates } from './region-presets.js';
const TAU = Math.PI * 2;
const RAD = Math.PI / 180;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const wrap = angle => ((angle + Math.PI) % TAU + TAU) % TAU - Math.PI;
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
    this.yaw = 128 * RAD;
    this.pitch = 20 * RAD;
    this.zoom = 1;
    this.velocity = { x: 0, y: 0 };
    this.pointers = new Map();
    this.projected = [];
    // Geography stays pixelated; small Chinese place names use the browser's
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
    canvas.setAttribute('aria-label', '可转动的像素地球。拖动旋转，滚轮或双指缩放；方向键旋转，加减键缩放，回车选择地点。也可展开旅途列表选择。');
    canvas.addEventListener('pointerdown', event => this.pointerDown(event), { signal });
    canvas.addEventListener('pointermove', event => this.pointerMove(event), { signal });
    canvas.addEventListener('pointerup', event => this.pointerUp(event), { signal });
    canvas.addEventListener('pointercancel', event => this.pointerUp(event, true), { signal });
    canvas.addEventListener('lostpointercapture', event => this.pointerUp(event, true), { signal });
    canvas.addEventListener('wheel', event => {
      event.preventDefault();
      this.zoom = clamp(this.zoom * Math.exp(-event.deltaY * .0012), .8, 1.25);
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
    this.cx = Math.round(width * (wide ? .68 : .5));
    this.cy = Math.round(height * (wide ? .49 : .49));
    this.radius = Math.min(height * .43, width * (wide ? .29 : .44)) * this.zoom;
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
    const halo = ctx.createRadialGradient(this.cx - this.radius * .3, this.cy - this.radius * .2, this.radius * .8, this.cx, this.cy, this.radius * 1.14);
    halo.addColorStop(0, '#dd958700'); halo.addColorStop(.7, '#dc897810'); halo.addColorStop(.85, '#e9a18b20'); halo.addColorStop(1, '#d48a7a00');
    ctx.fillStyle = halo;
    ctx.fillRect(this.cx - this.radius * 1.2, this.cy - this.radius * 1.2, this.radius * 2.4, this.radius * 2.4);
    ctx.save();
    ctx.translate(this.cx, this.cy + this.radius * 1.04);
    ctx.scale(1, .1);
    const shadow = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius * .82);
    shadow.addColorStop(0, '#02080970'); shadow.addColorStop(1, '#02080900');
    ctx.fillStyle = shadow; ctx.fillRect(-this.radius, -this.radius, this.radius * 2, this.radius * 2); ctx.restore();
    const data = this.image.data;
    data.fill(0);
    const cosYaw = Math.cos(this.yaw), sinYaw = Math.sin(this.yaw), cosPitch = Math.cos(this.pitch), sinPitch = Math.sin(this.pitch);
    const selectedZone=this.levels.find(level=>level.id===this.selectedId)?.scene.travelZone;
    for (const [x, y, nx, ny, nz, offset] of this.normals) {
      const forward = nz * cosPitch - ny * sinPitch;
      const wx = nx * cosYaw + forward * sinYaw;
      const wz = forward * cosYaw - nx * sinYaw;
      const wy = clamp(ny * cosPitch + nz * sinPitch, -1, 1);
      const lon = Math.atan2(wx, wz), lat = Math.asin(wy);
      const tx = clamp(Math.floor((lon / Math.PI + 1) * 360), 0, 719);
      const ty = clamp(Math.floor((.5 - lat / Math.PI) * 360), 0, 359);
      const index = ty * 720 + tx, land = this.landMask?.[index];
      const noise = grain(tx, ty), broad = (Math.sin(lon * 9 + Math.cos(lat * 13)) + Math.cos(lat * 17 - lon * 6)) * .5;
      const light = .30 + .70 * Math.max(0, nx * -.5 + ny * .52 + nz * .69);
      const coast = this.coastMask?.[index] ? 13 : 0;
      let r, g, b;
      if (land) {
        const zone=zoneForCoordinates(lat/RAD,lon/RAD);
        const zoneColor=[1,3,5].map(index=>parseInt(zone.color.slice(index,index+2),16));
        const active=selectedZone===zone.id;
        const boost=active?19:0;
        r = (zoneColor[0] + broad * 7 + noise * 9 + coast + boost) * light;
        g = (zoneColor[1] + broad * 7 + noise * 9 + coast * .6 + boost) * light;
        b = (zoneColor[2] + broad * 7 + noise * 9 + coast * .4 + boost) * light;
      } else {
        const wave = Math.sin(tx * .28 + ty * .16) * 2 + noise * 5;
        r = (43 + wave) * light;
        g = (70 + wave) * light;
        b = (76 + wave) * light;
      }
      // Sunset strikes the upper-left limb, rather than outlining every coast.
      const rim = Math.pow(1 - nz, 3.3) * clamp((-nx + ny) * .65, 0, 1);
      r += rim * 113; g += rim * 59; b += rim * 44;
      const shade = 1 - .13 * (1 - nz);
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
      const size = selected ? 3 : 2;
      ctx.fillStyle = '#0c2024'; ctx.fillRect(x - size - 1, y - size - 1, size * 2 + 2, size * 2 + 2);
      ctx.fillStyle = cleared ? '#f0c285' : selected ? '#f6ccb0' : '#c5bb9e';
      ctx.fillRect(x - size, y - size, size * 2, size * 2);
      ctx.fillStyle = '#fff1ce'; ctx.fillRect(x - 1, y - size, 1, 2);
      if (selected || cleared) {
        const radius = selected ? 7 : 5;
        ctx.strokeStyle = selected ? '#e4b194aa' : '#d0ab6555'; ctx.lineWidth = 1;
        ctx.strokeRect(x - radius, y - radius, radius * 2, radius * 2);
        ctx.fillStyle = '#e8b18a66';
        ctx.fillRect(x - 1, y - radius - 3, 1, 2); ctx.fillRect(x - 1, y + radius + 1, 1, 2);
      }
      this.projected.push({ id: level.id, x, y, depth, level, levels });
      if (selected) {
        this.placeLabel(`place:${key}`, level.location.name, x, y, 'globe-place-label');
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
      this.canvas.title = marker ? marker.levels.length > 1 ? `${marker.level.location.name} · ${marker.levels.length} 处风景；再次点击切换` : `${marker.level.location.name} · ${marker.level.name}` : '';
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

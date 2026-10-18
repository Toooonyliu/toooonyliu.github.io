import maplibregl from "maplibre-gl";
import { zenlyStyle } from "./mapStyle";
import "maplibre-gl/dist/maplibre-gl.css";
import { type Meal, users } from "./data";

/**
 * Interactive, cartoon-styled street map in the spirit of Zenly: pastel land,
 * bright water and parks, white roads, soft 3D buildings and a tilted camera.
 * Vector tiles from OpenFreeMap (OpenStreetMap data, keyless). Restaurants sit
 * at their catalog addresses; home-cooked meals only get a ~400 m neighbourhood
 * circle, never a point. If tiles cannot load, the caller falls back to the
 * original illustrated Pittsburgh.
 */
export type LngLat = [number, number];
export const venueCoords: Record<string, LngLat> = {
  kura_sushi: [-79.9646, 40.4269],       // 415 Cinema Dr, South Side
  speckled_egg: [-79.9969, 40.4404],     // 501 Grant St, Downtown
  meat_potatoes: [-80.0016, 40.4428],    // 649 Penn Ave, Downtown
  everyday_noodles: [-79.9226, 40.4380], // 5875 Forbes Ave, Squirrel Hill
  noodlehead: [-79.9255, 40.4585],       // 242 S Highland Ave, Shadyside
  apteka: [-79.9500, 40.4652],           // 4606 Penn Ave, Bloomfield
  pamelas_strip: [-79.9845, 40.4512],    // 60 21st St, Strip District
  pusadees_garden: [-79.9518, 40.4822],  // 5319 Butler St, Lawrenceville
  gaucho: [-80.0022, 40.4431],           // 146 6th St, Downtown
};
/** Neighbourhood centres only (never a home address). */
const homeAreas: Record<string, LngLat> = {
  daniel: [-79.9235, 40.4365], maya: [-79.9330, 40.4530], eric: [-79.9560, 40.4420],
  anika: [-79.9465, 40.4610], jordan: [-79.9610, 40.4700],
};
export const PITTSBURGH: LngLat = [-79.968, 40.448];

export type RealPin = { meal: Meal; lnglat: LngLat; approximate: boolean };
export function realPins(meals: Meal[]): RealPin[] {
  const seen = new Map<string, number>();
  return meals.flatMap((meal, index) => {
    const home = meal.type === "homemade";
    const key = home ? `home:${meal.userId}` : meal.venueId ? `venue:${meal.venueId}` : "";
    const base: LngLat | undefined = home ? homeAreas[meal.userId] ?? [PITTSBURGH[0] + 0.01, PITTSBURGH[1] + ((index % 5) - 2) * 0.004] : meal.venueId ? venueCoords[meal.venueId] : undefined;
    if (!key || !base) return [];
    const n = seen.get(key) ?? 0; seen.set(key, n + 1);
    // Several posts at one place fan out slightly so each stays tappable.
    return [{ meal, approximate: home, lnglat: [base[0] + n * 0.0016, base[1] - n * 0.0011] as LngLat }];
  });
}

const esc = (value: string) => value.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
function pinElement(pin: RealPin, label: { person: string; time: string; place: string; title: string }, selected: boolean, onClick: () => void) {
  const user = users.find(u => u.id === pin.meal.userId);
  const photo = pin.meal.photo || user?.avatar || "";
  const el = document.createElement("button");
  el.type = "button";
  el.className = "real-pin-host";
  el.setAttribute("aria-label", `${label.person} · ${label.title}`);
  el.innerHTML = `<span class="real-pin${selected ? " selected" : ""}${pin.approximate ? " approximate" : ""}">
    <span class="world-food"><img src="${esc(photo)}" alt="" draggable="false"/></span>
    ${user?.avatar ? `<img class="world-avatar" src="${esc(user.avatar)}" alt="" draggable="false"/>` : ""}
    <span class="world-person">${esc(label.person)}<span>${esc(label.time)}</span></span>
    <span class="world-place">${esc(label.place)}</span></span>`;
  el.addEventListener("click", event => { event.stopPropagation(); onClick(); });
  return el;
}

/** Circle polygon (approx. metres) for home-cooked meals. */
function circle([lng, lat]: LngLat, radius = 420, steps = 48) {
  const coords: LngLat[] = [];
  const dLat = radius / 111_320, dLng = radius / (111_320 * Math.cos(lat * Math.PI / 180));
  for (let i = 0; i <= steps; i++) { const a = (i / steps) * Math.PI * 2; coords.push([lng + dLng * Math.cos(a), lat + dLat * Math.sin(a)]); }
  return coords;
}

export type RealMap = {
  setPins: (pins: { pin: RealPin; label: { person: string; time: string; place: string; title: string }; selected: boolean; onClick: () => void }[]) => void;
  fitAll: (points: LngLat[], animate?: boolean) => void;
  flyTo: (lnglat: LngLat) => void;
  zoomIn: () => void; zoomOut: () => void; resize: () => void; dispose: () => void;
};

export function createRealMap(element: HTMLElement, onTiles: (ok: boolean) => void): RealMap {
  const map = new maplibregl.Map({
    container: element, style: zenlyStyle(), center: PITTSBURGH, zoom: 12.6, pitch: 48, bearing: -12,
    minZoom: 3, maxZoom: 18.5, maxPitch: 60, attributionControl: { compact: true }, dragRotate: true, cooperativeGestures: false,
  });
  let decided = false;
  const decide = (ok: boolean) => { if (!decided) { decided = true; onTiles(ok); } };
  map.on("load", () => decide(true));
  let errors = 0;
  map.on("error", () => { errors++; if (errors >= 3 && !map.loaded()) decide(false); });
  const timer = window.setTimeout(() => decide(!!map.isStyleLoaded() && map.areTilesLoaded()), 9000);

  map.on("load", () => {
    map.addSource("homes", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    map.addLayer({ id: "home-fill", type: "fill", source: "homes", paint: { "fill-color": "#ff8fb1", "fill-opacity": 0.16 } });
    map.addLayer({ id: "home-line", type: "line", source: "homes", paint: { "line-color": "#ff6f9c", "line-width": 1.5, "line-dasharray": [2, 2] } });
    flushHomes();
  });
  let markers: maplibregl.Marker[] = [];
  let homes: LngLat[] = [];
  const flushHomes = () => {
    const source = map.getSource("homes") as maplibregl.GeoJSONSource | undefined;
    source?.setData({ type: "FeatureCollection", features: homes.map(h => ({ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [circle(h)] } })) });
  };
  // Far out, pins shrink to photo-only so nearby restaurants don't pile up.
  const density = () => { element.classList.toggle("zoom-far", map.getZoom() < 14); element.classList.toggle("zoom-world", map.getZoom() < 10.5); };
  map.on("zoom", density); density();

  return {
    setPins(list) {
      markers.forEach(m => m.remove());
      markers = list.map(({ pin, label, selected, onClick }) => {
        const marker = new maplibregl.Marker({ element: pinElement(pin, label, selected, onClick), anchor: "center", offset: [0, 16] }).setLngLat(pin.lnglat).addTo(map);
        if (selected) marker.getElement().style.zIndex = "5";
        return marker;
      });
      homes = list.filter(p => p.pin.approximate).map(p => p.pin.lnglat);
      if (map.isStyleLoaded()) flushHomes();
    },
    fitAll(points, animate = true) {
      if (!points.length) return;
      const bounds = points.reduce((b, p) => b.extend(p), new maplibregl.LngLatBounds(points[0], points[0]));
      map.fitBounds(bounds, { padding: { top: 150, bottom: 190, left: 60, right: 60 }, maxZoom: 14.6, pitch: 48, bearing: -12, animate });
    },
    flyTo(lnglat) { map.flyTo({ center: lnglat, zoom: 15.5, pitch: 55, duration: 900, offset: [0, -60] }); },
    zoomIn() { map.zoomIn(); }, zoomOut() { map.zoomOut(); },
    resize() { map.resize(); },
    dispose() { window.clearTimeout(timer); markers.forEach(m => m.remove()); map.remove(); },
  };
}

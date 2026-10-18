import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { type Meal, users } from "./data";

/**
 * Real, zoomable street map (Leaflet + CARTO dark raster tiles, © OpenStreetMap).
 * Restaurants sit at their real catalog addresses. Home-cooked meals never get a
 * precise point: they are drawn as a ~400 m neighbourhood circle. If tiles cannot
 * load (e.g. blocked network), the caller falls back to the illustrated map.
 */
export const venueCoords: Record<string, [number, number]> = {
  kura_sushi: [40.4269, -79.9646],      // 415 Cinema Dr, South Side
  speckled_egg: [40.4404, -79.9969],    // 501 Grant St, Downtown
  meat_potatoes: [40.4428, -80.0016],   // 649 Penn Ave, Downtown
  everyday_noodles: [40.4380, -79.9226],// 5875 Forbes Ave, Squirrel Hill
  noodlehead: [40.4585, -79.9255],      // 242 S Highland Ave, Shadyside
  apteka: [40.4652, -79.9500],          // 4606 Penn Ave, Bloomfield
  pamelas_strip: [40.4512, -79.9845],   // 60 21st St, Strip District
  pusadees_garden: [40.4822, -79.9518], // 5319 Butler St, Lawrenceville
  gaucho: [40.4431, -80.0022],          // 146 6th St, Downtown
};
/** Neighbourhood centres only (never a home address). */
const homeAreas: Record<string, [number, number]> = {
  daniel: [40.4365, -79.9235], maya: [40.4530, -79.9330], eric: [40.4420, -79.9560],
  anika: [40.4610, -79.9465], jordan: [40.4700, -79.9610],
};
export const PITTSBURGH: [number, number] = [40.448, -79.968];

export type RealPin = { meal: Meal; latlng: [number, number]; approximate: boolean };
export function realPins(meals: Meal[]): RealPin[] {
  const seen = new Map<string, number>();
  return meals.flatMap((meal, index) => {
    const home = meal.type === "homemade";
    const key = home ? `home:${meal.userId}` : meal.venueId ? `venue:${meal.venueId}` : "";
    const base = home ? homeAreas[meal.userId] ?? [PITTSBURGH[0] + ((index % 5) - 2) * 0.004, PITTSBURGH[1] + 0.01] : meal.venueId ? venueCoords[meal.venueId] : undefined;
    if (!key || !base) return [];
    const n = seen.get(key) ?? 0; seen.set(key, n + 1);
    // Several posts at one place fan out slightly so each stays tappable.
    return [{ meal, approximate: home, latlng: [base[0] - n * 0.0011, base[1] + n * 0.0016] as [number, number] }];
  });
}

const esc = (value: string) => value.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
export function pinIcon(pin: RealPin, label: { person: string; time: string; place: string }, selected: boolean) {
  const user = users.find(u => u.id === pin.meal.userId);
  const photo = pin.meal.photo || user?.avatar || "";
  const html = `<span class="real-pin${selected ? " selected" : ""}${pin.approximate ? " approximate" : ""}">
    <span class="world-food"><img src="${esc(photo)}" alt="" draggable="false"/></span>
    ${user?.avatar ? `<img class="world-avatar" src="${esc(user.avatar)}" alt="" draggable="false"/>` : ""}
    <span class="world-person">${esc(label.person)}<span>${esc(label.time)}</span></span>
    <span class="world-place">${esc(label.place)}</span></span>`;
  return L.divIcon({ html, className: "real-pin-host", iconSize: [86, 120], iconAnchor: [43, 44] });
}

export function createRealMap(element: HTMLElement, onTiles: (ok: boolean) => void) {
  const map = L.map(element, { center: PITTSBURGH, zoom: 13, minZoom: 3, maxZoom: 18, zoomControl: false, attributionControl: true, worldCopyJump: true });
  map.attributionControl.setPrefix(false);
  let loaded = 0, failed = 0, decided = false;
  const decide = (ok: boolean) => { if (!decided) { decided = true; onTiles(ok); } };
  const tiles = L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    subdomains: "abcd", maxZoom: 19, crossOrigin: true,
    attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> © <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>',
  });
  tiles.on("tileload", () => { loaded++; if (loaded >= 2) decide(true); });
  tiles.on("tileerror", () => { failed++; if (failed >= 4 && loaded === 0) decide(false); });
  tiles.addTo(map);
  const timer = window.setTimeout(() => decide(loaded > 0), 7000);
  const layer = L.layerGroup().addTo(map);
  // Far out, pins shrink to photo-only so nearby restaurants don't pile up; labels return when zoomed in.
  const density = () => { element.classList.toggle("zoom-far", map.getZoom() < 15); element.classList.toggle("zoom-world", map.getZoom() < 11); };
  map.on("zoomend", density); density();
  return { map, layer, dispose: () => { window.clearTimeout(timer); map.remove(); } };
}

export function homeCircle(latlng: [number, number]) {
  return L.circle(latlng, { radius: 420, color: "#d6eeb8", weight: 1, opacity: .7, dashArray: "4 5", fillColor: "#d6eeb8", fillOpacity: .1, interactive: false });
}
export { L };

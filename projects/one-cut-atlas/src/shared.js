/** Small, explicit contracts shared by UI, renderer, storage and API. */
import { TRAVEL_ZONES } from './region-presets.js';
export const WORLD = { width: 960, height: 540, ground: 422 };
export const BACKDROP_MAX_LENGTH = 1_200_000;
export const ENVIRONMENTS = ['traditional_street', 'modern_city', 'wilderness', 'forest'];
export const LIGHTINGS = ['day', 'sunset', 'night'];
export const STYLES = ['kendo', 'suit', 'cowboy', 'traveler'];
export const ELEMENTS = ['wooden_buildings', 'lanterns', 'skyscrapers', 'neon_signs', 'trees', 'mountains', 'rocks', 'water'];
export const LABELS = {
 traditional_street: 'Old Town', modern_city: 'City', wilderness: 'Wilds', forest: 'Forest',
 day: 'Day', sunset: 'Dusk', night: 'Night',
 kendo: 'Ronin', suit: 'Suit', cowboy: 'Outlaw', traveler: 'Traveler',
 wooden_buildings: 'Timber', lanterns: 'Lanterns', skyscrapers: 'Skyscrapers', neon_signs: 'Neon',
 trees: 'Trees', mountains: 'Mountains', rocks: 'Rocks', water: 'Water'
};
export const CITIES = [
 { id:'kyoto', name:'Kyoto', country:'Japan', lat:35.0116, lon:135.7681 },
 { id:'tokyo', name:'Tokyo', country:'Japan', lat:35.6762, lon:139.6503 },
 { id:'shanghai', name:'Shanghai', country:'China', lat:31.2304, lon:121.4737 },
 { id:'beijing', name:'Beijing', country:'China', lat:39.9042, lon:116.4074 },
 { id:'new-york', name:'New York', country:'United States', lat:40.7128, lon:-74.0060 },
 { id:'pittsburgh', name:'Pittsburgh', country:'United States', lat:40.4406, lon:-79.9959 },
 { id:'paris', name:'Paris', country:'France', lat:48.8566, lon:2.3522 },
 { id:'london', name:'London', country:'United Kingdom', lat:51.5074, lon:-0.1278 },
 { id:'cairo', name:'Cairo', country:'Egypt', lat:30.0444, lon:31.2357 },
 { id:'cape-town', name:'Cape Town', country:'South Africa', lat:-33.9249, lon:18.4241 },
 { id:'sydney', name:'Sydney', country:'Australia', lat:-33.8688, lon:151.2093 },
 { id:'rio', name:'Rio de Janeiro', country:'Brazil', lat:-22.9068, lon:-43.1729 }
];
export function defaultScene(environment = 'traditional_street', lighting = 'sunset') {
 const elements = {traditional_street:['wooden_buildings','lanterns'], modern_city:['skyscrapers','neon_signs'], wilderness:['rocks','mountains'], forest:['trees','mountains']}[environment] || ['trees','mountains'];
 return { environment, lighting, elements, palette:{sky:'#604359',accent:'#e6b66e',ambient:'#243442'}, opponentStyle:'kendo', summary:'Custom arena.', source:'manual' };
}
export function validateScene(value = {}) {
 const fallback = defaultScene();
 const color = (x,d) => typeof x === 'string' && /^#[0-9a-f]{6}$/i.test(x) ? x : d;
 return {
  travelZone: TRAVEL_ZONES.some(zone=>zone.id===value.travelZone) ? value.travelZone : null,
  stageId: TRAVEL_ZONES.some(zone=>zone.flagship&&zone.id===value.stageId) ? value.stageId : null,
  environment: ENVIRONMENTS.includes(value.environment) ? value.environment : fallback.environment,
  lighting: LIGHTINGS.includes(value.lighting) ? value.lighting : fallback.lighting,
  elements: Array.isArray(value.elements) ? [...new Set(value.elements.filter(x => ELEMENTS.includes(x)))].slice(0,4) : fallback.elements,
  palette:{sky:color(value.palette?.sky,fallback.palette.sky),accent:color(value.palette?.accent,fallback.palette.accent),ambient:color(value.palette?.ambient,fallback.palette.ambient)},
  opponentStyle: STYLES.includes(value.opponentStyle) ? value.opponentStyle : 'kendo',
  summary:typeof value.summary === 'string' ? value.summary.slice(0,240) : fallback.summary,
  source:value.source === 'ai' ? 'ai' : 'manual',
  // A painted photo arena: a small 480×270 data URL prepared in the browser, or null for preset art.
  backdrop:typeof value.backdrop === 'string' && value.backdrop.length <= BACKDROP_MAX_LENGTH && /^data:image\/(webp|png|jpeg);base64,[A-Za-z0-9+/]+=*$/.test(value.backdrop) ? value.backdrop : null,
  placeName:typeof value.placeName === 'string' && value.placeName.trim() ? value.placeName.trim().slice(0,80) : null
 };
}
/** A photo stage remembers what the scout saw, so its arena can be painted later. Anything unusable becomes null. */
export function validatePlaceRecord(value) {
 if (!value || typeof value !== 'object') return null;
 const text = (x, max) => typeof x === 'string' && x.trim() ? x.trim().slice(0, max) : null;
 if (typeof value.scenePrompt !== 'string' || !/^[A-Za-z0-9 ,.;:'()\-]{20,300}$/.test(value.scenePrompt.trim())) return null;
 if (!['exterior', 'interior'].includes(value.setting) || !LIGHTINGS.includes(value.lighting) || !TRAVEL_ZONES.some(zone => zone.id === value.zone)) return null;
 const name = text(value.name, 80);
 return { name: name && /^[A-Za-z0-9 ,.'()\-]{2,80}$/.test(name) ? name : null, scenePrompt: value.scenePrompt.trim(), setting: value.setting, lighting: value.lighting, zone: value.zone, environment: ENVIRONMENTS.includes(value.environment) ? value.environment : 'traditional_street' };
}
/** @typedef {{id:string,name:string,location:{name:string,lat:number,lon:number},scene:object,photo:string|null,cleared:boolean,createdAt:string}} Level */
/** Engine contract: new DuelEngine({seed,difficulty}); tick(seconds,{left,right,attack,parry}); snapshot(); reset(seed?); setPaused(boolean).
 * snapshot = {phase:'countdown'|'playing'|'result',countdown:number,time:number,player:Fighter,opponent:Fighter,result:null|'victory'|'defeat'|'draw',effects:Array,message:string,paused:boolean}.
 * Fighter = {x:number,facing:1|-1,state:string,timer:number,stateDuration:number,dead:boolean}.
 * Renderer: drawScene(ctx,scene,time); drawFighter(ctx,fighter,style,isPlayer,time); drawEffects(ctx,effects,time).
 * All render coordinates use WORLD, fighters share ground=422. Rendering has no side effects.
 * Photo module: preparePhoto(file) -> {dataUrl,thumbnail,palette,gps}; requestScene(dataUrl) -> validated scene or throw.
 * Storage: loadLevels() -> Level[]; saveLevel(level); removeLevel(id), async; errors are surfaced to the UI.
 */

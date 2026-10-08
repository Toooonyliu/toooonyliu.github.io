/** Small, explicit contracts shared by UI, renderer, storage and API. */
import { TRAVEL_ZONES } from './region-presets.js';
export const WORLD = { width: 960, height: 540, ground: 422 };
export const ENVIRONMENTS = ['traditional_street', 'modern_city', 'wilderness', 'forest'];
export const LIGHTINGS = ['day', 'sunset', 'night'];
export const STYLES = ['kendo', 'suit', 'cowboy', 'traveler'];
export const ELEMENTS = ['wooden_buildings', 'lanterns', 'skyscrapers', 'neon_signs', 'trees', 'mountains', 'rocks', 'water'];
export const LABELS = {
 traditional_street: '古街', modern_city: '都市', wilderness: '荒野', forest: '森林',
 day: '白昼', sunset: '黄昏', night: '夜晚',
 kendo: '剑客', suit: '西装', cowboy: '牛仔', traveler: '旅人',
 wooden_buildings: '木屋', lanterns: '灯笼', skyscrapers: '高楼', neon_signs: '霓虹',
 trees: '树木', mountains: '远山', rocks: '岩石', water: '水面'
};
export const CITIES = [
 { id:'kyoto', name:'京都', country:'日本', lat:35.0116, lon:135.7681 },
 { id:'tokyo', name:'东京', country:'日本', lat:35.6762, lon:139.6503 },
 { id:'shanghai', name:'上海', country:'中国', lat:31.2304, lon:121.4737 },
 { id:'beijing', name:'北京', country:'中国', lat:39.9042, lon:116.4074 },
 { id:'new-york', name:'纽约', country:'美国', lat:40.7128, lon:-74.0060 },
 { id:'pittsburgh', name:'匹兹堡', country:'美国', lat:40.4406, lon:-79.9959 },
 { id:'paris', name:'巴黎', country:'法国', lat:48.8566, lon:2.3522 },
 { id:'london', name:'伦敦', country:'英国', lat:51.5074, lon:-0.1278 },
 { id:'cairo', name:'开罗', country:'埃及', lat:30.0444, lon:31.2357 },
 { id:'cape-town', name:'开普敦', country:'南非', lat:-33.9249, lon:18.4241 },
 { id:'sydney', name:'悉尼', country:'澳大利亚', lat:-33.8688, lon:151.2093 },
 { id:'rio', name:'里约热内卢', country:'巴西', lat:-22.9068, lon:-43.1729 }
];
export function defaultScene(environment = 'traditional_street', lighting = 'sunset') {
 const elements = {traditional_street:['wooden_buildings','lanterns'], modern_city:['skyscrapers','neon_signs'], wilderness:['rocks','mountains'], forest:['trees','mountains']}[environment] || ['trees','mountains'];
 return { environment, lighting, elements, palette:{sky:'#604359',accent:'#e6b66e',ambient:'#243442'}, opponentStyle:'kendo', summary:'手动配置的原创像素场景。', source:'manual' };
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
  source:value.source === 'ai' ? 'ai' : 'manual'
 };
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

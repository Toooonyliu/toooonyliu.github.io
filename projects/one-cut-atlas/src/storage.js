import { CITIES, validateScene } from './shared.js';

const DB_NAME='one-cut-atlas', STORE='levels';
let databasePromise;

function storageError(message,cause) {
  const error=new Error(message,{cause});
  error.name='StorageError';
  return error;
}

function openDatabase() {
  if (databasePromise) return databasePromise;
  databasePromise=new Promise((resolve,reject)=>{
    if (!globalThis.indexedDB) { reject(storageError('浏览器不支持本地存储。此关卡还没有保存。')); return; }
    const request=indexedDB.open(DB_NAME,1);
    request.onupgradeneeded=()=>{ if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE,{keyPath:'id'}); };
    request.onerror=()=>reject(storageError('无法打开本地存储。请检查浏览器的隐私设置。',request.error));
    request.onblocked=()=>reject(storageError('本地存储被另一个页面占用。请关闭旧的游戏页面后重试。'));
    request.onsuccess=()=>{
      const db=request.result;
      db.onversionchange=()=>{ db.close(); databasePromise=undefined; };
      resolve(db);
    };
  }).catch(error=>{ databasePromise=undefined; throw error; });
  return databasePromise;
}

export function newLevelId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  if (!globalThis.crypto?.getRandomValues) throw storageError('浏览器无法创建唯一关卡编号。请使用现代浏览器。');
  const bytes=crypto.getRandomValues(new Uint8Array(16)); bytes[6]=(bytes[6]&15)|64; bytes[8]=(bytes[8]&63)|128;
  const s=[...bytes].map(x=>x.toString(16).padStart(2,'0')).join('');
  return `${s.slice(0,8)}-${s.slice(8,12)}-${s.slice(12,16)}-${s.slice(16,20)}-${s.slice(20)}`;
}

function normalizeLevel(level) {
  if (!level || typeof level.id !== 'string' || !level.id.trim() || level.id.length > 120) throw storageError('关卡编号无效，无法保存。');
  const location=level.location;
  if (!location || typeof location.name !== 'string' || !location.name.trim() || !Number.isFinite(location.lat) || !Number.isFinite(location.lon) || Math.abs(location.lat)>90 || Math.abs(location.lon)>180) throw storageError('请确认有效的地点名称和坐标后保存。');
  const city=CITIES.find(city=>city.name===location.name && Math.abs(city.lat-location.lat)<.001 && Math.abs(city.lon-location.lon)<.001);
  const country=typeof location.country==='string' ? location.country.slice(0,100) : city?.country;
  if (level.photo != null && (typeof level.photo !== 'string' || !/^data:image\/(jpeg|png|webp);base64,/.test(level.photo) || level.photo.length > 3_000_000)) throw storageError('照片无法保存，请重新准备图片。');
  return { id:level.id, name:String(level.name || location.name).slice(0,100), location:{name:location.name.slice(0,100),lat:location.lat,lon:location.lon,...(country?{country}:{})}, ...(typeof level.isDemo==='boolean'?{isDemo:level.isDemo}:{}), scene:validateScene(level.scene || {}), photo:level.photo || null, cleared:level.cleared === true, createdAt:Number.isFinite(Date.parse(level.createdAt)) ? level.createdAt : new Date().toISOString() };
}

export async function loadLevels() {
  const db=await openDatabase();
  return new Promise((resolve,reject)=>{
    const transaction=db.transaction(STORE,'readonly'), request=transaction.objectStore(STORE).getAll();
    let rows=[];
    request.onsuccess=()=>{ rows=request.result; };
    transaction.oncomplete=()=>{
      try { resolve(rows.map(normalizeLevel).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))); }
      catch(error) { reject(storageError('本地关卡记录不完整。请刷新后重试，或清除该站点的存储。',error)); }
    };
    transaction.onerror=()=>reject(storageError('读取关卡失败。已保存的数据没有被删除。',transaction.error));
    transaction.onabort=()=>reject(storageError('读取关卡被中断，请重试。',transaction.error));
  });
}

/** Atomic read + write prevents a lost rematch from removing prior victory. */
export async function saveLevel(level) {
  const clean=normalizeLevel(level), db=await openDatabase();
  return new Promise((resolve,reject)=>{
    const transaction=db.transaction(STORE,'readwrite'), store=transaction.objectStore(STORE);
    let saved;
    const request=store.get(clean.id);
    request.onsuccess=()=>{
      const previous=request.result;
      saved={...clean,cleared:clean.cleared || previous?.cleared === true,createdAt:previous?.createdAt || clean.createdAt};
      store.put(saved);
    };
    transaction.oncomplete=()=>resolve(saved);
    transaction.onerror=()=>reject(storageError('保存失败，关卡尚未写入本机。可能是存储空间不足。',transaction.error));
    transaction.onabort=()=>reject(storageError('保存被中断，关卡尚未写入本机。请重试。',transaction.error));
  });
}

export async function removeLevel(id) {
  if (typeof id !== 'string' || !id) throw storageError('关卡编号无效。');
  const db=await openDatabase();
  return new Promise((resolve,reject)=>{
    const transaction=db.transaction(STORE,'readwrite');
    transaction.objectStore(STORE).delete(id);
    transaction.oncomplete=()=>resolve();
    transaction.onerror=()=>reject(storageError('删除关卡失败，请重试。',transaction.error));
    transaction.onabort=()=>reject(storageError('删除被中断，请重试。',transaction.error));
  });
}

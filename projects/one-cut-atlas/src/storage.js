import { CITIES, validateScene, validatePlaceRecord } from './shared.js';
import { validateAvatar } from './avatar.js';

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
    if (!globalThis.indexedDB) { reject(storageError('Local storage is unavailable. This duel was not saved.')); return; }
    const request=indexedDB.open(DB_NAME,1);
    request.onupgradeneeded=()=>{ if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE,{keyPath:'id'}); };
    request.onerror=()=>reject(storageError('Could not open your save. Check browser privacy settings.',request.error));
    request.onblocked=()=>reject(storageError('Close other game tabs and try again.'));
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
  if (!globalThis.crypto?.getRandomValues) throw storageError('A modern browser is required to save a duel.');
  const bytes=crypto.getRandomValues(new Uint8Array(16)); bytes[6]=(bytes[6]&15)|64; bytes[8]=(bytes[8]&63)|128;
  const s=[...bytes].map(x=>x.toString(16).padStart(2,'0')).join('');
  return `${s.slice(0,8)}-${s.slice(8,12)}-${s.slice(12,16)}-${s.slice(16,20)}-${s.slice(20)}`;
}

function normalizeLevel(level) {
  if (!level || typeof level.id !== 'string' || !level.id.trim() || level.id.length > 120) throw storageError('Invalid duel ID. Nothing was saved.');
  const location=level.location;
  if (!location || typeof location.name !== 'string' || !location.name.trim() || !Number.isFinite(location.lat) || !Number.isFinite(location.lon) || Math.abs(location.lat)>90 || Math.abs(location.lon)>180) throw storageError('Choose a valid location before saving.');
  const city=CITIES.find(city=>city.name===location.name && Math.abs(city.lat-location.lat)<.001 && Math.abs(city.lon-location.lon)<.001);
  const country=typeof location.country==='string' ? location.country.slice(0,100) : city?.country;
  if (level.photo != null && (typeof level.photo !== 'string' || !/^data:image\/(jpeg|png|webp);base64,/.test(level.photo) || level.photo.length > 3_000_000)) throw storageError('This photo could not be saved. Choose it again.');
  const place = validatePlaceRecord(level.place);
  return { id:level.id, name:String(level.name || location.name).slice(0,100), ...(place ? { place } : {}), location:{name:location.name.slice(0,100),lat:location.lat,lon:location.lon,...(country?{country}:{})}, ...(typeof level.isDemo==='boolean'?{isDemo:level.isDemo}:{}), scene:validateScene(level.scene || {}), ...(level.avatar&&typeof level.avatar==='object'?{avatar:validateAvatar(level.avatar)}:{}), photo:level.photo || null, cleared:level.cleared === true, createdAt:Number.isFinite(Date.parse(level.createdAt)) ? level.createdAt : new Date().toISOString() };
}

export async function loadLevels() {
  const db=await openDatabase();
  return new Promise((resolve,reject)=>{
    const transaction=db.transaction(STORE,'readonly'), request=transaction.objectStore(STORE).getAll();
    let rows=[];
    request.onsuccess=()=>{ rows=request.result; };
    transaction.oncomplete=()=>{
      try { resolve(rows.map(normalizeLevel).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))); }
      catch(error) { reject(storageError('Your save could not be read. Refresh and try again.',error)); }
    };
    transaction.onerror=()=>reject(storageError('Could not read your save. Existing data is safe.',transaction.error));
    transaction.onabort=()=>reject(storageError('Loading interrupted. Try again.',transaction.error));
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
    transaction.onerror=()=>reject(storageError('Not saved. Your device may be out of storage.',transaction.error));
    transaction.onabort=()=>reject(storageError('Save interrupted. Try again.',transaction.error));
  });
}

export async function removeLevel(id) {
  if (typeof id !== 'string' || !id) throw storageError('Invalid duel ID.');
  const db=await openDatabase();
  return new Promise((resolve,reject)=>{
    const transaction=db.transaction(STORE,'readwrite');
    transaction.objectStore(STORE).delete(id);
    transaction.oncomplete=()=>resolve();
    transaction.onerror=()=>reject(storageError('Could not delete this duel. Try again.',transaction.error));
    transaction.onabort=()=>reject(storageError('Delete interrupted. Try again.',transaction.error));
  });
}

// A completed search is a local convenience, separate from travel/account data.
const key='flighty-last-destination-v1';
export function readLastSearch(){try{const value=localStorage.getItem(key);return value&&value.length<=60?value:null;}catch{return null;}}
export function saveLastSearch(destination:string){try{localStorage.setItem(key,destination.slice(0,60));}catch{/* Private or full storage must not block comparison. */}}

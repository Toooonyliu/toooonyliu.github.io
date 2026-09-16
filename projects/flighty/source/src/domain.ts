import type {LoyaltyAccount,FlightCredit} from './loyalty';
export type Airport = { code: string; city: string; name: string; lat: number; lon: number; zone: string; country?:string };
export const airports: Record<string, Airport> = {
  LAX: {code:'LAX',city:'Los Angeles',name:'Los Angeles International',lat:33.9425,lon:-118.4081,zone:'America/Los_Angeles',country:'us'},
  HKG: {code:'HKG',city:'Hong Kong',name:'Hong Kong International',lat:22.308,lon:113.9185,zone:'Asia/Hong_Kong',country:'hk'},
  CAN: {code:'CAN',city:'Guangzhou',name:'Guangzhou Baiyun International',lat:23.3924,lon:113.2988,zone:'Asia/Shanghai',country:'cn'},
  EWR: {code:'EWR',city:'Newark',name:'Newark Liberty International',lat:40.6895,lon:-74.1745,zone:'America/New_York',country:'us'},
  SAN: {code:'SAN',city:'San Diego',name:'San Diego International',lat:32.7336,lon:-117.1897,zone:'America/Los_Angeles',country:'us'},
  SJC: {code:'SJC',city:'San Jose',name:'San Jose International',lat:37.3639,lon:-121.9289,zone:'America/Los_Angeles',country:'us'},
  OGG: {code:'OGG',city:'Kahului',name:'Kahului Airport',lat:20.8986,lon:-156.4305,zone:'Pacific/Honolulu',country:'us'},
  LAS: {code:'LAS',city:'Las Vegas',name:'Harry Reid International',lat:36.084,lon:-115.1537,zone:'America/Los_Angeles',country:'us'},

  PIT: { code:'PIT',city:'Pittsburgh',name:'Pittsburgh International',lat:40.4915,lon:-80.2329,zone:'America/New_York' },
  ORD: { code:'ORD',city:'Chicago',name:'Chicago O’Hare',lat:41.9786,lon:-87.9048,zone:'America/Chicago' },
  HND: { code:'HND',city:'Tokyo',name:'Tokyo Haneda',lat:35.5494,lon:139.7798,zone:'Asia/Tokyo',country:'jp' },
  KIX: { code:'KIX',city:'Osaka',name:'Kansai International',lat:34.4273,lon:135.2440,zone:'Asia/Tokyo',country:'jp' },
  SFO: { code:'SFO',city:'San Francisco',name:'San Francisco International',lat:37.6188,lon:-122.3754,zone:'America/Los_Angeles' },
  LHR: { code:'LHR',city:'London',name:'London Heathrow',lat:51.4700,lon:-0.4543,zone:'Europe/London',country:'gb' },
  JFK: { code:'JFK',city:'New York',name:'John F. Kennedy International',lat:40.6413,lon:-73.7781,zone:'America/New_York' },
};
export type Flight = { id:string; from:string; to:string; carrier:string; number:string; departure:string; arrival:string; status:'flown'|'planned'|'canceled'; km:number; minutes:number|null; gate?:string; seat?:string; dateOnly?:boolean; source?:'reference'|'manual'|'sample'|'live'; distanceEstimated?:boolean; aircraft?:string; registration?:string; delay?:number|null };
export type Trip = { id:string; title:string; flightIds:string[]; note:string; cover?:string; category?:'Work'|'Personal'; reason?:string; destination?:string; surface?:Record<string,string> };
export type State = { version:1; loyaltyAccounts?:LoyaltyAccount[]; flightCredits?:Record<string,FlightCredit>; pinnedProgram?:string; homeBases?:string[]; trips:Trip[]; rejected:string[]; dismissed:string[]; operations:{label:string; trips:Trip[]; rejected:string[]}[]; empty:boolean; addedFlights?:Flight[]; friends?:string[]; flightNotes?:Record<string,string>; flightFields?:Record<string,{booking:string;seat:string}> };
export const flights:Flight[] = [
  {id:'jp1',from:'PIT',to:'ORD',carrier:'United',number:'UA 2148',departure:'2026-05-03T12:00:00Z',arrival:'2026-05-03T13:35:00Z',status:'flown',km:664,minutes:95,seat:'12A'},
  {id:'jp2',from:'ORD',to:'HND',carrier:'ANA',number:'NH 111',departure:'2026-05-03T16:50:00Z',arrival:'2026-05-04T06:10:00Z',status:'flown',km:10140,minutes:800,seat:'24A'},
  {id:'jp3',from:'KIX',to:'SFO',carrier:'United',number:'UA 34',departure:'2026-05-14T07:50:00Z',arrival:'2026-05-14T18:10:00Z',status:'flown',km:8695,minutes:620,seat:'18F'},
  {id:'jp4',from:'SFO',to:'PIT',carrier:'United',number:'UA 2367',departure:'2026-05-14T20:00:00Z',arrival:'2026-05-15T00:50:00Z',status:'flown',km:3620,minutes:290,seat:'18F'},
  {id:'ch1',from:'PIT',to:'ORD',carrier:'United',number:'UA 1862',departure:'2026-04-08T13:00:00Z',arrival:'2026-04-08T14:40:00Z',status:'flown',km:664,minutes:100,seat:'14A'},
  {id:'ch2',from:'ORD',to:'PIT',carrier:'United',number:'UA 1471',departure:'2026-04-11T19:00:00Z',arrival:'2026-04-11T20:25:00Z',status:'flown',km:664,minutes:85,seat:'8A'},
  {id:'lo1',from:'PIT',to:'LHR',carrier:'British Airways',number:'BA 170',departure:'2026-03-10T01:00:00Z',arrival:'2026-03-10T08:15:00Z',status:'flown',km:5980,minutes:435,seat:'22A'},
  {id:'lo2',from:'LHR',to:'PIT',carrier:'British Airways',number:'BA 171',departure:'2026-03-15T16:00:00Z',arrival:'2026-03-16T00:15:00Z',status:'flown',km:5980,minutes:495,seat:'22A'},
  {id:'ny1',from:'PIT',to:'JFK',carrier:'Delta',number:'DL 5247',departure:'2025-12-30T14:00:00Z',arrival:'2025-12-30T15:30:00Z',status:'flown',km:547,minutes:null},
  {id:'ny2',from:'JFK',to:'PIT',carrier:'Delta',number:'DL 5089',departure:'2026-01-03T19:00:00Z',arrival:'2026-01-03T20:40:00Z',status:'flown',km:547,minutes:100},
  {id:'cancel',from:'PIT',to:'JFK',carrier:'Delta',number:'DL 5201',departure:'2025-12-30T10:00:00Z',arrival:'2025-12-30T11:30:00Z',status:'canceled',km:547,minutes:null},
  {id:'next',from:'PIT',to:'ORD',carrier:'United',number:'UA 2148',departure:'2026-09-15T13:00:00Z',arrival:'2026-09-15T14:40:00Z',status:'planned',km:664,minutes:100,gate:'B31',seat:'12A'},
];
// Screenshot dates use noon anchors for sorting only; exact times are unavailable.
export const reference2023:Flight[]=[
 {id:'ref23-cx882',from:'HKG',to:'LAX',carrier:'Cathay Pacific',number:'CX 882',departure:'2023-08-31T12:00:00+08:00',arrival:'',status:'flown',km:0,minutes:802,aircraft:'B777-300 ER',registration:'B-KPX'},
 {id:'ref23-cx983',from:'CAN',to:'HKG',carrier:'Cathay Pacific',number:'CX 983',departure:'2023-08-31T10:00:00+08:00',arrival:'',status:'flown',km:0,minutes:94,aircraft:'A330-300',registration:'B-HLN'},
 {id:'ref23-jl7017',from:'LAX',to:'HND',carrier:'Japan Airlines',number:'JL 7017',departure:'2023-06-28T12:00:00-07:00',arrival:'',status:'flown',km:0,minutes:703,aircraft:'B787-8',registration:'N877BF'},
 {id:'ref23-jl7039',from:'HND',to:'HKG',carrier:'Japan Airlines',number:'JL 7039',departure:'2023-06-28T10:00:00+09:00',arrival:'',status:'flown',km:0,minutes:247,aircraft:'B777-300 ER',registration:'B-KPX'},
].map(f=>({...f,status:'flown' as const,source:'reference' as const,dateOnly:true,distanceEstimated:true,km:routeDistance(f.from,f.to),delay:null}));
Object.assign(reference2023[0],{departure:'2023-08-31T16:51:00+08:00',arrival:'2023-08-31T15:13:00-07:00',dateOnly:false,distanceEstimated:false,km:11662,delay:3,gate:'3'});
export const reference2026:Flight={id:'ref26-ua821',from:'HKG',to:'LAX',carrier:'United',number:'UA 821',departure:'2026-08-21T21:41:00+08:00',arrival:'2026-08-21T20:28:00-07:00',minutes:827,km:11662,status:'flown',source:'reference',distanceEstimated:false,dateOnly:false,delay:8,aircraft:'B787-9',registration:'N26970'};
flights.push(...reference2023,reference2026);
export const reference2023Summary={km:23511,delayMinutes:9,displayedDelayAverage:4};
export function routeDistance(from:string,to:string){const a=airports[from],b=airports[to];if(!a||!b)return 0;const r=Math.PI/180,dLat=(b.lat-a.lat)*r,dLon=(b.lon-a.lon)*r;const h=Math.sin(dLat/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dLon/2)**2;return Math.round(6371.0088*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h)));}
export const flightMetadata=(f:Flight)=>({aircraft:f.aircraft??flightExtras[f.id]?.aircraft??'Unknown aircraft',delay:f.delay!==undefined?f.delay:flightExtras[f.id]?.delay??null,registration:f.registration});
export const duration=(minutes:number|null)=>minutes===null?'Unknown':`${Math.floor(minutes/60)}h ${minutes%60}m`;
export const compactDuration=(minutes:number)=>{const h=Math.round(minutes/60);return h>=24?`${Math.floor(h/24)}d ${h%24}h`:duration(minutes);};
export const personalFlights=(state:State)=>[...flights,...(state.addedFlights??[])];
export const byId = Object.fromEntries(flights.map(f=>[f.id,f]));
export const japanIds=['jp1','jp2','jp3','jp4'];
export const seed=():State=>({version:1,trips:[
  {id:'chicago',title:'Chicago',flightIds:['ch1','ch2'],note:'Leave more time for breakfast. The café near the gate gets busy in the morning.'},
  {id:'london',title:'London',flightIds:['lo1','lo2'],note:''},
  {id:'newyork',title:'New York',flightIds:['cancel','ny1','ny2'],note:'New Year with friends.'},
],rejected:[],dismissed:[],operations:[],empty:false});
export const ordered=(ids:string[],source=flights)=>[...new Set(ids)].map(id=>source.find(f=>f.id===id)).filter((f):f is Flight=>!!f).sort((a,b)=>Date.parse(a.departure)-Date.parse(b.departure));
export function tripDate(t:Pick<Trip,'flightIds'>,source=flights){const fs=ordered(t.flightIds,source);return fs[0]?.departure??'';}
export function date(f:Flight,year=false){return new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',...(year?{year:'numeric' as const}:{}),timeZone:airports[f.from].zone}).format(new Date(f.departure));}
export function time(iso:string,airport:string){return new Intl.DateTimeFormat('en-US',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:airports[airport].zone}).format(new Date(iso));}
export function range(t:Pick<Trip,'flightIds'>,source=flights){
 const fs=ordered(t.flightIds,source).filter(f=>f.status!=='canceled');if(!fs.length)return '';
 const first=fs[0],last=fs.at(-1)!;
 const startYear=new Intl.DateTimeFormat('en',{year:'numeric',timeZone:airports[first.from].zone}).format(new Date(first.departure));
 const endIso=last.arrival||last.departure,endZone=airports[last.arrival?last.to:last.from].zone;
 const endYear=new Intl.DateTimeFormat('en',{year:'numeric',timeZone:endZone}).format(new Date(endIso));
 const end=new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:endZone}).format(new Date(endIso));
 return `${date(first,startYear!==endYear)} – ${end}${last.arrival?'':' · final arrival unavailable'}`;
}
export function tripRoute(fs:Flight[]){
 const legs=[...fs].filter(f=>f.status==='flown').sort((a,b)=>a.departure.localeCompare(b.departure));if(!legs.length)return 'Route unavailable';
 if(legs.length===2&&legs[0].from===legs[1].to&&legs[0].to===legs[1].from)return `${legs[0].from} ↔ ${legs[0].to}`;
 return legs.map((f,i)=>i===0?`${f.from} → ${f.to}`:legs[i-1].to===f.from?` → ${f.to}`:` · ${f.from} → ${f.to}`).join('');
}
export function filterFlights(year:string,carrier='All airlines',source=flights){return source.filter(f=>f.status==='flown'&&(carrier==='All airlines'||f.carrier===carrier)&&(year==='All time'||new Intl.DateTimeFormat('en',{year:'numeric',timeZone:airports[f.from].zone}).format(new Date(f.departure))===year));}
export function totals(fs:Flight[]){const flown=fs.filter(f=>f.status==='flown');const refs=flown.filter(f=>reference2023.some(r=>r.id===f.id));const completeReference=reference2023.every(r=>refs.some(f=>f.id===r.id));return {count:flown.length,km:flown.reduce((n,f)=>n+f.km,0)+(completeReference?reference2023Summary.km-refs.reduce((n,f)=>n+f.km,0):0),estimated:flown.some(f=>f.distanceEstimated&&!(completeReference&&reference2023.some(r=>r.id===f.id))),reported:completeReference,minutes:flown.reduce((n,f)=>n+(f.minutes??0),0),missing:flown.filter(f=>f.minutes===null).length,airports:new Set(flown.flatMap(f=>[f.from,f.to])).size,carriers:new Set(flown.map(f=>f.carrier)).size};}
export type HistorySort='Date'|'From'|'To'|'Airline'|'Aircraft';
export const aircraftNames:Record<string,string>={'A330-300':'Airbus A330-300','B777-300 ER':'Boeing 777-300 ER','B777-300ER':'Boeing 777-300 ER','B787-8':'Boeing 787-8','B787-9':'Boeing 787-9','B737-800':'Boeing 737-800','CRJ-900':'Bombardier CRJ-900'};
export const aircraftCodes:Record<string,string>={'A330-300':'A333','B777-300 ER':'B77W','B777-300ER':'B77W','B787-8':'B788','B787-9':'B789','B737-800':'B738','CRJ-900':'CRJ9'};
export function historyGroups(fs:Flight[],sort:HistorySort,ascending:boolean){
 const key=(f:Flight)=>sort==='Date'?date(f,true).slice(-4):sort==='From'?f.from:sort==='To'?f.to:sort==='Airline'?f.carrier:flightMetadata(f).aircraft;
 const label=(k:string)=>sort==='From'||sort==='To'?`${airports[k].city} (${k})`:sort==='Aircraft'?aircraftNames[k]??k:k;
 return [...new Set(fs.map(key))].map(k=>({key:k,label:label(k),country:sort==='From'||sort==='To'?airports[k].country??'us':undefined,rows:fs.filter(f=>key(f)===k).sort((a,b)=>{return sort==='Date'?(a.departure.slice(0,10).localeCompare(b.departure.slice(0,10))*(ascending?1:-1)||fs.indexOf(a)-fs.indexOf(b)):(b.departure.slice(0,10).localeCompare(a.departure.slice(0,10))||fs.indexOf(a)-fs.indexOf(b));})})).sort((a,b)=>a.label.localeCompare(b.label)*(ascending?1:-1));
}
export function addPersonalFlight(state:State,flight:Flight):State{if(!airports[flight.from]||!airports[flight.to]||flight.from===flight.to||!flight.number.trim()||!Number.isFinite(Date.parse(flight.departure)))throw Error('Check the flight number, airports and departure date.');if(!flight.dateOnly&&(!Number.isFinite(Date.parse(flight.arrival))||Date.parse(flight.arrival)<=Date.parse(flight.departure)))throw Error('Arrival must be after departure.');if(personalFlights(state).some(f=>f.number.replace(/\s/g,'').toUpperCase()===flight.number.replace(/\s/g,'').toUpperCase()&&date(f,true)===date(flight,true)&&f.from===flight.from&&f.to===flight.to))throw Error('This flight is already in My Flights.');return {...state,empty:false,addedFlights:[...(state.addedFlights??[]),flight]};}
export function validateTrips(trips:Trip[],source=flights){const ids=trips.flatMap(t=>t.flightIds);if(new Set(ids).size!==ids.length)throw Error('A flight can only belong to one trip.');if(trips.some(t=>!t.title.trim()||[...t.title.trim()].length>80||!t.flightIds.length||t.flightIds.some(id=>!source.some(f=>f.id===id))||[...t.note].length>2000))throw Error('Check the trip title, flights and note.');}
export function commit(state:State,trips:Trip[],label:string,rejected=state.rejected):State{validateTrips(trips,personalFlights(state));return {...state,trips,rejected,operations:[...state.operations.slice(-19),{label,trips:state.trips,rejected:state.rejected}]};}
export function undo(state:State):State{const op=state.operations.at(-1);return op?{...state,trips:op.trips,rejected:op.rejected,operations:state.operations.slice(0,-1)}:state;}
export function splitTrip(state:State,id:string,index:number):State{const t=state.trips.find(t=>t.id===id);if(!t)throw Error('Trip not found');const fs=ordered(t.flightIds,personalFlights(state));if(index<1||index>=fs.length)throw Error('Choose a boundary between flights.');return commit(state,state.trips.flatMap(x=>x.id===id?[{...t,destination:undefined,flightIds:fs.slice(0,index).map(f=>f.id)},{id:`${id}-split-${Date.now()}`,title:`${airports[fs[index].to].city} · continued`,flightIds:fs.slice(index).map(f=>f.id),note:''}]:[x]),'Trip split');}
export function mergeTrips(state:State,ids:string[]):State{const ts=[...new Set(ids)].map(id=>state.trips.find(t=>t.id===id)).filter((t):t is Trip=>!!t);if(ts.length<2)throw Error('Select at least two trips.');const note=ts.filter(t=>t.note).map(t=>`${t.title}\n${t.note}`).join('\n\n');if([...note].length>2000)throw Error('Combined notes exceed 2,000 characters. Shorten the notes before merging.');const t={...ts[0],destination:undefined,flightIds:ordered(ts.flatMap(t=>t.flightIds),personalFlights(state)).map(f=>f.id),note};return commit(state,[...state.trips.filter(t=>!ids.includes(t.id)),t],'Trips merged');}
export function historyMatch(state:State,next:Flight,now:string){const ahead=Date.parse(next.departure)-Date.parse(now);if(ahead<=86400000||ahead>14*86400000||state.dismissed.includes(next.id)||state.empty)return null;const cutoff=new Date(now);cutoff.setUTCMonth(cutoff.getUTCMonth()-24);const matches=flights.filter(f=>f.status==='flown'&&f.from===next.from&&f.to===next.to&&Date.parse(f.departure)>=+cutoff&&Date.parse(f.departure)<Date.parse(now)).sort((a,b)=>Date.parse(b.departure)-Date.parse(a.departure));const withNote=matches.find(f=>state.trips.some(t=>t.flightIds.includes(f.id)&&t.note));const f=withNote??matches[0];if(!f)return null;return {flight:f,trip:state.trips.find(t=>t.flightIds.includes(f.id))};}
export function tripDestination(t:Pick<Trip,'flightIds'>,source=flights){
 const fs=ordered(t.flightIds,source).filter(f=>f.status!=='canceled');if(!fs.length)return 'PIT';
 let best=fs[0].to,stay=-1;fs.forEach((f,i)=>{const next=fs[i+1];const gap=next?Date.parse(next.departure)-Date.parse(f.arrival||f.departure):0;if(gap>stay){stay=gap;best=f.to;}});return best;
}
export function candidates(state:State):Trip[]{
 if(state.empty)return [];const assigned=new Set(state.trips.flatMap(t=>t.flightIds)),homes=state.homeBases?.length?state.homeBases:['PIT'];
 const fs=personalFlights(state).filter(f=>f.status==='flown'&&!assigned.has(f.id)).sort((a,b)=>Date.parse(a.departure)-Date.parse(b.departure));const groups:Flight[][]=[];let current:Flight[]=[];
 const flush=()=>{if(current.length>=2)groups.push(current);current=[];};
 for(const f of fs){const last=current.at(-1);if(last){const gap=(Date.parse(f.departure)-Date.parse(last.arrival||last.departure))/86400000;const near=last.to===f.from||routeDistance(last.to,f.from)<=600;const length=(Date.parse(f.departure)-Date.parse(current[0].departure))/86400000;if(gap<0||gap>21||length>35||!near||homes.includes(last.to))flush();}current.push(f);if(homes.includes(f.to))flush();}flush();
 return groups.map(fs=>{const ids=fs.map(f=>f.id),legacy=ids.join(',')===japanIds.join(','),destination=tripDestination({flightIds:ids},fs);const gaps=fs.filter((f,i)=>i>0&&fs[i-1].to!==f.from).length;const days=Math.max(1,Math.ceil((Date.parse(fs.at(-1)!.departure)-Date.parse(fs[0].departure))/86400000));return {id:legacy?'japan-v1':'suggest-'+ids.join('~'),title:legacy?'Japan':airports[destination].city,destination,flightIds:ids,note:'',reason:`${fs.length} completed flights over ${days} days. ${homes.includes(fs.at(-1)!.to)?'Returns to a home airport.':'Continuous onward journey.'}${gaps?' '+gaps+' transfer between different airports needs your review.':''}${fs.some(f=>f.dateOnly)?' Some times are unavailable; check the sequence.':''}`};}).filter(t=>!state.rejected.includes(t.id));
}

// Distances describe flown records, never a loyalty-account balance.
export const milesFromKm=(km:number)=>Math.round(km / 1.609344);
export function airlineSummaries(year='All time', source=flights){
 const selected=filterFlights(year,'All airlines',source);
 return [...new Set(selected.map(f=>f.carrier))].map(carrier=>{
  const records=selected.filter(f=>f.carrier===carrier);
  return {carrier,flightIds:records.map(f=>f.id),count:records.length,km:totals(records).km,miles:milesFromKm(totals(records).km),estimated:totals(records).estimated};
 }).sort((a,b)=>b.count-a.count||b.km-a.km||a.carrier.localeCompare(b.carrier));
}
// Illustrative rewards, intentionally independent of recorded flight distance.
export const sampleRewards:Record<string,{balance:number;target:number;benefit:string}>={
 United:{balance:18500,target:25000,benefit:'Lounge pass'},
 ANA:{balance:8200,target:15000,benefit:'Seat upgrade'},
 'British Airways':{balance:12000,target:20000,benefit:'Reward flight credit'},
 Delta:{balance:3400,target:10000,benefit:'Lounge pass'},
};
export const rewardProgress=(carrier:string)=>{const reward=sampleRewards[carrier];return reward?{...reward,remaining:Math.max(0,reward.target-reward.balance),percent:Math.min(100,100*reward.balance/reward.target)}:null;};
// Fictional fixture metadata for the original Passport statistic cards.
export const flightExtras:Record<string,{aircraft:string;delay:number}>={
 jp1:{aircraft:'B737-800',delay:0},jp2:{aircraft:'B777-300ER',delay:12},jp3:{aircraft:'B787-9',delay:8},jp4:{aircraft:'B737-800',delay:0},
 ch1:{aircraft:'B737-800',delay:18},ch2:{aircraft:'B737-800',delay:0},lo1:{aircraft:'B787-9',delay:0},lo2:{aircraft:'B787-9',delay:25},
 ny1:{aircraft:'CRJ-900',delay:0},ny2:{aircraft:'CRJ-900',delay:10},next:{aircraft:'B737-800',delay:0},
};

// A known leg-level delay replaces its portion of the reported year aggregate.
export function delayTotals(fs:Flight[]){const flown=fs.filter(f=>f.status==='flown'),complete=reference2023.every(r=>flown.some(f=>f.id===r.id));const covered=(f:Flight)=>complete&&reference2023.some(r=>r.id===f.id);return {minutes:flown.filter(f=>!covered(f)).reduce((n,f)=>n+Math.max(0,flightMetadata(f).delay??0),0)+(complete?reference2023Summary.delayMinutes:0),reported:complete,missing:flown.filter(f=>!covered(f)&&flightMetadata(f).delay===null).length};}
export function routeHistory(f:Flight,records=flights){return records.filter(r=>r.status==='flown'&&r.from===f.from&&r.to===f.to).sort((a,b)=>Date.parse(b.departure)-Date.parse(a.departure));}

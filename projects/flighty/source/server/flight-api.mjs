import http from 'node:http';
import {airports,routeDistance} from '../src/domain.ts';
const key=process.env.AVIATIONSTACK_API_KEY;
const allowed=new Set(['http://127.0.0.1:4174','http://localhost:4174']);
const cache=new Map();
export function normalizeFlight(row){
 const from=row.departure?.iata,to=row.arrival?.iata,departure=row.departure?.scheduled,arrival=row.arrival?.scheduled;
 if(!airports[from]||!airports[to]||!row.flight?.iata||!Number.isFinite(Date.parse(departure))||!Number.isFinite(Date.parse(arrival))||Date.parse(arrival)<=Date.parse(departure))return null;
 const number=row.flight.iata.replace(/^([A-Z0-9]{2})(\d)/,'$1 $2');const names={UA:'United',NH:'ANA',WN:'Southwest',CX:'Cathay Pacific',JL:'Japan Airlines',DL:'Delta',AS:'Alaska Airlines',BA:'British Airways'};
 return {id:`live-${row.flight.iata}-${departure}`,from,to,carrier:names[row.airline?.iata]??row.airline?.name??'Unknown airline',number,departure,arrival,status:row.flight_status==='landed'?'flown':['cancelled','canceled'].includes(row.flight_status)?'canceled':'planned',minutes:Math.round((Date.parse(arrival)-Date.parse(departure))/60000),km:routeDistance(from,to),distanceEstimated:true,source:'live',gate:row.departure?.gate??undefined,registration:row.aircraft?.registration??undefined,delay:typeof row.arrival?.delay==='number'?row.arrival.delay:null};
}
export function createFlightServer(){return http.createServer(async(req,res)=>{
 const origin=req.headers.origin;if(origin&&!allowed.has(origin)){res.writeHead(403);res.end();return;}
 if(origin)res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
 const send=(status,body)=>{res.writeHead(status);res.end(JSON.stringify(body));};
 if(req.method!=='GET'){send(405,{error:'GET required'});return;}
 const u=new URL(req.url,'http://127.0.0.1');if(u.pathname==='/status'){send(200,{configured:!!key,provider:'aviationstack'});return;}if(u.pathname!=='/flights'){send(404,{error:'Not found'});return;}
 if(!key){send(503,{error:'Live flight lookup is not configured. The demo can use sample results or manual entry.'});return;}
 const date=u.searchParams.get('date'),number=u.searchParams.get('number'),from=u.searchParams.get('from'),to=u.searchParams.get('to');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date??'')||(!number&&(!airports[from]||!airports[to]))||(number&&!/^[A-Z0-9]{2}\d{1,4}[A-Z]?$/.test(number))){send(400,{error:'Valid flight number or route and date required.'});return;}
 const cacheKey=u.search;const existing=cache.get(cacheKey);if(existing&&existing.expires>Date.now()){send(200,existing.value);return;}
 const upstream=new URL('https://api.aviationstack.com/v1/flights');upstream.searchParams.set('access_key',key);upstream.searchParams.set('flight_date',date);upstream.searchParams.set('limit','50');if(number)upstream.searchParams.set('flight_iata',number);else{upstream.searchParams.set('dep_iata',from);upstream.searchParams.set('arr_iata',to);}
 try{const response=await fetch(upstream,{signal:AbortSignal.timeout(10000)});const body=await response.json();if(!response.ok||body.error){send(502,{error:'The flight-data provider could not complete this lookup. Check the API plan/date coverage, or add the flight manually.'});return;}if(!Array.isArray(body.data))throw Error('Invalid response');const normalized=body.data.map(normalizeFlight).filter(Boolean);const flights=[...new Map(normalized.map(f=>[f.id,f])).values()];const value={flights,omitted:body.data.length-normalized.length,provider:'aviationstack'};cache.set(cacheKey,{value,expires:Date.now()+300000});if(cache.size>100)cache.delete(cache.keys().next().value);send(200,value);}catch{send(502,{error:'Flight lookup is temporarily unavailable. Please retry or add the flight manually.'});}
});}
if(process.argv[1]?.endsWith('flight-api.mjs'))createFlightServer().listen(4175,'127.0.0.1',()=>console.log(`Flight lookup adapter on http://127.0.0.1:4175 (${key?'API configured':'sample mode; no API key'})`));

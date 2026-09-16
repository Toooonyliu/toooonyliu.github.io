import {airports} from './domain.ts';
import type {LoyaltyAccount} from './loyalty.ts';

export const cabins = ['Economy', 'Premium economy', 'Business'] as const;
export type Cabin = typeof cabins[number];
export type Priority = 'price' | 'goal' | 'benefits';
export type PlannerQuery = {from:string;to:string;depart:string;returnDate:string;roundTrip:boolean;cabin:Cabin;nonstop:boolean};
export type Credit = {program:string;miles:number;points:number;second:number};
export type Offer = {id:string;carrier:string;route:string[];price:number;minutes:number;credits:Credit[];cabin:Cabin;bags:number;lounge:boolean;priority:boolean};
// Curated UI scenarios, not live fares or airline earning calculations. Values are USD / adult.
const scenarios = {
 HND:[
  {id:'nh',carrier:'ANA',via:'ORD',cost:[670,1150,2350],minutes:985,credit:[['ana',4200,4800,4800],['united',4000,650,2]]},
  {id:'ua',carrier:'United',via:'SFO',cost:[590,1020,2100],minutes:1110,credit:[['united',4100,560,2],['ana',3900,4200,0]]},
  {id:'jl',carrier:'Japan Airlines',via:'JFK',cost:[640,1120,2490],minutes:1060,credit:[['ba',4400,650,0]]},
 ],
 LHR:[
  {id:'ba',carrier:'British Airways',via:'',cost:[540,890,2050],minutes:435,credit:[['ba',3600,600,0]]},
  {id:'ua',carrier:'United',via:'EWR',cost:[475,820,1920],minutes:615,credit:[['united',3300,450,2],['ana',2900,3100,0]]},
 ],
 ORD:[
  {id:'ua',carrier:'United',via:'',cost:[165,0,0],minutes:100,credit:[['united',850,140,1],['ana',300,850,0]]},
 ],
} as const;
export function airportInput(value:string){const v=value.trim().toLowerCase();if(['tokyo','japan','tyo'].includes(v))return 'HND';if(['london','lon'].includes(v))return 'LHR';return Object.values(airports).find(a=>a.code.toLowerCase()===v||a.city.toLowerCase()===v)?.code??'';}
export function validateQuery(q:PlannerQuery){
 if(!airports[q.from]||!airports[q.to])return 'Choose a city or airport from the suggestions.';
 if(q.from===q.to)return 'Choose a destination different from your departure airport.';
 const valid=(v:string)=>/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
 if(!valid(q.depart)||(q.roundTrip&&!valid(q.returnDate)))return 'Enter valid travel dates.';
 if(q.depart<'2026-09-15')return 'Choose September 15, 2026 or later for this demo.';
 if(q.roundTrip&&q.returnDate<q.depart)return 'Return must be on or after departure.';
 return '';
}
export function offersFor(q:PlannerQuery):Offer[]{
 if(validateQuery(q)||!['PIT','SFO'].includes(q.from))return [];
 const rows=scenarios[q.to as keyof typeof scenarios]??[];
 return rows.flatMap(row=>{
  const ci=cabins.indexOf(q.cabin);if(!row.cost[ci])return [];
  const via=q.from==='SFO'?'':row.via;
  if(q.nonstop&&via)return [];
  const routes=via?[q.from,via,q.to]:[q.from,q.to];
  const factor=[1,1.5,2][ci];
  return [{id:`${q.from}-${q.to}-${row.id}`,carrier:row.carrier,route:routes,cabin:q.cabin,price:Math.round((row.cost[ci]+(q.from==='SFO'&&q.to==='LHR'?140:0))*(q.roundTrip?1.85:1)),minutes:q.from==='SFO'?(q.to==='HND'?675:q.to==='ORD'?255:630):row.minutes,credits:row.credit.map(c=>({program:String(c[0]),miles:Math.round(Number(c[1])*factor),points:Math.round(Number(c[2])*factor),second:c[0]==='ana'?Math.round(Number(c[3])*factor):c[0]==='united'?routes.length-1:0})),bags:ci===2?2:1,lounge:ci===2,priority:ci===2}];
 });
}
export function projectionFor(a:LoyaltyAccount|undefined,offer:Offer,q:PlannerQuery){
 const credit=offer.credits.find(c=>c.program===a?.program);
 if(!a||!credit)return null;
 const days=[q.depart,...(q.roundTrip?[q.returnDate]:[])];
 const eligible=days.filter(d=>d<=a.end&&(a.goal==='redeem'||d>=a.start)).length;
 const current=a.goal==='redeem'?a.balance:a.status;
 const earned=(a.goal==='redeem'?credit.miles:credit.points)*eligible,second=a.goal==='redeem'?0:credit.second*eligible;
 const after=current+earned,secondAfter=a.second+second;
 const requirements=[{current,after,target:a.target},...(a.goal!=='redeem'&&a.secondTarget>0?[{current:a.second,after:secondAfter,target:a.secondTarget}]:[])];
 const beforeRatio=Math.min(...requirements.map(c=>Math.min(1,c.current/c.target)));
 const afterRatio=Math.min(...requirements.map(c=>Math.min(1,c.after/c.target)));
 return {current,earned,after,second,secondAfter,remaining:Math.max(0,a.target-after),secondRemaining:Math.max(0,a.secondTarget-secondAfter),miles:credit.miles*days.length,eligible,legs:days.length,improvement:afterRatio-beforeRatio,met:requirements.every(c=>c.after>=c.target),alreadyMet:requirements.every(c=>c.current>=c.target)};
}
export function tierValid(a:LoyaltyAccount|undefined,q:PlannerQuery){return !!a?.currentTier&&a.currentTier!=='Member'&&!!a.tierSince&&!!a.tierUntil&&a.tierSince<=q.depart&&a.tierUntil>=(q.roundTrip?q.returnDate:q.depart);}
export function benefitsFor(offer:Offer,q:PlannerQuery,accounts:LoyaltyAccount[]){
 // Status-based scenario benefits only for explicitly seeded tiers, on matching carriers.
 const own=accounts.find(a=>a.program===(offer.carrier==='ANA'?'ana':offer.carrier==='United'?'united':offer.carrier==='British Airways'?'ba':''));
 const modeled=own?.source==='sample'&&tierValid(own,q)&&['Bronze','Premier Silver'].includes(own.currentTier??'');
 const perks=[{label:`${offer.bags} checked ${offer.bags===1?'bag':'bags'}`,reason:'Included in this sample fare'}];
 if(offer.priority)perks.push({label:'Priority check-in',reason:'Included in this sample Business fare'});
 else if(modeled)perks.push({label:'Priority check-in',reason:`Sample ${own!.currentTier} benefit on ${offer.carrier}`});
 if(offer.lounge)perks.push({label:'Lounge access',reason:'Included in this sample Business fare'});
 return {perks,tierModeled:modeled,tier:own?.currentTier,score:perks.length,unknown:!!own&&own.currentTier!=='Member'&&!modeled};
}
export function rankOffers(offers:Offer[],q:PlannerQuery,priority:Priority,goal:LoyaltyAccount|undefined,accounts:LoyaltyAccount[]){
 return [...offers].sort((a,b)=>{
  if(priority==='goal'){const diff=(projectionFor(goal,b,q)?.improvement??-1)-(projectionFor(goal,a,q)?.improvement??-1);if(diff)return diff;}
  if(priority==='benefits'){const diff=benefitsFor(b,q,accounts).score-benefitsFor(a,q,accounts).score;if(diff)return diff;}
  return a.price-b.price||a.minutes-b.minutes;
 });
}
export const money=(n:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);

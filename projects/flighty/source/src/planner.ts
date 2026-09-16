import {airports,routeDistance} from './domain.ts';
import {itineraryBenefits,membershipValid} from './benefitPolicy.ts';
import type {LoyaltyAccount} from './loyalty.ts';

export const cabins = ['Economy', 'Premium economy', 'Business'] as const;
export type Cabin = typeof cabins[number];
export type Priority = 'price' | 'goal' | 'benefits';
export type PlannerQuery = {from:string;to:string;depart:string;returnDate:string;roundTrip:boolean;cabin:Cabin;nonstop:boolean};
export type Credit = {program:string;miles:number;points:number;second:number;formula:string[];assumptions:string;source:string};
export type Offer = {id:string;carrier:string;route:string[];price:number;minutes:number;credits:Credit[];cabin:Cabin;bags:number;lounge:boolean;priority:boolean;bookingUrl:string};
// Curated fares, paired with published base earning formulas. Amounts are USD / adult.
// Credit is per direction; reverse legs assume the same fare class and eligible spend.
const scenarios = {
 HND:[
  {id:'nh',carrier:'ANA',via:'ORD',cost:[670,1150,2350],minutes:985},
  {id:'ua',carrier:'United',via:'SFO',cost:[590,1020,2100],minutes:1110},
  {id:'jl',carrier:'Japan Airlines',via:'JFK',cost:[640,1120,2490],minutes:1060},
 ],
 LHR:[
  {id:'ba',carrier:'British Airways',via:'',cost:[540,890,2050],minutes:435},
  {id:'ua',carrier:'United',via:'EWR',cost:[475,820,1920],minutes:615},
 ],
 ORD:[
  {id:'ua',carrier:'United',via:'',cost:[165,0,0],minutes:100},
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
  const price=Math.round((row.cost[ci]+(q.from==='SFO'&&q.to==='LHR'?140:0))*(q.roundTrip?1.85:1));
  return [{id:`${q.from}-${q.to}-${row.id}`,carrier:row.carrier,route:routes,cabin:q.cabin,price,minutes:q.from==='SFO'?(q.to==='HND'?675:q.to==='ORD'?255:630):row.minutes,credits:calculateCredits(row.carrier,routes,q.cabin,price,q.roundTrip),bags:ci===2?2:1,lounge:ci===2,priority:ci===2,bookingUrl:bookingSites[row.carrier]}];
 });
}
export const bookingSites:Record<string,string>={ANA:'https://www.ana.co.jp/en/us/',United:'https://www.united.com/en/us','Japan Airlines':'https://www.jal.co.jp/en-jp/','British Airways':'https://www.britishairways.com/'};
export const earningSources={ana:'https://www.ana.co.jp/en/us/amc/ana-international-flights/',partner:'https://www.ana.co.jp/en/us/amc/partner-airlines/united-airlines/',premium:'https://www.ana.co.jp/en/jp/amc/premium/overview/premium-point/',avios:'https://www.britishairways.com/content/the-british-airways-club/avios/collecting-avios/flights',tier:'https://www.britishairways.com/content/the-british-airways-club/about-tier-points/flights',united:'https://www.united.com/en/us/fly/mileageplus/whats-new.html'};
const fmt=(v:number)=>v.toLocaleString('en-US');
// ANA's published Tokyo sector miles. Other routes use approximate great-circle miles,
// explicitly disclosed in the calculation. Never substitute distance directly for credit.
export function sectorMiles(from:string,to:string,ana=false){const chart:Record<string,number>={SFO:5130,ORD:6283,JFK:6739};const other=from==='HND'?to:to==='HND'?from:'';return ana&&chart[other]?chart[other]:Math.round(routeDistance(from,to)/1.609344);}
export function calculateCredits(carrier:string,route:string[],cabin:Cabin,total:number,roundTrip:boolean):Credit[]{
 const ci=cabins.indexOf(cabin),directions=roundTrip?2:1;
 const eligible=Math.max(0,Math.floor(total/directions)-(route.at(-1)==='ORD'?25:140));
 const segments=route.slice(1).map((to,i)=>({from:route[i],to,feeder:i===0&&route.length>2}));
 const result:Credit[]=[];
 if(carrier==='ANA'||carrier==='United'){
  let miles=0,points=0,second=0;const formula:string[]=[];
  for(const leg of segments){
   const own=carrier==='ANA'&&!leg.feeder;
   // A domestic connection has Economy H when the long-haul cabin is Premium.
   const index=leg.feeder&&ci===1?0:ci,rate=[.7,1,1.25][index],bookingClass=[ 'H',own?'E':'A','D'][index];
   const distance=sectorMiles(leg.from,leg.to,own),earned=Math.floor(distance*Math.round(rate*100)/100),boarding=rate>=1?400:0;
   miles+=earned;points+=earned+boarding;if(own)second+=earned+boarding;
   formula.push(`${leg.from}–${leg.to} · ${own?'ANA':'United'} ${bookingClass}: ${fmt(distance)} sector mi × ${rate*100}% = ${fmt(earned)} miles; +${boarding} boarding = ${fmt(earned+boarding)} Premium Points${own?' (ANA Group)':''}.`);
  }
  result.push({program:'ana',miles,points,second,formula,assumptions:'Base flight miles only; tier/card bonuses excluded. ANA Tokyo sectors use its published mileage chart; other sectors use approximate geographic miles. Premium connections are Economy H. ANA Group points count ANA-operated legs only.',source:carrier==='ANA'?earningSources.ana:earningSources.partner});
  // Revenue earning requires United-issued (016) tickets; the CTA follows that choice.
  result.push({program:'united',miles:eligible*3,points:eligible,second:segments.length,formula:[`$${fmt(eligible)} eligible fare × 3 base miles/$ = ${fmt(eligible*3)} miles.`,`$${fmt(eligible)} eligible fare = ${fmt(eligible)} PQP; ${segments.length} eligible segments = ${segments.length} PQF.`],assumptions:`United-issued (016) ticket, standard paid fare purchased after April 2, 2026. Base member earnings only; Premier and card bonuses excluded. Sample fare allocates $${route.at(-1)==='ORD'?25:140} per direction to non-earning taxes; remaining spend is split equally outbound/return.`,source:earningSources.united});
 }
 if(carrier==='Japan Airlines'){
  // JL-marketed international long-haul; domestic feeder is an AA-operated JL codeshare.
  let miles=0,points=0;const formula:string[]=[];
  for(const leg of segments){const index=leg.feeder&&ci===1?0:ci,rate=leg.feeder?[.7,1,1.25][index]:[.7,1,2.5][index],tierRate=[.15,.12,.5][index],bookingClass=['H','E','D'][index],distance=sectorMiles(leg.from,leg.to),earned=Math.floor(distance*Math.round(rate*100)/100);miles+=earned;points+=Math.floor(distance*Math.round(tierRate*100)/100);formula.push(`${leg.from}–${leg.to} · JL ${bookingClass}${leg.feeder?' / American-operated':''}: ${fmt(distance)} approx. mi × ${rate*100}% = ${fmt(earned)} Avios; × ${tierRate*100}% = ${fmt(Math.floor(distance*Math.round(tierRate*100)/100))} tier points.`);}
  result.push({program:'ba',miles,points,second:0,formula,assumptions:'JL flight numbers throughout, with American operating the domestic connection. Base Avios only; tier bonuses excluded. Geographic miles approximate airline sector mileage. Premium connections use Economy H. BA credit, not ANA credit.',source:earningSources.avios});
 }
 if(carrier==='British Airways'){
  const gbp=Math.floor(eligible*.75),extra=[150,275,500][ci];
  result.push({program:'ba',miles:gbp*6,points:gbp+extra,second:0,formula:[`£${fmt(gbp)} eligible spend × 6 base Avios/£ = ${fmt(gbp*6)} Avios.`,`£${fmt(gbp)} + ${extra} standard long-haul fare bonus = ${fmt(gbp+extra)} tier points.`],assumptions:'BA-marketed standard paid fare, base Blue rate; tier bonuses excluded. Sample excludes $140 taxes per direction and uses assumed USD→GBP 0.75, not a live exchange rate. Actual conversion uses the purchase-date IATA rate. Return spend is split equally.',source:earningSources.avios});
 }
 return result;
}
export function displayAccount(accounts:LoyaltyAccount[],offer:Offer,preferred?:LoyaltyAccount){return accounts.find(a=>a.id===preferred?.id&&offer.credits.some(c=>c.program===a.program))??accounts.find(a=>offer.credits.some(c=>c.program===a.program));}
export function progressSegments(current:number,earned:number,target:number){const scale=Math.max(target,current+earned,1);return {current:Math.max(0,current)/scale*100,earned:Math.max(0,earned)/scale*100};}

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
export function tierValid(a:LoyaltyAccount|undefined,q:PlannerQuery){return membershipValid(a,q.depart,q.roundTrip?q.returnDate:q.depart);}
export const benefitsFor=itineraryBenefits;
export function rankOffers(offers:Offer[],q:PlannerQuery,priority:Priority,goal:LoyaltyAccount|undefined,accounts:LoyaltyAccount[]){
 return [...offers].sort((a,b)=>{
  if(priority==='goal'){const diff=(projectionFor(goal,b,q)?.improvement??-1)-(projectionFor(goal,a,q)?.improvement??-1);if(diff)return diff;}
  if(priority==='benefits'){const diff=benefitsFor(b,q,accounts).score-benefitsFor(a,q,accounts).score;if(diff)return diff;}
  return a.price-b.price||a.minutes-b.minutes;
 });
}
export const money=(n:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);

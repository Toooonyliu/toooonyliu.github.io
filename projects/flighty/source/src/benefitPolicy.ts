import type {LoyaltyAccount} from './loyalty.ts';
import type {Offer,PlannerQuery} from './planner.ts';

export const policyChecked='September 16, 2026';
export const policySources={
 ana:'https://www.ana.co.jp/en/jp/amc/premium/overview/service-comparison/',
 anaAirport:'https://www.ana.co.jp/en/jp/amc/premium/service/priority-flight/detail/',
 united:'https://marriottbonvoy.unitedmileageplus.com/faqs',
 unitedGold:'https://unitedperksplus.united.com/chart.aspx',
 ba:'https://www.britishairways.com/content/the-british-airways-club/about-the-club/tiers-and-benefits',
 baSeats:'https://www.britishairways.com/content/information/seating/reserving-your-seat',
 oneworld:'https://www.britishairways.com/content/information/partners-and-alliances/oneworld/frequent-flyer-benefits',
 jal:'https://www.jal.co.jp/jp/en/jalmile/flyon/lounge.html',
};
export type Perk={id:string;label:string;reason:string;kind:'included'|'conditional'|'paid';source:string;scope:string;};
export type TierPolicy={tier:string;tone:'bronze'|'silver'|'gold'|'platinum';perks:Perk[];next?:{tier:string;tone:TierPolicy['tone'];perks:Perk[]};};
const perk=(id:string,label:string,reason:string,source:string,scope:string,kind:Perk['kind']='included'):Perk=>({id,label,reason,source,scope,kind});
const anaCheck=perk('checkin','Premium Economy check-in','Use the Premium Economy counter on ANA Group international flights.',policySources.anaAirport,'ANA international');
const anaBag=perk('baggage','Extra baggage allowance','ANA Group international flights only; allowance depends on cabin and route.',policySources.ana,'ANA international','conditional');
const anaLounge=perk('lounge','ANA Lounge with miles','Redeem miles or Upgrade Points at eligible lounges. Not complimentary with Bronze.',policySources.anaAirport,'Eligible ANA lounges','paid');
const anaPlatinum=[perk('lounge','Lounge access','Eligible ANA / Star Alliance departures; lounge, guest and itinerary rules apply.',policySources.anaAirport,'Eligible departures','conditional'),perk('checkin','Priority check-in & boarding','Use designated priority services on eligible ANA flights.',policySources.ana,'ANA flights')];
const unitedAccess=perk('checkin','Premier Access','Priority check-in and boarding on United / United Express where available.',policySources.united,'United / United Express');
const unitedSeat=(gold=false)=>perk('seating',gold?'Economy Plus at booking':'Economy Plus at check-in','Complimentary for you and one companion when seats are available on eligible United Economy tickets.',gold?policySources.unitedGold:policySources.united,'United Economy','conditional');
const baCheck=perk('checkin','Priority check-in & boarding','Use designated priority services when flying British Airways.',policySources.ba,'British Airways');
const baSeat=(silver=false)=>perk('seating',silver?'Seat selection at booking':'Seat selection 7 days before',silver?'Free on BA flights for your booking; group-booking exceptions apply.':'Free on BA flights for your booking; exit-row and group-booking exceptions apply.',policySources.baSeats,'British Airways','conditional');
const baLounge=perk('lounge','Business lounge access','Silver / oneworld Sapphire on eligible departures; lounge and guest rules apply.',policySources.oneworld,'Eligible oneworld departures','conditional');
export function policyFor(a:Pick<LoyaltyAccount,'program'|'currentTier'>|undefined):TierPolicy|undefined{
 const tier=a?.currentTier?.trim().toLowerCase();
 if(a?.program==='ana'&&tier==='bronze')return {tier:'Bronze',tone:'bronze',perks:[anaCheck,anaBag,anaLounge],next:{tier:'Platinum',tone:'platinum',perks:anaPlatinum}};
 if(a?.program==='ana'&&tier==='platinum')return {tier:'Platinum',tone:'platinum',perks:anaPlatinum};
 if(a?.program==='united'&&['premier silver','silver'].includes(tier??''))return {tier:'Premier Silver',tone:'silver',perks:[unitedSeat(),unitedAccess],next:{tier:'Premier Gold',tone:'gold',perks:[unitedSeat(true)]}};
 if(a?.program==='united'&&['premier gold','gold'].includes(tier??''))return {tier:'Premier Gold',tone:'gold',perks:[unitedSeat(true),unitedAccess]};
 if(a?.program==='ba'&&tier==='bronze')return {tier:'Bronze',tone:'bronze',perks:[baSeat(),baCheck],next:{tier:'Silver',tone:'silver',perks:[baSeat(true),baLounge]}};
 if(a?.program==='ba'&&tier==='silver')return {tier:'Silver',tone:'silver',perks:[baSeat(true),baCheck,baLounge]};
 return undefined;
}
export function membershipValid(a:LoyaltyAccount|undefined,from:string,until=from){return !!a?.currentTier&&!!a.tierSince&&!!a.tierUntil&&a.tierSince<=from&&a.tierUntil>=until;}
export function membershipState(a:LoyaltyAccount,day:string){if(!a.currentTier)return 'Tier not entered';if(!a.tierSince||!a.tierUntil)return 'Validity needed';if(a.tierSince>day)return 'Starts '+a.tierSince;if(a.tierUntil<day)return 'Expired '+a.tierUntil;return 'Current tier';}
// Operating carriers are explicit in these curated scenarios. Crediting a different
// program never changes these operators or automatically provides that tier's perks.
export function offerOperators(o:Offer){return o.route.slice(1).map((to,i)=>({from:o.route[i],to,carrier:o.route.length>2&&i===0?(o.carrier==='ANA'?'United':o.carrier==='Japan Airlines'?'American Airlines':o.carrier):o.carrier}));}
export function itineraryBenefits(o:Offer,q:PlannerQuery,accounts:LoyaltyAccount[]){
 const legs=offerOperators(o),last=q.roundTrip?q.returnDate:q.depart;
 const candidates=accounts.flatMap(a=>{
  const policy=policyFor(a);if(!policy||!membershipValid(a,q.depart,last))return [];
  let applicable=legs.filter(l=>l.carrier===(a.program==='ana'?'ANA':a.program==='united'?'United':'British Airways'));
  let perks=policy.perks;
  if(a.program==='ana'){
   applicable=applicable.filter(l=>l.from==='HND'||l.to==='HND');
   // Bronze is not Star Alliance Gold: no ANA airport perks on the UA feeder.
  }
  if(a.program==='ba'&&o.carrier==='Japan Airlines'){
   applicable=legs.filter(l=>['Japan Airlines','American Airlines'].includes(l.carrier));
   perks=[perk('checkin','Business-class priority check-in',`${policy.tier} / oneworld ${policy.tier==='Silver'?'Sapphire':'Ruby'} on eligible JAL and American flights. Attach the membership to your booking.`,policySources.oneworld,'JAL + American')];
   if(policy.tier==='Silver')perks.push({...baLounge,reason:'oneworld Sapphire on eligible JAL / American departures; confirm lounge and guest eligibility.'});
  }
  if(!applicable.length)return [];
  const scope=applicable.map(l=>`${l.from}–${l.to}`).join(' · ');
  // Economy Plus is an Economy-seat benefit, not a benefit of the premium cabin.
  perks=perks.filter(p=>!(a.program==='united'&&p.id==='seating'&&o.cabin!=='Economy'&&!(o.cabin==='Premium economy'&&legs.length>1)));
  return [{account:a,policy,coverage:applicable.length/legs.length,scope,perks:perks.map(p=>({...p,scope:`${p.scope} · ${a.program==='united'&&p.id==='seating'&&o.cabin==='Premium economy'?`${legs[0].from}–${legs[0].to} Economy connection only`:scope}${q.roundTrip?' + return':''}`}))}];
 }).sort((a,b)=>b.coverage-a.coverage);
 const selected=candidates[0];
 const perks=selected?.perks??[];
 return {perks,tierModeled:!!selected,tier:selected?.policy.tier,account:selected?.account,policy:selected?.policy,scope:selected?.scope,coverage:selected?.coverage??0,score:selected?.coverage??0,unknown:!selected&&accounts.some(a=>!!a.currentTier),conditional:perks.filter(p=>p.kind!=='included'),included:perks.filter(p=>p.kind==='included')};
}

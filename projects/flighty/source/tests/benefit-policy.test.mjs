import test from 'node:test';
import assert from 'node:assert/strict';
import {offersFor,benefitsFor,rankOffers} from '../src/planner.ts';
import {sampleAccounts} from '../src/loyalty.ts';
import {membershipValid,membershipState,policyFor} from '../src/benefitPolicy.ts';
import {range,tripRoute,byId} from '../src/domain.ts';
const q={from:'PIT',to:'HND',depart:'2026-10-07',returnDate:'2026-10-17',roundTrip:true,cabin:'Economy',nonstop:false};
const accounts=sampleAccounts();
test('Bronze benefits preserve paid lounge and ANA-only international scope',()=>{
 const o=offersFor(q).find(o=>o.carrier==='ANA'),v=benefitsFor(o,q,accounts);
 assert.equal(v.coverage,.5);assert.equal(v.scope,'ORD–HND');
 assert.match(v.perks.find(p=>p.id==='checkin').label,/Premium Economy/);
 assert.equal(v.perks.find(p=>p.id==='lounge').kind,'paid');
 assert.ok(v.perks.every(p=>!p.scope.includes('PIT–ORD')));
});
test('United Silver seating is conditional; premium tickets do not gain Economy Plus on long haul',()=>{
 const silver=accounts[1],o=offersFor(q).find(o=>o.carrier==='United');
 assert.match(benefitsFor(o,q,[silver]).perks.find(p=>p.id==='seating').label,/check-in/);
 assert.equal(benefitsFor(o,q,[silver]).perks.find(p=>p.id==='seating').kind,'conditional');
 const prem=offersFor({...q,cabin:'Premium economy'}).find(o=>o.carrier==='United');
 assert.match(benefitsFor(prem,q,[silver]).perks.find(p=>p.id==='seating').scope,/PIT–SFO Economy connection only/);
 const bus=offersFor({...q,cabin:'Business'}).find(o=>o.carrier==='United');
 assert.ok(!benefitsFor(bus,q,[silver]).perks.some(p=>p.id==='seating'));
});
test('BA Bronze on JAL uses Ruby check-in, not BA-only seats or lounge privileges',()=>{
 const o=offersFor(q).find(o=>o.carrier==='Japan Airlines'),v=benefitsFor(o,q,accounts);
 assert.equal(v.account.program,'ba');assert.equal(v.coverage,1);
 assert.equal(v.perks.length,1);assert.match(v.perks[0].reason,/Ruby/);
 assert.ok(!v.perks.some(p=>p.id==='lounge'||p.id==='seating'));
 const ba=offersFor({...q,to:'LHR'}).find(o=>o.carrier==='British Airways');
 assert.match(benefitsFor(ba,{...q,to:'LHR'},accounts).perks.find(p=>p.id==='seating').label,/7 days/);
});
test('tier identity never derives from numerical progress or sample origin',()=>{
 const a={...accounts[0],source:'manual',status:60000};
 assert.equal(policyFor(a).tier,'Bronze');assert.equal(membershipState(a,'2026-10-01'),'Current tier');
 assert.equal(membershipValid(a,'2026-10-01','2027-04-01'),false);
 assert.equal(policyFor({...a,currentTier:'Unknown tier'}),undefined);
 assert.equal(membershipValid({...a,tierSince:undefined},q.depart),false);
 assert.equal(policyFor({...accounts[1],currentTier:' Premier Gold '}).tone,'gold');
});
test('benefits order measures applicable route coverage and breaks ties by fare, without mutating accounts',()=>{
 const before=JSON.stringify(accounts),ranked=rankOffers(offersFor(q),q,'benefits',accounts[0],accounts);
 assert.equal(ranked[0].carrier,'United');assert.equal(ranked.at(-1).carrier,'ANA');assert.equal(JSON.stringify(accounts),before);
});
test('trip range and route include the origin, arrival-local end and cross-year start',()=>{
 const fs=[byId.ny1,byId.ny2,byId.cancel];
 const label=range({flightIds:fs.map(f=>f.id)},fs);assert.match(label,/2025/);assert.match(label,/2026/);
 assert.equal(tripRoute([byId.ny1,byId.ny2]),'PIT ↔ JFK');
 assert.equal(tripRoute([byId.jp1,byId.jp2,byId.jp3,byId.jp4]),'PIT → ORD → HND · KIX → SFO → PIT');
});

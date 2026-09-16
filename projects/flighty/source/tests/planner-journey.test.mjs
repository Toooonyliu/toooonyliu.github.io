import test from 'node:test';
import assert from 'node:assert/strict';
import {airportInput,offersFor,projectionFor,rankOffers,benefitsFor,validateQuery} from '../src/planner.ts';
import {sampleAccounts} from '../src/loyalty.ts';
import {byId,flights,reference2023} from '../src/domain.ts';
import {journeyEvent,journeyFor} from '../src/journeyData.ts';
const q={from:'PIT',to:'HND',depart:'2026-10-07',returnDate:'2026-10-17',roundTrip:true,cabin:'Economy',nonstop:false};
test('search normalizes cities, validates dates, and never invents unsupported availability',()=>{
 assert.equal(airportInput(' Tokyo '),'HND');assert.equal(airportInput('NRT'),'');assert.ok(validateQuery({...q,returnDate:'2026-10-01'}));assert.ok(validateQuery({...q,depart:'2026-02-31'}));assert.ok(validateQuery({...q,to:'PIT'}));assert.equal(offersFor({...q,from:'LAX'}).length,0);assert.equal(offersFor({...q,nonstop:true}).length,0);assert.equal(offersFor({...q,from:'SFO',nonstop:true}).length,3);
});
test('rankings expose cost vs goal tradeoffs without comparing raw program currencies',()=>{
 const accounts=sampleAccounts(),offers=offersFor(q),before=JSON.stringify(accounts);
 assert.equal(rankOffers(offers,q,'price',accounts[0],accounts)[0].carrier,'United');assert.equal(rankOffers(offers,q,'goal',accounts[0],accounts)[0].carrier,'ANA');
 const nh=offers.find(o=>o.carrier==='ANA'),ua=offers.find(o=>o.carrier==='United');const p=projectionFor(accounts[0],nh,q),partner=projectionFor(accounts[0],ua,q);
 assert.equal(p.after,51600);assert.equal(p.secondAfter,31600);assert.equal(p.met,true);assert.equal(partner.remaining,0);assert.equal(partner.secondRemaining,3000);assert.equal(partner.met,false);assert.equal(projectionFor(accounts[2],ua,q),null);assert.equal(JSON.stringify(accounts),before);
});
test('cabin, trip type, credit program and period independently change estimates',()=>{
 const accounts=sampleAccounts(),economy=offersFor(q)[0],business=offersFor({...q,cabin:'Business'})[0];assert.ok(business.price>economy.price);assert.ok(business.credits[0].points>economy.credits[0].points);
 const one=projectionFor(accounts[0],economy,{...q,roundTrip:false});assert.equal(one.earned,4800);
 const cross=projectionFor(accounts[0],economy,{...q,depart:'2026-12-30',returnDate:'2027-01-08'});assert.equal(cross.eligible,1);assert.equal(cross.earned,4800);assert.equal(cross.miles,8400);
 const outside=projectionFor(accounts[0],economy,{...q,depart:'2027-10-07',returnDate:'2027-10-17'});assert.equal(outside.eligible,0);assert.equal(outside.improvement,0);assert.equal(projectionFor(accounts[1],economy,q).earned,1300);
});
test('benefits require explicit modeled status valid for the complete journey',()=>{
 const accounts=sampleAccounts(),o=offersFor(q)[0];assert.equal(benefitsFor(o,q,accounts).tierModeled,true);assert.equal(benefitsFor(o,q,[{...accounts[0],currentTier:undefined}]).tierModeled,false);assert.equal(benefitsFor(o,q,[{...accounts[0],source:'manual'}]).tierModeled,false);assert.equal(benefitsFor(o,{...q,returnDate:'2027-05-01'},accounts).tierModeled,false);assert.ok(benefitsFor(offersFor({...q,cabin:'Business'})[0],q,[]).perks.some(p=>p.label==='Lounge access'));
});
test('journey uses arrival-local dates, preserves cross-year boundaries and excludes canceled legs',()=>{
 const j=journeyFor([byId.ny2,byId.cancel,byId.ny1]);assert.equal(j.first.id,'ny1');assert.equal(j.last.id,'ny2');assert.equal(j.canceled,1);assert.match(journeyEvent(j.first,'departure').day,/2025/);assert.match(journeyEvent(j.last,'arrival').day,/2026/);assert.equal(journeyEvent(byId.jp2,'arrival').day,'May 4, 2026');assert.match(journeyEvent(byId.jp2,'arrival').clock,/3:10 PM/);assert.equal(journeyEvent(byId.jp4,'arrival').day,'May 14, 2026');
});
test('unknown timestamps and surface transfers stay explicit, with no inferred flights',()=>{
 const j=journeyFor(['jp1','jp2','jp3','jp4'].map(id=>byId[id]));assert.deepEqual(j.gaps,[{before:'jp3',from:'HND',to:'KIX'}]);assert.equal(journeyEvent(reference2023[1],'departure').clock,'Time unavailable');assert.equal(journeyEvent(reference2023[1],'arrival').day,'Date unavailable');assert.equal(journeyFor([]).first,undefined);assert.equal(journeyFor(flownOnly()).flights.length,15);
 function flownOnly(){return flights.filter(f=>f.status==='flown');}
});

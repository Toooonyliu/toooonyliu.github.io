import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateCredits,offersFor,displayAccount,projectionFor,progressSegments,bookingSites} from '../src/planner.ts';
import {sampleAccounts} from '../src/loyalty.ts';
const q={from:'PIT',to:'HND',depart:'2026-10-07',returnDate:'2026-10-17',roundTrip:true,cabin:'Economy',nonstop:false};
test('ANA uses published sector miles, booking-class rate and boarding points',()=>{
 const economy=calculateCredits('ANA',['SFO','HND'],'Economy',1200,true)[0];
 assert.equal(economy.miles,3591);assert.equal(economy.points,3591);assert.equal(economy.second,3591);
 const business=calculateCredits('ANA',['SFO','HND'],'Business',4000,true)[0];
 assert.equal(business.miles,6412);assert.equal(business.points,6812);assert.equal(business.second,6812);
 const mixed=calculateCredits('ANA',['PIT','ORD','HND'],'Premium economy',2200,true)[0];
 assert.equal(mixed.second,6683);assert.equal(mixed.points,6970);assert.equal(mixed.miles,6570);
});
test('United base revenue earning excludes sample taxes and tracks segments independently',()=>{
 const c=calculateCredits('United',['PIT','SFO','HND'],'Economy',1200,true).find(c=>c.program==='united');
 assert.equal(c.miles,1380);assert.equal(c.points,460);assert.equal(c.second,2);
 assert.match(c.assumptions,/United-issued/);assert.match(c.assumptions,/bonuses excluded/);
});
test('JAL separates long-haul and codeshare rates and never credits an ANA goal',()=>{
 const accounts=sampleAccounts(),o=offersFor(q).find(o=>o.carrier==='Japan Airlines');
 assert.equal(o.credits[0].miles,4966);assert.equal(projectionFor(accounts[0],o,q),null);
 assert.equal(displayAccount(accounts,o,accounts[0]).program,'ba');
 assert.equal(projectionFor(accounts[2],o,q).after,57932);
 const business=calculateCredits('Japan Airlines',['PIT','JFK','HND'],'Business',4000,true)[0];
 assert.equal(business.miles,17315);assert.match(business.formula[0],/125%/);assert.match(business.formula[1],/250%/);
});
test('BA uses eligible GBP spend and the standard long-haul tier bonus',()=>{
 const c=calculateCredits('British Airways',['PIT','LHR'],'Economy',1200,true)[0];
 assert.equal(c.miles,2070);assert.equal(c.points,495);assert.match(c.assumptions,/0.75/);
});
test('growth remains visible above the goal and zero contribution does not invent credit',()=>{
 assert.deepEqual(progressSegments(48000,9932,60000),{current:80,earned:9932/60000*100});
 const over=progressSegments(42000,9370,50000);assert.ok(Math.abs(over.current+over.earned-100)<1e-9);assert.ok(over.earned>0);
 assert.deepEqual(progressSegments(60000,0,60000),{current:100,earned:0});
 assert.equal(displayAccount([],offersFor(q)[0]),undefined);
 assert.ok(Object.values(bookingSites).every(url=>url.startsWith('https://')));
});

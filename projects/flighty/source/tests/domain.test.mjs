import { test } from 'node:test';
import assert from 'node:assert/strict';
import { airlineSummaries, milesFromKm, rewardProgress, airports, byId, candidates, commit, filterFlights, flights, historyMatch, japanIds, mergeTrips, ordered, seed, splitTrip, totals, undo, validateTrips } from '../src/domain.ts';

test('suggestions are not saved trips, dismissed proposals stay dismissed',()=>{
 const s=seed();assert.ok(candidates(s).some(t=>t.id==='japan-v1'));assert.equal(s.trips.length,3);assert.ok(!candidates({...s,rejected:['japan-v1']}).some(t=>t.id==='japan-v1'));
});
test('confirmation retains all source flight identities and suppresses candidate',()=>{
 const s=commit(seed(),[...seed().trips,{id:'japan',title:'Japan',flightIds:japanIds,note:'Take the train.'}],'Save');assert.ok(!candidates(s).some(t=>t.id==='japan-v1'));assert.deepEqual(s.trips.at(-1).flightIds,japanIds);
});
test('split, merge and undo retain membership, notes and flight totals',()=>{
 const initial=commit(seed(),[...seed().trips,{id:'japan',title:'Japan',flightIds:japanIds,note:'Keep this note',cover:'cover-test'}],'Save');
 const before=totals(flights);const split=splitTrip(initial,'japan',2);assert.equal(split.trips.length,5);validateTrips(split.trips);assert.equal(split.trips.find(t=>t.id==='japan').note,'Keep this note');assert.deepEqual(undo(split).trips,initial.trips);
 const splitId=split.trips.find(t=>t.id.startsWith('japan-split')).id;const merged=mergeTrips(split,['japan',splitId]);assert.deepEqual(merged.trips.find(t=>t.id==='japan').flightIds,japanIds);assert.equal(merged.trips.find(t=>t.id==='japan').cover,'cover-test');assert.deepEqual(totals(flights),before);
});
test('a flight cannot belong to multiple trips, or invalid trip be saved',()=>{
 assert.throws(()=>validateTrips([...seed().trips,{id:'bad',title:'duplicate',flightIds:['ch1'],note:''}]));assert.throws(()=>validateTrips([{id:'bad',title:'',flightIds:['jp1'],note:''}]));assert.throws(()=>validateTrips([{id:'bad',title:'No flights',flightIds:[],note:''}]));
});
test('over-limit combined notes are rejected without mutating records',()=>{
 const s=seed();s.trips[0].note='a'.repeat(1500);s.trips[1].note='b'.repeat(1500);assert.throws(()=>mergeTrips(s,['chicago','london']));assert.equal(s.trips[0].note.length,1500);
});
test('statistics and drill-down have identical source sets; canceled and planned excluded',()=>{
 const source=filterFlights('All time','United');assert.equal(totals(source).count,source.length);assert.equal(source.length,6);assert.ok(!filterFlights('All time').some(f=>['cancel','next'].includes(f.id)));assert.equal(totals(filterFlights('All time')).missing,1);
});
test('year filters use departure-local year and cross-year flights stay distinct',()=>{
 assert.ok(filterFlights('2025').some(f=>f.id==='ny1'));assert.ok(!filterFlights('2026').some(f=>f.id==='ny1'));assert.ok(filterFlights('2026').some(f=>f.id==='ny2'));
 const f={...byId.ny1,id:'midnight',departure:'2026-01-01T01:00:00Z'};assert.equal(filterFlights('2025','All airlines',[f]).length,1);
});
test('chronology is UTC even when local arrival clock goes backwards',()=>{
 const f=byId.jp3;assert.ok(Date.parse(f.arrival)>Date.parse(f.departure));assert.deepEqual(ordered([...japanIds].reverse()).map(f=>f.id),japanIds);
});
test('history prefers a note, respects exact direction, dismissal and travel-day suppression',()=>{
 const s=seed(),now='2026-09-10T12:00:00Z';assert.equal(historyMatch(s,byId.next,now).flight.id,'ch1');assert.equal(historyMatch(s,{...byId.next,from:'HND',to:'ORD'},now),null);
 assert.equal(historyMatch({...s,dismissed:['next']},byId.next,now),null);assert.equal(historyMatch(s,byId.next,'2026-09-15T00:00:00Z'),null);assert.equal(historyMatch(s,byId.next,'2026-08-01T00:00:00Z'),null);
});
test('airport geography and Japan gap remain real and separate',()=>{
 assert.ok(airports.SFO.lon<airports.ORD.lon&&airports.ORD.lon<airports.PIT.lon);assert.ok(airports.ORD.lat>airports.PIT.lat);assert.ok(airports.KIX.lon<airports.HND.lon&&airports.KIX.lat<airports.HND.lat);
 const japan=ordered(japanIds);assert.equal(japan.length,4);assert.equal(japan[1].to,'HND');assert.equal(japan[2].from,'KIX');assert.ok(!japan.some(f=>f.from==='HND'&&f.to==='KIX'));
});


test('airline leader and mileage share the exact year-filtered flown records',()=>{
 const rows=airlineSummaries('2026');assert.equal(rows[0].carrier,'United');assert.equal(rows[0].count,6);
 for(const row of rows){const fs=filterFlights('2026',row.carrier);assert.deepEqual(row.flightIds,fs.map(f=>f.id));assert.equal(row.miles,milesFromKm(totals(fs).km));}
 assert.equal(airlineSummaries('2025')[0].carrier,'Delta');assert.deepEqual(airlineSummaries('2024'),[]);assert.deepEqual(airlineSummaries('2026',[]),[]);
 assert.equal(airlineSummaries('All time').reduce((n,a)=>n+a.count,0),filterFlights('All time').length);
});
test('sample reward progress is independent of flown mileage and handles missing programs',()=>{
 const reward=rewardProgress('United');assert.equal(reward.remaining,6500);assert.equal(reward.percent,74);
 assert.notEqual(reward.balance,airlineSummaries().find(a=>a.carrier==='United').miles);assert.equal(rewardProgress('Unknown'),null);
});

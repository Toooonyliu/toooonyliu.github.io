import {airports,type Flight} from './domain.ts';
export const programs=[{id:'ana',name:'ANA Mileage Club',carrier:'ANA',unit:'Premium Points',second:'ANA Group points'},{id:'united',name:'United MileagePlus',carrier:'United',unit:'PQP',second:'PQF'},{id:'ba',name:'British Airways Club',carrier:'British Airways',currency:'Avios',unit:'Tier points',second:'Additional requirement'},{id:'cathay',name:'Cathay',carrier:'Cathay Pacific',unit:'Status Points',second:'Additional requirement'},{id:'jal',name:'JAL Mileage Bank',carrier:'Japan Airlines',unit:'FLY ON Points',second:'Additional requirement'},{id:'delta',name:'Delta SkyMiles',carrier:'Delta',unit:'MQDs',second:'Additional requirement'}];
export type LoyaltyAccount={id:string;program:string;balance:number;status:number;second:number;goal:'reach'|'retain'|'redeem';goalName:string;target:number;secondTarget:number;start:string;end:string;updated:string;source:'sample'|'manual';rule:'ana-platinum'|'personal'};
export type FlightCredit={accountId:string;stage:'estimated'|'pending'|'posted'|'missing';miles:number|null;points:number|null;second:number|null;note:string;updated:string};
export const sampleAccount=():LoyaltyAccount=>({id:'sample-ana',program:'ana',balance:18500,status:42000,second:22000,goal:'reach',goalName:'Platinum',target:50000,secondTarget:25000,start:'2026-01-01',end:'2026-12-31',updated:'2026-09-15',source:'sample',rule:'ana-platinum'});
export const sampleCredits=():Record<string,FlightCredit>=>({next:{accountId:'sample-ana',stage:'estimated',miles:300,points:850,second:0,note:'Illustrative entry only; replace with the airline’s estimate for your ticket.',updated:'2026-09-15'}});
export const sampleAccounts=():LoyaltyAccount[]=>[sampleAccount(),
 {id:'sample-united',program:'united',balance:64250,status:4200,second:16,goal:'reach',goalName:'My annual flying target',target:6000,secondTarget:20,start:'2026-01-01',end:'2026-12-31',updated:'2026-09-15',source:'sample',rule:'personal'},
 {id:'sample-ba',program:'ba',balance:48000,status:2100,second:0,goal:'redeem',goalName:'A future London getaway',target:60000,secondTarget:0,start:'2026-01-01',end:'2027-03-31',updated:'2026-09-15',source:'sample',rule:'personal'}];
// Add the new examples to older saved demos without replacing edited accounts.
export const accountsFor=(s:{loyaltyAccounts?:LoyaltyAccount[]})=>s.loyaltyAccounts?[...s.loyaltyAccounts,...sampleAccounts().slice(1).filter(a=>!s.loyaltyAccounts!.some(existing=>existing.id===a.id||existing.program===a.program))]:sampleAccounts();
export const creditsFor=(s:{flightCredits?:Record<string,FlightCredit>})=>s.flightCredits??sampleCredits();
export function validAccount(a:LoyaltyAccount){if(!programs.some(p=>p.id===a.program)||!a.goalName.trim()||![a.balance,a.status,a.second,a.target,a.secondTarget].every(x=>Number.isFinite(x)&&x>=0)||a.target<=0||!a.start||!a.end||a.end<a.start)throw Error('Enter a goal, valid non-negative balances and a qualification period.');if(a.goal==='redeem'&&a.secondTarget)throw Error('A redemption savings goal uses a miles balance only.');}
export function progressFor(a:LoyaltyAccount,credits:Record<string,FlightCredit>,flights:Flight[],now=new Date().toISOString().slice(0,10)){
 const rows=flights.filter(f=>f.status!=='canceled'&&credits[f.id]?.accountId===a.id).map(f=>({flight:f,credit:credits[f.id]}));
 const applicable=(f:Flight)=>{const day=new Intl.DateTimeFormat('en-CA',{timeZone:airports[f.from].zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(f.departure));return day<=a.end&&(a.goal==='redeem'||day>=a.start);};
 const pending=rows.filter(r=>r.credit.stage==='pending'&&r.flight.status==='flown'&&applicable(r.flight));
 const booked=rows.filter(r=>r.credit.stage==='estimated'&&r.flight.status==='planned'&&applicable(r.flight));
 const amount=(c:FlightCredit)=>a.goal==='redeem'?c.miles:c.points;
 const sum=(rs:typeof rows)=>rs.reduce((n,r)=>n+(amount(r.credit)??0),0),sumSecond=(rs:typeof rows)=>rs.reduce((n,r)=>n+(r.credit.second??0),0);
 const current=a.goal==='redeem'?a.balance:a.status,expected=sum(booked),waiting=sum(pending),projected=current+expected+waiting;
 return {rows,current,expected,waiting,projected,remaining:Math.max(0,a.target-current),projectedRemaining:Math.max(0,a.target-projected),secondProjected:a.second+sumSecond(booked)+sumSecond(pending),secondRemaining:Math.max(0,a.secondTarget-a.second),expired:a.end<now,unknown:[...pending,...booked].some(r=>amount(r.credit)===null||(a.secondTarget>0&&r.credit.second===null)),percent:Math.min(100,current/a.target*100)};
}

import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require=createRequire(import.meta.url);
const {initialNetwork,readNetwork,updateConnection,canReadMeal,circleMeals}=require(process.argv[2]+"/socialGraph.js");
const {seedMeals}=require(process.argv[2]+"/data.js");
const network=initialNetwork();
const meal=seedMeals.find(meal=>meal.id==="chloe-noodles");
const cases=[
  ["Opt-in restaurant with mutual friend is visible",()=>assert.equal(canReadMeal(meal,network),true)],
  ["Unconsented post stays friends-only",()=>assert.equal(canReadMeal({...meal,discoverable:false},network),false)],
  ["Private beats discovery permission",()=>assert.equal(canReadMeal({...meal,audience:"private"},network),false)],
  ["Home never enters second-degree discovery",()=>assert.equal(canReadMeal({...meal,type:"homemade"},network),false)],
  ["Delivery never implies public restaurant visit",()=>assert.equal(canReadMeal({...meal,type:"delivery"},network),false)],
  ["Unknown or missing venue is not discoverable",()=>{assert.equal(canReadMeal({...meal,venueId:"unknown"},network),false);assert.equal(canReadMeal({...meal,venueId:undefined},network),false);}],
  ["No mutual relationship means no discovery",()=>assert.equal(canReadMeal(meal,{...network,friends:[]}),false)],
  ["Pending request does not unlock home posts",()=>assert.equal(canReadMeal({...meal,type:"homemade"},updateConnection(network,"chloe","request")),false)],
  ["Duplicate and self requests are ignored",()=>{assert.deepEqual(updateConnection(network,"daniel","request"),network);const pending=updateConnection(network,"chloe","request");assert.deepEqual(updateConnection(pending,"chloe","request").outgoing,["chloe"]);}],
  ["Cannot accept an unreceived request",()=>assert.deepEqual(updateConnection(network,"chloe","accept"),network)],
  ["Acceptance is idempotent and clears pending",()=>{const accepted=updateConnection(network,"priya","accept");assert.equal(accepted.friends.filter(id=>id==="priya").length,1);assert.equal(accepted.incoming.length,0);assert.deepEqual(updateConnection(accepted,"priya","accept"),accepted);}],
  ["Decline removes the request",()=>assert.equal(updateConnection(network,"priya","decline").incoming.length,0)],
  ["Confirmed friendship unlocks shared meals, not private ones",()=>{const accepted={...network,friends:[...network.friends,"chloe"]};assert.equal(canReadMeal({...meal,type:"homemade"},accepted),true);assert.equal(canReadMeal({...meal,audience:"private"},accepted),false);}],
  ["Hidden people are excluded from both circles",()=>{const hidden=updateConnection(network,"chloe","hide");assert.ok(!circleMeals(seedMeals,hidden,"extended").some(meal=>meal.userId==="chloe"));}],
  ["Old storage gains defaults without dropping deliberate empty lists",()=>{assert.deepEqual(readNetwork(undefined),network);assert.deepEqual(readNetwork({friends:[]}).friends,[]);}],
  ["Stored graph removes unknown, duplicate and self IDs",()=>assert.deepEqual(readNetwork({friends:["maya","maya","daniel","nobody",4]}).friends,["maya"])],
  ["Friends and discovery circles do not duplicate people",()=>{const direct=circleMeals(seedMeals,network,"friends"),extended=circleMeals(seedMeals,network,"extended");assert.ok(!extended.some(meal=>direct.some(friendMeal=>friendMeal.userId===meal.userId)));}],
];
for(const [name,run] of cases){run();console.log(`PASS ${name}`);}
console.log(`${cases.length} social/privacy checks passed`);

import { chromium } from "playwright";
import assert from "node:assert/strict";
const browser=await chromium.launch({headless:true,executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"});
const page=await browser.newPage({viewport:{width:1280,height:1000}});
const errors=[];page.on("pageerror",error=>errors.push(error.message));
const button=name=>page.getByRole("button",{name,exact:true});
const consent=()=>page.getByRole("button",{name:/Let friends of friends discover this meal/});
const compose=async name=>{await button("Capture a meal").click();await page.getByLabel("What did you eat?",{exact:true}).fill(name);await button("Highly recommend").click();await button("Restaurant").click();await page.getByLabel("Restaurant place").selectOption("everyday_noodles");};
const publish=async()=>{await button("Share this meal").click();await page.getByTestId("bottom-sheet").waitFor({state:"detached"});};
const own=()=>page.evaluate(()=>JSON.parse(localStorage.getItem("food-reals-v3")).meals[0]);
try{
  await page.goto("http://127.0.0.1:4173/",{waitUntil:"networkidle"});
  await compose("Only my friends see this");assert.equal(await consent().getAttribute("aria-pressed"),"false");await publish();assert.equal((await own()).discoverable,false);
  await compose("Open to friends of friends");await consent().click();await publish();assert.equal((await own()).discoverable,true);
  await compose("Home stays with my friends");await consent().click();await button("Homemade").click();assert.equal(await consent().count(),0);await publish();assert.equal((await own()).discoverable,false);
  await compose("Private beats discovery");await consent().click();await page.getByLabel("Share with").selectOption("private");assert.equal(await consent().count(),0);await publish();assert.equal((await own()).discoverable,false);assert.equal((await own()).audience,"private");
  await page.reload({waitUntil:"networkidle"});
  await button("Choose people to see").click();await page.locator(".audience-option").filter({has:page.getByText("Friends of friends",{exact:true})}).click();await button("Yesterday").click();assert.equal(await page.locator(".world-pin").count(),0);assert.match(await page.locator(".map-invitation").innerText(),/quiet day/);await page.mouse.move(20,20);await page.screenshot({path:"qa/iteration5-14-empty-map.png"});
  const guest=await browser.newPage({viewport:{width:1280,height:1000}});
  await guest.goto("http://127.0.0.1:4173/#list="+encodeURIComponent(JSON.stringify({version:1,title:"A place for lunch",ids:["everyday_noodles"],note:"",author:"A friend"})),{waitUntil:"networkidle"});assert.equal(await guest.getByRole("button",{name:"Copy address",exact:true}).count(),1);assert.equal(await guest.getByRole("link",{name:"Open Google Maps",exact:true}).count(),1);assert.equal(await guest.locator(".experience-row").count(),0);await guest.screenshot({path:"qa/iteration5-15-guest.png"});
  assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:["Discovery defaults off","Per-post restaurant opt-in","Switching to home removes consent","Private overrides consent","Yesterday empty map has feed escape","Guest restaurant actions do not expose post history"],pageErrors:errors},null,2));
}finally{await browser.close();}

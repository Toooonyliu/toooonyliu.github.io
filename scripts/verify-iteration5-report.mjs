import { chromium } from "playwright";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const browser=await chromium.launch({headless:true,executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"});
try {
  const page=await browser.newPage({viewport:{width:1200,height:1000}});
  await page.goto(pathToFileURL(resolve("../product/food-reals-iteration-5.html")).href,{waitUntil:"load"});
  const images=await page.locator("img").evaluateAll(images=>images.map(image=>({src:image.getAttribute("src"),loaded:image.complete&&image.naturalWidth>0})));
  assert.equal(images.length,10);
  assert.ok(images.every(image=>image.loaded));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:"qa/iteration5-report.png",fullPage:true});
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  console.log("Report: 10 screenshots loaded; desktop and narrow layouts have no horizontal page overflow.");
} finally {await browser.close();}

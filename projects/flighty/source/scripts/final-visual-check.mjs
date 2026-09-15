import {chromium} from '@playwright/test';
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1400,height:1200},deviceScaleFactor:1});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:4174/');await page.locator('.earth-view[data-ready=true]').waitFor();await page.waitForTimeout(700);
await page.getByRole('button',{name:'Show night view'}).click();await page.getByRole('button',{name:'Show daylight'}).waitFor();await page.waitForTimeout(300);await page.mouse.move(0,0);await page.locator('.device-screen').screenshot({path:'qa/earth-night.png'});
await page.getByRole('button',{name:'Show daylight'}).click();await page.getByRole('button',{name:'Show night view'}).waitFor();
await page.goto('http://127.0.0.1:4174/qa/comparison.html');for(const id of ['collapsed','expanded','history','aircraft'])await page.locator('#'+id).screenshot({path:'qa/compare-'+id+'.png'});
console.log('Day/night toggle passed; page errors:',errors);await browser.close();

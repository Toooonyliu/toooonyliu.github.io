import {chromium} from '@playwright/test';
const b=await chromium.launch({headless:true});const p=await b.newPage({viewport:{width:1200,height:1200}});await p.goto('http://127.0.0.1:4174/qa/frequent-flyer-v2/comparison.html');for(const id of ['programs','trips','review','trip-focus'])await p.locator('#'+id).screenshot({path:`qa/frequent-flyer-v2/compare-${id}.png`});await b.close();

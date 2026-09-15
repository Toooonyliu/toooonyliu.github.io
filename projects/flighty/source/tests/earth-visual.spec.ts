import {test,expect} from '@playwright/test';
test.setTimeout(60000);
test.use({viewport:{width:1400,height:1200},launchOptions:{args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']}});
for(const device of ['iPhone','Pixel 10'])test(`${device}: globe gestures, panel dragging, logos and fixed navigation`,async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');
 if(device==='Pixel 10'){await page.getByTestId('device-picker').click();await page.getByRole('menuitemradio',{name:'Pixel 10'}).click();}
 const earth=page.locator('[data-flow-current=true] .earth-view').first();await expect(earth).toHaveAttribute('data-ready','true');
 await expect.poll(async()=>Math.round((await earth.boundingBox())?.width??0)).toBe(device==='Pixel 10'?427:393);
 const original=await earth.getAttribute('data-camera');const canvas=earth.locator('canvas');const bounds=await canvas.boundingBox();if(!bounds)throw Error('Missing globe');
 const x=bounds.x+bounds.width*.45,y=bounds.y+bounds.height*.25;
 await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+100,y+35,{steps:14});await page.mouse.up();
 await expect.poll(()=>earth.getAttribute('data-camera')).not.toBe(original);
 await expect(page.locator('.travel-panel')).toHaveAttribute('data-expanded','false');
 const before=Number(await earth.getAttribute('data-distance'));
 await page.getByRole('button',{name:'Zoom in',exact:true}).click();
 await expect.poll(async()=>Number(await earth.getAttribute('data-distance'))).toBeLessThan(before);
 await page.getByRole('button',{name:'Recenter Earth',exact:true}).click();
 await expect.poll(async()=>Number(await earth.getAttribute('data-distance'))).toBeCloseTo(3.6,1);
 // Wheel zoom affects the globe, not the panel.
 await page.mouse.move(x,y);await page.mouse.wheel(0,-150);
 await expect.poll(async()=>Number(await earth.getAttribute('data-distance'))).toBeLessThan(3.6);
 await page.getByRole('button',{name:'Recenter Earth',exact:true}).click();
 // Pointer drag on the panel is independent of globe orientation.
 const handle=page.getByRole('button',{name:'Expand panel',exact:true});const hb=await handle.boundingBox();if(!hb)throw Error('Missing panel handle');
 await page.mouse.move(hb.x+hb.width/2,hb.y+hb.height/2);await page.mouse.down();await page.mouse.move(hb.x+hb.width/2,hb.y-300,{steps:16});await page.mouse.up();
 await expect(page.locator('.travel-panel')).toHaveAttribute('data-expanded','true');
 await expect(page.getByRole('navigation',{name:'Main navigation'})).toBeVisible();
 await expect(page.locator('img[alt="United logo"]').first()).toBeVisible();
 expect(await page.locator('img[alt="United logo"]').first().evaluate((image:HTMLImageElement)=>image.complete&&image.naturalWidth>0)).toBe(true);
 await page.mouse.move(0,0);await page.locator('.device-screen').screenshot({path:`qa/${device.replace(' ','-').toLowerCase()}-expanded.png`});
 expect(errors).toEqual([]);
});

test('touch drag and two-finger pinch rotate and zoom the globe',async({browser})=>{
 const context=await browser.newContext({viewport:{width:1400,height:1200},hasTouch:true});const page=await context.newPage();await page.goto('/');
 const earth=page.locator('.earth-view').first();await expect(earth).toHaveAttribute('data-ready','true');await expect.poll(async()=>Math.round((await page.locator('.device-screen').boundingBox())?.width??0)).toBe(393);await expect(earth).toHaveAttribute('data-camera',/./);const rect=await earth.boundingBox();if(!rect)throw Error('No globe');
 const session=await context.newCDPSession(page),x=rect.x+rect.width*.5,y=rect.y+rect.height*.22;
 const send=async(type:string,points:{x:number;y:number;id:number}[])=>session.send('Input.dispatchTouchEvent',{type,touchPoints:points});
 await expect.poll(()=>page.evaluate(({x,y})=>document.elementFromPoint(x,y)?.tagName,{x,y})).toBe('CANVAS');const before=await earth.getAttribute('data-camera');await send('touchStart',[{x,y,id:0}]);for(let i=1;i<=8;i++)await send('touchMove',[{x:x+i*8,y:y+i*2,id:0}]);await send('touchEnd',[]);
 await expect.poll(()=>earth.getAttribute('data-camera')).not.toBe(before);
 const distance=Number(await earth.getAttribute('data-distance'));
 await send('touchStart',[{x:x-20,y,id:0},{x:x+20,y,id:1}]);
 for(let i=1;i<=8;i++)await send('touchMove',[{x:x-20-i*5,y,id:0},{x:x+20+i*5,y,id:1}]);await send('touchEnd',[]);
 await expect.poll(async()=>Number(await earth.getAttribute('data-distance'))).toBeLessThan(distance);
 await expect(page.locator('.travel-panel')).toHaveAttribute('data-expanded','false');await context.close();
});

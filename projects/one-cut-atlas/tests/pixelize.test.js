import test from 'node:test';
import assert from 'node:assert/strict';
import {downsample,extractPalette,quantize,pixelize} from '../src/pixelize.js';

function gradient(width,height){
 const data=new Uint8ClampedArray(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=(y*width+x)*4;data[i]=Math.round(x/(width-1)*255);data[i+1]=Math.round(y/(height-1)*255);data[i+2]=x<width/2?40:200;data[i+3]=255;}
 return {width,height,data};
}

test('downsample averages whole source blocks onto the target grid',()=>{
 const image=gradient(96,54),small=downsample(image,48,27);
 assert.equal(small.width,48);assert.equal(small.height,27);assert.equal(small.data.length,48*27*4);
 assert.ok(small.data[0]<8);assert.ok(small.data[(27*48-1)*4+1]>247);
 const flat={width:4,height:2,data:new Uint8ClampedArray([10,20,30,255,10,20,30,255,50,60,70,255,50,60,70,255,10,20,30,255,10,20,30,255,50,60,70,255,50,60,70,255])};
 assert.deepEqual([...downsample(flat,2,1).data],[10,20,30,255,50,60,70,255]);
});

test('median cut returns a bounded palette and quantize snaps every pixel onto it',()=>{
 const image=gradient(64,36),palette=extractPalette([image],8,4);
 assert.ok(palette.length>=2&&palette.length<=8);
 const snapped=quantize(image,palette),allowed=new Set(palette.map(color=>color.join(',')));
 for(let i=0;i<snapped.data.length;i+=4)assert.ok(allowed.has([snapped.data[i],snapped.data[i+1],snapped.data[i+2]].join(',')));
 const single={width:2,height:1,data:new Uint8ClampedArray([9,9,9,255,9,9,9,255])};
 assert.deepEqual(extractPalette([single],16,4),[[9,9,9]]);
 assert.deepEqual(extractPalette([{width:1,height:1,data:new Uint8ClampedArray([1,2,3,0])}],4,4),[[0,0,0]]);
});

test('pixelize produces the game grid with at most the requested colors',()=>{
 const result=pixelize(gradient(192,108),{width:48,height:27,colors:12});
 assert.equal(result.width,48);assert.equal(result.height,27);
 const colors=new Set();for(let i=0;i<result.data.length;i+=4)colors.add(`${result.data[i]},${result.data[i+1]},${result.data[i+2]}`);
 assert.ok(colors.size<=12&&colors.size>=4);
});

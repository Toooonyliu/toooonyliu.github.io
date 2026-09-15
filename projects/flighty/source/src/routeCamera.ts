import * as THREE from 'three';
import {airports,type Flight} from './domain.ts';
export function earthPosition(lat:number,lon:number,radius=1){const phi=THREE.MathUtils.degToRad(lat),theta=THREE.MathUtils.degToRad(lon);return new THREE.Vector3(radius*Math.cos(phi)*Math.cos(theta),radius*Math.sin(phi),-radius*Math.cos(phi)*Math.sin(theta));}
// Fit the full great-circle routes in the actual viewport, including arc elevation.
export function routeCamera(fs:Flight[],aspect=1,fov=43){
 const points:THREE.Vector3[]=[];for(const f of fs.filter(f=>f.status!=='canceled')){const a=earthPosition(airports[f.from].lat,airports[f.from].lon),b=earthPosition(airports[f.to].lat,airports[f.to].lon),angle=a.angleTo(b);for(let i=0;i<=32;i++){const t=i/32,v=angle<1e-6?a.clone():a.clone().multiplyScalar(Math.sin((1-t)*angle)).add(b.clone().multiplyScalar(Math.sin(t*angle))).divideScalar(Math.sin(angle));points.push(v.normalize().multiplyScalar(1.004+Math.sin(Math.PI*t)*Math.min(.06,angle*.022)));}}
 if(!points.length)return earthPosition(27,-95,3.6);
 const center=points.reduce((v,p)=>v.add(p.clone().normalize()),new THREE.Vector3()).normalize();if(center.length()<.1)return earthPosition(27,-95,3.6);
 const right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),center).normalize(),up=new THREE.Vector3().crossVectors(center,right).normalize();
 const tanY=Math.tan(THREE.MathUtils.degToRad(fov/2)),tanX=tanY*aspect;
 let distance=1.16;for(const p of points){const depth=p.dot(center);distance=Math.max(distance,depth+Math.abs(p.dot(right))/(tanX*.70),depth+Math.abs(p.dot(up))/(tanY*.64),depth>0?1.035/depth:3.8);}
 return center.multiplyScalar(Math.min(5.5,distance));
}

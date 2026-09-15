import {useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {Crosshair,Plus,Minus,Sun,Moon} from '@phosphor-icons/react';
import {airports,type Flight} from './domain';
import {earthPosition,routeCamera} from './routeCamera';
export {earthPosition} from './routeCamera';

type Props={flights:Flight[];selected?:string;showGaps?:boolean;onSelect?:(id:string)=>void};
export default function EarthView({flights,selected,showGaps=false,onSelect}:Props){
 const host=useRef<HTMLDivElement>(null),canvas=useRef<HTMLCanvasElement>(null);
 const api=useRef<{reset:()=>void;zoom:(factor:number)=>void;night:(enabled:boolean)=>void;rotate:(dx:number,dy:number)=>void}|null>(null);
 const [night,setNight]=useState(false),[failed,setFailed]=useState(false),[ready,setReady]=useState(false);
 const records=useRef(flights);records.current=flights;
 const selection=useRef(onSelect);selection.current=onSelect;
 const signature=flights.map(f=>f.id).join(',');
 useEffect(()=>{
  const root=host.current,element=canvas.current;if(!root||!element)return;
  let renderer:THREE.WebGLRenderer;
  try{renderer=new THREE.WebGLRenderer({canvas:element,antialias:true,alpha:false});}catch{setFailed(true);return;}
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;
  setNight(false);
  const scene=new THREE.Scene();scene.background=new THREE.Color('#020306');
  const camera=new THREE.PerspectiveCamera(43,1,.01,100);
  const hasJapan=flights.some(f=>['HND','KIX'].includes(f.to)||['HND','KIX'].includes(f.from));
  let initial=earthPosition(27,hasJapan?-115:-95,3.6);
  if(showGaps)initial=routeCamera(flights,root.clientWidth/root.clientHeight);
  camera.position.copy(initial);camera.lookAt(0,0,0);
  const controls=new OrbitControls(camera,element);controls.enablePan=false;controls.enableDamping=true;controls.dampingFactor=.085;controls.rotateSpeed=.55;controls.zoomSpeed=.65;controls.minDistance=showGaps?1.08:1.65;controls.maxDistance=5.6;controls.minPolarAngle=.05;controls.maxPolarAngle=Math.PI-.05;
  controls.touches.ONE=THREE.TOUCH.ROTATE;controls.touches.TWO=THREE.TOUCH.DOLLY_ROTATE;
  const resources:THREE.Texture[]=[];let disposed=false,dirty=true;
  const invalidate=()=>{dirty=true;};controls.addEventListener('change',invalidate);
  const loader=new THREE.TextureLoader();
  const load=(path:string)=>{const t=loader.load(path,()=>{if(!disposed){setReady(true);dirty=true;}},undefined,()=>{if(!disposed)setFailed(true);});t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());resources.push(t);return t;};
  const day=load('/assets/earth/day.jpg'),lights=load('/assets/earth/night.jpg');
  const sun=initial.clone().normalize().add(new THREE.Vector3(-.15,.35,.2)).normalize();
  const surface=new THREE.ShaderMaterial({uniforms:{dayMap:{value:day},nightMap:{value:lights},sunDirection:{value:sun.clone()}},vertexShader:`varying vec2 vUv;varying vec3 vN;void main(){vUv=uv;vN=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,fragmentShader:`uniform sampler2D dayMap;uniform sampler2D nightMap;uniform vec3 sunDirection;varying vec2 vUv;varying vec3 vN;void main(){float light=dot(normalize(vN),sunDirection);float daylight=smoothstep(-0.2,0.5,light);vec3 ground=mix(texture2D(dayMap,vUv).rgb,vec3(.15,.25,.30),.08);vec3 cities=texture2D(nightMap,vUv).rgb;vec3 color=ground*(0.08+0.92*daylight)+cities*(1.0-daylight)*1.2;gl_FragColor=vec4(color,1.0);
#include <colorspace_fragment>
}`});
  const earth=new THREE.Mesh(new THREE.SphereGeometry(1,128,96),surface);scene.add(earth);
  const atmosphere=new THREE.Mesh(new THREE.SphereGeometry(1.012,96,64),new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.BackSide,blending:THREE.AdditiveBlending,vertexShader:`varying vec3 vNormal;varying vec3 vPosition;void main(){vec4 p=modelViewMatrix*vec4(position,1.);vNormal=normalize(normalMatrix*normal);vPosition=p.xyz;gl_Position=projectionMatrix*p;}`,fragmentShader:`varying vec3 vNormal;varying vec3 vPosition;void main(){float rim=pow(1.-abs(dot(normalize(vNormal),normalize(-vPosition))),4.);gl_FragColor=vec4(.22,.57,.95,rim*.52);}`}));scene.add(atmosphere);
  // A sparse star field is geometry, kept outside the globe's interaction model.
  const starPositions=[];let random=42;const rand=()=>{random=(random*16807)%2147483647;return random/2147483647;};
  for(let i=0;i<750;i++){const v=new THREE.Vector3(rand()-.5,rand()-.5,rand()-.5).normalize().multiplyScalar(30);starPositions.push(v.x,v.y,v.z);}
  const starGeometry=new THREE.BufferGeometry();starGeometry.setAttribute('position',new THREE.Float32BufferAttribute(starPositions,3));scene.add(new THREE.Points(starGeometry,new THREE.PointsMaterial({color:'#c4d1df',size:.028,sizeAttenuation:true,transparent:true,opacity:.72})));
  const overlays=new THREE.Group();scene.add(overlays);
  const lineFor=(from:string,to:string,color:string,dashed=false,id?:string)=>{
   const a=earthPosition(airports[from].lat,airports[from].lon),b=earthPosition(airports[to].lat,airports[to].lon),angle=a.angleTo(b);
   const points=Array.from({length:100},(_,i)=>{const t=i/99;const v=angle<1e-5?a.clone():a.clone().multiplyScalar(Math.sin((1-t)*angle)).add(b.clone().multiplyScalar(Math.sin(t*angle))).divideScalar(Math.sin(angle));return v.normalize().multiplyScalar(1.004+Math.sin(Math.PI*t)*Math.min(.06,angle*.022));});
   const geometry=new THREE.BufferGeometry().setFromPoints(points);
   const material=dashed?new THREE.LineDashedMaterial({color,dashSize:.014,gapSize:.01}):new THREE.LineBasicMaterial({color,transparent:true,opacity:selected&&selected!==id ? .65:1});
   const line=new THREE.Line(geometry,material);line.computeLineDistances();if(id)line.userData.flight=id;overlays.add(line);
  };
  flights.filter(f=>f.status!=='canceled').forEach(f=>lineFor(f.from,f.to,flights.length===1||selected===f.id?'#299fff':'#cee9fa',false,f.id));
  if(showGaps)flights.forEach((f,i)=>{if(i&&f.status!=='canceled'&&flights[i-1].status!=='canceled'&&flights[i-1].to!==f.from)lineFor(flights[i-1].to,f.from,'#c9b8dc',true);});
  const codes=[...new Set(flights.filter(f=>f.status!=='canceled').flatMap(f=>[f.from,f.to]))];
  const labels:{position:THREE.Vector3;element:HTMLSpanElement;priority:number}[]=[];
  const label=(text:string,lat:number,lon:number,priority:number)=>{const node=document.createElement('span');node.className=priority===2?'earth-label airport-label':'earth-label place-label';node.textContent=text;root.appendChild(node);labels.push({position:earthPosition(lat,lon,1.012),element:node,priority});};
  codes.forEach(code=>{const a=airports[code];const point=new THREE.Mesh(new THREE.SphereGeometry(.007,12,10),new THREE.MeshBasicMaterial({color:'#9ddaff'}));point.userData.marker=true;point.position.copy(earthPosition(a.lat,a.lon,1.008));overlays.add(point);label(a.city,a.lat,a.lon,2);});
  const places:[string,number,number][]=[['North America',48,-103],['South America',-18,-58],['Europe',53,15],['Asia',49,95],['Africa',8,22],['Australia',-25,134],['Pacific Ocean',16,-155],['Atlantic Ocean',21,-38]];
  places.forEach(([text,lat,lon])=>label(text,lat,lon,1));
  const size={w:1,h:1};const resize=()=>{size.w=root.clientWidth;size.h=root.clientHeight;renderer.setSize(size.w,size.h,false);camera.aspect=size.w/size.h;if(showGaps){initial=routeCamera(flights,camera.aspect);camera.position.copy(initial);}camera.updateProjectionMatrix();dirty=true;};
  const observer=new ResizeObserver(resize);observer.observe(root);resize();
  let frame=0,lastTime=0;const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;controls.enableDamping=!reduced;
  const render=(time:number)=>{frame=requestAnimationFrame(render);if(time-lastTime<1000/40)return;lastTime=time;const changed=controls.update();if(!changed&&!dirty)return;dirty=false;
   root.dataset.fitted=String(showGaps);root.dataset.camera=camera.position.toArray().map(n=>n.toFixed(3)).join(',');root.dataset.distance=camera.position.length().toFixed(3);
   overlays.children.filter(o=>o.userData.marker).forEach(o=>{const depth=o.position.clone().sub(camera.position).dot(camera.getWorldDirection(new THREE.Vector3()));const radius=2*depth*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))/size.h*3;o.scale.setScalar(Math.max(.1,radius/.007));});
   const placed:{x:number;y:number;w:number}[]=[];
   labels.sort((a,b)=>b.priority-a.priority).forEach(({position,element,priority})=>{const projected=position.clone().project(camera);const visible=position.dot(camera.position.clone().sub(position))>0&&projected.z<1;const x=(projected.x*.5+.5)*size.w,y=(-projected.y*.5+.5)*size.h,w=element.offsetWidth||80;
    const collision=placed.some(p=>Math.abs(x-p.x)<(w+p.w)/2+5&&Math.abs(y-p.y)<22);
    if(!visible||collision||x<15||x>size.w-15||y<55||y>size.h-30){element.style.visibility='hidden';return;}
    element.style.visibility='visible';element.style.transform=`translate(${Math.max(w/2+8,Math.min(size.w-w/2-8,x))}px,${y+(priority===2?12:0)}px) translate(-50%,-50%)`;placed.push({x,y,w});
   });renderer.render(scene,camera);
  };frame=requestAnimationFrame(render);
  api.current={rotate:(dx,dy)=>{const s=new THREE.Spherical().setFromVector3(camera.position);s.theta+=dx;s.phi=THREE.MathUtils.clamp(s.phi+dy,.05,Math.PI-.05);camera.position.setFromSpherical(s);controls.update();},reset:()=>{controls.reset();camera.position.copy(initial);controls.update();},zoom:factor=>{camera.position.multiplyScalar(factor).clampLength(controls.minDistance,controls.maxDistance);controls.update();},night:enabled=>{surface.uniforms.sunDirection.value.copy(enabled?sun.clone().negate():sun);dirty=true;}};
  let start={x:0,y:0};const down=(e:PointerEvent)=>{start={x:e.clientX,y:e.clientY};};
  const click=(e:PointerEvent)=>{if(Math.hypot(e.clientX-start.x,e.clientY-start.y)>6||!selection.current)return;const r=element.getBoundingClientRect();const ray=new THREE.Raycaster();ray.params.Line={threshold:.018};ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);const hit=ray.intersectObjects(overlays.children).find(h=>h.object.userData.flight&&h.point.dot(camera.position.clone().sub(h.point))>0);if(hit)selection.current(hit.object.userData.flight);};
  element.addEventListener('pointerdown',down);element.addEventListener('pointerup',click);
  return()=>{disposed=true;cancelAnimationFrame(frame);observer.disconnect();controls.removeEventListener('change',invalidate);controls.dispose();element.removeEventListener('pointerdown',down);element.removeEventListener('pointerup',click);labels.forEach(l=>l.element.remove());scene.traverse(o=>{const mesh=o as THREE.Mesh;mesh.geometry?.dispose();const material=mesh.material;if(Array.isArray(material))material.forEach(m=>m.dispose());else material?.dispose();});resources.forEach(t=>t.dispose());renderer.dispose();api.current=null;};
 },[signature,selected,showGaps]);
 return <div ref={host} className="earth-view" data-ready={ready} data-scroll-drag="ignore">
 <canvas ref={canvas} className="earth-canvas" role="img" aria-label="Interactive Earth. Drag or use arrow keys to rotate; scroll, pinch or press plus/minus to zoom. Home recenters." tabIndex={0} onKeyDown={e=>{if(['+','=','-','Home','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))e.preventDefault();if(e.key==='+'||e.key==='=')api.current?.zoom(.85);if(e.key==='-')api.current?.zoom(1.15);if(e.key==='Home')api.current?.reset();if(e.key==='ArrowLeft')api.current?.rotate(-.12,0);if(e.key==='ArrowRight')api.current?.rotate(.12,0);if(e.key==='ArrowUp')api.current?.rotate(0,-.12);if(e.key==='ArrowDown')api.current?.rotate(0,.12);}}/> <div className="earth-tools"><button aria-label="Recenter Earth" onClick={()=>api.current?.reset()}><Crosshair size={23}/></button><button aria-label={night?'Show daylight':'Show night view'} onClick={()=>{setNight(!night);api.current?.night(!night);}}>{night?<Sun size={22}/>:<Moon size={22}/>}</button><div className="earth-zoom"><button aria-label="Zoom in" onClick={()=>api.current?.zoom(.88)}><Plus size={19}/></button><button aria-label="Zoom out" onClick={()=>api.current?.zoom(1.12)}><Minus size={19}/></button></div></div>
 {failed&&<p className="earth-error">Earth imagery could not load. Reload to try again.</p>}
 <span className="earth-credit">NASA Earth Observatory</span>
 </div>;
}

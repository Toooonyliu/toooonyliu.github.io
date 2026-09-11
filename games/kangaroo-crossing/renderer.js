// Orthographic 3D voxel renderer, shared by the page and the inline demo.
function createVoxelRenderer(ctx, width, height) {
  let faces = [], cam = 0;
  const project = ([x,y,z]) => [x, height-135-(y-cam)*64-z*.88];
  function shade(hex,f) {return '#'+hex.slice(1).match(/../g).map(v=>Math.min(255,Math.round(parseInt(v,16)*f)).toString(16).padStart(2,'0')).join('');}
  function face(points,color) {
    faces.push({points:points.map(project),color,depth:points.reduce((s,p)=>s-p[1]*64+p[2]*.12,0)/points.length});
  }
  function cube(x,y,z,w,d,h,color,angle=0) {
    const c=Math.cos(angle),s=Math.sin(angle),p=[];
    for(const zz of [z,z+h])for(const [xx,yy] of [[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]])p.push([x+xx*c-yy*s,y+(xx*s+yy*c)/64,zz]);
    face([p[0],p[1],p[2],p[3]],shade(color,.65));
    for(let i=0;i<4;i++){const j=(i+1)%4;face([p[i],p[j],p[j+4],p[i+4]],shade(color,[.76,.87,.66,.72][i]));}
    face(p.slice(4),shade(color,1.12));
  }
  function flush(){faces.sort((a,b)=>a.depth-b.depth);for(const f of faces){ctx.fillStyle=f.color;ctx.beginPath();f.points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();ctx.fill();}faces=[];}
  function ground(x,y,w,d,color){const p=project([x-w/2,y+d/128,0]);ctx.fillStyle=color;ctx.fillRect(p[0],p[1],w,d);}
  function shadow(x,y,w,d,alpha=.2){ctx.fillStyle=`rgba(24,44,35,${alpha})`;const p=project([x+10,y-.1,0]);ctx.beginPath();ctx.ellipse(...p,w,d,0,0,Math.PI*2);ctx.fill();}
  function kangaroo(x,y,lift,angle,squash,phase){
    const c=Math.cos(angle),s=Math.sin(angle);
    const part=(px,py,z,w,d,h,col)=>cube(x+px*c-py*s,y+(px*s+py*c)/64,lift+z*squash,w,d,h*squash,col,angle);
    // Local +Y is forward, so at angle zero the player sees its back.
    part(0,-23,5,10,28,8,'#ac754a');part(0,-42,2,6,18,5,'#b98051');
    for(const sign of [-1,1]){part(sign*10,4,1,11,23,8,'#b98151');part(sign*12,-2,9,12,16,16,'#c68c58');}
    part(0,0,16,25,20,28,'#cb9561');part(0,11,20,15,3,18,'#eed0a0');
    part(0,5,43,19,17,18,'#d09a66');part(0,17,44,13,12,8,'#dca976');part(0,23,48,8,3,4,'#453d35');
    for(const sign of [-1,1]){
      part(sign*7,4,60,5,7,23+Math.sin(phase)*2,'#c58b59');part(sign*7,8,63,2,1,16,'#edc1a3');
      part(sign*8,14,54,3,2,3,'#302f2b');part(sign*15,9,28,6,12,7,'#b98253');
    }
  }
  function render(rows,camera,player,hop,facing,elapsed,state,landing,death=null){
    cam=camera;ctx.clearRect(0,0,width,height);ctx.fillStyle='#a6d577';ctx.fillRect(0,0,width,height);
    const sorted=[...rows.values()].sort((a,b)=>b.n-a.n);
    for(const row of sorted){if(project([0,row.n,0])[1]<-180||project([0,row.n,0])[1]>height+150)continue;
      ground(width/2,row.n,width,64,row.water?'#57b7ce':row.road?'#646b79':row.n%2?'#a5d479':'#b0dc82');
      if(row.road){for(let x=0;x<width;x+=85)ground(x,row.n-.46,37,3,'#b8bdc1');}
      if(row.water){for(let x=0;x<width;x+=92)ground(x+Math.sin(elapsed+row.n)*9,row.n+.25,27,2,'#8cd6de');}
    }
    let pos=player, lift=0,squash=1;
    if(hop){const t=Math.min(1,hop.t/.3),a=Math.max(0,Math.min(1,(t-.16)/.72));const travel=a*a*(3-2*a);pos={x:hop.fromX+(hop.toX-hop.fromX)*travel,y:hop.fromY+(hop.toY-hop.fromY)*travel};lift=Math.sin(a*Math.PI)*33;squash=t<.16?1-.24*Math.sin(t/.16*Math.PI/2):t>.88?1-.2*Math.sin((t-.88)/.12*Math.PI):1+.07*Math.sin(a*Math.PI);}
    else squash=1-.16*Math.sin(Math.min(1,landing/.13)*Math.PI);
    const px=98+pos.x*64+32;
    for(const row of sorted){if(project([0,row.n,0])[1]<-180||project([0,row.n,0])[1]>height+150)continue;
      for(const car of row.cars){shadow(car.x+car.length/2,row.n,car.length*.55,21,.19);}
      if(!row.road&&!row.water){for(const x of [28,858])shadow(x,row.n,32,18,.17);}
    }
    if(!death)shadow(px,pos.y,20-lift*.15,11-lift*.06,.24-lift*.003);
    for(const row of sorted){if(project([0,row.n,0])[1]<-180||project([0,row.n,0])[1]>height+150)continue;
      if(!row.water&&!row.road){
        for(const x of [28,858]){cube(x,row.n,0,10,10,24,'#997553');cube(x,row.n,22,39,34,32,'#6ea753');cube(x-3,row.n+.04,54,25,24,15,'#87bf5e');}
        for(const d of row.decorations)cube(d.x,row.n+(d.y-32)/64,0,d.size,3,3,'#93c269');
        cube(width/2,row.n-.48,-7,width,4,7,'#8db562');
      }
      for(const p of row.platforms){
        if(p.leaf){cube(p.x+p.length/2,row.n,0,p.length-8,39,5,'#4a9c53');cube(p.x+p.length/2,row.n,5,p.length-23,3,1,'#9aca67');cube(p.x+p.length/2-12,row.n+.08,5,8,8,5,'#edb5c3');}
        else{cube(p.x+p.length/2,row.n,0,p.length,40,10,'#a7764d');for(const dx of [-p.length/2+7,p.length/2-7])cube(p.x+p.length/2+dx,row.n,10,9,34,1,'#d2a76f');cube(p.x+p.length/2,row.n,10,p.length-38,3,1,'#805637');}
      }
      for(const car of row.cars){const x=car.x+car.length/2,bus=car.type==='bus',amb=car.type==='ambulance',police=car.type==='police';
        for(const side of [-1,1])for(const axle of [-1,1])cube(x+axle*(car.length/2-17),row.n+side*.27,0,15,7,12,'#303944');
        cube(x,row.n,9,car.length,34,16,car.color);
        cube(x,row.n,25,car.length*(bus||amb?.86:.5),29,bus?23:amb?21:15,car.color);
        const roof=bus?48:amb?46:40;
        cube(x+row.dir*car.length*(bus||amb?.37:.21),row.n,roof-12,7,28,12,'#7fbcca');
        if(bus){for(let xx=-car.length/2+17;xx<car.length/2-12;xx+=24)cube(x+xx,row.n-.236,29,17,1,14,'#477e91');}
        if(police||amb){cube(x,row.n,roof,7,16,4,'#e45752');cube(x+7,row.n,roof,7,16,4,'#64b3ed');cube(x,row.n-.27,14,car.length-8,1,5,police?'#324e68':'#e26755');if(amb){cube(x,row.n-.237,29,14,1,4,'#e26755');cube(x,row.n-.238,24,4,1,14,'#e26755');}}
        for(const side of [-1,1])cube(x+row.dir*(car.length/2+.1),row.n+side*.18,14,1,7,7,'#fff0b2');
      }
    }
    if(!death){kangaroo(px,pos.y,lift,facing,squash,elapsed*8);flush();}
    else {
      flush();
      const t=death.t,origin=project([98+death.position.x*64+32,death.position.y,0]);
      const dx=origin[0],dy=origin[1];
      if(death.kind==='car' && t<1.2){
        // Draw the isolated character after the world so the flight stays above it.
        const flight=Math.max(0,t-.065);
        ctx.save();ctx.translate(dx+death.direction*flight*1150,dy-430*flight+140*flight*flight-35);
        ctx.rotate(death.direction*flight*9);ctx.translate(-dx,-dy+35);
        kangaroo(dx,death.position.y,0,facing,1,elapsed*8);flush();ctx.restore();
        if(t<.18){ctx.save();ctx.globalAlpha=1-t/.18;ctx.strokeStyle='#fff0b2';ctx.lineWidth=4;for(let i=0;i<9;i++){const a=i*Math.PI*2/9;ctx.beginPath();ctx.moveTo(dx+Math.cos(a)*21,dy-25+Math.sin(a)*21);ctx.lineTo(dx+Math.cos(a)*(35+t*80),dy-25+Math.sin(a)*(35+t*80));ctx.stroke();}ctx.restore();}
      }else if(death.kind==='water'){
        // Clip at the water surface: the model disappears below the waterline.
        if(t<.65){ctx.save();ctx.beginPath();ctx.rect(0,0,width,dy+2);ctx.clip();ctx.globalAlpha=Math.max(0,1-t/.65);kangaroo(dx,death.position.y,-t*150,facing+t*.7,1,elapsed*8);flush();ctx.restore();}
        ctx.save();
        for(let ring=0;ring<3;ring++){const age=t-ring*.13;if(age<0)continue;ctx.globalAlpha=Math.max(0,1-age/1.05)*.7;ctx.strokeStyle='#d5f8fa';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(dx,dy,15+age*70,6+age*27,0,0,Math.PI*2);ctx.stroke();}
        for(let i=0;i<18;i++){const age=Math.max(0,t-.06),a=i*Math.PI*2/18,speed=48+(i%4)*17;const z=(160+(i%3)*30)*age-260*age*age;if(z<0)continue;ctx.globalAlpha=Math.max(0,1-age/1.05);ctx.fillStyle=i%2?'#e5fcfa':'#9de1f0';const x=dx+Math.cos(a)*speed*age,y=dy+Math.sin(a)*speed*age*.4-z;ctx.fillRect(x,y,5+i%3,8+i%4);}
        ctx.restore();
      }
    }
    if(state==='playing'&&project([px,pos.y,0])[1]>height-95){ctx.fillStyle='#a5433f';ctx.fillRect(0,height-8,width,8);ctx.font='bold 19px sans-serif';ctx.textAlign='center';ctx.fillText('KEEP HOPPING! ↑',width/2,height-24);ctx.textAlign='start';}
  }
  return {render};
}

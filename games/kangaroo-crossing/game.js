(() => {
  'use strict';
  const canvas = document.querySelector('#game'), ctx = canvas.getContext('2d');
  const scoreEl = document.querySelector('#score'), bestEl = document.querySelector('#best');
  const overlay = document.querySelector('#overlay'), start = document.querySelector('#start');
  const W = 900, H = 630, TILE = 64, COLS = 11, LEFT = (W - COLS * TILE) / 2;
  let state = 'ready', rows = new Map(), player, camera = 0, score = 0, best = 0, last = 0, hop = null, elapsed = 0, facing = 0, targetFacing = 0, landing = 0, transition = 0, death = null; 
  try { best = Number(localStorage.getItem('little-crossing-best')) || 0; } catch {}
  bestEl.textContent = best;
  const audio = createGameAudio(document.querySelector('#sound'));
  const voxel = createVoxelRenderer(ctx,W,H);
  const random = (a,b) => a + Math.random() * (b-a);
  function makeRow(n) {
    const water = n > 2 && [6,7,8].includes(n % 14);
    const road = n > 2 && !water && ![0,1,5,9].includes(n % 14);
    const dir = n % 2 ? 1 : -1;
    const row = {n, road, water, platforms:[], dir, speed:random(85,145) + Math.min(n,100)*.4, cars:[], decorations:[]};
    if (road) {
      const spacing = 315;
      let i=0;
      for (let x=-350;x<W+350;x+=spacing) {
        const type=['car','bus','police','ambulance'][(n+i++)%4];
        const length=type==='bus'?155:type==='ambulance'?105:78;
        const color=type==='bus'?'#edbd50':type==='police'?'#f0f2ec':type==='ambulance'?'#fff4df':['#e98165','#83bac7'][i%2];
        row.cars.push({x,length,color,type});
      }
    } else if(water) {
      row.speed= n%14===7 ? 0 : 22;
      const leaf=n%14===7, length=leaf?76:190, spacing=leaf?112:245;
      for(let x=-300;x<W+300;x+=spacing)row.platforms.push({x,length,leaf});
    } else {
      for(let i=0;i<19;i++) row.decorations.push({x:random(0,W),y:random(7,55),size:random(2,5)});
    }
    return row;
  }
  function populate() {for(let n=Math.max(-3,Math.floor(camera)-4);n<camera+14;n++) if(!rows.has(n)) rows.set(n,makeRow(n));for(const n of rows.keys()) if(n<camera-5) rows.delete(n);}
  function reset() {player={x:5,y:0};camera=0;score=0;hop=null;elapsed=0;facing=0;targetFacing=0;landing=0;death=null;overlay.classList.remove('death-title');rows=new Map();populate();scoreEl.textContent=0;}
  function play() {
    if(state==='starting'||state==='playing')return;
    if(state!=='paused')reset();
    audio.start();
    state='starting';transition=.44;overlay.hidden=false;overlay.classList.add('leaving');
    document.querySelector('#pause').textContent='Ⅱ';
  }
  function show(title,copy,label,button) {document.querySelector('#modal-title').textContent=title;document.querySelector('#modal-copy').textContent=copy;document.querySelector('#modal-label').textContent=label;start.textContent=button;overlay.classList.remove('leaving');overlay.hidden=false;}
  function die(reason = 'Traffic caught you!', kind = 'fall', direction = 1) {
    if(state!=='playing')return;
    const t=hopProgress();
    const position=hop?{x:hop.fromX+(hop.toX-hop.fromX)*t,y:hop.fromY+(hop.toY-hop.fromY)*t}:{...player};
    death={kind,direction,reason,position,t:0,duration:kind==='water'?1.35:kind==='car'?1.25:.35};
    hop=null;state='dying';overlay.hidden=true;audio.stop();audio.sound(kind);
  }
  function finishDeath(){
    state='over';audio.sound('over');
    if(score>best){best=score;bestEl.textContent=best;try{localStorage.setItem('little-crossing-best',best);}catch{}}
    overlay.classList.add('death-title');
    show('One more crossing?',death.reason+' Distance: '+score+' rows.','A GOOD RUN','Try again ↗');
    document.querySelector('#announcement').textContent='Game over. '+death.reason+' Distance '+score;start.focus();
  }
  function pause() {if(state==='playing'){state='paused';audio.stop();show('Take a breather.','Your little kangaroo will be right here.','PAUSED','Keep going ↗');document.querySelector('#pause').textContent='▶';}else if(state==='paused') play();}
  function move(dx,dy) {if(state!=='playing'||hop)return;const x=player.x+dx,y=player.y+dy;if(x<0||x>=COLS||y<Math.max(0,Math.floor(camera-2)))return;audio.sound('jump');targetFacing=dy===1?0:dy===-1?Math.PI:dx===1?-Math.PI/2:Math.PI/2;hop={fromX:player.x,fromY:player.y,toX:x,toY:y,t:0};}
  function yOf(n){return H-135-(n-camera)*TILE;}
  function draw() {voxel.render(rows,camera,player,hop,facing,elapsed,state,landing,death);}
  function hopProgress(){if(!hop)return 0;const a=Math.max(0,Math.min(1,(hop.t/.3-.16)/.72));return a*a*(3-2*a);}
  function update(dt) {
    let justLanded=false;
    elapsed+=dt;landing=Math.max(0,landing-dt);
    const turn=Math.atan2(Math.sin(targetFacing-facing),Math.cos(targetFacing-facing));facing+=turn*Math.min(1,dt*22);
    const standing=rows.get(player.y);
    if(!hop && standing?.water)player.x+=standing.speed*standing.dir*dt/TILE;
    for(const row of rows.values())for(const p of row.platforms){p.x+=row.speed*row.dir*dt;if(p.x>W+300)p.x=-300-p.length;if(p.x+p.length<-300)p.x=W+300;}

    for(const row of rows.values())for(const car of row.cars){car.x+=row.speed*row.dir*dt;if(car.x>W+350)car.x=-350-car.length;if(car.x+car.length<-350)car.x=W+350;}
    if(hop){hop.t+=dt;if(hop.t>=.3){player.x=hop.toX;player.y=hop.toY;hop=null;landing=.13;justLanded=true;if(player.y>score){score=player.y;scoreEl.textContent=score;}}}
    // Always scroll forward. Catch up faster when the kangaroo gets ahead.
    camera+=dt*(.42+Math.min(score,80)*.003);
    camera+=Math.max(0,score-3-camera)*Math.min(1,dt*6);populate();
    const t=hopProgress();
    const px=hop?hop.fromX+(hop.toX-hop.fromX)*t:player.x,py=hop?hop.fromY+(hop.toY-hop.fromY)*t:player.y;
    if(px<-.4||px>COLS-.6){die('You drifted out of bounds!');return;}
    if(yOf(py)>H+20){die('You fell behind the screen!');return;}
    const row=rows.get(Math.round(py)),x=LEFT+px*TILE+TILE/2;
    if(!hop && row?.water && !row.platforms.some(p=>x>p.x+5&&x<p.x+p.length-5)){die('Splash! Land on a log or lily pad.','water');return;}
    if(row?.road&&Math.abs(py-row.n)<.43&&row.cars.some(c=>x+12>c.x&&x-12<c.x+c.length))die('Traffic caught you!','car',row.dir);
    if(justLanded && state==='playing')audio.sound(row?.water?(row.platforms[0]?.leaf?'leaf':'wood'):'land');
  }
  function frame(now){const dt=Math.min((now-last)/1000||0,1/30);last=now;if(state==='starting'){transition-=dt;if(transition<=0){state='playing';overlay.hidden=true;overlay.classList.remove('leaving');}}if(state==='playing')update(dt);else if(state==='dying'){death.t+=dt;if(death.t>=death.duration)finishDeath();}audio.tick();draw();requestAnimationFrame(frame);}
  const keys={ArrowUp:[0,1],w:[0,1],ArrowDown:[0,-1],s:[0,-1],ArrowLeft:[-1,0],a:[-1,0],ArrowRight:[1,0],d:[1,0]};
  window.addEventListener('keydown',e=>{const key=e.key.length===1?e.key.toLowerCase():e.key;if(keys[key]){e.preventDefault();move(...keys[key]);}else if(key==='p'&&!e.repeat)pause();else if(key==='r'&&!e.repeat){state='ready';play();}});
  start.addEventListener('click',play);document.querySelector('#pause').addEventListener('click',pause);
  document.querySelectorAll('[data-dx]').forEach(b=>b.addEventListener('pointerdown',e=>{e.preventDefault();move(Number(b.dataset.dx),Number(b.dataset.dy));}));
  let touch=null;canvas.addEventListener('pointerdown',e=>{touch={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});canvas.addEventListener('pointerup',e=>{if(!touch)return;const dx=e.clientX-touch.x,dy=e.clientY-touch.y;touch=null;if(Math.max(Math.abs(dx),Math.abs(dy))<12)move(0,1);else if(Math.abs(dx)>Math.abs(dy))move(Math.sign(dx),0);else move(0,-Math.sign(dy));});canvas.addEventListener('pointercancel',()=>touch=null);
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='playing')pause();});
  reset();requestAnimationFrame(frame);
})();

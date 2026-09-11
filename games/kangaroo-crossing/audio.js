// Original procedural score: 80 BPM, warm seventh chords, soft keys and bass.
// All audio is synthesized locally; nothing is downloaded or autoplayed.
function createGameAudio(button) {
  let context, master, music, effects, noiseBuffer, muted=false, active=false, next=0, step=0;
  const voices=new Set();
  try {muted=localStorage.getItem('kangaroo-muted')==='true';}catch{}
  function label(){button.textContent=muted?'Sound off':'Sound on';button.setAttribute('aria-pressed',String(muted));button.setAttribute('aria-label',muted?'Unmute music and sound effects':'Mute music and sound effects');}
  label();
  function unlock(){
    try {
      if(!context){
        const Audio=window.AudioContext||window.webkitAudioContext;
        if(!Audio){button.textContent='Audio unavailable';button.disabled=true;return;}
        context=new Audio();master=context.createGain();master.gain.value=muted?0:.65;
        const compressor=context.createDynamicsCompressor();compressor.threshold.value=-16;compressor.ratio.value=5;
        master.connect(compressor);compressor.connect(context.destination);
        music=context.createGain();music.gain.value=.5;music.connect(master);
        effects=context.createGain();effects.gain.value=.65;effects.connect(master);
        noiseBuffer=context.createBuffer(1,context.sampleRate,context.sampleRate);
        const data=noiseBuffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
      }
      if(context.state==='suspended')context.resume().catch(()=>{});
    }catch{button.textContent='Audio unavailable';button.disabled=true;}
  }
  function track(node,gain,filter){voices.add(node);node.onended=()=>{voices.delete(node);node.disconnect();gain.disconnect();if(filter)filter.disconnect();};}
  function tone(frequency,time,duration,volume=.1,type='sine',bus=music,endFrequency=frequency){
    if(!context)return;
    const oscillator=context.createOscillator(),gain=context.createGain();oscillator.type=type;
    oscillator.frequency.setValueAtTime(frequency,time);oscillator.frequency.exponentialRampToValueAtTime(Math.max(20,endFrequency),time+duration);
    gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(volume,time+.012);gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
    oscillator.connect(gain);gain.connect(bus);track(oscillator,gain);oscillator.start(time);oscillator.stop(time+duration+.02);
  }
  function noise(time,duration,volume,frequency,type='lowpass',bus=effects){
    const source=context.createBufferSource(),gain=context.createGain(),filter=context.createBiquadFilter();source.buffer=noiseBuffer;
    filter.type=type;filter.frequency.value=frequency;source.connect(filter);filter.connect(gain);gain.connect(bus);
    gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(volume,time+.008);gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
    track(source,gain,filter);source.start(time);source.stop(time+duration+.02);
  }
  const frequency=n=>440*2**((n-69)/12);
  const chords=[[60,64,67,71],[57,60,64,67],[53,57,60,64],[55,59,62,69]];
  const melody=[[76,null,79,83,null,79,76,null],[76,null,72,79,null,76,72,null],[76,null,77,81,null,77,76,null],[74,null,71,76,null,74,71,null]];
  function tick(){
    if(!context||!active||context.state!=='running'||muted||document.hidden)return;
    if(next<context.currentTime-.15)next=context.currentTime+.04;
    while(next<context.currentTime+.12){
      const bar=Math.floor(step/8)%4,beat=step%8,chord=chords[bar];
      if(beat===0){chord.forEach((n,i)=>tone(frequency(n),next+i*.025,2.6,.047,'sine'));}
      if(beat===0||beat===4)tone(frequency(chord[0]-24),next,1,.12,'sine');
      const note=melody[bar][beat];if(note!==null){tone(frequency(note),next,.8,.057,'sine');tone(frequency(note)*2,next,.23,.009,'sine');}
      if(beat%2===0)tone(85,next,.13,.075,'sine',music,40);
      if(beat===2||beat===6)noise(next,.11,.035,1700,'bandpass',music);
      noise(next,.045,.012,6500,'highpass',music);
      next+=.375;step=(step+1)%32;
    }
  }
  function stop(){active=false;for(const node of voices){try{node.stop();}catch{}}voices.clear();}
  function start(){unlock();stop();active=true;step=0;next=context?context.currentTime+.04:0;}
  function sound(name){
    if(!context||context.state!=='running'||muted||document.hidden)return;
    const t=context.currentTime;
    if(name==='jump'){tone(230,t,.14,.16,'sine',effects,610);tone(115,t,.08,.06,'triangle',effects,210);}
    if(name==='land'){noise(t,.075,.07,500);tone(95,t,.09,.06,'sine',effects,55);}
    if(name==='wood'){tone(340,t,.1,.095,'triangle',effects,150);noise(t,.05,.045,1200);}
    if(name==='leaf'){tone(440,t,.1,.07,'sine',effects,230);noise(t,.065,.025,2100);}
    if(name==='car'){noise(t,.25,.35,1500);tone(130,t,.3,.28,'triangle',effects,35);tone(660,t+.06,.75,.11,'sine',effects,100);}
    if(name==='water'){noise(t,.65,.24,1700);for(let i=0;i<7;i++)tone(320+i*67,t+.07+i*.09,.14,.09,'sine',effects,100+i*25);}
    if(name==='fall')tone(430,t,.32,.11,'sine',effects,90);
    if(name==='over')[67,64,60].forEach((n,i)=>tone(frequency(n),t+i*.14,.45,.09,'sine',effects));
  }
  button.addEventListener('click',()=>{unlock();muted=!muted;if(master)master.gain.setTargetAtTime(muted?0:.65,context.currentTime,.025);try{localStorage.setItem('kangaroo-muted',String(muted));}catch{}label();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){stop();if(context)context.suspend().catch(()=>{});}});
  window.addEventListener('pagehide',()=>{stop();if(context)context.close().catch(()=>{});});
  return {start,stop,tick,sound};
}

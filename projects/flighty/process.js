const tabs=[...document.querySelectorAll('[role="tab"]')];
const panels=tabs.map(tab=>document.getElementById(tab.getAttribute('aria-controls')));
const previous=document.getElementById('previous-phase'),next=document.getElementById('next-phase');
let current=0;
function select(index,{focus=false,scroll=false,save=true}={}){
 current=Math.max(0,Math.min(tabs.length-1,index));
 tabs.forEach((tab,i)=>{tab.setAttribute('aria-selected',String(i===current));tab.tabIndex=i===current?0:-1;panels[i].hidden=i!==current;});
 previous.disabled=current===0;next.disabled=current===tabs.length-1;
 document.getElementById('phase-position').textContent=`${current+1} / ${tabs.length} · ${tabs[current].textContent.trim().replace(/^\d+\s*/, '')}`;
 if(save)history.replaceState(null,'',`#${panels[current].id}`);
 if(focus)tabs[current].focus();
 if(scroll)document.querySelector('.phase-selector').scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
}
tabs.forEach((tab,i)=>{tab.addEventListener('click',()=>select(i));tab.addEventListener('keydown',event=>{let target;if(event.key==='ArrowRight')target=(i+1)%tabs.length;if(event.key==='ArrowLeft')target=(i+tabs.length-1)%tabs.length;if(event.key==='Home')target=0;if(event.key==='End')target=tabs.length-1;if(target!==undefined){event.preventDefault();select(target,{focus:true});}});});
previous.addEventListener('click',()=>select(current-1,{focus:true,scroll:true}));next.addEventListener('click',()=>select(current+1,{focus:true,scroll:true}));
function fromHash(){const index=panels.findIndex(panel=>`#${panel.id}`===location.hash);select(index<0?0:index,{save:false});}
window.addEventListener('hashchange',fromHash);fromHash();

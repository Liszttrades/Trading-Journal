(() => {
  const button=document.querySelector('.notebook-trigger'), display=document.querySelector('.book-display');
  const status=document.querySelector('#book-status'), hero=document.querySelector('.hero');
  let bag=[],last=-1,opened=false;
  const svg=body=>`<svg viewBox="0 0 100 100" fill="none" aria-hidden="true">${body}</svg>`;
  const scenes=[
    ['Candlestick chart',svg('<path class="book-grid" d="M10 25H90M10 50H90M10 75H90"/>'+[0,1,2,3,4].map((n)=>`<g class="book-candle" style="--n:${n}"><path d="M${18+n*16} ${40-n*5}v35"/><rect x="${14+n*16}" y="${48-n*5}" width="8" height="18" rx="1"/></g>`).join(''))],
    ['Performance curve',svg('<path class="book-grid" d="M12 20V82H90"/><path class="book-draw" d="M15 73L29 60 41 65 55 42 68 48 85 24"/><circle class="book-pulse" cx="85" cy="24" r="5"/>')],
    ['Trading plan',svg('<rect x="18" y="13" width="64" height="76" rx="5" stroke="#d5ddcd"/>'+[0,1,2].map(n=>`<g style="--n:${n}" class="book-check"><path d="m28 ${32+n*21} 4 4 7-9"/><path class="book-grid" d="M48 ${32+n*21}H70"/></g>`).join(''))],
    ['Risk and reward',svg('<path class="book-grid" d="M14 80H90"/><rect class="book-bar risk" x="24" y="48" width="19" height="32" rx="3"/><rect class="book-bar reward" x="57" y="22" width="19" height="58" rx="3"/><path d="M23 14h14m-7-7v14" stroke="#9bb88f" stroke-width="2"/>')],
    ['A chart lesson',svg('<path class="book-grid" d="M12 74L31 61 45 66 64 38 87 24"/><circle class="book-target" cx="64" cy="38" r="14"/><path class="book-pencil" d="m32 81 6-15 27-27 8 8-27 27Z" fill="#e5b899" stroke="#8e715b"/><path d="m38 66 8 8" stroke="#8e715b"/>')],
    ['Trading calendar',svg('<rect x="15" y="18" width="70" height="68" rx="6" stroke="#c2cdb9"/><path d="M15 35H85M31 12V24M69 12V24" stroke="#9cac91" stroke-width="3"/>'+[0,1,2,3,4,5].map(n=>`<rect class="book-day" style="--n:${n}" x="${25+n%3*20}" y="${45+Math.floor(n/3)*21}" width="12" height="12" rx="2"/>`).join(''))]
  ];
  function choose(){
    if(!bag.length){bag=[0,1,2,3,4,5];for(let i=bag.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}if(bag[bag.length-1]===last)[bag[0],bag[bag.length-1]]=[bag[bag.length-1],bag[0]];}
    return last=bag.pop();
  }
  function open(){if(opened)return;opened=true;const index=choose();display.innerHTML=scenes[index][1];button.dataset.scene=String(index);button.classList.add('is-open');button.setAttribute('aria-expanded','true');status.textContent=scenes[index][0];}
  function close(){opened=false;button.classList.remove('is-open');button.setAttribute('aria-expanded','false');status.textContent='';}
  button.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')open();});
  button.addEventListener('pointerleave',e=>{if(e.pointerType!=='touch')close();});
  button.addEventListener('focus',()=>{if(button.matches(':focus-visible'))open();});
  button.addEventListener('blur',close);
  button.addEventListener('click',()=>opened?close():open());
  button.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close();}});
  document.addEventListener('pointerdown',e=>{if(!button.contains(e.target))close();});
  const target={x:0,y:0},current={x:0,y:0};let frame=0;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  function blocked(){return reduced.matches||document.documentElement.classList.contains('motion-paused');}
  function reset(){cancelAnimationFrame(frame);frame=0;target.x=target.y=current.x=current.y=0;hero.style.setProperty('--mouse-x','0px');hero.style.setProperty('--mouse-y','0px');}
  function move(){frame=0;if(blocked()||document.hidden){reset();return;}current.x+=(target.x-current.x)*.09;current.y+=(target.y-current.y)*.09;hero.style.setProperty('--mouse-x',current.x+'px');hero.style.setProperty('--mouse-y',current.y+'px');if(Math.abs(target.x-current.x)+Math.abs(target.y-current.y)>.04)frame=requestAnimationFrame(move);}
  hero.addEventListener('pointermove',e=>{if(e.pointerType==='touch'||blocked())return;const r=hero.getBoundingClientRect();target.x=((e.clientX-r.left)/r.width-.5)*14;target.y=((e.clientY-r.top)/r.height-.5)*14;if(!frame)frame=requestAnimationFrame(move);});
  hero.addEventListener('pointerleave',()=>{target.x=target.y=0;if(!frame)frame=requestAnimationFrame(move);});
  new MutationObserver(()=>{if(blocked())reset();}).observe(document.documentElement,{attributes:true,attributeFilter:['class']});
  reduced.addEventListener('change',reset);document.addEventListener('visibilitychange',()=>{if(document.hidden){reset();close();}});
})();

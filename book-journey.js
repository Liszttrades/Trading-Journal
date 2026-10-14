(() => {
 const root=document.documentElement,section=document.querySelector('#gallery'),pin=section.querySelector('.gallery-pin');
 const intro=section.querySelector('.journey-intro'),book=section.querySelector('.journey-book'),cover=section.querySelector('.journey-cover');
 const heading=section.querySelector('.journey-heading'),features=section.querySelector('.journey-features'),ring=section.querySelector('.ring'),copy=section.querySelector('.gallery-copy'),cards=[...section.querySelectorAll('.ring-card')];
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),clamp=n=>Math.max(0,Math.min(1,n)),ease=n=>n*n*(3-2*n);
 const words=['every trade','your risk','each setup','your rules','your backtests','your progress'];
 let frame=0;
 const tips=[...section.querySelectorAll('[data-journey-tip]')];
 tips.forEach(b=>{const show=()=>{document.querySelector('#journey-tip').textContent=b.dataset.journeyTip;};b.addEventListener('pointerenter',show);b.addEventListener('focus',show);b.addEventListener('click',show);b.addEventListener('pointerleave',()=>{if(document.activeElement!==b)document.querySelector('#journey-tip').textContent='Hover a feature. Scroll to step inside.';});});
 function render(){
  frame=0;
  const calm=reduced.matches||root.classList.contains('motion-paused');
  const rect=section.getBoundingClientRect(),h=pin.clientHeight||innerHeight,w=pin.clientWidth||innerWidth;
  const offset=innerWidth<=700?60:70;
  const p=clamp((offset-rect.top)/Math.max(1,section.offsetHeight-h));
  const opening=ease(clamp(p/.16)),zoom=ease(clamp((p-.13)/.3));
  const textReveal=ease(clamp((p-.43)/.07)),arrival=ease(clamp((p-.56)/.17)),departure=ease(clamp((p-.84)/.16));
  const bookWidth=book.offsetWidth||(innerWidth<=700?205:310),bookHeight=book.offsetHeight||(innerWidth<=700?270:405);
  const maxScale=Math.max(w/bookWidth,h/bookHeight)*1.32;
  section.classList.add('journey-ready');
  section.classList.toggle('journey-calm',calm);
  intro.style.opacity=calm?'0':String(1-ease(clamp((p-.4)/.06)));
  intro.style.visibility=calm||p>=.47?'hidden':'visible';
  const introInteractive=!calm&&p<.15;
  features.inert=!introInteractive;features.style.pointerEvents=introInteractive?'auto':'none';
  heading.style.opacity=features.style.opacity=String(1-ease(clamp((p-.07)/.12)));
  cover.style.transform=`rotateY(${-opening*164}deg)`;
  book.style.transform=`translate(-50%,-50%) scale(${1+zoom*(maxScale-1)}) rotate(${(1-opening)*-5}deg)`;
  book.style.setProperty('--page-ink',String(1-ease(clamp((p-.31)/.12))));
  book.style.setProperty('--page-progress',String(ease(clamp((p-.1)/.24))));
  ring.style.opacity=calm?'1':String(arrival*(1-departure));
  copy.style.opacity=calm?'1':String(textReveal*(1-departure));
  copy.style.transform=`scale(${calm?1:1+departure*.12}) translateY(${calm?0:departure*-20}px)`;
  const travel=calm?.5:clamp((p-.56)/.44);
  ring.style.transform=`scale(${calm?1:2.15-1.15*arrival+departure*1.5})`;
  section.dataset.phase=calm?'still':p<.43?'book':p<.56?'text':p<.73?'arrive':p<.84?'hold':'depart';
  const rx=Math.min(w*.36,570),ry=Math.min(h*.36,330);
  cards.forEach((card,i)=>{const a=i/cards.length*Math.PI*2+travel*1.4;card.style.transform=`translate(${Math.cos(a)*rx}px,${Math.sin(a)*ry}px) rotate(${Math.sin(a)*7}deg)`;});
  const word=document.querySelector('#changing-word');word.textContent=words[Math.min(5,Math.floor(travel*6))];
  word.style.background=['#526c4c','#7962b4','#b66d43','#4d7d8d','#a3598b','#5a6ac0'][Math.min(5,Math.floor(travel*6))];
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(render);}
 addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule,{passive:true});
 reduced.addEventListener('change',schedule);new MutationObserver(schedule).observe(root,{attributes:true,attributeFilter:['class']});
 render();
})();

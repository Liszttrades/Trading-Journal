(() => {
  'use strict';
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const root=document.documentElement, reduced=matchMedia('(prefers-reduced-motion: reduce)'), mobile=matchMedia('(max-width: 700px)');
  const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
  let paused=reduced.matches, raf=0, active=0, counterStart=null, counterDone=false, lastWord=-1;
  const motion=$('.motion-toggle'), hero=$('.hero'), floats=$$('.float-card'), workflow=$('.workflow'), chapters=$$('.chapter'), scenes=$$('.scene'), gallery=$('.gallery'), ringCards=$$('.ring-card');
  const categoryData={
    journal:[['lime','Performance journal','P&L, win rate and average R. A clearer view of your trading history.','Your trading,<br>in perspective.','↗'],['orange','Batch entry','Record several scalps in a single session, with notes for each trade.','One session.<br>Every scalp.','+'],['purple','Trading calendar','Revisit individual trading days and their recorded results.','See your<br>trading days.','▦']],
    review:[['purple','Chart library','Filter your screenshots by pair and live or backtesting entries.','Keep the<br>full picture.','▧'],['pink','Chart annotation','Zoom in, draw lines and shapes, and add text to your charts.','Mark what<br>mattered.','✎'],['paper','Mistake roadmap','Connect the mistake with a correction you can revisit.','Turn a mistake<br>into a lesson.','→']],
    plan:[['blue','Account & risk','Estimate potential loss and reward with your prices and lot size.','Know the<br>downside.','⌖'],['orange','Rules & targets','Set your own daily plan, targets and maximum entries.','Plan before<br>you enter.','✓'],['cream','Backtesting lab','Keep practice trades separate from your live trading record.','Practice.<br>Then review.','◷']]
  };
  function category(name){
    $('#category-panel').innerHTML=categoryData[name].map(([color,title,copy,heading,icon])=>`<article><div class="category-art ${color}" aria-hidden="true"><b>${heading}</b><span>${icon}</span></div><h3>${title}</h3><p>${copy}</p></article>`).join('');
    $('#category-panel').setAttribute('aria-labelledby',`tab-${name}`);
    $$('[data-category]').forEach(b=>{const selected=b.dataset.category===name;b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1;});
  }
  $$('[data-category]').forEach((b,i,all)=>{
    b.addEventListener('click',()=>category(b.dataset.category));
    b.addEventListener('keydown',e=>{let target;if(e.key==='ArrowRight')target=(i+1)%all.length;else if(e.key==='ArrowLeft')target=(i+all.length-1)%all.length;else if(e.key==='Home')target=0;else if(e.key==='End')target=all.length-1;else return;e.preventDefault();all[target].focus();category(all[target].dataset.category);});
  });category('journal');
  function setChapter(index){
    active=clamp(index,0,3);
    chapters.forEach((b,i)=>{b.classList.toggle('active',i===active);b.setAttribute('aria-pressed',String(i===active));});
    scenes.forEach((s,i)=>{s.hidden=i!==active;s.classList.toggle('active',i===active);});
    $('.chapter-progress i').style.width=`${(active+1)*25}%`;
  }
  chapters.forEach(b=>b.addEventListener('click',()=>{
    const index=Number(b.dataset.step);
    setChapter(index);
    if(!mobile.matches&&!paused){
      const top=workflow.getBoundingClientRect().top+scrollY;
      const distance=Math.max(1,workflow.offsetHeight-(innerHeight-70));
      window.scrollTo({top:top-70+distance*((index+.35)/4),behavior:'instant'});
    }
  }));
  const words=$('.word-reveal');
  const original=words.textContent;words.setAttribute('aria-label',original);
  words.replaceChildren(...original.split(' ').map((word,i)=>{const span=document.createElement('span');span.textContent=(i?' ':'')+word;span.setAttribute('aria-hidden','true');return span;}));
  const spans=[...words.children], portal=$('.portal'), canvas=$('#portal-canvas');
  let ctx=null;try{ctx=canvas.getContext('2d');}catch{}
  let width=1,height=1,pointer={x:0,y:0,inside:false},smooth={x:0,y:0};
  const particles=Array.from({length:180},(_,i)=>({x:((i*137)%997)/997,y:((i*271)%991)/991,s:.35+(i%4)*.25,phase:i*.73}));
  function resize(){
    width=portal.clientWidth||1;height=portal.clientHeight||1;
    const dpr=Math.min(devicePixelRatio||1,2);canvas.width=width*dpr;canvas.height=height*dpr;
    ctx?.setTransform(dpr,0,0,dpr,0,0);
    positionRing(.15,0);if(paused)drawField(0);
  }
  function drawField(t){
    if(!ctx)return;
    smooth.x+=(pointer.x-smooth.x)*.07;smooth.y+=(pointer.y-smooth.y)*.07;
    ctx.clearRect(0,0,width,height);
    const cx=width/2+smooth.x*width*.3,cy=height*.43+smooth.y*height*.3;
    for(const p of particles){
      let x=p.x*width,y=p.y*height;
      const dx=cx-x,dy=cy-y,d=Math.hypot(dx,dy),pull=pointer.inside&&!paused?clamp(1-d/230):0;
      x+=dx*pull*.25+Math.sin(t*.2+p.phase)*3;y+=dy*pull*.25+Math.cos(t*.15+p.phase)*3;
      ctx.fillStyle=`rgba(222,222,225,${.09+pull*.36})`;ctx.beginPath();ctx.arc(x,y,p.s,0,Math.PI*2);ctx.fill();
      if(pull>.25){ctx.strokeStyle=`rgba(222,222,225,${pull*.1})`;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+dx*.04,y+dy*.04);ctx.stroke();}
    }
    if(pointer.inside&&!paused){const g=ctx.createRadialGradient(cx,cy,6,cx,cy,130);g.addColorStop(0,'#00000065');g.addColorStop(.4,'#00000025');g.addColorStop(.65,'#ffffff04');g.addColorStop(1,'#ffffff00');ctx.fillStyle=g;ctx.fillRect(cx-130,cy-130,260,260);}
  }
  portal.addEventListener('pointermove',e=>{if(paused)return;const r=portal.getBoundingClientRect();pointer={x:(e.clientX-r.left)/width*2-1,y:(e.clientY-r.top)/height*2-1,inside:true};$('.petal-ring').style.translate=`${pointer.x*7}px ${pointer.y*7}px`;});
  portal.addEventListener('pointerleave',()=>{pointer={x:0,y:0,inside:false};$('.petal-ring').style.translate='0 0';});
  function positionRing(progress,time){
    const w=gallery.clientWidth||innerWidth,h=$('.gallery-pin').clientHeight||innerHeight;
    const rx=Math.min(w*.36,570),ry=Math.min(h*.36,330);
    ringCards.forEach((card,i)=>{const a=(i/ringCards.length)*Math.PI*2+progress*1.05+time*.015;const x=Math.cos(a)*rx,y=Math.sin(a)*ry;card.style.transform=`translate(${x}px,${y}px) rotate(${Math.sin(a)*7}deg)`;});
  }
  const curve=$('.curve'), counter=$('[data-count]');let curveLength=900;
  try{curveLength=curve.getTotalLength();}catch{}
  function finalizeCounter(){counter.textContent='+$248.00';curve.style.strokeDashoffset='0';counterDone=true;}
  const born=performance.now();
  function frame(now){
    raf=0;if(paused||document.hidden)return;
    const t=now*.001,hr=hero.getBoundingClientRect();
    if(hr.bottom>0){const progress=clamp(-hr.top/Math.max(hr.height,1));floats.forEach((card,i)=>{const dir=i%2?1:-1;const intro=1-Math.pow(1-clamp((now-born)/1600),3);const fromX=(hero.clientWidth*.5-card.offsetLeft-card.offsetWidth*.5)*(1-intro),fromY=(hero.clientHeight*.5-card.offsetTop-card.offsetHeight*.5)*(1-intro);card.style.translate=`${fromX+Math.sin(t*.35+i)*5+dir*progress*90}px ${fromY+Math.cos(t*.27+i)*6-progress*(i%3+1)*45}px`;card.style.opacity=String((.15+intro*.85)*(1-progress*.55));});}
    if(!mobile.matches){const wr=workflow.getBoundingClientRect(),distance=workflow.offsetHeight-(innerHeight-70);if(wr.top<innerHeight&&wr.bottom>0){const p=clamp((70-wr.top)/Math.max(1,distance));const next=Math.min(3,Math.floor(p*4));if(next!==active)setChapter(next);}}
    const gr=gallery.getBoundingClientRect();if(gr.top<innerHeight&&gr.bottom>0){const p=clamp((innerHeight*.5-gr.top)/Math.max(1,gr.height));positionRing(p,(now-born)*.001);const index=Math.min(3,Math.floor(p*4));if(index!==lastWord){$('#changing-word').textContent=['every trade','your risk','each setup','your progress'][index];lastWord=index;}}
    const mr=words.getBoundingClientRect();if(mr.top<innerHeight&&mr.bottom>0){const p=clamp((innerHeight*.85-mr.top)/(innerHeight*.6+mr.height));spans.forEach((span,i)=>span.classList.toggle('read',i<Math.ceil(p*spans.length)));}
    if(!counterDone){const pr=$('.dashboard').getBoundingClientRect();if(counterStart===null&&pr.top<innerHeight*.85&&pr.bottom>0)counterStart=now;if(counterStart!==null){const p=clamp((now-counterStart)/1400),e=1-Math.pow(1-p,3);counter.textContent=`+$${(248*e).toFixed(2)}`;curve.style.strokeDasharray=String(curveLength);curve.style.strokeDashoffset=String(curveLength*(1-e));if(p===1)counterDone=true;}}
    const fr=portal.getBoundingClientRect();if(fr.top<innerHeight&&fr.bottom>0)drawField(t);
    raf=requestAnimationFrame(frame);
  }
  function sync(){
    root.classList.toggle('motion-paused',paused);motion.setAttribute('aria-pressed',String(paused));motion.textContent=paused?'Play motion':'Pause motion';
    if(paused){cancelAnimationFrame(raf);raf=0;floats.forEach(c=>{c.style.translate='none';c.style.opacity='1';});finalizeCounter();positionRing(.15,0);drawField(0);}
    else if(!raf&&!document.hidden)raf=requestAnimationFrame(frame);
  }
  motion.addEventListener('click',()=>{paused=!paused;sync();});
  reduced.addEventListener('change',()=>{paused=reduced.matches;sync();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;}else sync();});
  addEventListener('resize',resize,{passive:true});
  // Keep static content readable before motion initializes; no page-blocking loader.
  resize();setChapter(0);sync();
})();

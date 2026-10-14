(() => {
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const toggle = document.querySelector('.motion-toggle');
  let paused = reduced.matches;
  let frame = 0;
  const preview = document.querySelector('.dashboard');
  const previewSection = document.querySelector('.preview-section');
  const workflow = document.querySelector('.workflow');
  const track = document.querySelector('.step-track i');
  const portal = document.querySelector('.portal');
  const canvas = document.querySelector('#portal-canvas');
  const ctx = canvas.getContext('2d');
  const curve = document.querySelector('.curve');
  const counter = document.querySelector('[data-count]');
  const length = curve.getTotalLength();
  let started = 0, chartSeen = false, chartDone = false;
  let w = 1, h = 1, pointer = {x:0,y:0}, current = {x:0,y:0};
  const clamp = (n,a=0,b=1) => Math.max(a,Math.min(b,n));
  const particles = Array.from({length:420},(_,i)=>({angle:i*2.399963, radius: .45+((i*73)%419)/419*.75, speed:.1+((i*37)%43)/43*.12, size:.5+(i%4)*.3}));
  if (!paused) root.classList.add('js-motion');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) {entry.target.classList.add('visible');observer.unobserve(entry.target);}
    }),{threshold:.12});
    document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));
  } else document.querySelectorAll('.reveal').forEach(el=>el.classList.add('visible'));
  function size(){
    w = portal.clientWidth; h = portal.clientHeight;
    const dpr=Math.min(devicePixelRatio||1,2);
    canvas.width=w*dpr;canvas.height=h*dpr;
    if(ctx)ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  function draw(time){
    if(!ctx)return;
    ctx.clearRect(0,0,w,h);
    current.x+=(pointer.x-current.x)*.045;current.y+=(pointer.y-current.y)*.045;
    const cx=w*.5+current.x*35, cy=h*.48+current.y*25;
    const radius=Math.min(w*.29,280);
    ctx.save();ctx.translate(cx,cy);ctx.rotate(-.19+current.x*.06);
    const glow=ctx.createRadialGradient(0,0,radius*.15,0,0,radius*1.35);
    glow.addColorStop(0,'#050606');glow.addColorStop(.3,'#050606');glow.addColorStop(.48,'#d4b98b28');glow.addColorStop(.63,'#d4b98b08');glow.addColorStop(1,'#d4b98b00');
    ctx.fillStyle=glow;ctx.fillRect(-radius*1.5,-radius*1.5,radius*3,radius*3);
    for(const p of particles){
      const angle=p.angle+time*p.speed;
      const r=radius*p.radius;
      const x=Math.cos(angle)*r, y=Math.sin(angle)*r*(.31+current.y*.025);
      ctx.fillStyle=`rgba(221,203,169,${.2+(Math.sin(angle)+1)*.25})`;
      ctx.beginPath();ctx.ellipse(x,y,p.size*1.6,p.size,.2,0,Math.PI*2);ctx.fill();
    }
    ctx.fillStyle='#060707';ctx.beginPath();ctx.ellipse(0,0,radius*.32,radius*.29,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#d4c2a259';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(0,0,radius*.35,radius*.29,0,0,Math.PI*2);ctx.stroke();ctx.restore();
  }
  function tick(now){
    if(paused||document.hidden){frame=0;return;}
    const r=previewSection.getBoundingClientRect();
    if(r.top<innerHeight && r.bottom>0){
      const progress=clamp((innerHeight-r.top)/(innerHeight+r.height));
      preview.style.transform=`perspective(1400px) rotateX(${(1-progress)*5}deg)`;
      if(!chartSeen&&r.top<innerHeight*.65){chartSeen=true;started=now;}
    }
    if(chartSeen&&!chartDone){
      const t=clamp((now-started)/1500);const eased=1-Math.pow(1-t,3);
      curve.style.strokeDasharray=length;curve.style.strokeDashoffset=length*(1-eased);
      counter.textContent=`+$${(248*eased).toFixed(2)}`;
      chartDone=t===1;
    }
    const wr=workflow.getBoundingClientRect();track.style.width=`${clamp((innerHeight*.5-wr.top)/wr.height)*100}%`;
    const pr=portal.getBoundingClientRect();if(pr.top<innerHeight&&pr.bottom>0)draw(now*.001);
    frame=requestAnimationFrame(tick);
  }
  function sync(){
    root.classList.toggle('motion-paused',paused);
    toggle.textContent=paused?'Play motion':'Pause motion';toggle.setAttribute('aria-pressed',String(paused));
    if(paused){cancelAnimationFrame(frame);frame=0;preview.style.transform='none';curve.style.strokeDashoffset=0;counter.textContent='+$248.00';chartDone=true;pointer={x:0,y:0};draw(0);}
    else if(!frame&&!document.hidden)frame=requestAnimationFrame(tick);
  }
  toggle.addEventListener('click',()=>{paused=!paused;sync();});
  reduced.addEventListener('change',()=>{paused=reduced.matches;sync();});
  portal.addEventListener('pointermove',e=>{if(paused)return;const r=portal.getBoundingClientRect();pointer={x:(e.clientX-r.left)/w*2-1,y:(e.clientY-r.top)/h*2-1};});
  portal.addEventListener('pointerleave',()=>{pointer={x:0,y:0};});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else sync();});
  addEventListener('resize',()=>{size();if(paused)draw(0);},{passive:true});
  size();draw(0);sync();
})();

export function validateRoadmap(value) {
 if(!value || !Array.isArray(value.nodes) || value.nodes.length>150)throw Error('Use up to 150 roadmap cards.');
 const ids=new Set();
 const nodes=value.nodes.map(n=>{
  if(typeof n.id!=='string'||n.id.length>100||ids.has(n.id))throw Error('Invalid card ID.');ids.add(n.id);
  if(![n.x,n.y].every(v=>Number.isFinite(v)&&Math.abs(v)<=20000)||typeof n.title!=='string'||n.title.length>200||typeof n.text!=='string'||n.text.length>10000||!(n.parent===null||typeof n.parent==='string'))throw Error('Invalid roadmap card.');
  return {id:n.id,x:n.x,y:n.y,title:n.title,text:n.text,parent:n.parent,expanded:n.expanded!==false};
 });
 if(nodes.some(n=>n.parent!==null && n.parent!=='chart' && (!ids.has(n.parent)||n.parent===n.id)))throw Error('Invalid roadmap connection.');
 return {nodes};
}
export function createRoadmap(save) {
 const dialog=document.querySelector('#image-dialog'),board=document.querySelector('#flow-board'),stage=document.querySelector('#flow-stage');
 let image=null,nodes=[],scale=1,x=30,y=30,drag=null,dirty=false,saving=false;
 const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const status=t=>document.querySelector('#flow-status').textContent=t;
 function transform(){stage.style.transform=`translate(${x}px,${y}px) scale(${scale})`;document.querySelector('#flow-zoom').textContent=Math.round(scale*100)+'%';}
 function render(){
  const chart=`<article class="flow-node flow-chart" style="left:60px;top:180px"><header>${esc(image.reviewName || image.name)}</header><img src="${image.data}" alt="Trade chart"><footer>Chart → mistake → correction → next trade</footer></article>`;
  const paths=nodes.map(n=>{const p=n.parent==='chart'?{x:60,y:180,w:620}:nodes.find(p=>p.id===n.parent);if(!p)return '';const ax=p.x+(p.w||320),ay=p.y+45,bx=n.x,by=n.y+45;return `<path d="M${ax} ${ay} C${ax+100} ${ay},${bx-100} ${by},${bx} ${by}"/>`;}).join('');
  stage.innerHTML=`<svg class="flow-edges" width="40000" height="40000" viewBox="-20000 -20000 40000 40000">${paths}</svg>${chart}`+nodes.map(n=>`<article class="flow-node" data-node="${esc(n.id)}" style="left:${n.x}px;top:${n.y}px"><header data-drag="${esc(n.id)}"><span>${esc(n.title || 'Untitled note')}</span><button type="button" data-expand="${esc(n.id)}" aria-label="Expand or collapse">${n.expanded?'−':'+'}</button></header>${n.expanded?`<div class="flow-node-body"><input data-title="${esc(n.id)}" value="${esc(n.title)}" maxlength="200" aria-label="Card title"><textarea data-note="${esc(n.id)}" maxlength="10000" rows="4" placeholder="What happened? What will I change?">${esc(n.text)}</textarea><div><button type="button" data-child="${esc(n.id)}">+ Next step</button><button type="button" data-delete="${esc(n.id)}">Delete</button></div></div>`:''}</article>`).join('');transform();
 }
 function add(parent='chart'){if(nodes.length>=150){status('Maximum 150 cards.');return;}const p=nodes.find(n=>n.id===parent);nodes.push({id:crypto.randomUUID(),x:p?p.x+380:760,y:p?p.y:nodes.length*230+80,title:parent==='chart'?'Mistake':'Correction / next step',text:'',parent,expanded:true});dirty=true;render();}
 board.addEventListener('wheel',e=>{e.preventDefault();const r=board.getBoundingClientRect(),px=e.clientX-r.left,py=e.clientY-r.top;const next=Math.max(.15,Math.min(3,scale*(e.deltaY<0?1.1:1/1.1)));x=px-(px-x)*next/scale;y=py-(py-y)*next/scale;scale=next;transform();},{passive:false});
 board.addEventListener('pointerdown',e=>{if(saving||e.target.closest('input,textarea,button'))return;const header=e.target.closest('[data-drag]');const n=nodes.find(n=>n.id===header?.dataset.drag);if(!n&&e.target.closest('.flow-node'))return;drag={n,sx:e.clientX,sy:e.clientY,ox:n?n.x:x,oy:n?n.y:y};board.setPointerCapture(e.pointerId);});
 board.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.sx,dy=e.clientY-drag.sy;if(drag.n){drag.n.x=Math.max(-20000,Math.min(20000,drag.ox+dx/scale));drag.n.y=Math.max(-20000,Math.min(20000,drag.oy+dy/scale));dirty=true;render();}else{x=drag.ox+dx;y=drag.oy+dy;transform();}});
 board.addEventListener('pointerup',()=>drag=null);board.addEventListener('pointercancel',()=>drag=null);
 board.addEventListener('input',e=>{const id=e.target.dataset.title||e.target.dataset.note,n=nodes.find(n=>n.id===id);if(!n)return;n[e.target.dataset.title?'title':'text']=e.target.value;dirty=true;if(e.target.dataset.title)e.target.closest('.flow-node').querySelector('header span').textContent=n.title;});
 board.addEventListener('click',e=>{if(saving)return;const b=e.target.closest('button');if(!b)return;if(b.dataset.child)add(b.dataset.child);if(b.dataset.expand){const n=nodes.find(n=>n.id===b.dataset.expand);n.expanded=!n.expanded;dirty=true;render();}if(b.dataset.delete){const id=b.dataset.delete,parent=nodes.find(n=>n.id===id).parent;nodes=nodes.filter(n=>n.id!==id);nodes.forEach(n=>{if(n.parent===id)n.parent=parent;});dirty=true;render();}});
 document.querySelector('#flow-add').onclick=()=>{if(!saving)add();};
 document.querySelector('#flow-fit').onclick=()=>{const minX=Math.min(60,...nodes.map(n=>n.x)),minY=Math.min(80,...nodes.map(n=>n.y)),maxX=Math.max(680,...nodes.map(n=>n.x+320)),maxY=Math.max(560,...nodes.map(n=>n.y+320));scale=Math.min(1,(board.clientWidth-60)/(maxX-minX),(board.clientHeight-60)/(maxY-minY));x=30-minX*scale;y=30-minY*scale;transform();};
 document.querySelector('#flow-save').onclick=async e=>{saving=true;e.target.disabled=true;try{await save(image.id,validateRoadmap({nodes}));dirty=false;status('Roadmap saved to your cloud account.');}catch(err){status(err.message);}finally{saving=false;e.target.disabled=false;}};
 const mayClose=e=>{if(saving||(dirty&&!confirm('Close without saving roadmap changes?'))){e.preventDefault();e.stopImmediatePropagation();}};
 dialog.addEventListener('cancel',mayClose);dialog.querySelector('[data-close="image-dialog"]').addEventListener('click',mayClose);
 return {open(next){image=next;nodes=validateRoadmap(next.roadmap||{nodes:[]}).nodes;dirty=false;scale=.9;x=30;y=30;render();status('Drag the background to pan · Scroll to zoom · Drag a card header to move it.');},canSwitch(){return !dirty||confirm('Switch views without saving roadmap changes?');}};
}

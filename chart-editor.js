import {validateAnnotations} from './annotations.js?v=professional-themes-20261013';
export function createChartEditor(save) {
 const dialog=document.querySelector('#image-dialog'), canvas=document.querySelector('#chart-canvas'), ctx=canvas.getContext('2d'), viewport=document.querySelector('#chart-viewport');
 const $=s=>dialog.querySelector(s);
 let img=new Image(), items=[], history=[], redo=[], draft=null, active=null, scale=1, fitScale=1, x=0,y=0,drag=null, dirty=false, saving=false;
 const status=t=>$('#chart-status').textContent=t;
 const snapshot=()=>{history.push(structuredClone(items));redo=[];dirty=true;};
 function drawShape(a) {
  const w=canvas.width,h=canvas.height,p=a.points.map(([x,y])=>[x*w,y*h]);
  ctx.strokeStyle=a.color;ctx.fillStyle=a.color;ctx.lineWidth=a.width*Math.max(w/1400,1);ctx.lineCap='round';ctx.beginPath();
  if(a.type==='text'){ctx.font=`${Math.max(18,w/55)}px Arial`;ctx.fillText(a.text,p[0][0],p[0][1]);return;}
  if(a.type==='rect'){ctx.strokeRect(p[0][0],p[0][1],p.at(-1)[0]-p[0][0],p.at(-1)[1]-p[0][1]);return;}
  if(a.type==='ellipse'){const q=p.at(-1);ctx.ellipse((q[0]+p[0][0])/2,(q[1]+p[0][1])/2,Math.abs(q[0]-p[0][0])/2,Math.abs(q[1]-p[0][1])/2,0,0,Math.PI*2);ctx.stroke();return;}
  ctx.moveTo(...p[0]);for(const q of p.slice(1))ctx.lineTo(...q);ctx.stroke();
 }
 function render(){ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0);for(const a of items)drawShape(a);if(draft)drawShape(draft);canvas.style.transform=`translate(${x}px,${y}px) scale(${scale})`;$('#chart-zoom').textContent=`${Math.round(scale*100)}%`;}
 function fit(){scale=fitScale=Math.min((viewport.clientWidth-24)/canvas.width,(viewport.clientHeight-24)/canvas.height);x=(viewport.clientWidth-canvas.width*scale)/2;y=(viewport.clientHeight-canvas.height*scale)/2;render();}
 function zoom(f,px=viewport.clientWidth/2,py=viewport.clientHeight/2){const next=Math.min(fitScale*8,Math.max(fitScale,scale*f));x=px-(px-x)*next/scale;y=py-(py-y)*next/scale;scale=next;render();}
 function point(e){const r=canvas.getBoundingClientRect();return [Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))];}
 viewport.addEventListener('wheel',e=>{e.preventDefault();const r=viewport.getBoundingClientRect();zoom(e.deltaY<0?1.15:1/1.15,e.clientX-r.left,e.clientY-r.top);},{passive:false});
 viewport.addEventListener('pointerdown',e=>{
  if(saving || !active || !img.complete || !img.naturalWidth)return;
  const bounds=canvas.getBoundingClientRect();
  if(e.clientX<bounds.left||e.clientX>bounds.right||e.clientY<bounds.top||e.clientY>bounds.bottom)return;
  const tool=$('#chart-tool').value;viewport.setPointerCapture(e.pointerId);
  if(tool==='pan'){drag={x:e.clientX,y:e.clientY,ox:x,oy:y};return;}
  if(items.length>=500){status('Maximum 500 annotations.');return;}
  const p=point(e),color=$('#chart-color').value,width=Number($('#chart-width').value);
  if(tool==='text'){const text=$('#chart-text').value.trim();if(!text){status('Type your label in the text field, then click the chart.');return;}snapshot();items.push({type:tool,color,width,points:[p],text});render();return;}
  draft={type:tool,color,width,points:[p,p],text:''};
 });
 viewport.addEventListener('pointermove',e=>{
  if(drag){x=drag.ox+e.clientX-drag.x;y=drag.oy+e.clientY-drag.y;render();return;}
  if(draft){const p=point(e);if(draft.type==='pen'){if(draft.points.length<10000)draft.points.push(p);}else draft.points[1]=p;render();}
  else if(active){const [px,py]=point(e);$('#chart-position').textContent=`Chart position ${Math.round(px*100)}%, ${Math.round(py*100)}%`;}
 });
 function finish(){if(draft){snapshot();items.push(draft);draft=null;render();}drag=null;}
 viewport.addEventListener('pointerup',finish);viewport.addEventListener('pointercancel',()=>{draft=null;drag=null;render();});
 dialog.addEventListener('click',async e=>{
  const toolButton=e.target.closest('[data-chart-tool]');
  if(toolButton && !saving){$('#chart-tool').value=toolButton.dataset.chartTool;document.querySelectorAll('[data-chart-tool]').forEach(b=>b.setAttribute('aria-pressed',String(b===toolButton)));$('#chart-text').hidden=toolButton.dataset.chartTool!=='text';viewport.style.cursor=toolButton.dataset.chartTool==='pan'?'grab':'crosshair';}
  const action=e.target.closest('[data-chart-action]')?.dataset.chartAction;if(!action||saving)return;
  if(action==='in')zoom(1.25);if(action==='out')zoom(.8);if(action==='fit')fit();
  if(action==='undo'&&history.length){redo.push(structuredClone(items));items=history.pop();dirty=true;render();}
  if(action==='redo'&&redo.length){history.push(structuredClone(items));items=redo.pop();dirty=true;render();}
  if(action==='clear'&&items.length){snapshot();items=[];render();}
  if(action==='save'){saving=true;e.target.disabled=true;try{await save(active,validateAnnotations(items));dirty=false;status('Annotations saved to your cloud account.');}catch(err){status(err.message);}finally{saving=false;e.target.disabled=false;}}
  if(action==='download'){const link=document.createElement('a');link.download='chart-review.png';link.href=canvas.toDataURL('image/png');link.click();}
 });
 dialog.addEventListener('cancel',e=>{if(saving){e.preventDefault();return;}if(dirty&&!confirm('Close without saving these annotations?'))e.preventDefault();});
 dialog.querySelector('[data-close="image-dialog"]').addEventListener('click',e=>{if(saving||(dirty&&!confirm('Close without saving these annotations?'))){e.stopImmediatePropagation();e.preventDefault();}});
 window.addEventListener('resize',()=>{if(dialog.open&&active)fit();});
 return {canSwitch(){return !dirty || confirm('Switch views without saving chart annotations?');},open(image){active=image.id;items=validateAnnotations(image.annotations||[]);history=[];redo=[];draft=null;dirty=false;$('#chart-tool').value='pan';$('#chart-text').hidden=true;document.querySelectorAll('[data-chart-tool]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.chartTool==='pan')));$('#image-title').textContent=image.reviewName || image.name;status('Scroll to zoom · Drag to pan · Choose a tool to mark the chart.');img=new Image();img.onload=()=>{canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;fit();};img.src=image.data;if(!dialog.open)dialog.showModal();}};
}

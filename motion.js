export function startWorkspaceMotion(){
 const root=document.getElementById('journal-workspace');if(!root)return;
 const preference=matchMedia('(prefers-reduced-motion: reduce)'),seen=new WeakSet();
 const animate=(element,frames,options)=>{if(!preference.matches&&element?.animate)element.animate(frames,options);};
 const reveal=new IntersectionObserver(records=>{for(const record of records)if(record.isIntersecting){reveal.unobserve(record.target);animate(record.target,[{opacity:0,transform:'translateY(9px)'},{opacity:1,transform:'translateY(0)'}],{duration:380,easing:'cubic-bezier(.2,.7,.2,1)'});}},{threshold:.08});
 function scan(){for(const element of root.querySelectorAll('.metric,.chart-panel,.calendar-panel,.chart-card,.scalp-row')){if(seen.has(element))continue;seen.add(element);if(!preference.matches)reveal.observe(element);}for(const path of root.querySelectorAll('.chart-line')){if(seen.has(path))continue;seen.add(path);path.setAttribute('pathLength','1000');animate(path,[{strokeDasharray:'1000',strokeDashoffset:1000},{strokeDasharray:'1000',strokeDashoffset:0}],{duration:850,easing:'cubic-bezier(.2,.6,.2,1)'});}}
 let scheduled=false;new MutationObserver(()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;scan();});}).observe(root,{childList:true,subtree:true});scan();
 document.addEventListener('click',event=>{if(event.target.closest('[data-view]'))requestAnimationFrame(()=>animate(document.querySelector('.page'),[{opacity:.5,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{duration:260,easing:'ease-out'}));});
 const dialogObserver=new MutationObserver(records=>{for(const record of records)if(record.attributeName==='open'&&record.target.open)animate(record.target,[{opacity:0,transform:'translateY(12px) scale(.985)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:220,easing:'ease-out'});});for(const dialog of document.querySelectorAll('dialog'))dialogObserver.observe(dialog,{attributes:true,attributeFilter:['open']});
 preference.addEventListener('change',()=>{if(preference.matches){reveal.disconnect();for(const animation of document.getAnimations())animation.cancel();}});
}

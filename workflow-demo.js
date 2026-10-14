(() => {
 const workflow=document.querySelector('#workflow');
 const chapters=[...workflow.querySelectorAll('.chapter')];
 const names=['Rules & targets','Account & risk','Batch entry','Chart review'];
 function sync(){const index=Math.max(0,chapters.findIndex(b=>b.getAttribute('aria-pressed')==='true'));document.querySelector('#demo-count').textContent=`0${index+1} / 04`;document.querySelector('#demo-name').textContent=names[index];}
 new MutationObserver(sync).observe(workflow.querySelector('.chapter-list'),{attributes:true,subtree:true,attributeFilter:['aria-pressed']});
 workflow.querySelectorAll('[data-demo-direction]').forEach(b=>b.addEventListener('click',()=>{const index=chapters.findIndex(c=>c.getAttribute('aria-pressed')==='true');chapters[(index+Number(b.dataset.demoDirection)+chapters.length)%chapters.length].click();sync();}));
 if('IntersectionObserver' in window)new IntersectionObserver(entries=>{workflow.classList.toggle('demo-visible',entries[0].isIntersecting);},{threshold:.01}).observe(workflow.querySelector('.scene-stack'));
 else workflow.classList.add('demo-visible');
 document.addEventListener('visibilitychange',()=>workflow.classList.toggle('demo-tab-hidden',document.hidden));
 sync();
})();

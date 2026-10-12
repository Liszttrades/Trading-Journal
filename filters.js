const chevron='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg>';
const check='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4 10-10"/></svg>';
const controls=new Map();
export function syncFilterMenus(){
 for(const id of ['filter-setup','filter-session','filter-outcome']){
  const select=document.getElementById(id);if(!select)continue;
  let c=controls.get(id);
  if(!c){
   const field=select.parentElement,wrapper=document.createElement('div');wrapper.className='filter-select';
   const trigger=document.createElement('button');trigger.type='button';trigger.className='filter-select-trigger';trigger.setAttribute('aria-haspopup','listbox');trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-label',field.querySelector('span')?.textContent||id);
   const menu=document.createElement('div');menu.id=id+'-menu';menu.className='filter-menu';menu.setAttribute('role','listbox');menu.setAttribute('aria-label',trigger.getAttribute('aria-label'));menu.hidden=true;trigger.setAttribute('aria-controls',menu.id);
   select.hidden=true;wrapper.append(trigger,menu);field.append(wrapper);c={select,trigger,menu};controls.set(id,c);
   const close=()=>{menu.hidden=true;trigger.setAttribute('aria-expanded','false');};
   const open=()=>{for(const other of controls.values()){other.menu.hidden=true;other.trigger.setAttribute('aria-expanded','false');}menu.hidden=false;trigger.setAttribute('aria-expanded','true');(menu.querySelector('[aria-selected="true"]')||menu.firstElementChild)?.focus();};
   trigger.addEventListener('click',()=>menu.hidden?open():close());
   trigger.addEventListener('keydown',e=>{if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();open();}});
   menu.addEventListener('click',e=>{const option=e.target.closest('[role="option"]');if(!option)return;select.value=option.dataset.value;close();trigger.focus();select.dispatchEvent(new Event('change',{bubbles:true}));});
   wrapper.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close();trigger.focus();}if(e.target===trigger)return;const options=[...menu.children],i=options.indexOf(document.activeElement);let next=null;if(e.key==='ArrowDown')next=(i+1)%options.length;if(e.key==='ArrowUp')next=(i-1+options.length)%options.length;if(e.key==='Home')next=0;if(e.key==='End')next=options.length-1;if(next!==null){e.preventDefault();options[next]?.focus();}});
   document.addEventListener('pointerdown',e=>{if(!wrapper.contains(e.target))close();});wrapper.addEventListener('focusout',e=>{if(!wrapper.contains(e.relatedTarget))close();});
  }
  c.trigger.replaceChildren();const text=document.createElement('span');text.textContent=select.selectedOptions[0]?.textContent||'All';c.trigger.append(text);c.trigger.insertAdjacentHTML('beforeend',chevron);
  c.menu.replaceChildren();for(const option of select.options){const button=document.createElement('button');button.type='button';button.setAttribute('role','option');button.setAttribute('aria-selected',String(option.selected));button.tabIndex=-1;button.dataset.value=option.value;const text=document.createElement('span');text.textContent=option.textContent;button.append(text);if(option.selected)button.insertAdjacentHTML('beforeend',check);c.menu.append(button);}
 }
}

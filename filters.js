import {journalNow} from './model.js?v=account-guide-20261013';
const chevron='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg>';
const check='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4 10-10"/></svg>';
const controls=new Map();
export function syncFilterMenus(){
 for(const id of ['filter-range','filter-setup','filter-session','filter-outcome','pair-filter']){
  const select=document.getElementById(id);if(!select)continue;
  let c=controls.get(id);
  if(!c){
   const field=select.parentElement,wrapper=document.createElement('div');wrapper.className='filter-select'+(id==='pair-filter'?' pair-picker':'');
   const trigger=document.createElement('button');trigger.type='button';trigger.className='filter-select-trigger';trigger.setAttribute('aria-haspopup','listbox');trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-label',select.getAttribute('aria-label')||field.querySelector('span')?.textContent||id);
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
  select.hidden=true;
  c.trigger.replaceChildren();const text=document.createElement('span');text.textContent=select.selectedOptions[0]?.textContent||'All';c.trigger.insertAdjacentHTML('beforeend',menuIcon(id));c.trigger.append(text);c.trigger.insertAdjacentHTML('beforeend',chevron);
  c.menu.replaceChildren();for(const option of select.options){const button=document.createElement('button');button.type='button';button.setAttribute('role','option');button.setAttribute('aria-selected',String(option.selected));button.tabIndex=-1;button.dataset.value=option.value;const text=document.createElement('span');text.textContent=option.textContent;const copy=document.createElement('span');copy.className='menu-option-copy';copy.append(text);const hint=document.createElement('small');hint.textContent=menuHint(id,option.value);copy.append(hint);button.insertAdjacentHTML('beforeend',menuIcon(id,option.value));button.append(copy);if(option.selected)button.insertAdjacentHTML('beforeend',check);c.menu.append(button);}
 }
}

function menuIcon(id,value='') {
 const paths=id==='filter-range'?'<rect x="4" y="5" width="16" height="15" rx="3"/><path d="M8 3v4m8-4v4M4 10h16m-12 4h2m4 0h2"/>':id==='filter-session'?'<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>':id==='filter-setup'?'<path d="M4 17l5-5 4 3 7-10M15 5h5v5"/>':value==='win'?'<path d="m5 16 7-8 7 8M12 8v12"/>':value==='loss'?'<path d="m5 8 7 8 7-8M12 16V4"/>':'<path d="M4 7h16M4 12h12M4 17h8"/>';
 return '<svg class="menu-field-icon" viewBox="0 0 24 24" aria-hidden="true">'+paths+'</svg>';
}
function menuHint(id,value) {
 if(id==='pair-filter')return value==='All pairs'?'Every market in your journal':'View entries for this market';
 if(id==='filter-range')return value==='all'?'Your complete trade history':value==='today'?'Current journal day':'Including today';
 if(id==='filter-setup')return value?'Trades using this setup':'Every recorded strategy';
 if(id==='filter-session')return value?'Trades from this session':'Across all trading sessions';
 return {all:'Every recorded result',win:'Positive net P&L',loss:'Negative net P&L',flat:'Zero net P&L',open:'Positions still open'}[value]||'';
}
export function presetDateRange(value,today) {
 if(value==='all')return {from:'',to:''};
 const days=value==='today'?1:Number(value);if(![1,7,30,90].includes(days))throw Error('Choose a supported date range.');
 const date=new Date(today+'T12:00:00Z');date.setUTCDate(date.getUTCDate()-days+1);return {from:date.toISOString().slice(0,10),to:today};
}
export function applyDatePreset(timezone) {
 const range=presetDateRange(document.getElementById('filter-range').value,journalNow(timezone).slice(0,10));
 document.getElementById('filter-from').value=range.from;document.getElementById('filter-to').value=range.to;
}

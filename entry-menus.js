const svg=paths=>`<svg viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;
const chevron=svg('<path d="m7 10 5 5 5-5"/>'),check=svg('<path d="m5 12 4 4 10-10"/>');
const icons={pair:'<circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4c4 4 4 12 0 16-4-4-4-12 0-16"/>',direction:'<path d="M8 19V5m-4 4 4-4 4 4M16 5v14m-4-4 4 4 4-4"/>',status:'<circle cx="12" cy="12" r="8"/><path d="m8 12 3 3 5-6"/>',session:'<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>',setup:'<path d="M4 17l5-5 4 3 7-10M15 5h5v5"/>',mood:'<circle cx="12" cy="12" r="8"/><path d="M8 14h8M8 9h1m6 0h1"/>',rules:'<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 10h6m-6 5h6"/>',kind:'<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 9h8m-8 6h5"/>'};
// Local lettermark icons keep broker/platform choices distinct without remote images.
const brokerMarks={Vantage:['V','#ec724d'], 'IC Markets':['IC','#91cc67'],Pepperstone:['P','#67a1e8'],Exness:['E','#eac758'],XM:['XM','#df727a'],OANDA:['O','#7dc1b1'],'FP Markets':['FP','#9b9deb'],Eightcap:['8','#7cc6df']};
const platformMarks={MT5:['M5','#dda352'],MT4:['M4','#8fa9dd'],cTrader:['cT','#b9d282'],TradingView:['TV','#91b3ec']};
const currencyMarks={USD:['$','#87bda2'],PHP:['₱','#dfb765'],EUR:['€','#899fe0'],GBP:['£','#b49ad4'],JPY:['¥','#dc939c'],AUD:['A$','#aaca88'],CAD:['C$','#dd9a88']};
function assetIcon(name,value){
 let letters,color;
 if(name==='currency'&&currencyMarks[value])[letters,color]=currencyMarks[value];
 else if(name==='pair'&&value){const code=String(value).toUpperCase().replace(/[^A-Z0-9]/g,'');letters=code.startsWith('BTC')?'₿':code.startsWith('ETH')?'Ξ':code.startsWith('XAU')?'Au':code.startsWith('XAG')?'Ag':code.slice(0,3);const hash=[...code].reduce((h,c)=>(h*31+c.charCodeAt(0))>>>0,0);color=code.startsWith('XAU')?'#dfc273':code.startsWith('BTC')?'#dfa56b':`hsl(${hash%360} 38% 72%)`;}
 else return null;
 return `<svg class="provider-mark asset-mark" viewBox="0 0 32 32" aria-hidden="true"><rect x="1" y="1" width="30" height="30" rx="8" fill="${color}" fill-opacity=".13" stroke="${color}" stroke-opacity=".35"/><text x="16" y="17" text-anchor="middle" dominant-baseline="middle" fill="${color}" stroke="none" font-size="${letters.length>2?10:15}" font-weight="750" font-family="Arial, sans-serif">${letters}</text></svg>`;
}
function fieldIcon(name,value){
 const asset=assetIcon(name,value);if(asset)return asset;
 const map=name==='broker'?brokerMarks:name==='platform'?platformMarks:null;
 if(!map)return svg(icons[name]||icons.kind);
 const mark=map[value];
 if(!mark)return svg(name==='broker'?'<path d="M4 20h16M6 20V9h12v11M4 9l8-5 8 5M10 13v3m4-3v3"/>':'<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4"/>');
 const [letters,color]=mark;
 return `<svg class="provider-mark" viewBox="0 0 32 32" aria-hidden="true"><rect x="1" y="1" width="30" height="30" rx="8" fill="${color}" fill-opacity=".13" stroke="${color}" stroke-opacity=".35"/><text x="16" y="17" text-anchor="middle" dominant-baseline="middle" fill="${color}" stroke="none" font-size="${letters.length>1?11:16}" font-weight="750" font-family="Arial, sans-serif">${letters}</text></svg>`;
}
function hint(name,value){if(name==='currency')return {USD:'US dollar',PHP:'Philippine peso',EUR:'Euro',GBP:'British pound',JPY:'Japanese yen',AUD:'Australian dollar',CAD:'Canadian dollar'}[value]||'Result currency';if(name==='timezone')return { 'Asia/Manila':'Manila · Philippines',UTC:'Coordinated Universal Time','America/New_York':'New York · United States','Europe/London':'London · United Kingdom','Asia/Tokyo':'Tokyo · Japan'}[value]||'Journal time zone';if(!value)return 'Leave this field unspecified';if(name==='pair')return 'Trading instrument';if(name==='kind')return value==='live'?'Your real trading journal':'Practice and historical testing';if(name==='direction')return value==='Long'?'Buy / upward price move':'Sell / downward price move';if(name==='status')return value==='Open'?'Position still active':'Include in realized results';if(name==='rules')return value==='Yes'?'Followed your trading plan':'Record what you would change';return {setup:'Trading strategy',session:'Trading session',mood:'Mindset during this trade'}[name]||'';}
export function enhanceRiskMenus(){enhanceFormMenus('risk-calculator');enhanceFormMenus('account-form');}
export function enhanceEntryMenus(){enhanceFormMenus('entry-form','entry-dialog');}
export function enhanceSettingsMenus(){enhanceFormMenus('settings-form','settings-dialog');}
function enhanceFormMenus(formId,dialogId){
 const form=document.getElementById(formId);
 for(const select of form.querySelectorAll('select')){
  if(select.dataset.entryMenu)continue;select.dataset.entryMenu='true';
  const label=select.parentElement,title=label.firstChild.textContent.trim(),field=document.createElement('div');field.className='entry-menu-field';const caption=document.createElement('span');caption.textContent=title;label.replaceWith(field);select.hidden=true;field.append(caption,select);
  const wrapper=document.createElement('div');wrapper.className='entry-select';const trigger=document.createElement('button');trigger.type='button';trigger.className='entry-select-trigger';trigger.setAttribute('aria-label',title);trigger.setAttribute('aria-haspopup','listbox');trigger.setAttribute('aria-expanded','false');
  const menu=document.createElement('div');menu.className='entry-select-menu';menu.id=formId+'-menu-'+select.name;menu.setAttribute('role','listbox');menu.setAttribute('aria-label',title);menu.hidden=true;trigger.setAttribute('aria-controls',menu.id);wrapper.append(trigger,menu);field.append(wrapper);
  const close=()=>{menu.hidden=true;trigger.setAttribute('aria-expanded','false');};
  const render=()=>{trigger.replaceChildren();trigger.insertAdjacentHTML('beforeend',fieldIcon(select.name,select.value));const text=document.createElement('span');text.textContent=select.selectedOptions[0]?.textContent||'Select';trigger.append(text);trigger.insertAdjacentHTML('beforeend',chevron);menu.replaceChildren();for(const option of select.options){const b=document.createElement('button');b.type='button';b.tabIndex=-1;b.setAttribute('role','option');b.setAttribute('aria-selected',String(option.selected));b.dataset.value=option.value;b.insertAdjacentHTML('beforeend',fieldIcon(select.name,option.value));const copy=document.createElement('span'),name=document.createElement('strong'),detail=document.createElement('small');name.textContent=option.textContent;detail.textContent=hint(select.name,option.value);copy.append(name,detail);b.append(copy);if(option.selected)b.insertAdjacentHTML('beforeend',check);menu.append(b);}};
  const open=()=>{for(const other of form.querySelectorAll('.entry-select-menu'))other.hidden=true;for(const b of form.querySelectorAll('.entry-select-trigger'))b.setAttribute('aria-expanded','false');menu.hidden=false;trigger.setAttribute('aria-expanded','true');const box=trigger.getBoundingClientRect(),dialog=document.getElementById(dialogId)?.getBoundingClientRect()||{top:0,bottom:window.innerHeight};wrapper.classList.toggle('menu-up',dialog.bottom-box.bottom<260&&box.top-dialog.top>260);(menu.querySelector('[aria-selected="true"]')||menu.firstElementChild)?.focus();};
  trigger.addEventListener('click',()=>menu.hidden?open():close());trigger.addEventListener('keydown',e=>{if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();open();}});
  menu.addEventListener('click',e=>{const b=e.target.closest('[role="option"]');if(!b)return;select.value=b.dataset.value;close();render();trigger.focus();select.dispatchEvent(new Event('change',{bubbles:true}));});select.addEventListener('change',render);
  wrapper.addEventListener('keydown',e=>{if(e.key==='Escape'&&!menu.hidden){e.preventDefault();e.stopPropagation();close();trigger.focus();return;}if(e.target===trigger)return;const options=[...menu.children],i=options.indexOf(document.activeElement);let next=null;if(e.key==='ArrowDown')next=(i+1)%options.length;if(e.key==='ArrowUp')next=(i-1+options.length)%options.length;if(e.key==='Home')next=0;if(e.key==='End')next=options.length-1;if(next!==null){e.preventDefault();options[next]?.focus();}});
  wrapper.addEventListener('focusout',e=>{if(!wrapper.contains(e.relatedTarget))close();});render();
 }
}
document.addEventListener('pointerdown',e=>{for(const wrapper of document.querySelectorAll('.entry-select'))if(!wrapper.contains(e.target)){wrapper.querySelector('.entry-select-menu').hidden=true;wrapper.querySelector('.entry-select-trigger').setAttribute('aria-expanded','false');}});

// Daily fiat reference rates. Trade snapshots are never recalculated by this module.
const cache=new Map(),pending=new Map();
export function quoteCurrency(pair){const p=String(pair||'').toUpperCase().trim();const match=p.match(/(?:\/|_|-)([A-Z]{3})$/);if(match)return match[1];const fiat=['USD','PHP','EUR','GBP','JPY','AUD','CAD','CHF','NZD','SGD','HKD','CNY','INR','ZAR','TRY','MXN','SEK','NOK','DKK'];return fiat.find(c=>p.length>3&&p.endsWith(c))||null;}
export function validateRate(data,base,quote){if(data?.base!==base||data?.quote!==quote||!Number.isFinite(data.rate)||data.rate<=0||!/^\d{4}-\d{2}-\d{2}$/.test(data.date||''))throw Error('No valid conversion rate returned.');return {rate:data.rate,date:data.date,source:'Frankfurter',fetched:Date.now()};}
export async function dailyRate(base,quote){
 if(!/^[A-Z]{3}$/.test(base||'')||!/^[A-Z]{3}$/.test(quote||''))throw Error('Choose valid currency codes.');
 if(base===quote)return {rate:1,date:null,source:'Same currency',fetched:Date.now()};
 const key=base+'/'+quote,old=cache.get(key);if(old&&Date.now()-old.fetched<3600000)return old;if(pending.has(key))return pending.get(key);
 const request=(async()=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);try{const response=await fetch(`https://api.frankfurter.dev/v2/rate/${base}/${quote}`,{signal:controller.signal});if(!response.ok)throw Error('Rate service unavailable.');const result=validateRate(await response.json(),base,quote);cache.set(key,result);return result;}finally{clearTimeout(timer);}})();pending.set(key,request);try{return await request;}finally{pending.delete(key);}
}
let displayRate=null;
export function pesoRate(settings){return settings.autoFx!==false&&displayRate?.base===settings.currency?displayRate:null;}
export async function refreshPesoRate(settings){if(settings.autoFx===false||settings.currency==='PHP'){displayRate=null;return;}try{const rate=await dailyRate(settings.currency,'PHP');displayRate={...rate,base:settings.currency};}catch{displayRate=null;}}
export function attachAutoConversion(form,currency,enabled=true){
 const pair=form.elements.namedItem('pair'),input=form.elements.namedItem('fxRate');if(!pair||!input)return;
 input.insertAdjacentHTML('afterend','<small class="fx-status" role="status"></small>');const status=input.nextElementSibling;let request=0,manual=false;
 input.addEventListener('input',()=>{manual=true;request++;status.textContent='Manual conversion rate.';});
 async function update(){const id=++request;if(!enabled){status.textContent='Manual conversion mode.';return;}manual=false;const from=quoteCurrency(pair.value);if(!from){input.value='';status.textContent='Quote currency unknown. Enter a conversion rate manually.';return;}input.value='';status.textContent=`Loading ${from} → ${currency} daily rate…`;try{const r=await dailyRate(from,currency);if(id!==request||manual||!input.isConnected)return;input.value=r.rate;status.textContent=r.date?`1 ${from} = ${r.rate} ${currency} · ${r.date} · daily reference`:'Same currency · conversion = 1';input.dispatchEvent(new Event('change',{bubbles:true}));}catch{if(id!==request||!input.isConnected)return;status.textContent='Daily rate unavailable. Enter your broker’s conversion manually.';}}
 // Parent listeners can clear contract fields before this conversion runs.
 pair.addEventListener('change',()=>queueMicrotask(update));update();
}

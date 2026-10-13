const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function feedSymbol(pair){const p=pair.toUpperCase().trim();if(p.includes('/'))return p;return /^[A-Z]{6}$/.test(p)?p.slice(0,3)+'/'+p.slice(3):p;}
export function assessLot({lots,entry,stop,multiplier,fxRate,fees,equity,leverage}){
 for(const v of [lots,entry,stop,multiplier,fxRate,fees,equity])if(!Number.isFinite(v))throw Error('Enter your lot size, prices, equity and contract settings first.');
 if(lots<=0||entry<=0||stop<=0||entry===stop||multiplier<=0||fxRate<=0||fees<0||equity<=0)throw Error('Use positive values and different entry and stop prices.');
 const loss=Math.abs(entry-stop)*multiplier*lots*fxRate+fees;
 return {loss,percent:loss/equity*100,margin:leverage>0?entry*multiplier*lots*fxRate/leverage:null};
}
export function brokerFields(account={}){
 const brokers=['Vantage','IC Markets','Pepperstone','Exness','XM','OANDA','FP Markets','Eightcap','Other'];
 const select=(label,name,items,value)=>`<label>${label}<select name="${name}"><option value="">Choose ${label.toLowerCase()}</option>${items.map(v=>`<option ${v===value?'selected':''}>${esc(v)}</option>`).join('')}</select></label>`;
 return `<div class="broker-profile form-grid">${select('Broker','broker',brokers,account.broker)}${select('Platform','platform',['MT5','MT4','cTrader','TradingView','Other'],account.platform)}<label>Other broker name<input name="brokerCustom" maxlength="80" value="${esc(account.brokerCustom)}" placeholder="If yours is not listed"></label><label>Account leverage · 1:<input type="number" name="accountLeverage" min="1" step="any" value="${esc(account.accountLeverage??'')}" placeholder="e.g. 2000"></label></div><p class="helper">Broker = your account provider. MT5 = your trading platform. Leverage is separate from lot size.</p>`;
}
let dispose=()=>{};
export function mountBrokerTools({db,amount}){
 dispose();const form=document.getElementById('risk-calculator'),field=n=>form.elements.namedItem(n),pair=()=>field('pair').value;
 const broker=db.settings.account?.broker,leverage=db.settings.account?.accountLeverage;
 const brokerDetails=form.querySelector('.risk-broker');
 brokerDetails.insertAdjacentHTML('afterbegin',`<div class="contract-template"><button type="button" id="gold-template" hidden>Use Vantage gold template</button><p id="contract-note" class="helper">In MT5: right-click the pair → Specification. Contract size is not your trade’s lot size.</p></div>`);
 // Keep the native details summary as its first child.
 brokerDetails.prepend(brokerDetails.querySelector('summary'));
 const template=document.getElementById('gold-template');const refreshTemplate=()=>{template.hidden=!(broker==='Vantage'&&pair()==='XAUUSD');};refreshTemplate();
 template.onclick=()=>{field('multiplier').value=100;field('quantityStep').value=.01;document.getElementById('contract-note').textContent='Template: 100 oz per lot, 0.01 lot steps. Confirm these in your MT5 symbol Specification before calculating.';field('multiplier').dispatchEvent(new Event('input',{bubbles:true}));};
 const summary=form.querySelector('.risk-summary');
 summary.insertAdjacentHTML('beforeend',`<details class="risk-explainer" open><summary>Check my own lot size</summary><label>Lot size shown in MT5<input id="my-lots" type="number" min="0.00000001" step="any" placeholder="e.g. 0.04"></label><button type="button" id="check-my-lots">Check this lot size</button><div id="my-lot-result" role="status"></div><p class="helper">Leverage ${leverage?'1:'+esc(leverage):'not set'} · Lot size controls price-move exposure.</p></details>`);
 document.getElementById('check-my-lots').onclick=()=>{const result=document.getElementById('my-lot-result');try{const data=Object.fromEntries(['entry','stop','multiplier','fxRate','fees','equity','percent','quantityStep'].map(n=>[n,field(n).value===''?NaN:Number(field(n).value)]));const lots=Number(document.getElementById('my-lots').value),r=assessLot({...data,lots,leverage}),rules=db.settings.tradingRules||{},alerts=[];
 if(rules.maxLotSize>0&&lots>rules.maxLotSize)alerts.push('Above your saved lot-size limit.');
 if(rules.riskMoney>0&&r.loss>rules.riskMoney)alerts.push('Above your saved money-risk limit.');
 if(rules.riskPercent>0&&r.percent>rules.riskPercent)alerts.push('Above your saved risk-percentage limit.');
 if(data.percent>0&&r.percent>data.percent)alerts.push('Above the risk percentage entered.');
 if(data.quantityStep>0&&Math.abs(lots/data.quantityStep-Math.round(lots/data.quantityStep))>1e-7)alerts.push('Does not match the lot increment entered.');
 result.innerHTML=`<p>At <b>${lots} lots</b>, estimated stop loss + fees: <b>${esc(amount(r.loss))}</b> (${r.percent.toFixed(2)}%).</p>${r.margin!==null?`<p>Simple margin estimate: ${esc(amount(r.margin))}. Assumes this symbol uses your account leverage; broker tiers and symbol rules may differ.</p>`:''}${alerts.map(a=>`<p class="warning-pill">${a}</p>`).join('')}`;
 }catch(e){result.textContent=e.message;}};
 const clear=()=>{document.getElementById('my-lot-result').textContent='';};form.addEventListener('input',clear);form.addEventListener('change',clear);document.getElementById('account-form').addEventListener('input',()=>{document.getElementById('my-lot-result').textContent='Save account changes to use the updated leverage.';});
 field('entry').closest('.form-grid').insertAdjacentHTML('beforebegin',`<div class="quote-panel"><div class="quote-heading"><span>Reference market price</span><strong id="quote-value">—</strong></div><p id="quote-status" class="helper" role="status">Not connected. Enter a price from MT5 or connect a feed.</p><button type="button" id="quote-use" disabled>Use as entry price</button><details><summary>Connect price feed</summary><label>Twelve Data API key<input id="quote-key" type="password" autocomplete="off" placeholder="Kept only while this page is open"></label><label>Provider symbol<input id="quote-symbol" value="${esc(feedSymbol(pair()))}" placeholder="XAU/USD"></label><div><button type="button" id="quote-connect">Connect</button><button type="button" id="quote-disconnect">Disconnect</button></div><p class="helper">Requires a Twelve Data plan with streaming access to the selected symbol. Prices may differ from MT5. Your key goes only to Twelve Data and is not saved in the journal.</p><a href="https://twelvedata.com" target="_blank" rel="noopener">Get a data-provider key ↗</a></details></div>`);
 const $=id=>document.getElementById(id);let socket=null,tick=null,heartbeat=null,watchdog=null,generation=0;
 const status=message=>{if($('quote-status'))$('quote-status').textContent=message;};
 function stop(message='Disconnected.'){generation++;if(socket){socket.onclose=null;socket.close();socket=null;}clearInterval(heartbeat);clearInterval(watchdog);tick=null;if($('quote-use'))$('quote-use').disabled=true;if($('quote-value'))$('quote-value').textContent='—';status(message);}
 function connect(){stop();const key=$('quote-key').value.trim(),symbol=$('quote-symbol').value.trim().toUpperCase();if(!key||!symbol){status('Enter your data-provider key and symbol.');return;}const gen=generation;status('Connecting to Twelve Data…');socket=new WebSocket('wss://ws.twelvedata.com/v1/quotes/price?apikey='+encodeURIComponent(key));
 socket.onopen=()=>{if(gen!==generation)return;socket.send(JSON.stringify({action:'subscribe',params:{symbols:symbol}}));status('Connected; waiting for a price. Check symbol access if none arrives.');heartbeat=setInterval(()=>{if(socket?.readyState===1)socket.send(JSON.stringify({action:'heartbeat'}));},10000);};
 socket.onmessage=event=>{if(gen!==generation)return;let data;try{data=JSON.parse(event.data);}catch{return;}if(data.event==='price'&&data.symbol===symbol){const price=Number(data.price),timestamp=Number(data.timestamp)*1000;if(!Number.isFinite(price)||price<=0||!Number.isFinite(timestamp))return;tick={price,timestamp};renderTick();}else if(data.event==='subscribe-status'&&(data.status==='error'||data.fails?.length)){stop('Subscription unavailable. Check your API plan and provider symbol.');}};
 socket.onerror=()=>{if(gen===generation)stop('Feed unavailable. Check your key, connection and streaming access.');};socket.onclose=()=>{if(gen===generation)stop('Feed disconnected. Reconnect or enter your MT5 price.');};
 watchdog=setInterval(()=>{if(tick)renderTick();},1000);
 }
 function renderTick(){const age=Math.max(0,Math.floor((Date.now()-tick.timestamp)/1000)),fresh=age<120;$('quote-value').textContent=String(tick.price);$('quote-use').disabled=!fresh;status(`${fresh?'Streaming':'Stale / market may be closed'} · Twelve Data · ${new Date(tick.timestamp).toLocaleString()} · ${age}s old`);}
 $('quote-connect').onclick=connect;$('quote-disconnect').onclick=()=>{stop();$('quote-key').value='';};$('quote-symbol').oninput=()=>stop('Symbol changed. Connect again.');
 $('quote-use').onclick=()=>{if(!tick||Date.now()-tick.timestamp>=120000)return;field('entry').value=tick.price;field('entry').dispatchEvent(new Event('input',{bubbles:true}));};
 field('pair').addEventListener('change',()=>{stop('Pair changed. Confirm contract settings and reconnect for this symbol.');$('quote-symbol').value=feedSymbol(pair());field('entry').value='';field('stop').value='';field('multiplier').value='';field('fxRate').value='';refreshTemplate();});
 const hidden=()=>{if(document.hidden)stop('Paused while this tab is hidden. Reconnect when ready.');};document.addEventListener('visibilitychange',hidden);
 const nav=e=>{if(e.target.closest('[data-view],#sign-out'))stop();};document.addEventListener('click',nav);
 dispose=()=>{stop();document.removeEventListener('visibilitychange',hidden);document.removeEventListener('click',nav);};
}

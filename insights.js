import {net,risk} from './model.js?v=slate-copper-20261014';
export function equity(db){return db.settings.account?.startingBalance == null ? null : db.settings.account.startingBalance + (db.settings.account.netFunding || 0) + db.entries.filter(e=>e.kind==='live').reduce((s,e)=>s+(net(e)||0),0);}
export function performance(entries){
 const closed=entries.filter(e=>net(e)!==null).slice().sort((a,b)=>a.exitTime.localeCompare(b.exitTime)||String(a.id).localeCompare(String(b.id)));
 const wins=closed.filter(e=>net(e)>0), losses=closed.filter(e=>net(e)<0);
 let running=0,peak=0,drawdown=0,winStreak=0,lossStreak=0,maxWinStreak=0,maxLossStreak=0;
 for(const e of closed){const p=net(e);running+=p;peak=Math.max(peak,running);drawdown=Math.max(drawdown,peak-running);winStreak=p>0?winStreak+1:0;lossStreak=p<0?lossStreak+1:0;maxWinStreak=Math.max(maxWinStreak,winStreak);maxLossStreak=Math.max(maxLossStreak,lossStreak);}
 return {count:closed.length,pnl:running,winRate:closed.length?wins.length/closed.length:null,avgWin:wins.length?wins.reduce((s,e)=>s+net(e),0)/wins.length:null,avgLoss:losses.length?losses.reduce((s,e)=>s+net(e),0)/losses.length:null,expectancy:closed.length?running/closed.length:null,drawdown,maxWinStreak,maxLossStreak};
}
export function groupPerformance(entries,key){const groups=new Map();for(const e of entries){const names=key==='mistakes'?(e.mistakes?.length?e.mistakes:['No mistake tagged']):[e[key]||'Not specified'];for(const name of names){if(!groups.has(name))groups.set(name,[]);groups.get(name).push(e);}}return [...groups].map(([name,trades])=>({name,...performance(trades)})).sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name));}
export function filterEntries(entries,f){const q=(f.search||'').trim().toLowerCase();return entries.filter(e=>{const p=net(e),day=(e.status==='Closed'?e.exitTime:e.entryTime).slice(0,10);return (!f.kind||f.kind==='all'||e.kind===f.kind)&&(!f.pair||f.pair==='All pairs'||e.pair===f.pair)&&(!f.from||day>=f.from)&&(!f.to||day<=f.to)&&(!f.setup||e.setup===f.setup)&&(!f.session||e.session===f.session)&&(!f.outcome||f.outcome==='all'||(f.outcome==='open'?p===null:f.outcome==='win'?p>0:f.outcome==='loss'?p!==null&&p<0:p===0))&&(!q||[e.pair,e.setup,e.session,e.notes,e.lesson,...(e.mistakes||[])].join(' ').toLowerCase().includes(q));});}
export function positionSize({equity:balance,percent,entry,stop,multiplier=1,fxRate=1,fees=0,riskCap=null,lotCap=null,quantityStep=0.01}){
 for(const [key,value] of Object.entries({balance,percent,entry,stop,multiplier,fxRate,fees,quantityStep})){if(!Number.isFinite(value))throw Error(`Enter ${({balance:'your account equity',percent:'your risk percentage',entry:'an entry price',stop:'a stop-loss price',multiplier:'the units in one lot',fxRate:'the currency conversion rate',fees:'estimated total fees',quantityStep:'the smallest lot increment'})[key]}.`);}
 if(balance<=0||percent<=0||percent>100||entry<0||stop<0||entry===stop||multiplier<=0||fxRate<=0||fees<0||quantityStep<=0)throw Error('Equity and broker settings must be above zero, risk must be between 0 and 100%, and entry and stop-loss prices must be different. Prices and fees cannot be negative.');
 const budget=Math.min(balance*percent/100,riskCap>0?riskCap:Infinity);const available=budget-fees;
 if(available<=0)throw Error('Your fees use up the entire risk budget. Check your fees and risk settings.');
 const unitRisk=Math.abs(entry-stop)*multiplier*fxRate;const quantity=Math.floor(Math.min(available/unitRisk,lotCap>0?lotCap:Infinity)/quantityStep+1e-10)*quantityStep;
 if(!Number.isFinite(quantity)||quantity<=0)throw Error('No lot size fits these settings. Check your risk budget, maximum lot size and broker’s lot increment.');
 const actualRisk=quantity*unitRisk+fees;return {budget,quantity,actualRisk,riskPercent:actualRisk/balance*100,notional:entry*quantity*multiplier*fxRate,effectiveLeverage:entry*quantity*multiplier*fxRate/balance};
}
export function dailyState(db,day){const live=db.entries.filter(e=>e.kind==='live');const trades=live.filter(e=>e.entryTime.slice(0,10)===day);const pnl=live.filter(e=>e.exitTime?.slice(0,10)===day).reduce((s,e)=>s+(net(e)||0),0);const rules=db.settings.tradingRules||{};return {entries:trades.length,pnl,remaining:rules.maxEntries==null?null:Math.max(0,rules.maxEntries-trades.length),limit:rules.maxEntries,target:rules.dailyMoney,lossLimit:rules.dailyLoss};}
export function tradeWarnings(db,trade,id=null){if(trade.kind!=='live')return [];const other={...db,entries:db.entries.filter(e=>e.id!==id)};const day=trade.entryTime.slice(0,10),state=dailyState(other,day),rules=db.settings.tradingRules||{},warnings=[];
 if(state.limit && state.entries>=state.limit)warnings.push(`This is live entry #${state.entries+1} on ${day}, above your limit of ${state.limit}.`);
 if(state.lossLimit && state.pnl<=-state.lossLimit)warnings.push(`Recorded realized net loss on ${day} reached your daily loss limit.`);
 if(state.target && state.pnl>=state.target)warnings.push(`Recorded daily profit target already reached on ${day}.`);
 const amount=risk(trade);const planned=amount==null?null:amount+(trade.fees||0);
 if(rules.riskMoney && planned>rules.riskMoney)warnings.push(`Planned risk plus fees exceeds your ${rules.riskMoney} money limit.`);
 if(rules.riskPercent && trade.equitySnapshot>0 && planned/trade.equitySnapshot*100>rules.riskPercent)warnings.push(`Planned risk plus fees exceeds ${rules.riskPercent}% of recorded equity.`);
 if(rules.maxLotSize && trade.quantity>rules.maxLotSize)warnings.push(`Lot size exceeds your ${rules.maxLotSize} lot limit.`);
 return warnings;}
export function duplicateKey(e){return JSON.stringify([e.kind,e.pair,e.direction,e.entryTime,e.exitTime,e.status,net(e),e.quantity,e.entry,e.exit]);}
export function prepareBatch(entries,incoming,skipDuplicates=true){const keys=new Set(entries.map(duplicateKey)),accepted=[];let skipped=0;for(const e of incoming){const key=duplicateKey(e);if(skipDuplicates&&keys.has(key)){skipped++;continue;}keys.add(key);accepted.push(e);}return {accepted,skipped};}

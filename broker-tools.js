const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function brokerFields(account={}){
 const brokers=['Vantage','IC Markets','Pepperstone','Exness','XM','OANDA','FP Markets','Eightcap','Other'];
 const select=(label,name,items,value)=>`<label>${label}<select name="${name}"><option value="">Choose ${label.toLowerCase()}</option>${items.map(v=>`<option ${v===value?'selected':''}>${esc(v)}</option>`).join('')}</select></label>`;
 return `<div class="broker-profile form-grid">${select('Broker','broker',brokers,account.broker)}${select('Platform','platform',['MT5','MT4','cTrader','TradingView','Other'],account.platform)}<label>Other broker name<input name="brokerCustom" maxlength="80" value="${esc(account.brokerCustom)}" placeholder="If yours is not listed"></label><label>Account leverage · 1:<input type="number" name="accountLeverage" min="1" step="any" value="${esc(account.accountLeverage??'')}" placeholder="e.g. 2000"></label></div><p class="helper">Broker = your account provider. MT5 = your trading platform. Leverage is separate from lot size.</p>`;
}
export function tradeOutcome({equity,quantity,entry,stop,target,multiplier,fxRate,fees}){
 const values={equity,quantity,entry,stop,target,multiplier,fxRate,fees};
 if(Object.values(values).some(v=>!Number.isFinite(v)))throw Error('Fill in your balance, lot size, prices and contract settings.');
 if(equity<=0||quantity<=0||entry<=0||stop<=0||target<=0||multiplier<=0||fxRate<=0||fees<0)throw Error('Use positive values. Fees can be zero.');
 if(entry===stop)throw Error('Stop loss must be different from entry.');
 const direction=stop<entry?'Long':'Short';
 if((direction==='Long'&&target<=entry)||(direction==='Short'&&target>=entry))throw Error(direction==='Long'?'For a buy, take profit must be above entry.':'For a sell, take profit must be below entry.');
 const loss=Math.abs(entry-stop)*quantity*multiplier*fxRate+fees;
 const profit=Math.abs(target-entry)*quantity*multiplier*fxRate-fees;
 return {direction,loss,profit,percent:loss/equity*100,rewardRisk:profit/loss,afterLoss:equity-loss,afterWin:equity+profit};
}

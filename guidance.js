import {net} from './model.js?v=wide-minimal-20261014';
export function guidanceState(db){
 const rules=db.settings.tradingRules||{},live=db.entries.filter(t=>t.kind==='live');
 const steps=[
  {title:'Set account balance',detail:'A starting point for your risk budget',view:'tools',done:db.settings.account?.startingBalance!=null},
  {title:'Choose your pairs',detail:'Keep your everyday markets handy',action:'pairs',done:db.settings.onboarding?.pairsReviewed===true},
  {title:'Write your trading plan',detail:'Your rules, targets and daily limits',view:'rules',done:rules.planVersion===1&&Boolean(rules.notes?.trim()||rules.maxEntries||rules.dailyMoney||rules.dailyLoss||rules.riskMoney||rules.riskPercent||rules.maxLotSize)},
  {title:'Log your first trade',detail:'Capture the result and your reasoning',action:'trade',done:live.length>0}
 ];
 const queue=live.filter(t=>net(t)!==null&&!t.reviewed&&!t.lesson?.trim()).slice().sort((a,b)=>b.exitTime.localeCompare(a.exitTime)||String(b.id).localeCompare(String(a.id)));
 return {steps,complete:steps.every(s=>s.done),queue};
}

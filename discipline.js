import {dailyState} from './insights.js?v=wide-minimal-20261014';
export function ruleRoutine(db,day){
 const state=dailyState(db,day),today=db.entries.filter(t=>t.kind==='live'&&t.entryTime.slice(0,10)===day);
 const reports=today.filter(t=>['Yes','No'].includes(t.rules));
 const warnings=[];if(state.limit&&state.entries>=state.limit)warnings.push('Entry limit reached');if(state.lossLimit&&state.pnl<=-state.lossLimit)warnings.push('Daily loss limit reached');if(state.target&&state.pnl>=state.target)warnings.push('Daily target reached');
 return {state,warnings,followed:reports.filter(t=>t.rules==='Yes').length,reported:reports.length,unreported:today.length-reports.length};
}
export function checklistForTrade(plan,trade){return trade?.planChecks?.length?trade.planChecks.map(c=>({...c})):(plan.checklist||[]).map(label=>({label,checked:false}));}

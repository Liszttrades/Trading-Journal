import { net, risk } from './model.js?v=large-type-calendar-20261014';
export const defaultRules = { notes: '', dailyMoney: null, dailyR: null, maxEntries: null };
export function ruleFlags(entries, limit = null) {
  const counts = new Map();
  const flags = new Map();
  const ordered = entries.filter(e => e.kind === 'live').slice().sort((a,b) => a.entryTime.localeCompare(b.entryTime) || (a.created || '').localeCompare(b.created || '') || a.id.localeCompare(b.id));
  for (const entry of ordered) {
    const day = entry.entryTime.slice(0,10);
    const ordinal = (counts.get(day) || 0) + 1;
    counts.set(day, ordinal);
    flags.set(entry.id, { ordinal, overLimit: Number.isInteger(limit) && limit > 0 && ordinal > limit });
  }
  return flags;
}
export function dailyProgress(entries, day) {
  const live = entries.filter(e => e.kind === 'live');
  const closed = live.filter(e => e.exitTime?.slice(0,10) === day && net(e) !== null);
  const withRisk = closed.filter(e => risk(e) > 0);
  return { count: live.filter(e => e.entryTime.slice(0,10) === day).length, pnl: closed.reduce((s,e)=>s+net(e),0), r: withRisk.reduce((s,e)=>s+net(e)/risk(e),0), missingRisk: closed.length-withRisk.length };
}

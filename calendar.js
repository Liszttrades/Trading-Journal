import { net } from './model.js?v=batch-cards-20261012';

// Use recorded closing dates directly: journal timestamps already use the chosen zone.
export function monthSummary(entries, year, month) {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}-`;
  const days = new Map();
  for (const trade of entries) {
    const pnl = net(trade);
    if (pnl === null || !Number.isFinite(pnl) || !trade.exitTime?.startsWith(prefix)) continue;
    const date = trade.exitTime.slice(0, 10);
    const day = days.get(date) || { pnl: 0, entries: [] };
    day.pnl += pnl; day.entries.push(trade); days.set(date, day);
  }
  const count = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const offset = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
  const weeks = Array.from({ length: Math.ceil((offset + count) / 7) }, (_, row) => {
    const cells = Array.from({ length: 7 }, (_, col) => {
      const number = row * 7 + col - offset + 1;
      if (number < 1 || number > count) return null;
      const date = prefix + String(number).padStart(2, '0');
      return { number, date, ...(days.get(date) || { pnl: 0, entries: [] }) };
    });
    return { cells, pnl: cells.reduce((sum, day) => sum + (day?.pnl || 0), 0), count: cells.reduce((sum, day) => sum + (day?.entries.length || 0), 0) };
  });
  return { weeks, pnl: weeks.reduce((sum, week) => sum + week.pnl, 0), count: weeks.reduce((sum, week) => sum + week.count, 0) };
}

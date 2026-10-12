// Edit these starting choices, or use Customize inside the journal.
export const defaultSettings = {
  pairs: ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'BTCUSD', 'ETHUSD'],
  setups: ['Breakout', 'Pullback', 'Reversal', 'Trend continuation', 'Range'],
  sessions: ['Asia', 'London', 'New York', 'Overlap'],
  moods: ['Calm', 'Confident', 'Anxious', 'FOMO', 'Frustrated'],
  currency: 'USD',
  timezone: 'Asia/Manila'
};

// An actual net result overrides the price calculation. Zero is valid.
export function net(trade) {
  if (trade.status !== 'Closed') return null;
  if (trade.pnl !== null) return trade.pnl;
  if (trade.entry === null || trade.exit === null || trade.quantity === null) return null;
  const direction = trade.direction === 'Long' ? 1 : -1;
  return (trade.exit - trade.entry) * direction * trade.quantity * trade.multiplier - trade.fees;
}

export function risk(trade) {
  if (trade.risk !== null) return trade.risk;
  if (trade.entry === null || trade.stop === null || trade.quantity === null) return null;
  return Math.abs(trade.entry - trade.stop) * trade.quantity * trade.multiplier;
}

export function fresh(kind, pair) {
  const date = new Date();
  const localTime = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  return {
    kind, pair, direction: 'Long', status: 'Open', entryTime: localTime, exitTime: '',
    setup: '', session: '', mood: '', rules: '', entry: null, exit: null, stop: null,
    quantity: null, multiplier: 1, fees: 0, pnl: null, risk: null, notes: '', lesson: ''
  };
}

// Keep the day's repeated choices, never the previous trade's result or evidence.
export function nextScalp(previous) {
  const trade = fresh(previous.kind, previous.pair);
  for (const key of ['direction', 'status', 'setup', 'session', 'multiplier']) trade[key] = previous[key];
  trade.entryTime = previous.exitTime || previous.entryTime;
  return trade;
}

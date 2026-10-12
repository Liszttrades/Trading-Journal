import { net } from './model.js';
function requireInput(condition, message) {
  if (!condition) throw Object.assign(Error(message), { status: 400 });
}

function validateTrade(value) {
  requireInput(value && typeof value === 'object', 'Enter trade details.');
  const template = {
    kind: 'live', pair: '', direction: 'Long', status: 'Open', entryTime: '', exitTime: '',
    setup: '', session: '', mood: '', rules: '', entry: null, exit: null, stop: null,
    quantity: null, multiplier: 1, fees: 0, pnl: null, risk: null, notes: '', lesson: ''
  };
  const trade = {};
  for (const [key, fallback] of Object.entries(template)) trade[key] = value[key] ?? fallback;
  for (const key of ['kind', 'pair', 'direction', 'status', 'entryTime', 'exitTime', 'setup', 'session', 'mood', 'rules', 'notes', 'lesson']) {
    requireInput(typeof trade[key] === 'string', `Invalid ${key}.`);
    requireInput(trade[key].length <= (key === 'notes' ? 20000 : key === 'lesson' ? 4000 : 100), `${key} is too long.`);
  }
  requireInput(['live', 'backtest'].includes(trade.kind), 'Choose live or backtest.');
  requireInput(['Long', 'Short'].includes(trade.direction), 'Choose Long or Short.');
  requireInput(['Open', 'Closed'].includes(trade.status), 'Choose Open or Closed.');
  requireInput(['Yes', 'No', ''].includes(trade.rules), 'Choose Yes or No for rules.');
  trade.pair = trade.pair.trim();
  requireInput(trade.pair.length > 0 && trade.pair.length <= 40, 'Choose a pair.');
  const validDate = text => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(text) && Number.isFinite(Date.parse(text));
  requireInput(validDate(trade.entryTime), 'Enter a valid entry date and time.');
  requireInput(!trade.exitTime || validDate(trade.exitTime), 'Enter a valid exit date and time.');
  requireInput(!trade.exitTime || trade.exitTime >= trade.entryTime, 'Exit must be after entry.');
  for (const key of ['entry', 'exit', 'stop', 'quantity', 'multiplier', 'fees', 'pnl', 'risk']) {
    requireInput(trade[key] === null || (typeof trade[key] === 'number' && Number.isFinite(trade[key])), `Enter a valid ${key}.`);
  }
  for (const key of ['entry', 'exit', 'stop', 'fees']) requireInput(trade[key] === null || trade[key] >= 0, `${key} cannot be negative.`);
  for (const key of ['quantity', 'multiplier', 'risk']) requireInput(trade[key] === null || trade[key] > 0, `${key} must be positive.`);
  requireInput(trade.multiplier !== null && trade.fees !== null, 'Enter multiplier and fees (0 fees is valid).');
  if (trade.status === 'Closed') {
    requireInput(Boolean(trade.exitTime), 'Closed entries need an exit date and time.');
    requireInput(net(trade) !== null && Number.isFinite(net(trade)), 'Enter actual net P&L, or entry/exit prices and quantity.');
  }
  return trade;
}

function validateSettings(value) {
  const settings = {};
  for (const key of ['pairs', 'setups', 'sessions', 'moods']) {
    requireInput(Array.isArray(value?.[key]) && value[key].length <= 80, `Check your ${key} list.`);
    requireInput(value[key].every(x => typeof x === 'string' && x.length <= 80), `Check your ${key} list.`);
    settings[key] = [...new Set(value[key].map(x => x.trim()).filter(Boolean))];
  }
  requireInput(settings.pairs.length > 0, 'Add at least one pair.');
  requireInput(['USD', 'PHP', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD'].includes(value.currency), 'Choose a supported currency.');
  requireInput(typeof value.timezone === 'string', 'Choose a time zone.');
  try { new Intl.DateTimeFormat('en', { timeZone: value.timezone }); }
  catch { requireInput(false, 'Choose a valid time zone.'); }
  const rules = value.tradingRules || {};
  const maxEntries = rules.maxEntries ?? 3;
  requireInput(Number.isInteger(maxEntries) && maxEntries >= 1 && maxEntries <= 1000, 'Daily entry limit must be 1–1000.');
  requireInput(typeof (rules.notes ?? '') === 'string' && (rules.notes ?? '').length <= 20000, 'Rules notes must be at most 20,000 characters.');
  for (const key of ['dailyMoney', 'dailyR']) requireInput(rules[key] == null || (Number.isFinite(rules[key]) && rules[key] > 0), 'Targets must be positive or blank.');
  settings.tradingRules = { maxEntries, notes: rules.notes ?? '', dailyMoney: rules.dailyMoney ?? null, dailyR: rules.dailyR ?? null };
  settings.currency = value.currency;
  settings.timezone = value.timezone;
  return settings;
}

export { validateTrade, validateSettings };

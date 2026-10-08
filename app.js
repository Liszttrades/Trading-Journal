import { monthSummary } from './calendar.js';
import { api, imageURL, exportBackup, restoreBackup } from './storage.js';
import { fresh, net, risk } from './model.js';

// UI state only. IndexedDB holds records and screenshots in this browser.
const $ = selector => document.querySelector(selector);
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
let database = { settings: { pairs: [], currency: 'USD', timezone: 'Asia/Manila' }, entries: [] };
let view = 'live';
let editing = null;
let files = [];
let removedImages = [];
let previewURLs = [];
let busy = false;
let deleting = false;
let calendarYear = null;
let calendarMonth = null;
let calendarEntries = [];

function currentMonth() {
  const parts = new Intl.DateTimeFormat('en', { timeZone: database.settings.timezone, year: 'numeric', month: 'numeric' }).formatToParts(new Date());
  return [Number(parts.find(p => p.type === 'year').value), Number(parts.find(p => p.type === 'month').value) - 1];
}


function message(selector, text = '') {
  const element = $(selector);
  element.textContent = text;
  element.hidden = !text;
}

async function load() {
  try {
    database = await api('/api/journal');
    message('#load-error');
    render();
  } catch (error) {
    message('#load-error', `${error.message} Allow browser storage for this website, then reload. Your existing data has not been reset.`);
  }
}

function money(value) {
  return new Intl.NumberFormat('en', { style: 'currency', currency: database.settings.currency, maximumFractionDigits: 2 }).format(value);
}

function options(items, selected = '', blank = false) {
  return `${blank ? '<option value="">Select</option>' : ''}${[...new Set([...items, ...(selected ? [selected] : [])])].map(item => `<option value="${escape(item)}" ${item === selected ? 'selected' : ''}>${escape(item)}</option>`).join('')}`;
}

function render() {
  const title = view === 'backtest' ? 'Backtesting lab' : view === 'gallery' ? 'Chart library' : 'Trading journal';
  $('#heading').textContent = title;
  $('#breadcrumb').textContent = title;
  $('#subtitle').textContent = view === 'backtest' ? 'Test your setups. Keep the evidence.' : view === 'gallery' ? 'Your screenshots, connected to the trades behind them.' : 'Every trade, its reasoning, and what comes next.';
  $('#new-entry').textContent = view === 'backtest' ? '+ New backtest' : '+ New trade';
  document.querySelectorAll('[data-view]').forEach(button => button.classList.toggle('active', button.dataset.view === view));
  const currentPair = $('#pair-filter').value || 'All pairs';
  $('#pair-filter').innerHTML = options(['All pairs', ...database.settings.pairs, ...database.entries.map(entry => entry.pair)], currentPair);
  const selected = database.entries.filter(entry => (view === 'gallery' || entry.kind === view) && (currentPair === 'All pairs' || entry.pair === currentPair));
  $('#performance').hidden = view === 'gallery';
  $('#pnl-calendar').hidden = view === 'gallery';
  if (view !== 'gallery') renderCalendar(selected);
  $('#records-title').textContent = `${view === 'gallery' ? 'Screenshots' : 'Entries'} (${selected.length})`;
  $('#footnote').textContent = `${database.settings.currency} results. Times entered in ${database.settings.timezone}. Saved in this browser. Export backups regularly; there is no cloud sync.`;
  if (view === 'gallery') {
    const cards = selected.flatMap(entry => entry.images.map(image => `<button class="image-card" data-image="${image.id}" data-image-name="${escape(image.name)}"><img src="${imageURL(image.id, database)}" alt="${escape(entry.pair + ' ' + image.name)}"><div><strong>${escape(entry.pair)}</strong><span>${entry.kind === 'backtest' ? 'Backtest' : 'Live trade'} · ${escape(entry.entryTime.replace('T', ' '))}</span></div></button>`));
    $('#entries').innerHTML = `<div class="gallery">${cards.join('') || '<div class="empty"><h3>No screenshots yet</h3><p>Attach a chart image to a trade or backtest.</p></div>'}</div>`;
    return;
  }
  const closed = selected.filter(entry => net(entry) !== null);
  const total = closed.reduce((sum, entry) => sum + net(entry), 0);
  const wins = closed.filter(entry => net(entry) > 0);
  const gains = wins.reduce((sum, entry) => sum + net(entry), 0);
  const losses = -closed.filter(entry => net(entry) < 0).reduce((sum, entry) => sum + net(entry), 0);
  const rTrades = closed.filter(entry => risk(entry) > 0);
  const averageR = rTrades.length ? rTrades.reduce((sum, entry) => sum + net(entry) / risk(entry), 0) / rTrades.length : null;
  const metrics = [
    ['Net P&L', money(total), `${closed.length} closed entries`, total < 0 ? 'negative' : total > 0 ? 'positive' : ''],
    ['Win rate', closed.length ? `${(wins.length / closed.length * 100).toFixed(1)}%` : '—', `${wins.length} wins · ${closed.length - wins.length} losses / flat`, ''],
    ['Profit factor', losses ? (gains / losses).toFixed(2) : '—', 'Gross wins ÷ gross losses', ''],
    ['Average R', averageR === null ? '—' : `${averageR.toFixed(2)}R`, 'Net result ÷ initial risk', '']
  ];
  $('#metrics').innerHTML = metrics.map(([label, value, note, color]) => `<div class="metric"><span>${label}</span><strong class="${color}">${escape(value)}</strong><small>${note}</small></div>`).join('');
  $('#chart-unit').textContent = `${database.settings.currency} · closed ${view === 'backtest' ? 'backtests' : 'trades'}`;
  renderCurve(closed);
  if (!selected.length) {
    $('#entries').innerHTML = '<div class="empty"><h3>A clean page for your next trade</h3><p>Add an entry, attach your charts, and capture your reasoning.</p><button class="secondary" data-new-entry>Add your first entry</button></div>';
    return;
  }
  const rows = selected.map(entry => {
    const pnl = net(entry);
    const r = risk(entry);
    const result = pnl === null ? '<span class="tag">Open</span>' : escape(money(pnl));
    return `<tr><td><button class="trade-link" data-entry="${entry.id}">${escape(entry.pair)}<small>${escape(entry.setup || 'No setup')}</small></button></td><td><span class="tag ${entry.direction.toLowerCase()}">${entry.direction}</span></td><td>${escape(entry.entryTime.replace('T', ' '))}<small class="subtext">${escape(entry.session || database.settings.timezone)}</small></td><td class="${pnl < 0 ? 'negative' : pnl > 0 ? 'positive' : ''}">${result}<small class="subtext">${entry.status}</small></td><td>${pnl !== null && r > 0 ? `${(pnl / r).toFixed(2)}R` : '—'}</td><td>${entry.images.length ? `${entry.images.length} attached` : '—'}</td><td><button class="secondary compact" data-entry="${entry.id}">Open</button></td></tr>`;
  });
  $('#entries').innerHTML = `<div class="table-scroll"><table><thead><tr>${['Pair / setup', 'Direction', 'Entry time', 'Result', 'R', 'Charts', ''].map(label => `<th>${label}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
}

function renderCalendar(entries) {
  if (calendarYear === null) [calendarYear, calendarMonth] = currentMonth();
  calendarEntries = entries;
  const summary = monthSummary(entries, calendarYear, calendarMonth);
  const title = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(calendarYear, calendarMonth, 1)));
  const color = value => value > 0 ? 'positive' : value < 0 ? 'negative' : '';
  const signed = value => `${value > 0 ? '+' : ''}${money(value)}`;
  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Week total'];
  const cells = summary.weeks.map((week, i) => week.cells.map(day => day ? `<button class="calendar-day ${day.entries.length ? (day.pnl > 0 ? 'profit-day' : day.pnl < 0 ? 'loss-day' : 'flat-day') : ''}" data-calendar-day="${day.date}" aria-label="${day.date}, ${escape(signed(day.pnl))}, ${day.entries.length} closed trades"><span class="day-number">${day.number}</span><strong class="${color(day.pnl)}">${day.entries.length ? escape(signed(day.pnl)) : '—'}</strong><small>${day.entries.length ? `${day.entries.length} trade${day.entries.length === 1 ? '' : 's'}` : 'No closed trades'}</small></button>` : '<div class="calendar-blank" aria-hidden="true"></div>').join('') + `<div class="calendar-week"><span>Week ${i + 1}</span><strong class="${color(week.pnl)}">${escape(signed(week.pnl))}</strong><small>${week.count} trades</small></div>`).join('');
  $('#pnl-calendar').innerHTML = `<div class="calendar-heading"><div><h2>P&L calendar</h2><p>Closed ${view === 'backtest' ? 'backtests' : 'trades'} · closing date · ${escape(database.settings.timezone)}</p></div><div class="calendar-nav"><button class="secondary" data-month-step="-1" aria-label="Previous month">‹</button><strong aria-live="polite">${title}</strong><button class="secondary" data-month-step="1" aria-label="Next month">›</button><button class="secondary" data-calendar-today>This month</button></div></div><div class="calendar-total"><span>Monthly net P&L <strong class="${color(summary.pnl)}">${escape(signed(summary.pnl))}</strong></span><span>${summary.count} closed trades</span></div><div class="calendar-scroll"><div class="calendar-grid">${weekdays.map(day => `<div class="weekday">${day}</div>`).join('')}${cells}</div></div><p class="helper">Click a day to review its trades. Weekly totals include only days within this month. Open trades are excluded.</p>`;
}

function renderCurve(entries) {
  if (!entries.length) {
    $('#curve').innerHTML = '<div class="chart-empty"><span>Your performance starts with your first closed entry.</span><small>Open positions stay out of realized results.</small></div>';
    return;
  }
  let running = 0;
  const values = [0, ...entries.slice().sort((a, b) => a.exitTime.localeCompare(b.exitTime)).map(entry => running += net(entry))];
  const minimum = Math.min(...values, 0), maximum = Math.max(...values, 0);
  const spread = maximum - minimum || 1;
  const x = index => 75 + index / Math.max(1, values.length - 1) * 600;
  const y = value => 185 - (value - minimum) / spread * 155;
  const line = values.map((value, index) => `${index ? 'L' : 'M'} ${x(index)} ${y(value)}`).join(' ');
  const grids = [minimum, (minimum + maximum) / 2, maximum].map(value => `<line x1="75" x2="675" y1="${y(value)}" y2="${y(value)}" class="chart-grid"/><text x="65" y="${y(value) + 4}" text-anchor="end">${escape(value.toLocaleString('en', { maximumFractionDigits: 1 }))}</text>`).join('');
  $('#curve').innerHTML = `<svg class="local-chart" viewBox="0 0 700 220" role="img" aria-label="Cumulative realized profit and loss across closed trades">${grids}<path d="${line}" class="chart-line"/><text x="75" y="214">Start</text><text x="675" y="214" text-anchor="end">${entries.length} closed entries</text></svg>`;
}

function select(label, name, items, value, blank = false) {
  return `<label>${label}<select name="${name}">${options(items, value, blank)}</select></label>`;
}

function number(label, name, value, min = '') {
  return `<label>${label}<input type="number" step="any" name="${name}" value="${value ?? ''}" ${min !== '' ? `min="${min}"` : ''}></label>`;
}

function openEntry(entry = null) {
  editing = entry;
  files = [];
  removedImages = [];
  deleting = false;
  const trade = entry || fresh(view === 'backtest' ? 'backtest' : 'live', database.settings.pairs[0]);
  const settings = database.settings;
  $('#entry-title').textContent = entry ? 'Review entry' : 'New journal entry';
  $('#core-fields').innerHTML = [
    select('Entry type', 'kind', ['live', 'backtest'], trade.kind),
    select('Pair', 'pair', settings.pairs, trade.pair),
    select('Direction', 'direction', ['Long', 'Short'], trade.direction),
    select('Status', 'status', ['Open', 'Closed'], trade.status),
    `<label>Entry date & time<input type="datetime-local" name="entryTime" required value="${escape(trade.entryTime)}"></label>`,
    `<label>Exit date & time<input type="datetime-local" name="exitTime" value="${escape(trade.exitTime)}"></label>`,
    select('Setup', 'setup', settings.setups, trade.setup, true),
    select('Session', 'session', settings.sessions, trade.session, true),
    number(`Actual net P&L (${settings.currency})`, 'pnl', trade.pnl),
    number(`Initial risk (${settings.currency})`, 'risk', trade.risk, 0)
  ].join('');
  $('#price-fields').innerHTML = [number('Entry price', 'entry', trade.entry, 0), number('Exit price', 'exit', trade.exit, 0), number('Initial stop', 'stop', trade.stop, 0), number('Quantity / units', 'quantity', trade.quantity, 0), number('Contract multiplier', 'multiplier', trade.multiplier, 0), number(`Total fees (${settings.currency})`, 'fees', trade.fees, 0)].join('');
  $('#review-fields').innerHTML = select('Mood', 'mood', settings.moods, trade.mood, true) + select('Followed your rules?', 'rules', ['Yes', 'No'], trade.rules, true);
  $('#entry-form').elements.notes.value = trade.notes;
  $('#entry-form').elements.lesson.value = trade.lesson;
  $('#upload').value = '';
  $('#delete-entry').hidden = !entry;
  $('#delete-entry').textContent = 'Delete entry';
  message('#form-error');
  renderAttachments();
  $('#entry-dialog').showModal();
}

function renderAttachments() {
  previewURLs.forEach(URL.revokeObjectURL);
  previewURLs = files.map(file => URL.createObjectURL(file));
  const existing = (editing?.images || []).filter(image => !removedImages.includes(image.id)).map(image => `<div><button type="button" class="image-preview" data-image="${image.id}" data-image-name="${escape(image.name)}"><img src="${imageURL(image.id, database)}" alt="${escape(image.name)}"></button><button type="button" data-remove-image="${image.id}">Remove</button></div>`);
  const pending = files.map((file, index) => `<div><img src="${previewURLs[index]}" alt="${escape(file.name)}"><button type="button" data-remove-file="${index}">Remove</button></div>`);
  $('#attachments').innerHTML = [...existing, ...pending].join('');
}

function setBusy(value) {
  busy = value;
  $('#save-entry').disabled = value;
  $('#delete-entry').disabled = value;
  $('#save-entry').textContent = value ? 'Saving…' : 'Save entry';
}

async function fileData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, base64: String(reader.result).split(',')[1] });
    reader.onerror = () => reject(Error('Could not read the image. Please choose it again.'));
    reader.readAsDataURL(file);
  });
}

$('#entry-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (busy) return;
  setBusy(true);
  message('#form-error');
  const form = new FormData(event.currentTarget);
  const trade = {};
  for (const key of ['kind', 'pair', 'direction', 'status', 'entryTime', 'exitTime', 'setup', 'session', 'mood', 'rules', 'notes', 'lesson']) trade[key] = String(form.get(key) || '');
  for (const key of ['entry', 'exit', 'stop', 'quantity', 'multiplier', 'fees', 'pnl', 'risk']) trade[key] = form.get(key) === '' ? null : Number(form.get(key));
  try {
    const images = await Promise.all(files.map(fileData));
    await api('/api/entries', { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trade, id: editing?.id, images, removeImages: removedImages }) });
    $('#entry-dialog').close();
    await load();
  } catch (error) {
    message('#form-error', error.message);
  } finally {
    setBusy(false);
  }
});

$('#upload').addEventListener('change', event => {
  const next = [...event.target.files];
  const existingCount = (editing?.images || []).filter(image => !removedImages.includes(image.id)).length;
  if (next.some(file => file.size > 8 * 1024 * 1024) || next.length + existingCount > 4) {
    message('#form-error', 'Choose up to four images, 8 MB each.');
    event.target.value = '';
    return;
  }
  files = next;
  message('#form-error');
  renderAttachments();
});

$('#delete-entry').addEventListener('click', async () => {
  if (busy || !editing) return;
  if (!deleting) { deleting = true; $('#delete-entry').textContent = 'Confirm delete entry & images'; return; }
  setBusy(true);
  try {
    await api('/api/entries', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editing.id }) });
    $('#entry-dialog').close();
    await load();
  } catch (error) { message('#form-error', error.message); }
  finally { setBusy(false); }
});

$('#customize').addEventListener('click', () => {
  const settings = database.settings;
  $('#settings-fields').innerHTML = ['pairs', 'setups', 'sessions', 'moods'].map(key => `<label>${key[0].toUpperCase() + key.slice(1)}<textarea name="${key}" rows="5">${escape(settings[key].join('\n'))}</textarea></label>`).join('') + select('Result currency', 'currency', ['USD', 'PHP', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD'], settings.currency) + select('Journal time zone', 'timezone', ['Asia/Manila', 'UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo'], settings.timezone);
  message('#settings-error');
  $('#settings-dialog').showModal();
});

$('#settings-form').addEventListener('submit', async event => {
  event.preventDefault();
  const button = event.currentTarget.querySelector('button[type="submit"]');
  button.disabled = true;
  const form = new FormData(event.currentTarget);
  const settings = {};
  ['pairs', 'setups', 'sessions', 'moods'].forEach(key => settings[key] = String(form.get(key)).split('\n').map(x => x.trim()).filter(Boolean));
  settings.currency = form.get('currency');
  settings.timezone = form.get('timezone');
  try {
    await api('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) });
    $('#settings-dialog').close();
    await load();
  } catch (error) { message('#settings-error', error.message); }
  finally { button.disabled = false; }
});

$('#pair-filter').addEventListener('change', render);
$('#new-entry').addEventListener('click', () => openEntry());
document.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.monthStep) { const date = new Date(Date.UTC(calendarYear, calendarMonth + Number(button.dataset.monthStep), 1)); calendarYear = date.getUTCFullYear(); calendarMonth = date.getUTCMonth(); renderCalendar(calendarEntries); }
  if (button.hasAttribute('data-calendar-today')) { [calendarYear, calendarMonth] = currentMonth(); renderCalendar(calendarEntries); }
  if (button.dataset.calendarDay) {
    const day = button.dataset.calendarDay;
    const trades = calendarEntries.filter(entry => entry.exitTime?.slice(0, 10) === day && net(entry) !== null);
    $('#day-title').textContent = `${day} · Daily trades`;
    $('#day-trades').innerHTML = trades.length ? trades.map(entry => `<button class="daily-trade secondary" data-entry="${entry.id}"><span>${escape(entry.pair)} · ${escape(entry.direction)}<small>${escape(entry.exitTime.replace('T', ' '))}</small></span><strong class="${net(entry) < 0 ? 'negative' : net(entry) > 0 ? 'positive' : ''}">${escape(money(net(entry)))}</strong></button>`).join('') : '<p class="helper">No closed trades on this day for the selected pair.</p>';
    $('#day-dialog').showModal();
  }
  if (button.dataset.view) { view = button.dataset.view; $('#pair-filter').value = 'All pairs'; render(); }
  if (button.dataset.entry) { $('#day-dialog').close(); openEntry(database.entries.find(entry => entry.id === button.dataset.entry)); }
  if (button.hasAttribute('data-new-entry')) openEntry();
  if (button.dataset.close && !busy) $(`#${button.dataset.close}`).close();
  if (button.dataset.image) {
    $('#image-title').textContent = button.dataset.imageName || 'Chart screenshot';
    $('#full-image').src = imageURL(button.dataset.image, database);
    $('#full-image').alt = button.dataset.imageName || 'Chart screenshot';
    $('#image-dialog').showModal();
  }
  if (button.dataset.removeImage) { removedImages.push(button.dataset.removeImage); renderAttachments(); }
  if (button.dataset.removeFile !== undefined) { files.splice(Number(button.dataset.removeFile), 1); renderAttachments(); }
});

$('#entry-dialog').addEventListener('cancel', event => { if (busy) event.preventDefault(); });
$('#entry-dialog').addEventListener('close', () => { previewURLs.forEach(URL.revokeObjectURL); previewURLs = []; });
$('#export-backup').addEventListener('click', async () => {
  try { await exportBackup(); message('#load-error'); }
  catch (error) { message('#load-error', error.message); }
});
$('#restore-backup').addEventListener('click', () => $('#backup-file').click());
$('#backup-file').addEventListener('change', async event => {
  const file = event.target.files[0];
  if (!file) return;
  if (!confirm('Replace the journal in this browser with this backup? Export your current journal first.')) { event.target.value = ''; return; }
  try { await restoreBackup(file); await load(); }
  catch (error) { message('#load-error', error.message); }
  event.target.value = '';
});
window.addEventListener('focus', () => { if (!busy && !$('#entry-dialog').open && !$('#settings-dialog').open) void load(); });
void load();

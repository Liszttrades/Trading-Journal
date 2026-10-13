import {attachAutoConversion,pesoRate,refreshPesoRate} from './exchange-rates.js?v=soft-light-badges-20261014';
import {ruleRoutine,checklistForTrade} from './discipline.js?v=soft-light-badges-20261014';
import {startWorkspaceMotion} from './motion.js?v=soft-light-badges-20261014';
import {fieldIcon,enhanceEntryMenus,enhanceSettingsMenus} from './entry-menus.js?v=soft-light-badges-20261014';
import {guidanceState} from './guidance.js?v=soft-light-badges-20261014';
import {syncFilterMenus,applyDatePreset} from './filters.js?v=soft-light-badges-20261014';
import { createWorkbench } from './workbench.js?v=soft-light-badges-20261014';
import { equity, filterEntries, tradeWarnings } from './insights.js?v=soft-light-badges-20261014';
import { createRoadmap } from './roadmap.js?v=soft-light-badges-20261014';
import { createChartEditor } from './chart-editor.js?v=soft-light-badges-20261014';
import { defaultRules, ruleFlags, dailyProgress } from './rules.js?v=soft-light-badges-20261014';
import { backend } from './cloud.js?v=soft-light-badges-20261014';
import { resetCloudState, cloudChanged } from './storage.js?v=soft-light-badges-20261014';
import { monthSummary } from './calendar.js?v=soft-light-badges-20261014';
import { api, imageURL, exportBackup, restoreBackup } from './storage.js?v=soft-light-badges-20261014';
import { fresh, nextScalp, journalNow, net, risk } from './model.js?v=soft-light-badges-20261014';

// UI state only. The authenticated cloud database is the source of truth.
const $ = selector => document.querySelector(selector);
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
let database = { settings: { pairs: [], currency: 'USD', timezone: 'Asia/Manila' }, entries: [] };
let view = 'live';
let galleryKind = 'all';
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
  document.body.dataset.syncing='true';
  try {
    database = await api('/api/journal');
    message('#load-error');
    await refreshPesoRate(database.settings);
    render();
    $('#sync-status').textContent = `Synced ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } catch (error) {
    $('#sync-status').textContent = 'Sync failed';
    message('#load-error', `${error.message} Check your connection and use Sync now. No empty journal has been saved over your cloud data.`);
  } finally { document.body.dataset.syncing='false'; }
}

function money(value) {
  const currency = database.settings.currency;
  const original = new Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: 2 }).format(value);
  const rate = pesoRate(database.settings)?.rate ?? database.settings.phpRates?.[currency];
  return currency !== 'PHP' && Number.isFinite(rate) && rate > 0
    ? `${original} · ${new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 2 }).format(value * rate)}`
    : original;
}

function options(items, selected = '', blank = false) {
  return `${blank ? '<option value="">Select</option>' : ''}${[...new Set([...items, ...(selected ? [selected] : [])])].map(item => `<option value="${escape(item)}" ${item === selected ? 'selected' : ''}>${escape(item)}</option>`).join('')}`;
}

function render() {
  document.body.classList.toggle('gallery-view', view === 'gallery');
  $('#pair-chips').hidden = view !== 'gallery';
  $('#pair-filter').hidden = true;
  const isTools = view === 'tools';
  $('#setup-guide').hidden=view!=='live';
  $('#review-queue').hidden=view!=='live';
  $('#save-followup').hidden=view!=='live'||!lastSavedId;
  $('#analytics-scope').hidden=!['live','backtest'].includes(view);
  if(view==='live')renderGuidance();
  $('#tools-panel').hidden = !isTools;
  $('#journal-filters').hidden = isTools || view === 'rules';
  $('#daily-status').hidden = view !== 'live';
  $('#advanced-analysis').hidden = !['live','backtest'].includes(view);
  $('#performance-breakdowns').hidden = !['live','backtest'].includes(view);
  $('#batch-open').hidden = isTools || view === 'rules';
  if (view === 'live') workbench.daily();
  if (isTools) {
    $('#heading').textContent = $('#breadcrumb').textContent = 'Account & risk';
    $('#subtitle').textContent = 'Set your balance, plan your risk, and calculate your trade size.';
    document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
    document.querySelector('.records').hidden = true; $('#new-entry').hidden = true; $('#rules-panel').hidden = true; $('#performance').hidden = true; $('#pnl-calendar').hidden = true;
    workbench.tools(); return;
  }
  $('#rules-panel').hidden = view !== 'rules';
  document.querySelector('.records').hidden = view === 'rules';
  $('#new-entry').hidden = view === 'rules';
  $('#performance').hidden = view === 'rules' || view === 'gallery';
  $('#pnl-calendar').hidden = view === 'rules' || view === 'gallery';
  if (view === 'rules') {
    $('#heading').textContent = $('#breadcrumb').textContent = 'Rules & targets';
    $('#subtitle').textContent = 'Write your own trading plan and daily limits.';
    document.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === view));
    renderRules();
    return;
  }
  const title = view === 'backtest' ? 'Backtesting lab' : view === 'gallery' ? 'Chart Library' : 'Trading journal';
  $('#heading').innerHTML = view === 'live' ? 'Every trade. <span class="heading-accent">One journal.</span>' : escape(title);
  $('#breadcrumb').textContent = title;
  $('#subtitle').textContent = view === 'backtest' ? 'BACKTEST WORKSPACE' : view === 'gallery' ? 'CHART ARCHIVE' : ['LIVE JOURNAL', database.settings.account?.broker === 'Other' ? database.settings.account?.brokerCustom : database.settings.account?.broker, database.settings.account?.platform].filter(Boolean).join(' · ');
  $('#new-entry').textContent = view === 'backtest' ? '+ New backtest' : '+ New trade';
  document.querySelectorAll('[data-view]').forEach(button => button.classList.toggle('active', button.dataset.view === view));
  const currentPair = $('#pair-filter').value || 'All pairs';
  $('#pair-filter').innerHTML = options(['All pairs', ...database.settings.pairs, ...database.entries.map(entry => entry.pair)], currentPair);
  for (const [selector,key,label] of [['#filter-setup','setup','All setups'],['#filter-session','session','All sessions']]) {
    const control=$(selector),selectedValue=control.value;
    const choices=[...new Set(database.entries.map(e=>e[key]).filter(Boolean))];
    control.innerHTML=`<option value="">${label}</option>`+options(choices,selectedValue);
    control.value=selectedValue;
  }
  applyDatePreset(database.settings.timezone);
  syncFilterMenus();
  const pairPicker=document.querySelector('.pair-picker');if(pairPicker)pairPicker.hidden=view==='gallery';
  const activeFilters=['#trade-search','#filter-setup','#filter-session'].filter(id=>$(id).value.trim()).length + ($('#filter-range').value!=='all'?1:0) + ($('#filter-outcome').value!=='all'?1:0) + (currentPair!=='All pairs'?1:0) + (view==='gallery'&&galleryKind!=='all'?1:0);
  $('#filter-state').textContent=activeFilters?`${activeFilters} active filter${activeFilters===1?'':'s'}`:'All trades';
  $('#filter-state').classList.toggle('has-filters',Boolean(activeFilters));
  const selected = filterEntries(database.entries,{kind:view==='gallery'?galleryKind:view,pair:currentPair,search:$('#trade-search').value,from:$('#filter-from').value,to:$('#filter-to').value,setup:$('#filter-setup').value,session:$('#filter-session').value,outcome:$('#filter-outcome').value});
  if (view !== 'gallery') workbench.analytics(selected);
  $('#analytics-scope').textContent=[view==='backtest'?'Backtests':'Live trades',$('#filter-range').selectedOptions[0].textContent,currentPair,$('#filter-setup').value||'All setups',$('#filter-session').value||'All sessions',$('#filter-outcome').selectedOptions[0].textContent,`${selected.length} matching entries`,$('#trade-search').value?`Search: ${$('#trade-search').value}`:''].filter(Boolean).join(' · ');
  $('#performance').hidden = view === 'gallery';
  $('#pnl-calendar').hidden = view === 'gallery';
  if (view !== 'gallery') renderCalendar(selected);
  $('#records-title').textContent = `${view === 'gallery' ? 'Screenshots' : 'Entries'} (${selected.length})`;
  const conversion=pesoRate(database.settings);
  $('#footnote').textContent = `${database.settings.currency} results. ${conversion?`PHP conversion: 1 ${database.settings.currency} = ${conversion.rate} PHP · ${conversion.date} · Frankfurter daily reference. `:database.settings.currency==='PHP'?'':database.settings.phpRates?.[database.settings.currency]?'PHP conversion uses your saved manual fallback rate. ':'PHP conversion unavailable. '} Times use ${database.settings.timezone}. Private cloud journal.`;
  if (view === 'gallery') {
    const pairs = [...new Set([...database.settings.pairs, ...database.entries.map(entry => entry.pair)])];
    $('#pair-chips').innerHTML = `<div class="gallery-kind-filter" role="group" aria-label="Chart entry type">${[['all','All charts'],['live','Live only'],['backtest','Backtest only']].map(([kind,label])=>`<button type="button" data-gallery-kind="${kind}" aria-pressed="${galleryKind===kind}" class="pair-chip ${galleryKind===kind?'selected':''}">${fieldIcon('kind',kind)}${label}</button>`).join('')}</div>` + ['All pairs', ...pairs].map(pair => `<button type="button" data-pair-filter="${escape(pair)}" class="pair-chip ${pair === currentPair ? 'selected' : ''}" aria-pressed="${pair === currentPair}">${fieldIcon('pair',pair==='All pairs'?'':pair)}${escape(pair === 'All pairs' ? 'All' : pair)}</button>`).join('');
    const cards = selected.flatMap(entry => entry.images.map(image => {
      const pnl = net(entry);
      return `<article class="chart-card"><button type="button" class="chart-art" data-image="${escape(image.id)}" data-image-name="${escape(image.name)}" aria-label="View ${escape(entry.pair + ' ' + image.name)}"><img loading="lazy" src="${imageURL(image.id, database)}" alt="${escape(entry.pair + ' ' + image.name)}"><span class="chart-kind">${fieldIcon('kind',entry.kind)}${entry.kind === 'backtest' ? 'Backtest' : 'Live'}</span></button><div class="chart-copy"><div class="chart-title"><strong class="icon-label">${fieldIcon('pair',entry.pair)}${escape(entry.pair)}</strong><span class="${pnl < 0 ? 'negative' : pnl > 0 ? 'positive' : ''}">${pnl === null ? 'Open' : escape(money(pnl))}</span></div><p>${escape(entry.setup || 'No setup')} · ${escape(entry.entryTime.replace('T', ' '))}</p><p class="chart-note">${escape(entry.notes || image.name)}</p><div class="chart-tags"><span>${fieldIcon('direction',entry.direction)}${escape(entry.direction)}</span><span>${fieldIcon('session',entry.session)}${escape(entry.session || 'No session')}</span><button type="button" data-entry="${escape(entry.id)}">Review trade ↗</button></div></div></article>`;
    }));
    $('#records-title').textContent = `Screenshots (${cards.length})`;
    $('#entries').innerHTML = `<div class="gallery">${cards.join('') || '<div class="empty"><h3>No charts for this selection</h3><p>Select another pair or attach screenshots to a trade or backtest.</p><button class="secondary" data-new-entry>Add a trade with charts</button></div>'}</div>`;
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
  const flags = ruleFlags(database.entries, database.settings.tradingRules?.planVersion === 1 ? database.settings.tradingRules.maxEntries : null);
  const rows = selected.map(entry => {
    const pnl = net(entry);
    const r = risk(entry);
    const result = pnl === null ? '<span class="tag">Open</span>' : escape(money(pnl));
    return `<tr><td><button class="trade-link" data-entry="${entry.id}"><span class="icon-label">${fieldIcon('pair',entry.pair)}${escape(entry.pair)}</span><small>${escape(entry.setup || 'No setup')}</small>${flags.get(entry.id)?.overLimit ? '<small class="negative">FOMO · Rule breaker (daily limit)</small>' : ''}</button></td><td><span class="tag ${entry.direction.toLowerCase()}">${fieldIcon('direction',entry.direction)}${entry.direction}</span></td><td>${escape(entry.entryTime.replace('T', ' '))}<small class="subtext">${escape(entry.session || database.settings.timezone)}</small></td><td class="${pnl < 0 ? 'negative' : pnl > 0 ? 'positive' : ''}">${result}<small class="subtext">${entry.status}</small></td><td>${pnl !== null && r > 0 ? `${(pnl / r).toFixed(2)}R` : '—'}</td><td>${entry.images.length ? `${entry.images.length} attached` : '—'}</td><td><button class="secondary compact" data-entry="${entry.id}">Open</button></td></tr>`;
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
  $('#pnl-calendar').innerHTML = `<div class="calendar-heading"><div><h2>P&L calendar</h2><p>Closed ${view === 'backtest' ? 'backtests' : 'trades'} · closing date · ${escape(database.settings.timezone)}</p></div><div class="calendar-nav"><button class="secondary" data-month-step="-1" aria-label="Previous month">‹</button><strong aria-live="polite">${title}</strong><button class="secondary" data-month-step="1" aria-label="Next month">›</button><button class="secondary" data-calendar-today>This month</button></div></div><div class="calendar-total"><span>Monthly net P&L <strong class="${color(summary.pnl)}">${escape(signed(summary.pnl))}</strong></span><span>${summary.count} closed trades</span></div><div class="calendar-scroll"><div class="calendar-grid">${weekdays.map(day => `<div class="weekday">${day}</div>`).join('')}${cells}</div></div>`;
}

function renderCurve(entries) {
  if (!entries.length) {
    $('#curve').innerHTML = '<div class="chart-empty"><span>Your performance starts with your first closed entry.</span><small>Open positions stay out of realized results.</small></div>';
    return;
  }
  let running = 0;
  const chronological=entries.slice().sort((a,b)=>a.exitTime.localeCompare(b.exitTime));
  const values = [0, ...chronological.map(entry => running += net(entry))];
  const minimum = Math.min(...values, 0), maximum = Math.max(...values, 0);
  const spread = maximum - minimum || 1;
  const width = Math.max(280, $('#curve').clientWidth || 800), height = 260;
  const format = value => new Intl.NumberFormat('en', {style:'currency',currency:database.settings.currency,maximumFractionDigits:2}).format(value);
  const labels = [minimum,minimum+spread/3,minimum+spread*2/3,maximum];
  const gutter = Math.min(width*.38, Math.max(85,...labels.map(v=>format(v).length*7+18)));
  const left=4,right=width-gutter,top=14,bottom=230;
  const x = index => left + index / Math.max(1, values.length - 1) * (right-left);
  const y = value => bottom - (value-minimum)/spread*(bottom-top);
  const line = values.map((value,index)=>`${index?'L':'M'} ${x(index)} ${y(value)}`).join(' ');
  const area = `${line} L${right} ${bottom} L${left} ${bottom} Z`;
  const grids = labels.map(value=>`<line x1="${left}" x2="${right}" y1="${y(value)}" y2="${y(value)}" class="chart-grid"/><text x="${right+12}" y="${y(value)+4}" text-anchor="start">${escape(format(value))}</text>`).join('');
  const points=values.map((value,i)=>`<g class="curve-hit" tabindex="0" role="img" aria-label="${escape(i?`${chronological[i-1].pair} · ${chronological[i-1].exitTime.replace('T',' ')} · Cumulative ${format(value)}`:`Start · ${format(value)}`)}"><title>${escape(i?`${chronological[i-1].pair} · ${chronological[i-1].exitTime.replace('T',' ')} · Trade ${format(net(chronological[i-1]))} · Cumulative ${format(value)}`:`Start · ${format(value)}`)}</title><circle class="curve-hit-area" cx="${x(i)}" cy="${y(value)}" r="12"/><circle class="curve-point" cx="${x(i)}" cy="${y(value)}" r="4"/></g>`).join('');
  $('#curve').innerHTML = `<svg class="local-chart area-pnl-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Cumulative realized profit and loss across ${entries.length} closed entries"><defs><linearGradient id="pnl-theme-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".12"/><stop offset="1" stop-color="var(--accent)" stop-opacity=".025"/></linearGradient></defs>${grids}<path d="${area}" fill="url(#pnl-theme-fill)"/><path d="${line}" class="chart-line"/><text x="${left}" y="254">Start</text><text x="${right}" y="254" text-anchor="end">${entries.length} closed entries</text>${points}</svg>`;

}

function select(label, name, items, value, blank = false) {
  return `<label>${label}<select name="${name}">${options(items, value, blank)}</select></label>`;
}

function number(label, name, value, min = '') {
  return `<label>${label}<input type="number" step="any" name="${name}" value="${value ?? ''}" ${min !== '' ? `min="${min}"` : ''}></label>`;
}

function openEntry(entry = null, draft = null) {
  editing = entry;
  files = [];
  removedImages = [];
  deleting = false;
  const trade = entry || draft || fresh(view === 'backtest' ? 'backtest' : 'live', database.settings.pairs[0], database.settings.timezone);
  const settings = database.settings;
  if (!entry) trade.equitySnapshot = trade.equitySnapshot ?? equity(database);
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
    number(`Initial risk (${settings.currency})`, 'risk', trade.risk, 0),
    number(`Equity when entering (${settings.currency})`, 'equitySnapshot', trade.equitySnapshot, 0),
    number('Lot size', 'quantity', trade.quantity, 0.000001)
  ].join('');
  $('#time-zone-note').textContent = `Times use ${settings.timezone}. New entries start with matching entry and exit times; adjust them for the actual trade. Open trades do not count toward realized P&L.`;
  $('#price-fields').innerHTML = [number('Entry price', 'entry', trade.entry, 0), number('Exit price', 'exit', trade.exit, 0), number('Initial stop', 'stop', trade.stop, 0), number('Contract units per lot', 'multiplier', trade.multiplier, 0), number(`Total fees (${settings.currency})`, 'fees', trade.fees, 0), number(`Journal currency per 1 price-currency unit`, 'fxRate', trade.fxRate ?? 1, 0)].join('');
  $('#review-fields').innerHTML = select('Mood', 'mood', settings.moods, trade.mood, true) + select('Followed your rules?', 'rules', ['Yes', 'No'], trade.rules, true);
  $('#entry-form').elements.reviewed.checked=trade.reviewed===true;
  $('#entry-form').elements.mistakes.value = (trade.mistakes || []).join('; ');
  $('#mistake-options').innerHTML = (settings.mistakeTags || []).map(t=>`<option value="${escape(t)}"></option>`).join('');
  $('#trade-warnings').hidden=true;
  $('#entry-form').elements.notes.value = trade.notes;
  $('#entry-form').elements.lesson.value = trade.lesson;
  $('#upload').value = '';
  $('#save-next').hidden = Boolean(entry);
  $('#delete-entry').hidden = !entry;
  $('#delete-entry').textContent = 'Delete entry';
  message('#form-error');
  renderAttachments();
  renderTradeChecklist(trade);
  updateTradeWarnings();
  enhanceEntryMenus();
  if(!entry&&!draft)attachAutoConversion($('#entry-form'),settings.currency,settings.autoFx!==false);
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
  $('#save-next').disabled = value;
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
  const addAnother = event.submitter?.id === 'save-next' && !editing;
  setBusy(true);
  message('#form-error');
  const form = new FormData(event.currentTarget);
  const trade = {};
  for (const key of ['kind', 'pair', 'direction', 'status', 'entryTime', 'exitTime', 'setup', 'session', 'mood', 'rules', 'notes', 'lesson']) trade[key] = String(form.get(key) || '');
  for (const key of ['entry', 'exit', 'stop', 'quantity', 'multiplier', 'fees', 'pnl', 'risk', 'fxRate', 'equitySnapshot']) trade[key] = form.get(key) === '' ? null : Number(form.get(key));
  trade.planChecks=[...document.querySelectorAll('#trade-rule-checklist [data-plan-check]')].map(input=>({label:input.dataset.planCheck,checked:input.checked}));
  trade.ruleException=String(form.get('ruleException')||'');
  trade.reviewed=form.get('reviewed')==='on';
  trade.leverage=editing?.leverage ?? null;
  trade.mistakes=String(form.get('mistakes')||'').split(';').map(t=>t.trim()).filter(Boolean);
  try {
    const images = await Promise.all(files.map(fileData));
    const saved=await api('/api/entries', { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trade, id: editing?.id, images, removeImages: removedImages }) });
    lastSavedId=saved.id;
    $('#entry-dialog').close();
    await load();
    if (addAnother) {
      openEntry(null, nextScalp(trade));
      $('#entry-title').textContent = 'Saved · Next scalp';
      $('#entry-form').elements.entryTime.focus();
    }
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
  $('#settings-fields').innerHTML = ['pairs', 'setups', 'sessions', 'moods', 'mistakeTags'].map(key => `<label>${key[0].toUpperCase() + key.slice(1)}<textarea name="${key}" rows="5">${escape((settings[key] || []).join('\n'))}</textarea></label>`).join('') + select('Result currency', 'currency', ['USD', 'PHP', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD'], settings.currency) + select('Journal time zone', 'timezone', ['Asia/Manila', 'UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo'], settings.timezone) + `<label class="fx-mode"><input type="checkbox" name="autoFx" ${settings.autoFx!==false?'checked':''}> Automatically use daily conversion rates</label><label>Manual fallback: PHP per 1 unit of result currency<input type="number" step="any" min="0.000001" name="phpRate" value="${settings.phpRates?.[settings.currency] ?? ''}" placeholder="Enter your exchange rate"></label><p class="helper">Automatic mode uses Frankfurter daily fiat reference rates. A saved manual rate is used if the service is unavailable. Historical trade amounts and conversion snapshots stay unchanged.</p>`;
  $('#settings-form').elements.currency.addEventListener('change', event => {
    $('#settings-form').elements.phpRate.value = settings.phpRates?.[event.target.value] ?? '';
  });
  message('#settings-error');
  enhanceSettingsMenus();
  $('#settings-dialog').showModal();
});

$('#settings-form').addEventListener('submit', async event => {
  event.preventDefault();
  const button = event.currentTarget.querySelector('button[type="submit"]');
  button.disabled = true;
  const form = new FormData(event.currentTarget);
  const settings = { ...database.settings, onboarding:{pairsReviewed:true} };
  ['pairs', 'setups', 'sessions', 'moods', 'mistakeTags'].forEach(key => settings[key] = String(form.get(key)).split('\n').map(x => x.trim()).filter(Boolean));
  settings.autoFx = form.get('autoFx')==='on';
  settings.currency = form.get('currency');
  settings.phpRates = { ...database.settings.phpRates };
  if (form.get('phpRate') === '') delete settings.phpRates[settings.currency];
  else settings.phpRates[settings.currency] = Number(form.get('phpRate'));
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
  if (button.hasAttribute('data-pair-filter')) { $('#pair-filter').value = button.dataset.pairFilter; render(); }
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
    const image = database.entries.flatMap(entry => entry.images).find(image => image.id === button.dataset.image);
    if (image) {
      const entry = database.entries.find(e => e.images.some(i => i.id === image.id));
      activeReview = { ...image, reviewName: `${entry.pair} · ${journalNow(database.settings.timezone).slice(0,10)}` };
      document.querySelector('#image-title').textContent = activeReview.reviewName;
      if (!$('#image-dialog').open) $('#image-dialog').showModal();
      showReviewMode('flow');
    }
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
let currentUser = null;
let lastSavedId=null;
let syncInProgress = false;
async function syncIfIdle(force = false) {
  if (!currentUser || busy || syncInProgress || document.hidden || document.querySelector('dialog[open]')) return;
  syncInProgress = true;
  try { if (force || await cloudChanged()) await load(); } catch (error) { $('#sync-status').textContent = 'Sync failed'; message('#load-error', error.message); } finally { syncInProgress = false; }
}
$('#sync-now').addEventListener('click', () => syncIfIdle(true));
window.addEventListener('focus', () => syncIfIdle());
setInterval(() => syncIfIdle(), 30000);

function showSession(session) {
  const next = session?.user || null;
  if (next?.id !== currentUser?.id) {
    resetCloudState();
    lastSavedId=null;
    database = { settings: { pairs: [], currency: 'USD', timezone: 'Asia/Manila' }, entries: [] };
    document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
    $('#entries').replaceChildren(); $('#pnl-calendar').replaceChildren(); $('#metrics').replaceChildren(); $('#curve').replaceChildren();
    editing = null; files = []; removedImages = [];
  }
  currentUser = next;
  $('#auth-screen').hidden = Boolean(next);
  $('#journal-workspace').hidden = !next;
  $('#account-email').textContent = next?.email || '';
  if (next) void syncIfIdle();
}
async function authAction(action) {
  const controls = document.querySelectorAll('#auth-screen button');
  controls.forEach(button => button.disabled = true);
  $('#auth-message').textContent = '';
  try {
    const email = $('#auth-email').value.trim(), password = $('#auth-password').value;
    const client = backend();
    if (action !== 'reset' && (!email || password.length < 8)) throw Error('Enter your email and a password of at least 8 characters.');
    if (action === 'login') {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      $('#auth-password').value = ''; showSession(data.session);
    } else if (action === 'signup') {
      const { data, error } = await client.auth.signUp({ email, password, options: { emailRedirectTo: location.origin + location.pathname } });
      if (error) throw error;
      $('#auth-password').value = '';
      $('#auth-message').textContent = 'Check your email to confirm your account, then sign in. If email delivery is not configured, ask the project owner to create your account.';
      if (data.session) showSession(data.session);
    } else {
      if (!email) throw Error('Enter your email first.');
      const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
      if (error) throw error;
      $('#auth-message').textContent = 'If an account exists, check your email for a reset link.';
    }
  } catch (error) { $('#auth-message').textContent = error.message; }
  finally { controls.forEach(button => button.disabled = false); }
}
$('#auth-form').addEventListener('submit', event => { event.preventDefault(); void authAction('login'); });
$('#signup').addEventListener('click', () => authAction('signup'));
$('#reset-password').addEventListener('click', () => authAction('reset'));
$('#sign-out').addEventListener('click', async () => {
  if (busy) return;
  const { error } = await backend().auth.signOut({ scope: 'local' });
  if (error) { message('#load-error', error.message); return; }
  showSession(null);
});
$('#password-form').addEventListener('submit', async event => {
  event.preventDefault();
  const button = event.currentTarget.querySelector('button'); button.disabled = true;
  try {
    const { error } = await backend().auth.updateUser({ password: $('#new-password').value });
    if (error) throw error;
    $('#new-password').value = ''; $('#password-dialog').close();
  } catch (error) { $('#password-message').textContent = error.message; }
  finally { button.disabled = false; }
});
try {
  const client = backend();
  client.auth.onAuthStateChange((event, session) => {
    // Schedule outside the SDK callback to avoid auth lock deadlocks.
    setTimeout(() => { showSession(session); if (event === 'PASSWORD_RECOVERY') $('#password-dialog').showModal(); }, 0);
  });
  client.auth.getSession().then(({ data, error }) => { if (error) $('#auth-message').textContent = error.message; else showSession(data.session); });
} catch (error) { $('#auth-message').textContent = error.message; }


function renderRules() {
  const rules = { ...defaultRules, ...database.settings.tradingRules };
  const limit = rules.planVersion === 1 ? rules.maxEntries : null;
  const field = (label, name, value, min, max = '') => `<label>${label}<input name="${name}" type="number" min="${min}" ${max ? `max="${max}"` : ''} step="any" value="${value ?? ''}" placeholder="Not set"></label>`;
  $('#rules-panel').innerHTML = ruleCockpit()+`<form id="rules-form" class="plan-editor"><div class="plan-header"><div><span class="plan-kicker">MY PLAYBOOK</span><h2>Trading plan</h2></div><button class="primary" type="submit">Save plan</button></div><div class="plan-columns"><section class="plan-card"><span class="plan-kicker">01 · STRATEGY</span><h3>My rules & notes</h3><textarea name="notes" rows="7" maxlength="20000" placeholder="Setup / entry checklist / exit plan / reminders">${escape(rules.notes)}</textarea><label class="plan-checklist-editor">Entry checklist · one check per line<textarea name="checklist" rows="4" placeholder="Write your own checks, e.g. Setup confirmed / Stop planned">${escape((rules.checklist||[]).join('\n'))}</textarea></label></section><section class="plan-card"><span class="plan-kicker">02 · DAILY PLAN</span><h3>Targets & limits</h3><div class="form-grid">${field(`Daily target (${escape(database.settings.currency)})`,'dailyMoney',rules.dailyMoney,0.01)}<label>Maximum entries per day<input name="maxEntries" type="number" min="1" max="1000" step="1" value="${limit ?? ''}" placeholder="Not set"></label>${field(`Daily loss limit (${escape(database.settings.currency)})`,'dailyLoss',rules.dailyLoss,0.01)}</div><p class="helper">Blank means no limit. Applies to all live pairs.</p></section></div><section class="plan-card risk-plan"><span class="plan-kicker">03 · RISK MANAGEMENT</span><h3>Lot size & trade risk</h3><div class="form-grid">${field('Maximum lot size','maxLotSize',rules.maxLotSize,0.000001)}${field('Maximum risk per trade (% of equity)','riskPercent',rules.riskPercent,0.01,100)}${field(`Maximum risk per trade (${escape(database.settings.currency)})`,'riskMoney',rules.riskMoney,0.01)}</div><p class="helper">Limits trigger journal warnings; they do not block broker orders.</p></section><p id="rules-message" role="status"></p></form>`;

}
document.addEventListener('submit', async event => {
  if (event.target.id !== 'rules-form') return;
  event.preventDefault();
  const button = event.target.querySelector('button[type="submit"]');
  button.disabled = true;
  const data = new FormData(event.target);
  const tradingRules = { checklist:String(data.get('checklist')||'').split('\n').map(s=>s.trim()).filter(Boolean), notes: String(data.get('notes')), planVersion: 1, maxEntries: data.get('maxEntries') === '' ? null : Number(data.get('maxEntries')), dailyMoney: data.get('dailyMoney') === '' ? null : Number(data.get('dailyMoney')), dailyR: null, ...Object.fromEntries(['dailyLoss', 'maxLotSize', 'riskPercent', 'riskMoney'].map(key => [key, data.get(key) === '' ? null : Number(data.get(key))])) };
  try {
    await api('/api/settings', { method: 'PUT', body: JSON.stringify({ ...database.settings, tradingRules }) });
    await load();
    $('#rules-message').textContent = 'Rules saved to your cloud account.';
  } catch (error) { $('#rules-message').textContent = error.message; }
  finally { button.disabled = false; }
});

document.addEventListener('click', event => {
  const button = event.target.closest('[data-time-action]');
  if (!button || busy) return;
  const form = $('#entry-form');
  const now = journalNow(database.settings.timezone);
  if (button.dataset.timeAction === 'both') { form.elements.entryTime.value = now; form.elements.exitTime.value = now; }
  if (button.dataset.timeAction === 'exit') {
    form.elements.exitTime.value = now < form.elements.entryTime.value ? form.elements.entryTime.value : now;
  }
  if (button.dataset.timeAction === 'copy') form.elements.exitTime.value = form.elements.entryTime.value;
});

const chartEditor = createChartEditor(async (imageId, annotations) => {
  await api('/api/annotations', { method: 'PUT', body: JSON.stringify({ imageId, annotations }) });
  if (activeReview?.id === imageId) activeReview.annotations = structuredClone(annotations);
  await load();
});

let activeReview = null;
const roadmap = createRoadmap(async (imageId, value) => {
  await api('/api/roadmap', { method:'PUT', body:JSON.stringify({imageId,roadmap:value}) });
  activeReview.roadmap = value;
  await load();
});
function showReviewMode(mode) {
  $('#flow-review').hidden = mode !== 'flow';
  $('#chart-viewport').hidden = mode !== 'chart';
  document.querySelector('.chart-toolbar').hidden = mode !== 'chart';
  document.querySelector('.chart-review-footer').hidden = mode !== 'chart';
  $('#image-dialog').classList.toggle('flow-mode',mode==='flow');
  if(mode==='flow') roadmap.open(activeReview);
  else chartEditor.open({...activeReview,name:activeReview.reviewName});
}
$('#review-flow').addEventListener('click',()=>{if ($('#flow-review').hidden && chartEditor.canSwitch()) showReviewMode('flow');});
$('#review-chart').addEventListener('click',()=>{if(!$('#flow-review').hidden && roadmap.canSwitch())showReviewMode('chart');});

let curveWidth = 0;
new ResizeObserver(records => {
  const width = Math.round(records[0].contentRect.width);
  if (width > 0 && width !== curveWidth) { curveWidth = width; if (view === 'live' || view === 'backtest') render(); }
}).observe($('#curve'));

const workbench = createWorkbench({getDB:()=>database,api,reload:load,openTrade:draft=>openEntry(null,draft),getView:()=>view});
for (const selector of ['#filter-range','#filter-setup','#filter-session','#filter-outcome']) $(selector).addEventListener('change',render);
let searchTimer;
$('#trade-search').addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(render,180);});
$('#clear-filters').addEventListener('click',()=>{galleryKind='all';for(const s of ['#filter-from','#filter-to','#filter-setup','#filter-session','#trade-search']) $(s).value='';$('#filter-outcome').value='all';$('#filter-range').value='all';$('#pair-filter').value='All pairs';render();});
$('#entry-form').addEventListener('input',updateTradeWarnings);
$('#entry-form').addEventListener('change',updateTradeWarnings);
function updateTradeWarnings(){
  const form=new FormData($('#entry-form'));
  const trade={kind:form.get('kind'),entryTime:String(form.get('entryTime')||''),risk:form.get('risk')===''?null:Number(form.get('risk')),entry:form.get('entry')===''?null:Number(form.get('entry')),stop:form.get('stop')===''?null:Number(form.get('stop')),quantity:form.get('quantity')===''?null:Number(form.get('quantity')),multiplier:Number(form.get('multiplier')),fxRate:Number(form.get('fxRate')),fees:Number(form.get('fees')),equitySnapshot:form.get('equitySnapshot')===''?null:Number(form.get('equitySnapshot')),leverage:null};
  const warnings=tradeWarnings(database,trade,editing?.id);
  const checks=[...document.querySelectorAll('#trade-rule-checklist [data-plan-check]')];if(trade.kind==='live'&&checks.some(c=>!c.checked))warnings.push(`${checks.filter(c=>!c.checked).length} plan check(s) still unchecked. Complete them or record why you took this trade.`);
  updateChecklistProgress();
  if(database.settings.tradingRules?.riskPercent && !trade.equitySnapshot) warnings.push('Record equity to check your percentage risk limit.');
  $('#trade-warnings').hidden=!warnings.length;
  $('#trade-warnings').innerHTML=warnings.map(t=>`<p>${escape(t)}</p>`).join('');
}

function renderGuidance(){
 const state=guidanceState(database);
 $('#setup-guide').hidden=state.complete;
 $('#setup-guide').innerHTML=`<div class="guidance-heading"><div><span class="plan-kicker">GET STARTED</span><h2>Set up your trading routine</h2></div><span>${state.steps.filter(s=>s.done).length} / 4 ready</span></div><div class="setup-steps">${state.steps.map((s,i)=>`<button type="button" ${s.view?`data-view="${s.view}"`:s.action==='pairs'?'data-open-customize':'data-new-entry'} class="setup-step ${s.done?'done':''}"><b>${s.done?'✓':i+1}</b><span><strong>${escape(s.title)}</strong><small>${escape(s.detail)}</small></span></button>`).join('')}</div>`;
 const queue=state.queue;$('#review-queue').innerHTML=`<div class="guidance-heading"><div><span class="plan-kicker">REVIEW & IMPROVE</span><h2>Needs review <span class="queue-count">${queue.length}</span></h2><p>Add a lesson or mark your review complete.</p></div></div>${queue.slice(0,5).map(t=>`<button class="review-queue-row" type="button" data-entry="${escape(t.id)}"><span><strong>${escape(t.pair)}</strong><small>${escape(t.exitTime.replace('T',' '))} · ${escape(t.setup||'No setup recorded')}</small></span><span class="${net(t)<0?'negative':net(t)>0?'positive':''}">${escape(money(net(t)))}</span><span class="review-link">Review trade ↗</span></button>`).join('')||'<p class="helper">All closed live trades have a lesson or a completed review.</p>'}${queue.length>5?`<p class="helper">Showing the 5 most recent of ${queue.length} trades needing review.</p>`:''}`;
 const saved=database.entries.find(t=>t.id===lastSavedId);if(!saved){lastSavedId=null;$('#save-followup').hidden=true;}else $('#save-followup').innerHTML=`<span>✓ Trade saved · ${escape(saved.pair)}</span><div><button class="secondary" type="button" data-followup-scalp>Add another scalp</button><button class="secondary" type="button" data-entry="${escape(saved.id)}">Review this trade</button><button type="button" class="followup-dismiss" aria-label="Dismiss saved trade message">×</button></div>`;
}
document.addEventListener('click',e=>{if(e.target.closest('[data-open-customize]'))$('#customize').click();if(e.target.closest('[data-followup-scalp]')){const saved=database.entries.find(t=>t.id===lastSavedId);if(saved)openEntry(null,nextScalp(saved));}if(e.target.closest('.followup-dismiss')){lastSavedId=null;$('#save-followup').hidden=true;}});

startWorkspaceMotion();

function renderTradeChecklist(trade){
 const checks=checklistForTrade(database.settings.tradingRules||{},trade),panel=$('#trade-rule-checklist');panel.hidden=!checks.length&&!trade.ruleException;
 panel.innerHTML=`<div class="routine-card-heading"><div><span class="plan-kicker">BEFORE THIS ENTRY</span><h3>Check your plan</h3></div><span id="trade-check-progress" role="status"></span></div><div class="check-progress-track"><span id="trade-check-fill"></span></div>${checks.map(c=>`<label class="rule-check-row"><input type="checkbox" data-plan-check="${escape(c.label)}" ${c.checked?'checked':''}><span>${escape(c.label)}</span></label>`).join('')}<label class="exception-label">If you skipped a rule, explain why<textarea name="ruleException" maxlength="2000" rows="2" placeholder="What did you skip, and what will you change?">${escape(trade.ruleException||'')}</textarea></label><p class="helper">These checks are your record for this trade. They do not verify market conditions or block broker orders.</p>`;updateChecklistProgress();
}
function updateChecklistProgress(){const checks=[...document.querySelectorAll('#trade-rule-checklist [data-plan-check]')],done=checks.filter(c=>c.checked).length;if($('#trade-check-progress'))$('#trade-check-progress').textContent=`${done} / ${checks.length} checked`;if($('#trade-check-fill'))$('#trade-check-fill').style.width=checks.length?`${done/checks.length*100}%`:'0%';}
function ruleCockpit(){
 const day=journalNow(database.settings.timezone).slice(0,10),routine=ruleRoutine(database,day),s=routine.state;
 const bar=(v,max)=>max?Math.min(100,Math.max(0,v/max*100)):0;
 const tiles=[['Entries today',`${s.entries}${s.limit?' / '+s.limit:''}`,s.limit?`${s.remaining} remaining`:'Set an entry limit in your plan',bar(s.entries,s.limit)],['Daily target',money(s.pnl),s.target?`Target ${money(s.target)}`:'No profit target set',bar(s.pnl,s.target)],['Loss allowance',money(Math.max(0,-s.pnl)),s.lossLimit?`Limit ${money(s.lossLimit)}`:'No daily loss limit set',bar(-s.pnl,s.lossLimit)],['Reported rule adherence',routine.reported?`${Math.round(routine.followed/routine.reported*100)}%`:'—',`${routine.followed} Yes / ${routine.reported} reported · ${routine.unreported} unreported`,routine.reported?routine.followed/routine.reported*100:0]];
 return `<section class="rules-cockpit"><div class="routine-card-heading"><div><span class="plan-kicker">TODAY’S ROUTINE · ${escape(day)}</span><h2>Today’s progress</h2></div><span class="routine-status">${routine.warnings.length?'Pause & review':'Review your plan'}</span></div><div class="routine-metrics">${tiles.map(([title,value,detail,progress])=>`<div class="routine-tile"><span>${title}</span><strong class="${title==='Daily target'?(s.pnl<0?'negative':s.pnl>0?'positive':''):title==='Loss allowance'&&s.pnl<0?'positive':''}">${escape(value)}</strong><small>${escape(detail)}</small><div class="check-progress-track"><span style="width:${progress}%"></span></div></div>`).join('')}</div>${routine.warnings.length?`<div class="routine-alert">${routine.warnings.map(w=>`<span>${escape(w)}</span>`).join('')}</div>`:''}<div class="routine-flow"><span>Check your plan before every entry.</span><button class="secondary" type="button" data-routine-trade>New trade ↗</button></div><p class="helper">Based on logged trades and self-reported rule checks.</p></section>`;
}
document.addEventListener('click',e=>{if(e.target.closest('[data-routine-trade]')){document.querySelector('[data-view="live"]').click();openEntry();}});

// Refresh display-only daily conversions while the journal is open.
setInterval(async()=>{if(!currentUser||document.hidden)return;await refreshPesoRate(database.settings);if(!document.querySelector('dialog[open]')&&(view==='live'||view==='backtest'||view==='gallery'))render();},3600000);

document.addEventListener('click',event=>{const button=event.target.closest('[data-gallery-kind]');if(button){galleryKind=button.dataset.galleryKind;render();document.querySelector(`[data-gallery-kind="${galleryKind}"]`)?.focus();}});

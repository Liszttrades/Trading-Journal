import { defaultSettings } from './model.js';
import { validateTrade, validateSettings } from './validation.js';

// No network requests. Each browser profile owns its own IndexedDB journal.
const connection = new Promise((resolve, reject) => {
  const request = indexedDB.open('trade-notebook-pages-v1', 1);
  request.onupgradeneeded = () => request.result.createObjectStore('journal');
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(Error('Browser storage is unavailable.'));
  request.onblocked = () => reject(Error('Close other journal tabs and reload.'));
});

async function transaction(mutator) {
  const db = await connection;
  return new Promise((resolve, reject) => {
    const tx = db.transaction('journal', mutator ? 'readwrite' : 'readonly');
    const store = tx.objectStore('journal');
    const request = store.get('current');
    let result, failure;
    request.onsuccess = () => {
      try {
        result = request.result || { settings: structuredClone(defaultSettings), entries: [] };
        if (mutator) { result = mutator(result); store.put(result, 'current'); }
      } catch (error) { failure = error; tx.abort(); }
    };
    tx.oncomplete = () => resolve(result);
    tx.onabort = tx.onerror = () => reject(failure || Error('Could not save. Browser storage may be full or blocked. Export a backup before clearing any data.'));
  });
}

function screenshot(image) {
  if (!image || typeof image.name !== 'string' || typeof image.base64 !== 'string' || image.base64.length > 11200000) throw Error('Invalid or oversized screenshot.');
  let bytes;
  try { bytes = atob(image.base64); } catch { throw Error('Invalid screenshot encoding.'); }
  if (!bytes.length || bytes.length > 8 * 1024 * 1024) throw Error('Each screenshot must be 8 MB or smaller.');
  const mime = bytes.startsWith('\x89PNG\r\n\x1a\n') ? 'image/png' : bytes.startsWith('\xff\xd8\xff') ? 'image/jpeg' : bytes.startsWith('RIFF') && bytes.slice(8, 12) === 'WEBP' ? 'image/webp' : null;
  if (!mime) throw Error('Use PNG, JPG or WebP screenshots.');
  return { id: crypto.randomUUID(), name: image.name.slice(0, 180), mime, data: `data:${mime};base64,${image.base64}` };
}

export async function api(url, options = {}) {
  if (url === '/api/journal') return transaction();
  const input = JSON.parse(options.body);
  if (url === '/api/settings') {
    const settings = validateSettings(input);
    await transaction(db => ({ ...db, settings }));
    return { ok: true };
  }
  if (url !== '/api/entries') throw Error('Unknown operation.');
  if (options.method === 'DELETE') {
    await transaction(db => ({ ...db, entries: db.entries.filter(entry => entry.id !== input.id) }));
    return { ok: true };
  }
  const trade = validateTrade(input.trade);
  if (!Array.isArray(input.images) || input.images.length > 4) throw Error('Choose up to four screenshots.');
  const images = input.images.map(screenshot);
  await transaction(db => {
    const existing = db.entries.find(entry => entry.id === input.id);
    if (options.method === 'PUT' && !existing) throw Error('Entry no longer exists. Reload and try again.');
    const keep = existing?.images.filter(image => !(input.removeImages || []).includes(image.id)) || [];
    if (keep.length + images.length > 4) throw Error('Each entry can have four screenshots.');
    const entry = { ...trade, id: existing?.id || crypto.randomUUID(), created: existing?.created || new Date().toISOString(), updated: new Date().toISOString(), images: [...keep, ...images] };
    return { ...db, entries: existing ? db.entries.map(e => e.id === entry.id ? entry : e) : [entry, ...db.entries] };
  });
  // Best effort: browsers may still evict storage. Backups remain necessary.
  if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});
  return { ok: true };
}

export function imageURL(id, db) {
  return db.entries.flatMap(entry => entry.images).find(image => image.id === id)?.data || '';
}

export async function exportBackup() {
  const journal = await transaction();
  const blob = new Blob([JSON.stringify({ format: 'trade-notebook-pages', version: 1, journal }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = `trade-notebook-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click(); setTimeout(() => URL.revokeObjectURL(url), 30000);
}

export async function restoreBackup(file) {
  if (file.size > 200 * 1024 * 1024) throw Error('Backup is too large (200 MB maximum).');
  const input = JSON.parse(await file.text());
  if (input.format !== 'trade-notebook-pages' || input.version !== 1 || !Array.isArray(input.journal?.entries)) throw Error('Choose a backup exported by this GitHub Pages edition.');
  const settings = validateSettings(input.journal.settings);
  // Rebuild validated objects; never accept arbitrary image URLs or raw HTML.
  const entries = input.journal.entries.map(entry => {
    const trade = validateTrade(entry);
    if (!Array.isArray(entry.images) || entry.images.length > 4) throw Error('Invalid backup screenshots.');
    const images = entry.images.map(image => {
      if (typeof image.data !== 'string' || !/^data:image\/(png|jpeg|webp);base64,/.test(image.data)) throw Error('Invalid backup image.');
      return screenshot({ name: image.name, base64: image.data.split(',')[1] });
    });
    return { ...trade, id: crypto.randomUUID(), created: new Date().toISOString(), updated: new Date().toISOString(), images };
  });
  await transaction(() => ({ settings, entries }));
}

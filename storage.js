import {prepareBatch} from './insights.js?v=guided-workspace-20261012';
import { validateRoadmap } from './roadmap.js?v=guided-workspace-20261012';
import { validateAnnotations } from './annotations.js?v=guided-workspace-20261012';
import { defaultSettings } from './model.js?v=guided-workspace-20261012';
import { validateTrade, validateSettings } from './validation.js?v=guided-workspace-20261012';

import { backend, signedUser } from './cloud.js?v=guided-workspace-20261012';
let snapshot = null;
let revision = 0;
let owner = null;
let epoch = 0;
export function resetCloudState() { epoch++; snapshot = null; revision = 0; owner = null; }

async function transaction(mutator) {
  const user = await signedUser();
  if (owner && owner !== user.id) resetCloudState();
  owner = user.id;
  const started = epoch;
  if (!mutator) {
    const { data, error } = await backend().from('trade_journals').select('payload,revision').eq('owner_id', user.id).maybeSingle();
    if (started !== epoch) throw Error('Account changed during sync. Try again.');
    if (error) throw Error(error.message);
    revision = data?.revision || 0;
    snapshot = data?.payload || { settings: structuredClone(defaultSettings), entries: [] };
    return structuredClone(snapshot);
  }
  if (!snapshot) throw Error('Load the cloud journal before saving.');
  const next = mutator(structuredClone(snapshot));
  if (new TextEncoder().encode(JSON.stringify(next)).length > 60 * 1024 * 1024) throw Error('This journal reached the 60 MB limit. Export a backup and remove unused screenshots before adding more.');
  const { data, error } = await backend().rpc('save_trade_journal', { expected_revision: revision, journal: next });
  if (started !== epoch) throw Error('Account changed during save. Sign in again to review the saved result.');
  if (error) throw Error(error.message.includes('SYNC_CONFLICT') ? 'Another device changed this journal. Your form has not been saved. Copy your notes, close the form, and press Sync now before trying again.' : `Cloud save failed: ${error.message}. Keep your form open.`);
  revision = Number(data); snapshot = next;
  return structuredClone(next);
}

export async function cloudChanged() {
  const user = await signedUser();
  const { data, error } = await backend().from('trade_journals').select('revision').eq('owner_id', user.id).maybeSingle();
  if (error) throw Error(error.message);
  return owner !== user.id || snapshot === null || (data?.revision || 0) !== revision;
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
  if (url === '/api/roadmap') {
    const roadmap = validateRoadmap(input.roadmap);
    await transaction(db => {
      const image = db.entries.flatMap(e => e.images).find(i => i.id === input.imageId);
      if (!image) throw Error('Chart no longer exists. Sync and try again.');
      image.roadmap = roadmap; return db;
    });
    return { ok: true };
  }
  if (url === '/api/annotations') {
    const annotations = validateAnnotations(input.annotations);
    await transaction(db => {
      let found = false;
      for (const entry of db.entries) for (const image of entry.images) if (image.id === input.imageId) { image.annotations = annotations; found = true; }
      if (!found) throw Error('Chart no longer exists. Sync and try again.');
      return db;
    });
    return { ok: true };
  }
  if (url === '/api/settings') {
    const settings = validateSettings(input);
    await transaction(db => ({ ...db, settings }));
    return { ok: true };
  }
  if (url === '/api/batch') {
    if (!Array.isArray(input.trades) || !input.trades.length || input.trades.length > 500) throw Error('Add 1–500 trades per batch.');
    const incoming = input.trades.map((t,i)=>{try{return validateTrade(t);}catch(e){throw Error(`Trade ${i+1}: ${e.message}`);}});
    let result;
    await transaction(db=>{
      const prepared = prepareBatch(db.entries,incoming,input.skipDuplicates !== false);
      result = { added:prepared.accepted.length, skipped:prepared.skipped };
      const now = new Date().toISOString();
      db.entries = [...prepared.accepted.map(trade=>({...trade,id:crypto.randomUUID(),created:now,updated:now,images:[]})),...db.entries];
      for (const [key,field] of [['pairs','pair'],['setups','setup'],['sessions','session']]) db.settings[key] = [...new Set([...db.settings[key],...prepared.accepted.map(t=>t[field]).filter(Boolean)])].slice(0,80);
      db.settings = validateSettings(db.settings);
      return db;
    });
    return result;
  }
  if (url !== '/api/entries') throw Error('Unknown operation.');
  if (options.method === 'DELETE') {
    await transaction(db => ({ ...db, entries: db.entries.filter(entry => entry.id !== input.id) }));
    return { ok: true };
  }
  const trade = validateTrade(input.trade);
  if (!Array.isArray(input.images) || input.images.length > 4) throw Error('Choose up to four screenshots.');
  const images = input.images.map(screenshot);
  let savedId;
  await transaction(db => {
    const existing = db.entries.find(entry => entry.id === input.id);
    if (options.method === 'PUT' && !existing) throw Error('Entry no longer exists. Reload and try again.');
    const keep = existing?.images.filter(image => !(input.removeImages || []).includes(image.id)) || [];
    if (keep.length + images.length > 4) throw Error('Each entry can have four screenshots.');
    const entry = { ...trade, id: existing?.id || crypto.randomUUID(), created: existing?.created || new Date().toISOString(), updated: new Date().toISOString(), images: [...keep, ...images] };
    savedId=entry.id;
    return { ...db, entries: existing ? db.entries.map(e => e.id === entry.id ? entry : e) : [entry, ...db.entries] };
  });

  return { ok: true, id:savedId };
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
      return { ...screenshot({ name: image.name, base64: image.data.split(',')[1] }), roadmap: validateRoadmap(image.roadmap || {nodes:[]}), annotations: validateAnnotations(image.annotations || []) };
    });
    return { ...trade, id: crypto.randomUUID(), created: new Date().toISOString(), updated: new Date().toISOString(), images };
  });
  await transaction(() => ({ settings, entries }));
}

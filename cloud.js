import { SUPABASE_URL, SUPABASE_PUBLIC_KEY } from './config.js';
let client;
export function backend() {
  if (!SUPABASE_URL || !SUPABASE_PUBLIC_KEY) throw Error('Cloud setup is not connected yet. Follow SETUP.md to configure your Supabase project.');
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(SUPABASE_URL)) throw Error('Use your HTTPS Supabase project URL.');
  if (SUPABASE_PUBLIC_KEY.startsWith('sb_secret_')) throw Error('Use a publishable key, never a secret key.');
  if (SUPABASE_PUBLIC_KEY.startsWith('ey')) {
    try { if (JSON.parse(atob(SUPABASE_PUBLIC_KEY.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).role !== 'anon') throw Error(); }
    catch { throw Error('Use only the public publishable or legacy anon key.'); }
  }
  if (!window.supabase?.createClient) throw Error('Could not load the sign-in library. Check your internet connection and reload.');
  return client ||= window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);
}
export async function signedUser() {
  const { data, error } = await backend().auth.getUser();
  if (error || !data.user) throw Error('Please sign in again.');
  return data.user;
}

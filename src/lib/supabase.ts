import type { SupabaseClient } from '@supabase/supabase-js';

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** true bila kredensial Supabase tersedia → menu "Main Online" aktif. */
export const onlineTersedia = Boolean(URL && ANON);

let clientPromise: Promise<SupabaseClient | null> | null = null;

/**
 * Klien Supabase, dimuat MALAS (dynamic import) supaya bundle mode solo/offline
 * tetap ringan — `@supabase/supabase-js` baru ditarik saat mode online dipakai.
 */
export function getSupabase(): Promise<SupabaseClient | null> {
  if (!onlineTersedia) return Promise.resolve(null);
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js').then(({ createClient }) =>
      createClient(URL!, ANON!, { auth: { persistSession: true } }),
    );
  }
  return clientPromise;
}

let sesiPromise: Promise<string | null> | null = null;

/**
 * Pastikan ada sesi (anonymous sign-in). Kembalikan uid pemain, atau null bila
 * online tak dikonfigurasi / gagal. Aman dipanggil berkali-kali.
 */
export function sesiSiap(): Promise<string | null> {
  if (!onlineTersedia) return Promise.resolve(null);
  if (sesiPromise) return sesiPromise;
  sesiPromise = (async () => {
    const sb = await getSupabase();
    if (!sb) return null;
    const { data } = await sb.auth.getSession();
    if (data.session?.user) return data.session.user.id;
    const { data: baru, error } = await sb.auth.signInAnonymously();
    if (error || !baru.user) {
      console.error('[ChemUno] anonymous sign-in gagal', error);
      return null;
    }
    return baru.user.id;
  })();
  return sesiPromise;
}

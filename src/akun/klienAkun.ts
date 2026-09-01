import { getSupabase, sesiSiap } from '../lib/supabase';
import type { HasilAkun } from './tipe';

/**
 * Panggil Edge Function `akun` — semua operasi identitas murid (daftar / masuk /
 * pulihkan sesi / gabung kelas / sinkron progres) lewat sini. Server otoritatif:
 * PIN di-hash & session token dibuat di sisi server.
 */
export async function kirimAkun(
  tipe: string,
  payload: Record<string, unknown> = {},
): Promise<HasilAkun> {
  const sb = await getSupabase();
  if (!sb) return { error: 'mode online tidak dikonfigurasi' };
  await sesiSiap();
  const { data, error } = await sb.functions.invoke('akun', {
    body: { tipe, ...payload },
  });
  if (error) {
    let pesan = error.message;
    try {
      const isi = await (error as { context?: Response }).context?.json?.();
      if (isi?.error) pesan = isi.error;
    } catch {
      /* abaikan */
    }
    return { error: pesan };
  }
  return (data ?? {}) as HasilAkun;
}

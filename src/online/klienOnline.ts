import type { KartuKimia, SoalKuis } from '../game';
import { getSupabase, sesiSiap } from '../lib/supabase';
import type { StatePublik } from './tipe';

export interface HasilAksi {
  ok?: boolean;
  error?: string;
  stale?: boolean;
  tanpaUbah?: boolean;
  code?: string;
  versi?: number;
  /** State ter-redaksi + tangan pemanggil — dibalas langsung agar tak menunggu Realtime. */
  statePublik?: StatePublik;
  tanganku?: KartuKimia[];
  /** Soal kuis privat pemanggil (kalau ia sedang jadi target kuis). */
  soalPrivat?: SoalKuis | null;
  [k: string]: unknown;
}

/**
 * Panggil Edge Function `aksi`. Semua mutasi permainan online lewat sini —
 * server yang otoritatif, klien tinggal menerima update via Realtime.
 */
export async function kirimAksi(
  tipe: string,
  payload: Record<string, unknown> = {},
): Promise<HasilAksi> {
  const sb = await getSupabase();
  if (!sb) return { error: 'mode online tidak dikonfigurasi' };
  await sesiSiap();
  const { data, error } = await sb.functions.invoke('aksi', {
    body: { tipe, ...payload },
  });
  if (error) {
    // FunctionsHttpError menyimpan body di context
    let pesan = error.message;
    try {
      const isi = await (error as { context?: Response }).context?.json?.();
      if (isi?.error) pesan = isi.error;
    } catch {
      /* abaikan */
    }
    return { error: pesan };
  }
  return (data ?? {}) as HasilAksi;
}

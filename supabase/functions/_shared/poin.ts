// Terapkan poin Peringkat Golongan ke satu murid. Dipakai Edge Function `aksi`
// (online, server-otoritatif) dan `akun` (laporan sesi solo). Rumus poin/peringkat
// ada di `game/peringkat.ts` (satu sumber — SPEC bagian 10).
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { tambahPoin } from './game/peringkat.ts';

export type AkurasiDelta = Record<string, { benar: number; total: number }>;

/** id murid yang tertaut ke sesi anon `authUid` (null bila tak ada — mis. tamu/guru). */
export async function muridDariAuthUid(
  db: SupabaseClient,
  authUid: string,
): Promise<string | null> {
  const { data } = await db
    .from('murid')
    .select('id')
    .eq('auth_uid', authUid)
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

/**
 * Tambah `poin` ke poin minggu berjalan murid + gabung `akurasiDelta` ke
 * `riwayat_akurasi_per_golongan`. Peringkat aktif/rekor ikut ter-update lewat
 * `tambahPoin`. Aman dipanggil dengan poin 0 (cuma catat akurasi).
 * Mengembalikan ringkasan progres baru (atau null bila murid tak ditemukan).
 */
export async function beriPoinMurid(
  db: SupabaseClient,
  muridId: string,
  poin: number,
  akurasiDelta: AkurasiDelta = {},
) {
  const { data: pr } = await db
    .from('progres_murid')
    .select(
      'total_poin, peringkat_golongan_aktif, peringkat_golongan_rekor, riwayat_akurasi_per_golongan',
    )
    .eq('murid_id', muridId)
    .maybeSingle();
  if (!pr) return null;

  const k = tambahPoin(
    {
      totalPoin: Number(pr.total_poin) || 0,
      peringkatAktif: pr.peringkat_golongan_aktif ?? 1,
      peringkatRekor: pr.peringkat_golongan_rekor ?? 1,
    },
    Math.max(0, Math.floor(poin) || 0),
  );

  const riw: AkurasiDelta = { ...(pr.riwayat_akurasi_per_golongan ?? {}) };
  for (const [g, d] of Object.entries(akurasiDelta)) {
    if (g === 'umum') continue;
    const cur = riw[g] ?? { benar: 0, total: 0 };
    riw[g] = {
      benar: cur.benar + Math.max(0, d.benar | 0),
      total: cur.total + Math.max(0, d.total | 0),
    };
  }

  await db
    .from('progres_murid')
    .update({
      total_poin: k.totalPoin,
      peringkat_golongan_aktif: k.peringkatAktif,
      peringkat_golongan_rekor: k.peringkatRekor,
      riwayat_akurasi_per_golongan: riw,
    })
    .eq('murid_id', muridId);

  return {
    totalPoin: k.totalPoin,
    peringkatGolonganAktif: k.peringkatAktif,
    peringkatGolonganRekor: k.peringkatRekor,
  };
}

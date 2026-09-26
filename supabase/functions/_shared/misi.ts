// Evaluasi Challenge/Misi setelah sebuah sesi permainan (SPEC bagian 10).
// Dipakai Edge Function `akun` (solo) & `aksi` (online). Rumus kemajuan di
// `_shared/game/misi.ts` (satu sumber); pemilihan Misi Harian di
// `_shared/game/misiHarian.ts`.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { kemajuanMisi, type KonteksSesi, type Misi } from './game/misi.ts';
import {
  badgeHarianBaru,
  bonusLengkap,
  misiHarianUntuk,
  streakSetelahLengkap,
  tanggalWIB,
} from './game/misiHarian.ts';
import { beriPoinMurid } from './poin.ts';

export interface MisiSelesai {
  id: string;
  judul: string;
  poinReward: number;
  badgeReward: string | null;
  /** misi = misi jangka panjang; harian = misi harian; lengkap = bonus 3/3; lencana = lencana harian. */
  jenis?: 'misi' | 'harian' | 'lengkap' | 'lencana';
}

/**
 * Misi jangka panjang + Misi Harian. Masing-masing diisolasi: kegagalan satu
 * (mis. tabel harian belum dimigrasi) tak menggagalkan yang lain.
 */
export async function evaluasiMisi(
  db: SupabaseClient,
  muridId: string,
  sesi: KonteksSesi,
): Promise<MisiSelesai[]> {
  const hasil: MisiSelesai[] = [];
  try {
    hasil.push(...(await evaluasiMisiTetap(db, muridId, sesi)));
  } catch (e) {
    console.error('evaluasiMisiTetap', e);
  }
  try {
    hasil.push(...(await evaluasiMisiHarian(db, muridId, sesi)));
  } catch (e) {
    console.error('evaluasiMisiHarian', e);
  }
  return hasil;
}

async function evaluasiMisiTetap(
  db: SupabaseClient,
  muridId: string,
  sesi: KonteksSesi,
): Promise<MisiSelesai[]> {
  const [misiRes, progRes, pmRes] = await Promise.all([
    db.from('misi').select('*'),
    db
      .from('misi_progres_murid')
      .select('misi_id, progres, selesai')
      .eq('murid_id', muridId),
    db
      .from('progres_murid')
      .select('peringkat_golongan_rekor, badge_diraih')
      .eq('murid_id', muridId)
      .maybeSingle(),
  ]);
  const misiRows = misiRes.data as Record<string, unknown>[] | null;
  const pm = pmRes.data as
    | { peringkat_golongan_rekor: number; badge_diraih: string[] | null }
    | null;
  if (!misiRows || !pm) return [];

  const progMap = new Map<string, { progres: number; selesai: boolean }>();
  for (const r of (progRes.data ?? []) as {
    misi_id: string;
    progres: number;
    selesai: boolean;
  }[]) {
    progMap.set(r.misi_id, { progres: r.progres, selesai: r.selesai });
  }

  const badgeDiraih: string[] = pm.badge_diraih ?? [];
  const capaian = {
    peringkatRekor: pm.peringkat_golongan_rekor ?? 1,
    jumlahBadgeMaster: badgeDiraih.filter((b) => b.startsWith('master-')).length,
  };

  const selesaiBaru: MisiSelesai[] = [];
  const badgeTambah: string[] = [];
  let poinTambah = 0;
  const now = new Date().toISOString();

  for (const row of misiRows) {
    const misi: Misi = {
      id: String(row.id),
      judul: String(row.judul),
      deskripsi: String(row.deskripsi),
      tipe: row.tipe as Misi['tipe'],
      target: (row.target ?? {}) as Record<string, unknown>,
      poinReward: Number(row.poin_reward) || 0,
      badgeReward: (row.badge_reward as string | null) ?? null,
    };
    const cur = progMap.get(misi.id) ?? { progres: 0, selesai: false };
    if (cur.selesai) continue;

    const { progres, selesai } = kemajuanMisi(misi, cur.progres, sesi, capaian);
    if (progres === cur.progres && !selesai) continue;

    await db.from('misi_progres_murid').upsert({
      murid_id: muridId,
      misi_id: misi.id,
      progres,
      selesai,
      selesai_pada: selesai ? now : null,
    });

    if (selesai) {
      selesaiBaru.push({
        id: misi.id,
        judul: misi.judul,
        poinReward: misi.poinReward,
        badgeReward: misi.badgeReward,
        jenis: 'misi',
      });
      poinTambah += misi.poinReward;
      if (misi.badgeReward && !badgeDiraih.includes(misi.badgeReward)) {
        badgeTambah.push(misi.badgeReward);
      }
    }
  }

  if (poinTambah > 0) await beriPoinMurid(db, muridId, poinTambah);
  await tambahBadge(db, muridId, badgeTambah);

  return selesaiBaru;
}

async function tambahBadge(db: SupabaseClient, muridId: string, badge: string[]) {
  if (!badge.length) return;
  const { data: fresh } = await db
    .from('progres_murid')
    .select('badge_diraih')
    .eq('murid_id', muridId)
    .maybeSingle();
  const gabung = [...new Set([...(fresh?.badge_diraih ?? []), ...badge])];
  await db
    .from('progres_murid')
    .update({ badge_diraih: gabung })
    .eq('murid_id', muridId);
}

/**
 * Misi Harian (reset 00:00 WIB). Kemajuan disimpan per (murid, tanggal, misi);
 * saat ketiganya selesai pertama kali hari ini → Bonus Lengkap (naik sesuai
 * streak) + lencana streak bila memenuhi.
 */
async function evaluasiMisiHarian(
  db: SupabaseClient,
  muridId: string,
  sesi: KonteksSesi,
): Promise<MisiSelesai[]> {
  const tanggal = tanggalWIB();
  const daftar = misiHarianUntuk(tanggal);

  const [progRes, pmRes] = await Promise.all([
    db
      .from('misi_harian_progres')
      .select('misi_id, progres, selesai')
      .eq('murid_id', muridId)
      .eq('tanggal', tanggal),
    db
      .from('progres_murid')
      .select(
        'harian_streak, harian_streak_terbaik, harian_terakhir, harian_total, badge_diraih',
      )
      .eq('murid_id', muridId)
      .maybeSingle(),
  ]);
  if (progRes.error) throw progRes.error;
  if (pmRes.error) throw pmRes.error;
  const pm = pmRes.data as {
    harian_streak: number;
    harian_streak_terbaik: number;
    harian_terakhir: string | null;
    harian_total: number;
    badge_diraih: string[] | null;
  } | null;
  if (!pm) return [];

  const cur = new Map<string, { progres: number; selesai: boolean }>();
  for (const r of (progRes.data ?? []) as {
    misi_id: string;
    progres: number;
    selesai: boolean;
  }[]) {
    cur.set(r.misi_id, { progres: r.progres, selesai: r.selesai });
  }
  const lengkapSebelum = daftar.every((m) => cur.get(m.id)?.selesai);

  // Misi harian tak ada yang bertipe agregat — capaian tak dipakai.
  const capaian = { peringkatRekor: 1, jumlahBadgeMaster: 0 };
  const now = new Date().toISOString();
  const selesaiBaru: MisiSelesai[] = [];
  let poinTambah = 0;

  for (const misi of daftar) {
    const lama = cur.get(misi.id) ?? { progres: 0, selesai: false };
    if (lama.selesai) continue;
    const { progres, selesai } = kemajuanMisi(misi, lama.progres, sesi, capaian);
    if (progres === lama.progres && !selesai) continue;

    const { error } = await db.from('misi_harian_progres').upsert({
      murid_id: muridId,
      tanggal,
      misi_id: misi.id,
      progres,
      selesai,
      selesai_pada: selesai ? now : null,
    });
    if (error) throw error;
    cur.set(misi.id, { progres, selesai });

    if (selesai) {
      selesaiBaru.push({
        id: misi.id,
        judul: misi.judul,
        poinReward: misi.poinReward,
        badgeReward: null,
        jenis: 'harian',
      });
      poinTambah += misi.poinReward;
    }
  }

  const lengkapSesudah = daftar.every((m) => cur.get(m.id)?.selesai);
  let badgeTambah: string[] = [];
  if (!lengkapSebelum && lengkapSesudah && pm.harian_terakhir !== tanggal) {
    const streak = streakSetelahLengkap(pm.harian_terakhir, pm.harian_streak, tanggal);
    const total = (pm.harian_total ?? 0) + 1;
    const bonus = bonusLengkap(streak);
    await db
      .from('progres_murid')
      .update({
        harian_streak: streak,
        harian_streak_terbaik: Math.max(pm.harian_streak_terbaik ?? 0, streak),
        harian_terakhir: tanggal,
        harian_total: total,
      })
      .eq('murid_id', muridId);

    poinTambah += bonus;
    selesaiBaru.push({
      id: 'harian-lengkap',
      judul: `Semua Misi Harian selesai! 🔥 ${streak} hari`,
      poinReward: bonus,
      badgeReward: null,
      jenis: 'lengkap',
    });
    badgeTambah = badgeHarianBaru(streak, total, pm.badge_diraih ?? []);
    for (const id of badgeTambah) {
      selesaiBaru.push({
        id: `lencana-${id}`,
        judul: 'Lencana baru',
        poinReward: 0,
        badgeReward: id,
        jenis: 'lencana',
      });
    }
  }

  if (poinTambah > 0) await beriPoinMurid(db, muridId, poinTambah);
  await tambahBadge(db, muridId, badgeTambah);

  return selesaiBaru;
}

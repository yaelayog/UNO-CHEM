// Evaluasi Challenge/Misi setelah sebuah sesi permainan (SPEC bagian 10).
// Dipakai Edge Function `akun` (solo) & `aksi` (online). Rumus kemajuan di
// `_shared/game/misi.ts` (satu sumber).
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { kemajuanMisi, type KonteksSesi, type Misi } from './game/misi.ts';
import { beriPoinMurid } from './poin.ts';

export interface MisiSelesai {
  id: string;
  judul: string;
  poinReward: number;
  badgeReward: string | null;
}

export async function evaluasiMisi(
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
      });
      poinTambah += misi.poinReward;
      if (misi.badgeReward && !badgeDiraih.includes(misi.badgeReward)) {
        badgeTambah.push(misi.badgeReward);
      }
    }
  }

  if (poinTambah > 0) await beriPoinMurid(db, muridId, poinTambah);
  if (badgeTambah.length) {
    const { data: fresh } = await db
      .from('progres_murid')
      .select('badge_diraih')
      .eq('murid_id', muridId)
      .maybeSingle();
    const gabung = [
      ...new Set([...(fresh?.badge_diraih ?? []), ...badgeTambah]),
    ];
    await db
      .from('progres_murid')
      .update({ badge_diraih: gabung })
      .eq('murid_id', muridId);
  }

  return selesaiBaru;
}

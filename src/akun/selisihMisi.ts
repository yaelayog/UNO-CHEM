// Misi yang baru selesai, dihitung dari selisih status akun sebelum vs sesudah
// disegarkan. Dipakai sesudah permainan ONLINE: di sana misi dievaluasi server
// (`aksi`) untuk semua pemain sekaligus, jadi klien tak menerima daftar
// "misi selesai" langsung seperti di solo (`akun/tambahPoin`).
import { bonusLengkap, misiHarianUntuk, type Misi } from '../game';
import type { HarianAkun, MisiProgres, MisiSelesai } from './tipe';

export interface StatusMisi {
  misiProgres: MisiProgres[];
  harian: HarianAkun | null;
  badgeDiraih: string[];
}

export function selisihMisi(
  lama: StatusMisi,
  baru: StatusMisi,
  misiTetap: Misi[],
): MisiSelesai[] {
  const hasil: MisiSelesai[] = [];

  const sudahTetap = new Set(lama.misiProgres.filter((m) => m.selesai).map((m) => m.misiId));
  for (const p of baru.misiProgres) {
    if (!p.selesai || sudahTetap.has(p.misiId)) continue;
    const m = misiTetap.find((x) => x.id === p.misiId);
    if (!m) continue;
    hasil.push({
      id: m.id,
      judul: m.judul,
      poinReward: m.poinReward,
      badgeReward: m.badgeReward,
      jenis: 'misi',
    });
  }

  const h = baru.harian;
  if (h) {
    // Hari berganti → progres lama milik kemarin, anggap kosong.
    const lamaHariIni = lama.harian?.tanggal === h.tanggal ? lama.harian : null;
    const sudahHarian = new Set(
      (lamaHariIni?.progres ?? []).filter((m) => m.selesai).map((m) => m.misiId),
    );
    const defs = misiHarianUntuk(h.tanggal);
    for (const p of h.progres) {
      if (!p.selesai || sudahHarian.has(p.misiId)) continue;
      const m = defs.find((x) => x.id === p.misiId);
      if (!m) continue;
      hasil.push({
        id: m.id,
        judul: m.judul,
        poinReward: m.poinReward,
        badgeReward: null,
        jenis: 'harian',
      });
    }
    if (h.lengkapHariIni && !lamaHariIni?.lengkapHariIni) {
      hasil.push({
        id: 'harian-lengkap',
        judul: `Semua Misi Harian selesai! 🔥 ${h.streak} hari`,
        poinReward: bonusLengkap(h.streak),
        badgeReward: null,
        jenis: 'lengkap',
      });
    }
  }

  const sudahBadge = new Set(lama.badgeDiraih);
  for (const id of baru.badgeDiraih) {
    if (id.startsWith('harian-') && !sudahBadge.has(id)) {
      hasil.push({
        id: `lencana-${id}`,
        judul: 'Lencana baru',
        poinReward: 0,
        badgeReward: id,
        jenis: 'lencana',
      });
    }
  }

  return hasil;
}

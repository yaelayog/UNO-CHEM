// UNO-Chem Fase 4 — Challenge / Misi (SPEC bagian 10, Minggu 3).
//
// Fungsi murni: hitung kemajuan satu misi setelah sebuah sesi permainan.
// Dipakai identik di alur solo (Edge Function `akun`) & online (`aksi`).
//
// Dua kelompok tipe:
//  · KEJADIAN  — counter bertambah per sesi yang memenuhi syarat. Andal walau
//                progres agregat klien belum tersinkron ke server.
//                (menang, mainGame, kuisBenarTotal, kuisBenarGolongan,
//                 kuisBenarTP, kuisBenarSesi, akurasiSesi)
//  · AGREGAT   — progres = nilai capaian terkini murid (yang otoritatif di
//                `progres_murid` server): (peringkatGolongan, badgeMaster)

import type { Golongan } from '../data/types';

export type TipeMisi =
  | 'menang'
  | 'mainGame'
  | 'kuisBenarTotal'
  | 'kuisBenarGolongan'
  | 'kuisBenarTP'
  | 'kuisBenarSesi'
  | 'akurasiSesi'
  | 'peringkatGolongan'
  | 'badgeMaster';

export interface Misi {
  id: string;
  judul: string;
  deskripsi: string;
  tipe: TipeMisi;
  /**
   * Parameter: { jumlah?, golongan?, online?, tanpaSalah?, tp?, minBenar?,
   * persen?, minKuis? }.
   */
  target: Record<string, unknown>;
  poinReward: number;
  badgeReward: string | null;
}

/** Ringkasan 1 sesi permainan yang baru selesai. */
export interface KonteksSesi {
  menang: boolean;
  online: boolean;
  kuisBenar: number;
  kuisSalah: number;
  benarPerGolongan: Partial<Record<Golongan, number>>;
  /** Jawaban benar per nomor Tujuan Pembelajaran ("1".."4"). Opsional. */
  benarPerTP?: Record<string, number>;
}

/** Snapshot capaian agregat murid saat ini (dari `progres_murid` server). */
export interface CapaianMurid {
  peringkatRekor: number;
  jumlahBadgeMaster: number;
}

/** Angka target satu misi (untuk progress bar & pengecekan selesai). */
export function targetMisi(misi: Misi): number {
  const t = misi.target ?? {};
  if (misi.tipe === 'peringkatGolongan') return Number(t.golongan) || 1;
  return Number(t.jumlah) || 1;
}

const AGREGAT: Record<TipeMisi, boolean> = {
  menang: false,
  mainGame: false,
  kuisBenarTotal: false,
  kuisBenarGolongan: false,
  kuisBenarTP: false,
  kuisBenarSesi: false,
  akurasiSesi: false,
  peringkatGolongan: true,
  badgeMaster: true,
};

/**
 * Kemajuan misi setelah `sesi`. `progresLama` = counter tersimpan
 * (`misi_progres_murid.progres`). Untuk tipe AGREGAT counter di-set ulang ke
 * nilai capaian; untuk tipe KEJADIAN counter bertambah sesuai delta sesi.
 */
export function kemajuanMisi(
  misi: Misi,
  progresLama: number,
  sesi: KonteksSesi,
  capaian: CapaianMurid,
): { progres: number; target: number; selesai: boolean } {
  const t = misi.target ?? {};
  const target = targetMisi(misi);
  let progres = progresLama;

  switch (misi.tipe) {
    case 'menang': {
      const cocok =
        sesi.menang &&
        (!t.online || sesi.online) &&
        (!t.tanpaSalah || sesi.kuisSalah === 0);
      if (cocok) progres = progresLama + 1;
      break;
    }
    case 'kuisBenarGolongan': {
      const g = String(t.golongan) as Golongan;
      progres = progresLama + (sesi.benarPerGolongan[g] ?? 0);
      break;
    }
    case 'kuisBenarTP':
      progres = progresLama + (sesi.benarPerTP?.[String(t.tp)] ?? 0);
      break;
    case 'kuisBenarSesi':
      // Hitung 1 per sesi yang mencapai `minBenar` jawaban benar.
      if (sesi.kuisBenar >= (Number(t.minBenar) || 1)) progres = progresLama + 1;
      break;
    case 'akurasiSesi': {
      // Hitung 1 per sesi dengan akurasi ≥ `persen` (minimal `minKuis` soal).
      const total = sesi.kuisBenar + sesi.kuisSalah;
      const cukup = total >= (Number(t.minKuis) || 1);
      if (cukup && sesi.kuisBenar * 100 >= (Number(t.persen) || 100) * total) {
        progres = progresLama + 1;
      }
      break;
    }
    case 'mainGame':
      progres = progresLama + 1;
      break;
    case 'kuisBenarTotal':
      progres = progresLama + sesi.kuisBenar;
      break;
    case 'peringkatGolongan':
      progres = capaian.peringkatRekor;
      break;
    case 'badgeMaster':
      progres = capaian.jumlahBadgeMaster;
      break;
  }

  progres = Math.max(0, Math.min(progres, target));
  return { progres, target, selesai: progres >= target };
}

/** true bila misi ini murni dievaluasi dari capaian (tak butuh delta sesi). */
export function misiAgregat(misi: Misi): boolean {
  return AGREGAT[misi.tipe] ?? false;
}

/** SPEC signature — apakah misi sudah selesai dengan progres counter tertentu. */
export function cekMisiSelesai(misi: Misi, progres: number): boolean {
  return progres >= targetMisi(misi);
}

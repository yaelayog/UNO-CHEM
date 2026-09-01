// ChemUno Fase 4 — Sistem "Peringkat Golongan 1–18" (SPEC bagian 10).
//
// Fungsi murni, tanpa efek samping (arsitektur brief §6c). Dipakai identik di
// alur solo & online, dan di Edge Function (cron reset mingguan).
//
// PENTING: "Peringkat Golongan [angka]" ≠ "Golongan warna kartu" (Alkali/Halogen).
// Angka 1–18 mengikuti penomoran golongan IUPAC modern — dipakai sebagai TANGGA
// PERINGKAT musiman, bukan identitas unsur.
//
// Model poin (Opsi A): `totalPoin` = poin MINGGU BERJALAN (di-nol-kan tiap reset
// mingguan). Peringkat aktif = kombinasi lantai hasil reset + golongan alami dari
// poin minggu ini. `peringkatRekor` menyimpan puncak permanen (hanya naik).

import type { TingkatKesulitan } from '../data/types';

export type { TingkatKesulitan };

// ── Sumber poin ──────────────────────────────────────────────────────
/** Poin dari 1 jawaban kuis benar (solo & online), dibobot kesulitan. Kecil. */
export const POIN_KUIS: Record<TingkatKesulitan, number> = {
  mudah: 10,
  sedang: 20,
  sulit: 30,
};
export function poinJawabanBenar(kesulitan: TingkatKesulitan): number {
  return POIN_KUIS[kesulitan] ?? 0;
}

/** Bonus BESAR khusus menang di sesi ONLINE. Menang lawan bot TIDAK dapat ini. */
export const POIN_BONUS_MENANG_ONLINE = 250;
export function poinBonusMenangOnline(): number {
  return POIN_BONUS_MENANG_ONLINE;
}

// ── Kurva peringkat (kuadratik) ──────────────────────────────────────
export const GOLONGAN_MIN = 1;
export const GOLONGAN_MAKS = 18;
const BASE_POIN = 100;

/**
 * Poin kumulatif (minggu ini) yang dibutuhkan untuk MENCAPAI peringkat golongan
 * `g`. Kuadratik: g2=400, g3=900, … g18=32400. `g<=1` → 0 (semua orang minimal 1).
 */
export function kebutuhanPoinGolongan(g: number): number {
  if (g <= GOLONGAN_MIN) return 0;
  const dibatasi = Math.min(g, GOLONGAN_MAKS);
  return BASE_POIN * dibatasi * dibatasi;
}

/** Peringkat golongan tertinggi yang `totalPoin` sudah cukup untuk dicapai (1–18). */
export function hitungGolonganDariPoin(totalPoin: number): number {
  let g = GOLONGAN_MIN;
  while (g < GOLONGAN_MAKS && totalPoin >= kebutuhanPoinGolongan(g + 1)) g++;
  return g;
}

// ── Naik peringkat saat dapat poin ──────────────────────────────────
export interface KeadaanPeringkat {
  totalPoin: number;
  peringkatAktif: number;
  peringkatRekor: number;
}

/**
 * Terapkan tambahan poin. Peringkat aktif me-RATCHET naik (tak pernah turun di
 * tengah minggu); rekor mengikuti puncak aktif. Murni — kembalikan keadaan baru.
 */
export function tambahPoin(
  keadaan: KeadaanPeringkat,
  poin: number,
): KeadaanPeringkat {
  const totalPoin = Math.max(0, keadaan.totalPoin + poin);
  const peringkatAktif = Math.max(
    keadaan.peringkatAktif,
    hitungGolonganDariPoin(totalPoin),
  );
  return {
    totalPoin,
    peringkatAktif,
    peringkatRekor: Math.max(keadaan.peringkatRekor, peringkatAktif),
  };
}

// ── Reset mingguan (berbasis waktu, bukan hukuman kalah) ─────────────
export const PENURUNAN_RESET = 3; // boleh 3–4
export const LANTAI_RESET = 3;

/**
 * Peringkat aktif baru setelah reset mingguan: turun `PENURUNAN_RESET` golongan
 * dari puncak minggu ini, TIDAK PERNAH < `LANTAI_RESET` bila murid pernah
 * mencapai `LANTAI_RESET` atau lebih tinggi (permanen).
 */
export function terapkanResetMingguan(
  peringkatAktif: number,
  peringkatRekor: number,
): number {
  const turun = Math.max(peringkatAktif - PENURUNAN_RESET, GOLONGAN_MIN);
  return peringkatRekor >= LANTAI_RESET ? Math.max(turun, LANTAI_RESET) : turun;
}

/**
 * Keadaan penuh setelah reset mingguan: peringkat aktif diturunkan, poin minggu
 * di-nol-kan (murid menumpuk lagi dari awal), rekor tetap.
 */
export function resetMingguan(keadaan: KeadaanPeringkat): KeadaanPeringkat {
  return {
    totalPoin: 0,
    peringkatAktif: terapkanResetMingguan(
      keadaan.peringkatAktif,
      keadaan.peringkatRekor,
    ),
    peringkatRekor: keadaan.peringkatRekor,
  };
}

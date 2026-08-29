export * from './types';
export { GOLONGAN, SEMUA_GOLONGAN, WARNA_GOLONGAN } from './golongan';
export { DAFTAR_UNSUR } from './unsur';
export { BANK_SOAL } from './kuis';
export { SEMUA_FUNFACT } from './funfact';

import type { Golongan, SoalKuis, TingkatKesulitan, Unsur } from './types';
import { DAFTAR_UNSUR } from './unsur';
import { BANK_SOAL } from './kuis';

/** Unsur-unsur pada satu golongan. */
export function unsurByGolongan(golongan: Golongan): Unsur[] {
  return DAFTAR_UNSUR.filter((u) => u.golongan === golongan);
}

/** Cari unsur berdasarkan simbol (case-insensitive). */
export function cariUnsur(simbol: string): Unsur | undefined {
  const s = simbol.toLowerCase();
  return DAFTAR_UNSUR.find((u) => u.simbol.toLowerCase() === s);
}

/** Soal-soal pada satu tingkat kesulitan. */
export function soalByKesulitan(tingkat: TingkatKesulitan): SoalKuis[] {
  return BANK_SOAL.filter((q) => q.tingkatKesulitan === tingkat);
}

/**
 * Ambil satu soal acak pada tingkat kesulitan tertentu.
 * `rng` di-inject agar bisa dites deterministik (default Math.random).
 */
export function soalAcak(
  tingkat: TingkatKesulitan,
  rng: () => number = Math.random,
): SoalKuis {
  const kandidat = soalByKesulitan(tingkat);
  return kandidat[Math.floor(rng() * kandidat.length)];
}

import type { Golongan, SoalKuis, TingkatKesulitan } from '../data/types';
import { BANK_SOAL } from '../data/kuis';
import { rngInt } from './rng';

/**
 * Pilih 1 soal untuk QuizModal. Prioritas:
 *  1. soal yang dibantu Fun Fact yang sudah dilihat pemain (`dibantuFunFact`) —
 *     bias TAK TERLIHAT: pemain yang menyimak Fun Fact dapat soal yang lebih ia kuasai;
 *  2. di antara itu, soal yang golongannya sama dengan warna kartu pemicu;
 *  3. fallback: seluruh pool pada tingkat kesulitan tsb.
 * Semua tetap menghormati anti-ulang (`kecuali`). Deterministik lewat state RNG.
 */
export function pilihSoal(
  tingkat: TingkatKesulitan,
  golongan: Golongan | null,
  rngState: number,
  kecuali: ReadonlySet<string> = new Set(),
  dibantuFunFact: ReadonlySet<string> = new Set(),
): [SoalKuis, number] {
  const pool = BANK_SOAL.filter((q) => q.tingkatKesulitan === tingkat);
  const belumTerpakai = pool.filter((q) => !kecuali.has(q.id));
  // Kalau semua soal di tingkat ini sudah keluar, pakai lagi seluruh pool.
  const basis = belumTerpakai.length > 0 ? belumTerpakai : pool;

  // Utamakan soal yang sudah "dibuka" lewat Fun Fact.
  const dariFunFact = basis.filter((q) => dibantuFunFact.has(q.id));
  const dasar = dariFunFact.length > 0 ? dariFunFact : basis;

  const seGolongan = golongan
    ? dasar.filter((q) => q.golonganTerkait === golongan)
    : [];
  const kandidat = seGolongan.length > 0 ? seGolongan : dasar;

  const [i, next] = rngInt(rngState, kandidat.length);
  return [kandidat[i], next];
}

export const BATAS_WAKTU_KUIS_DETIK = 20;
/** Jawaban benar dalam ambang ini = penalti dihapus total. */
export const AMBANG_CEPAT_DETIK = 8;

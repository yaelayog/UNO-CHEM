import type { Golongan } from '../data/types';
import type { AksiBot, GameState, KartuKimia } from './types';
import type { HasilKuis } from './penalti';
import { indeksBerikutnya, langkahLegal } from './engine';
import { rngNext } from './rng';

/**
 * Keputusan bot pada gilirannya (fungsi murni). Heuristik sederhana:
 * - mainkan kartu aksi lebih agresif kalau lawan berikutnya hampir menang;
 * - simpan kartu wild kecuali terdesak;
 * - untuk kartu angka, utamakan golongan yang paling banyak di tangan.
 */
export function langkahBot(state: GameState): AksiBot {
  const p = state.pemain[state.giliran];
  const legalIds = new Set(langkahLegal(state, p.id));
  if (legalIds.size === 0) return { tipe: 'tarik' };

  const legal = p.tangan.filter((k) => legalIds.has(k.id));
  const lawanBerikut = state.pemain[indeksBerikutnya(state, 1)];
  const lawanHampirMenang = lawanBerikut.tangan.length <= 2;

  const freq = frekuensiGolongan(p.tangan);

  const skor = (k: KartuKimia): number => {
    switch (k.jenis) {
      case 'angka':
        return 2 + (freq[k.golongan!] ?? 0);
      case 'skip':
      case 'draw2':
        return lawanHampirMenang ? 10 : 4;
      case 'reverse':
        return 3;
      case 'wild':
        return lawanHampirMenang ? 6 : 1;
      case 'wild4':
        return lawanHampirMenang ? 9 : 2;
      default:
        return 0;
    }
  };

  const terbaik = [...legal].sort((a, b) => skor(b) - skor(a))[0];

  let warnaWild: Golongan | undefined;
  if (terbaik.jenis === 'wild' || terbaik.jenis === 'wild4') {
    warnaWild = golonganTerbanyak(freq) ?? 'alkali';
  }

  // House rule: kalau kartu terbaik adalah kartu angka, tumpuk sekalian semua
  // kartu angka lain seperiode (mengurangi kartu = lebih dekat menang).
  let ekstraIds: string[] | undefined;
  if (terbaik.jenis === 'angka') {
    ekstraIds = p.tangan
      .filter(
        (k) =>
          k.id !== terbaik.id &&
          k.jenis === 'angka' &&
          k.periode === terbaik.periode,
      )
      .map((k) => k.id);
    if (ekstraIds.length === 0) ekstraIds = undefined;
  }

  return { tipe: 'main', kartuId: terbaik.id, ekstraIds, warnaWild };
}

/**
 * Bot menjawab kuis penalti. Mengembalikan hasil + state dengan RNG yang sudah
 * maju (agar tetap deterministik). Peluang benar tergantung tingkat kesulitan.
 */
export function jawabKuisBot(state: GameState): { hasil: HasilKuis; state: GameState } {
  const tingkat = state.efekTertunda?.tingkatKuis ?? 'mudah';
  const [roll, rng] = rngNext(state.rng);
  const [batasCepat, batasLambat] = {
    mudah: [0.55, 0.85],
    sedang: [0.35, 0.7],
    sulit: [0.2, 0.5],
  }[tingkat];

  const hasil: HasilKuis =
    roll < batasCepat ? 'benarCepat' : roll < batasLambat ? 'benarLambat' : 'salah';

  return { hasil, state: { ...state, rng } };
}

/** Golongan (warna) terbaik untuk dipilih bot saat memainkan Katalis/Reaksi Eksplosif. */
export function warnaBotTerbaik(state: GameState, pemainId: string): Golongan {
  const p = state.pemain.find((x) => x.id === pemainId);
  return golonganTerbanyak(frekuensiGolongan(p?.tangan ?? [])) ?? 'alkali';
}

function frekuensiGolongan(tangan: KartuKimia[]): Partial<Record<Golongan, number>> {
  const freq: Partial<Record<Golongan, number>> = {};
  for (const k of tangan) {
    if (k.golongan) freq[k.golongan] = (freq[k.golongan] ?? 0) + 1;
  }
  return freq;
}

function golonganTerbanyak(
  freq: Partial<Record<Golongan, number>>,
): Golongan | undefined {
  let terbaik: Golongan | undefined;
  let maks = 0;
  for (const [g, n] of Object.entries(freq) as [Golongan, number][]) {
    if (n > maks) {
      maks = n;
      terbaik = g;
    }
  }
  return terbaik;
}

import type { Golongan } from '../data/types';
import { DAFTAR_UNSUR } from '../data/unsur';
import { WARNA_GOLONGAN } from '../data/golongan';
import type { KartuKimia } from './types';

/** Salinan tiap kartu angka (per unsur) di dalam deck. */
export const SALINAN_KARTU_ANGKA = 2;
/** Salinan tiap kartu spesial berwarna (skip/reverse/draw2) per golongan. */
export const SALINAN_KARTU_SPESIAL = 2;
/** Jumlah kartu wild ("Katalis") dan wild4 ("Reaksi Eksplosif"). */
export const JUMLAH_WILD = 4;
export const JUMLAH_WILD4 = 4;

/** Unsur "wakil" tiap golongan — dipakai sebagai wajah kartu spesial. */
export const WAKIL_GOLONGAN: Record<Golongan, string> = {
  alkali: 'Na',
  alkaliTanah: 'Ca',
  halogen: 'Cl',
  gasMulia: 'He',
  transisi: 'Fe',
};

export const JUDUL_EFEK = {
  skip: 'Reaksi Tidak Stabil',
  reverse: 'Reaksi Balik',
  draw2: 'Ionisasi',
  wild: 'Katalis',
  wild4: 'Reaksi Eksplosif',
} as const;

const GOLONGAN_KEYS = Object.keys(WARNA_GOLONGAN) as Golongan[];

function unsurWajib(simbol: string) {
  const u = DAFTAR_UNSUR.find((x) => x.simbol === simbol);
  if (!u) throw new Error(`Unsur wakil "${simbol}" tidak ada di DAFTAR_UNSUR`);
  return u;
}

/**
 * Membangun deck ChemUno secara deterministik (belum dikocok).
 * Komposisi: 2×(tiap unsur) kartu angka + 2×(skip/reverse/draw2) per golongan
 * + 4 wild + 4 wild4.
 */
export function buatDeck(): KartuKimia[] {
  const deck: KartuKimia[] = [];

  // Kartu angka — periode unsur sebagai "angka" UNO.
  for (const u of DAFTAR_UNSUR) {
    for (let c = 0; c < SALINAN_KARTU_ANGKA; c++) {
      deck.push({
        id: `n-${u.simbol}-${c}`,
        simbol: u.simbol,
        namaUnsur: u.namaUnsur,
        nomorAtom: u.nomorAtom,
        periode: u.periode,
        golongan: u.golongan,
        warnaUno: WARNA_GOLONGAN[u.golongan],
        jenis: 'angka',
        faktaMenarik: u.fakta,
      });
    }
  }

  // Kartu spesial berwarna.
  for (const g of GOLONGAN_KEYS) {
    const u = unsurWajib(WAKIL_GOLONGAN[g]);
    for (const jenis of ['skip', 'reverse', 'draw2'] as const) {
      for (let c = 0; c < SALINAN_KARTU_SPESIAL; c++) {
        deck.push({
          id: `${jenis}-${g}-${c}`,
          simbol: u.simbol,
          namaUnsur: u.namaUnsur,
          nomorAtom: u.nomorAtom,
          periode: 0, // tidak ikut pencocokan angka
          golongan: g,
          warnaUno: WARNA_GOLONGAN[g],
          jenis,
          judulEfek: JUDUL_EFEK[jenis],
        });
      }
    }
  }

  // Kartu wild.
  for (let c = 0; c < JUMLAH_WILD; c++) {
    deck.push(kartuWild(`wild-${c}`, 'wild'));
  }
  for (let c = 0; c < JUMLAH_WILD4; c++) {
    deck.push(kartuWild(`wild4-${c}`, 'wild4'));
  }

  return deck;
}

function kartuWild(id: string, jenis: 'wild' | 'wild4'): KartuKimia {
  return {
    id,
    simbol: '★',
    namaUnsur: JUDUL_EFEK[jenis],
    nomorAtom: 0,
    periode: 0,
    golongan: null,
    warnaUno: null,
    jenis,
    judulEfek: JUDUL_EFEK[jenis],
  };
}

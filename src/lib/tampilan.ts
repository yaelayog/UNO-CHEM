import type { Golongan, JenisKartu } from '../data/types';

/** Kelas Tailwind per golongan — sumber tunggal gaya warna kartu di UI.
 * `tinta` = warna teks gelap untuk dipakai di atas latar putih (badge periode). */
export const GAYA_GOLONGAN: Record<
  Golongan,
  { fill: string; chip: string; soft: string; tinta: string; garis: string; ring: string }
> = {
  alkali: {
    fill: 'bg-alkali text-white',
    chip: 'bg-alkali text-white',
    soft: 'bg-alkali-050 text-alkali-700',
    tinta: 'text-alkali-700',
    garis: 'border-black/10',
    ring: 'ring-alkali',
  },
  alkaliTanah: {
    fill: 'bg-alkali-tanah text-white',
    chip: 'bg-alkali-tanah text-white',
    soft: 'bg-alkali-tanah-050 text-alkali-tanah-700',
    tinta: 'text-alkali-tanah-700',
    garis: 'border-black/10',
    ring: 'ring-alkali-tanah',
  },
  halogen: {
    fill: 'bg-halogen text-halogen-700',
    chip: 'bg-halogen text-halogen-700',
    soft: 'bg-halogen-050 text-halogen-700',
    tinta: 'text-halogen-700',
    garis: 'border-black/10',
    ring: 'ring-halogen',
  },
  gasMulia: {
    fill: 'bg-gas-mulia text-white',
    chip: 'bg-gas-mulia text-white',
    soft: 'bg-gas-mulia-050 text-gas-mulia-700',
    tinta: 'text-gas-mulia-700',
    garis: 'border-black/10',
    ring: 'ring-gas-mulia',
  },
  transisi: {
    fill: 'bg-transisi text-white',
    chip: 'bg-transisi text-white',
    soft: 'bg-transisi-050 text-transisi-700',
    tinta: 'text-transisi-700',
    garis: 'border-black/10',
    ring: 'ring-transisi',
  },
};

export const IKON_JENIS: Record<Exclude<JenisKartu, 'angka'>, string> = {
  skip: '⊘',
  reverse: '⇄',
  draw2: '+2',
  wild: '✦',
  wild4: '+4',
};

/** Label mekanik singkat (bahasa polos) untuk muka kartu spesial. */
export const LABEL_MEKANIK: Record<Exclude<JenisKartu, 'angka'>, string> = {
  skip: 'LEWATI',
  reverse: 'BALIK ARAH',
  draw2: '+2 KARTU',
  wild: 'PILIH WARNA',
  wild4: '+4 & WARNA',
};

export const LABEL_JENIS: Record<Exclude<JenisKartu, 'angka'>, string> = {
  skip: 'Reaksi Tidak Stabil — lawan dilewati (+ kuis)',
  reverse: 'Reaksi Balik — arah main dibalik',
  draw2: 'Ionisasi — lawan ambil 2 kartu (kecuali lolos kuis)',
  wild: 'Katalis — pilih golongan bebas',
  wild4: 'Reaksi Eksplosif — lawan ambil 4 kartu (+ kuis sulit)',
};

export const ROMAWI_PERIODE = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

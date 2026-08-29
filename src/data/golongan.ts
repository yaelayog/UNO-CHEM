import type { Golongan, InfoGolongan } from './types';

/** Warna UNO per golongan (dipakai juga di src/index.css sebagai token). */
export const WARNA_GOLONGAN: Record<Golongan, string> = {
  alkali: '#ef4444', // merah
  alkaliTanah: '#f97316', // oranye
  halogen: '#eab308', // kuning
  gasMulia: '#22c55e', // hijau
  transisi: '#3b82f6', // biru
};

export const GOLONGAN: Record<Golongan, InfoGolongan> = {
  alkali: {
    key: 'alkali',
    nama: 'Logam Alkali',
    nomorGolongan: 'IA',
    warnaUno: WARNA_GOLONGAN.alkali,
    deskripsi:
      'Logam sangat reaktif, lunak, mengkilap. Bereaksi hebat dengan air membentuk basa (alkali) dan gas hidrogen.',
    fakta: [
      'Semua logam alkali punya 1 elektron valensi, sehingga mudah melepas elektron dan membentuk ion +1.',
      'Natrium dan kalium disimpan dalam minyak tanah karena langsung bereaksi dengan uap air di udara.',
      'Warna nyala khas: litium merah, natrium kuning, kalium ungu — dipakai dalam uji nyala.',
      'Kereaktifan bertambah dari atas ke bawah: fransium paling reaktif di golongan ini.',
    ],
  },
  alkaliTanah: {
    key: 'alkaliTanah',
    nama: 'Logam Alkali Tanah',
    nomorGolongan: 'IIA',
    warnaUno: WARNA_GOLONGAN.alkaliTanah,
    deskripsi:
      'Logam reaktif (kurang dari alkali), lebih keras dan lebih rapat. Membentuk ion +2.',
    fakta: [
      'Punya 2 elektron valensi, cenderung membentuk ion +2.',
      'Kalsium dan magnesium adalah penyusun utama tulang, gigi, dan klorofil.',
      'Magnesium terbakar dengan nyala putih terang — dulu dipakai untuk lampu blitz fotografi.',
      'Air sadah mengandung ion Ca²⁺ dan Mg²⁺ yang membuat sabun sukar berbusa.',
    ],
  },
  halogen: {
    key: 'halogen',
    nama: 'Halogen',
    nomorGolongan: 'VIIA',
    warnaUno: WARNA_GOLONGAN.halogen,
    deskripsi:
      'Nonlogam sangat reaktif dengan 7 elektron valensi. "Halogen" berarti "pembentuk garam".',
    fakta: [
      'Halogen butuh 1 elektron lagi untuk stabil, sehingga cenderung membentuk ion −1.',
      'Wujud pada suhu kamar berubah: fluor & klor gas, brom cair, iod padat.',
      'Klor dipakai untuk mendisinfeksi air minum dan kolam renang.',
      'Kereaktifan halogen menurun dari atas ke bawah: fluor paling reaktif.',
    ],
  },
  gasMulia: {
    key: 'gasMulia',
    nama: 'Gas Mulia',
    nomorGolongan: 'VIIIA',
    warnaUno: WARNA_GOLONGAN.gasMulia,
    deskripsi:
      'Gas tak berwarna yang sangat stabil karena kulit elektron terluarnya penuh.',
    fakta: [
      'Kulit terluar sudah penuh (2 atau 8 elektron), jadi hampir tidak bereaksi — disebut inert.',
      'Helium lebih ringan dari udara dan dipakai mengisi balon serta pendingin superkonduktor.',
      'Neon memancarkan cahaya merah-oranye terang saat dialiri listrik → lampu neon.',
      'Argon adalah gas mulia paling melimpah di atmosfer Bumi (± 0,93%).',
    ],
  },
  transisi: {
    key: 'transisi',
    nama: 'Logam Transisi',
    nomorGolongan: 'Golongan B',
    warnaUno: WARNA_GOLONGAN.transisi,
    deskripsi:
      'Logam keras dengan titik leleh tinggi, sering berwarna-warni senyawanya, dan bisa punya lebih dari satu bilangan oksidasi.',
    fakta: [
      'Banyak senyawa logam transisi berwarna, contoh larutan tembaga(II) biru dan besi(III) kuning-coklat.',
      'Logam transisi sering menjadi katalis, misalnya besi pada pembuatan amonia (proses Haber).',
      'Sebagian besar bersifat feromagnetik atau paramagnetik; besi, kobalt, nikel bisa dijadikan magnet.',
      'Bilangan oksidasi bervariasi, contoh besi bisa +2 atau +3, mangan bisa +2 sampai +7.',
    ],
  },
};

export const SEMUA_GOLONGAN = Object.values(GOLONGAN);

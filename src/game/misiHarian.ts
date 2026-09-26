// UNO-Chem — Misi Harian (reset tiap 00:00 WIB).
//
// Fungsi murni, dipakai identik di klien (tampilan) & Edge Function (evaluasi):
//  · 3 misi per hari, satu per tingkat (Pemanasan / Belajar / Tantangan),
//    dipilih DETERMINISTIK dari tanggal → semua murid mendapat misi yang sama
//    hari itu (bisa dibahas bareng di kelas).
//  · "Golongan Hari Ini" berputar tiap hari; misi bertema golongan mengikutinya.
//  · Selesaikan ketiganya → Bonus Lengkap + streak 🔥 (hari berturut-turut).
//
// Kemajuan tiap misi dihitung `kemajuanMisi` (misi.ts) — satu sumber rumus.
//
// Kalibrasi target: pemain manusia rata-rata hanya dapat ±2 kuis per permainan
// (kuis muncul saat terkena Skip/+2/+4 lawan, temanya = warna kartu serangan),
// jadi misi kuis dibuat kecil & misi bertema golongan memakai KARTU yang
// dimainkan — sesuatu yang bisa diusahakan pemain sendiri.

import { GOLONGAN } from '../data/golongan';
import type { Golongan } from '../data/types';
import type { Misi, TipeMisi } from './misi';

// ── Tanggal (WIB = UTC+7, tanpa DST) ─────────────────────────────────
const OFFSET_WIB_MS = 7 * 60 * 60 * 1000;
const SEHARI_MS = 24 * 60 * 60 * 1000;

/** Tanggal kalender WIB 'YYYY-MM-DD' untuk suatu saat. */
export function tanggalWIB(saat: Date = new Date()): string {
  return new Date(saat.getTime() + OFFSET_WIB_MS).toISOString().slice(0, 10);
}

/** Nomor hari sejak 1970-01-01 untuk tanggal 'YYYY-MM-DD'. */
export function nomorHari(tanggal: string): number {
  return Math.floor(Date.parse(`${tanggal}T00:00:00Z`) / SEHARI_MS);
}

/** Tanggal `hari` hari sesudah (negatif = sebelum) `tanggal`. */
export function geserTanggal(tanggal: string, hari: number): string {
  return new Date((nomorHari(tanggal) + hari) * SEHARI_MS).toISOString().slice(0, 10);
}

/** Milidetik sampai reset berikutnya (00:00 WIB). */
export function msSampaiReset(saat: Date = new Date()): number {
  const wib = saat.getTime() + OFFSET_WIB_MS;
  return SEHARI_MS - (((wib % SEHARI_MS) + SEHARI_MS) % SEHARI_MS);
}

// ── Golongan Hari Ini ────────────────────────────────────────────────
const URUTAN_GOLONGAN: Golongan[] = [
  'alkali',
  'alkaliTanah',
  'halogen',
  'gasMulia',
  'transisi',
];

/** Nama warna kartu UNO per golongan (untuk teks misi & tips). */
export const WARNA_KARTU: Record<Golongan, string> = {
  alkali: 'merah',
  alkaliTanah: 'oranye',
  halogen: 'kuning',
  gasMulia: 'hijau',
  transisi: 'biru',
};

export function golonganHariIni(tanggal: string): Golongan {
  const n = URUTAN_GOLONGAN.length;
  return URUTAN_GOLONGAN[((nomorHari(tanggal) % n) + n) % n];
}

/** Fakta singkat golongan hari ini (berganti tiap putaran). */
export function faktaHariIni(tanggal: string): string {
  const fakta = GOLONGAN[golonganHariIni(tanggal)].fakta;
  const putaran = Math.floor(nomorHari(tanggal) / URUTAN_GOLONGAN.length);
  return fakta[((putaran % fakta.length) + fakta.length) % fakta.length];
}

// ── Kumpulan misi ────────────────────────────────────────────────────
export type TingkatHarian = 'pemanasan' | 'belajar' | 'tantangan';

export const TINGKAT_HARIAN: TingkatHarian[] = ['pemanasan', 'belajar', 'tantangan'];

export const POIN_HARIAN: Record<TingkatHarian, number> = {
  pemanasan: 50,
  belajar: 100,
  tantangan: 150,
};

export interface MisiHarian extends Misi {
  tingkat: TingkatHarian;
  /** true bila misi mengikuti Golongan Hari Ini. */
  bertemaGolongan: boolean;
}

interface Templat {
  kunci: string;
  tipe: TipeMisi;
  judul: (nama: string, warna: string) => string;
  deskripsi: (nama: string, warna: string) => string;
  target: (g: Golongan) => Record<string, unknown>;
  bertemaGolongan?: boolean;
}

const KUMPULAN: Record<TingkatHarian, Templat[]> = {
  pemanasan: [
    {
      kunci: 'h-main-1',
      tipe: 'mainGame',
      judul: () => 'Pemanasan Lab',
      deskripsi: () => 'Mainkan 1 permainan',
      target: () => ({ jumlah: 1 }),
    },
    {
      kunci: 'h-benar-2',
      tipe: 'kuisBenarTotal',
      judul: () => 'Dua Jawaban Tepat',
      deskripsi: () => 'Jawab 2 kuis dengan benar',
      target: () => ({ jumlah: 2 }),
    },
    {
      kunci: 'h-kartu-4',
      tipe: 'kartuGolongan',
      judul: (nama) => `Kenali ${nama}`,
      deskripsi: (nama, warna) => `Mainkan 4 kartu ${nama} (kartu ${warna})`,
      target: (g) => ({ jumlah: 4, golongan: g }),
      bertemaGolongan: true,
    },
  ],
  belajar: [
    {
      kunci: 'h-tp2',
      tipe: 'kuisBenarTP',
      judul: () => 'Tren Periodik',
      deskripsi: () =>
        'Jawab 1 soal jari-jari atom, energi ionisasi, atau keelektronegatifan dengan benar',
      target: () => ({ jumlah: 1, tp: 2 }),
    },
    {
      kunci: 'h-tp3',
      tipe: 'kuisBenarTP',
      judul: () => 'Logam atau Nonlogam?',
      deskripsi: () => 'Jawab 2 soal sifat logam–nonlogam unsur dengan benar',
      target: () => ({ jumlah: 2, tp: 3 }),
    },
    {
      kunci: 'h-akurat',
      tipe: 'akurasiSesi',
      judul: () => 'Teliti Itu Kunci',
      deskripsi: () =>
        'Jawab SEMUA kuis dengan benar dalam 1 permainan (min. 2 soal)',
      target: () => ({ jumlah: 1, persen: 100, minKuis: 2 }),
    },
    {
      kunci: 'h-benar-5',
      tipe: 'kuisBenarTotal',
      judul: () => 'Rajin Menjawab',
      deskripsi: () => 'Jawab 5 kuis dengan benar',
      target: () => ({ jumlah: 5 }),
    },
  ],
  tantangan: [
    {
      kunci: 'h-menang-1',
      tipe: 'menang',
      judul: () => 'Juara Hari Ini',
      deskripsi: () => 'Menangkan 1 permainan',
      target: () => ({ jumlah: 1 }),
    },
    {
      kunci: 'h-sesi-3',
      tipe: 'kuisBenarSesi',
      judul: () => 'Reaksi Kilat',
      deskripsi: () => 'Jawab 3 kuis dengan benar dalam satu permainan',
      target: () => ({ jumlah: 1, minBenar: 3 }),
    },
    {
      kunci: 'h-sempurna',
      tipe: 'menang',
      judul: () => 'Menang Sempurna',
      deskripsi: () => 'Menangkan 1 permainan tanpa sekali pun salah kuis',
      target: () => ({ jumlah: 1, tanpaSalah: true }),
    },
    {
      kunci: 'h-main-3',
      tipe: 'mainGame',
      judul: () => 'Maraton Lab',
      deskripsi: () => 'Mainkan 3 permainan',
      target: () => ({ jumlah: 3 }),
    },
  ],
};

const GARAM: Record<TingkatHarian, number> = {
  pemanasan: 11,
  belajar: 23,
  tantangan: 37,
};

/** Hash bilangan bulat 32-bit sederhana (deterministik, sebar merata). */
function acak(hari: number, garam: number): number {
  let h = Math.imul(hari ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(garam, 0xc2b2ae35);
  h ^= h >>> 13;
  h = Math.imul(h, 0x27d4eb2f);
  h ^= h >>> 16;
  return h >>> 0;
}

/** 3 misi harian untuk `tanggal` ('YYYY-MM-DD', WIB). Urut: pemanasan, belajar, tantangan. */
export function misiHarianUntuk(tanggal: string): MisiHarian[] {
  const hari = nomorHari(tanggal);
  const g = golonganHariIni(tanggal);
  const nama = GOLONGAN[g].nama;
  const warna = WARNA_KARTU[g];

  const pilih = (tingkat: TingkatHarian, hindariGolongan: boolean): Templat => {
    const pool = KUMPULAN[tingkat];
    let i = acak(hari, GARAM[tingkat]) % pool.length;
    // Jangan dua misi bertema golongan di hari yang sama — variasi lebih baik.
    if (hindariGolongan && pool[i].bertemaGolongan) i = (i + 1) % pool.length;
    return pool[i];
  };

  const belajar = pilih('belajar', false);
  const pemanasan = pilih('pemanasan', Boolean(belajar.bertemaGolongan));
  const tantangan = pilih('tantangan', false);

  return (
    [
      ['pemanasan', pemanasan],
      ['belajar', belajar],
      ['tantangan', tantangan],
    ] as const
  ).map(([tingkat, t]) => ({
    id: t.kunci,
    judul: t.judul(nama, warna),
    deskripsi: t.deskripsi(nama, warna),
    tipe: t.tipe,
    target: t.target(g),
    poinReward: POIN_HARIAN[tingkat],
    badgeReward: null,
    tingkat,
    bertemaGolongan: Boolean(t.bertemaGolongan),
  }));
}

// ── Bonus Lengkap & streak ───────────────────────────────────────────
export const BONUS_LENGKAP_DASAR = 100;
export const BONUS_LENGKAP_PER_HARI = 25;
export const BONUS_LENGKAP_MAKS_HARI = 7;

/** Bonus saat ketiga misi hari ini selesai; naik seiring streak (maks di hari ke-7). */
export function bonusLengkap(streak: number): number {
  const n = Math.min(Math.max(Math.floor(streak) || 1, 1), BONUS_LENGKAP_MAKS_HARI);
  return BONUS_LENGKAP_DASAR + BONUS_LENGKAP_PER_HARI * (n - 1);
}

/** Streak setelah `hariIni` dilengkapi. `terakhir` = tanggal lengkap sebelumnya. */
export function streakSetelahLengkap(
  terakhir: string | null,
  streakLama: number,
  hariIni: string,
): number {
  if (terakhir === hariIni) return Math.max(streakLama, 1);
  if (terakhir === geserTanggal(hariIni, -1)) return Math.max(streakLama, 0) + 1;
  return 1;
}

/**
 * Streak yang masih "menyala" untuk ditampilkan: tetap hidup bila terakhir
 * lengkap hari ini atau kemarin (masih bisa disambung hari ini); selain itu 0.
 */
export function streakAktif(
  terakhir: string | null,
  streak: number,
  hariIni: string,
): number {
  if (!terakhir) return 0;
  return terakhir === hariIni || terakhir === geserTanggal(hariIni, -1) ? streak : 0;
}

/** Lencana dari Misi Harian (metadata tampil ada di `data/misiBadge.ts`). */
export const SYARAT_BADGE_HARIAN: {
  id: string;
  streak?: number;
  totalLengkap?: number;
}[] = [
  { id: 'harian-streak-3', streak: 3 },
  { id: 'harian-streak-7', streak: 7 },
  { id: 'harian-total-10', totalLengkap: 10 },
];

/** Lencana harian yang baru layak diberikan (belum ada di `sudah`). */
export function badgeHarianBaru(
  streak: number,
  totalLengkap: number,
  sudah: readonly string[],
): string[] {
  return SYARAT_BADGE_HARIAN.filter(
    (b) =>
      !sudah.includes(b.id) &&
      ((b.streak !== undefined && streak >= b.streak) ||
        (b.totalLengkap !== undefined && totalLengkap >= b.totalLengkap)),
  ).map((b) => b.id);
}

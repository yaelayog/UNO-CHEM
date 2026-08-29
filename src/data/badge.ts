import type { Golongan } from './types';
import type { Progres } from '../lib/progres';

export interface Badge {
  id: string;
  nama: string;
  deskripsi: string;
  ikon: string;
  /** Terbuka bila fungsi ini true untuk progres saat itu. */
  syarat: (p: Progres) => boolean;
}

const AMBANG_MASTER_GOLONGAN = 12;

const MASTER: { g: Golongan; nama: string; ikon: string }[] = [
  { g: 'alkali', nama: 'Master Golongan Alkali', ikon: '🔥' },
  { g: 'alkaliTanah', nama: 'Master Alkali Tanah', ikon: '🪨' },
  { g: 'halogen', nama: 'Master Halogen', ikon: '🧂' },
  { g: 'gasMulia', nama: 'Master Gas Mulia', ikon: '🎈' },
  { g: 'transisi', nama: 'Master Logam Transisi', ikon: '⚙️' },
];

export const SEMUA_BADGE: Badge[] = [
  ...MASTER.map(({ g, nama, ikon }) => ({
    id: `master-${g}`,
    nama,
    ikon,
    deskripsi: `${AMBANG_MASTER_GOLONGAN} jawaban kuis benar bertema golongan ini`,
    syarat: (p: Progres) =>
      (p.benarPerGolongan[g] ?? 0) >= AMBANG_MASTER_GOLONGAN,
  })),
  {
    id: 'juara-pertama',
    nama: 'Kemenangan Pertama',
    ikon: '🏆',
    deskripsi: 'Menangkan 1 permainan',
    syarat: (p) => p.gameDimenangkan >= 1,
  },
  {
    id: 'juara-lima',
    nama: 'Juara Kelas',
    ikon: '👑',
    deskripsi: 'Menangkan 5 permainan',
    syarat: (p) => p.gameDimenangkan >= 5,
  },
  {
    id: 'beruntun-5',
    nama: 'Reaksi Berantai',
    ikon: '⚡',
    deskripsi: 'Jawab 5 kuis benar berturut-turut',
    syarat: (p) => p.streakTerbaik >= 5,
  },
  {
    id: 'ilmuwan',
    nama: 'Ilmuwan Muda',
    ikon: '🔬',
    deskripsi: '50 jawaban kuis benar (total)',
    syarat: (p) => p.kuisBenar >= 50,
  },
  {
    id: 'ahli-kimia',
    nama: 'Ahli Kimia',
    ikon: '⚗️',
    deskripsi: '150 jawaban kuis benar (total)',
    syarat: (p) => p.kuisBenar >= 150,
  },
  {
    id: 'kolektor',
    nama: 'Rajin Berlatih',
    ikon: '📚',
    deskripsi: 'Mainkan 10 permainan',
    syarat: (p) => p.gameDimainkan >= 10,
  },
  {
    id: 'sempurna',
    nama: 'Nilai Sempurna',
    ikon: '💯',
    deskripsi: 'Menang dengan semua kuis dijawab benar',
    syarat: (p) => p.gameSempurna >= 1,
  },
];

/** Id badge yang syaratnya terpenuhi sekarang. */
export function badgeTerbuka(p: Progres): string[] {
  return SEMUA_BADGE.filter((b) => b.syarat(p)).map((b) => b.id);
}

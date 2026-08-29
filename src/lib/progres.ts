import type { Golongan } from '../data/types';
import { badgeTerbuka } from '../data/badge';

const KEY = 'chemuno:progres';

export interface Progres {
  xp: number;
  gameDimainkan: number;
  gameDimenangkan: number;
  gameSempurna: number;
  kuisBenar: number;
  kuisTotal: number;
  streakTerbaik: number;
  benarPerGolongan: Partial<Record<Golongan, number>>;
  badge: string[];
}

export function progresDefault(): Progres {
  return {
    xp: 0,
    gameDimainkan: 0,
    gameDimenangkan: 0,
    gameSempurna: 0,
    kuisBenar: 0,
    kuisTotal: 0,
    streakTerbaik: 0,
    benarPerGolongan: {},
    badge: [],
  };
}

export function bacaProgres(): Progres {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return progresDefault();
    return { ...progresDefault(), ...(JSON.parse(raw) as Partial<Progres>) };
  } catch {
    return progresDefault();
  }
}

export function simpanProgres(p: Progres): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* abaikan (mode privat / storage penuh) */
  }
}

export function resetProgres(): Progres {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* abaikan */
  }
  return progresDefault();
}

// ── Level ───────────────────────────────────────────────────────────
// XP kumulatif untuk mencapai level n = 100 · n(n-1)/2.
export function xpUntukLevel(level: number): number {
  return (100 * level * (level - 1)) / 2;
}

export function levelDariXp(xp: number): number {
  return Math.floor((1 + Math.sqrt(1 + (8 * xp) / 100)) / 2);
}

/** Kemajuan dalam level saat ini: { level, xpDiLevel, xpButuh, rasio }. */
export function infoLevel(xp: number) {
  const level = levelDariXp(xp);
  const dasar = xpUntukLevel(level);
  const berikut = xpUntukLevel(level + 1);
  const xpDiLevel = xp - dasar;
  const xpButuh = berikut - dasar;
  return { level, xpDiLevel, xpButuh, rasio: xpButuh === 0 ? 1 : xpDiLevel / xpButuh };
}

// ── Rekam hasil satu permainan ──────────────────────────────────────
export interface RingkasanGame {
  menang: boolean;
  kuisBenar: number;
  kuisTotal: number;
  streakTerbaik: number;
  benarPerGolongan: Partial<Record<Golongan, number>>;
}

export interface HasilRekam {
  progres: Progres;
  xpDidapat: number;
  levelSebelum: number;
  levelSesudah: number;
  badgeBaru: string[];
}

const XP_MENANG = 120;
const XP_SELESAI = 30;
const XP_PER_KUIS_BENAR = 12;
const XP_SEMPURNA = 50;

export function tambahHasilGame(
  lama: Progres,
  r: RingkasanGame,
): HasilRekam {
  const sempurna = r.menang && r.kuisTotal >= 2 && r.kuisBenar === r.kuisTotal;

  const xpDidapat =
    XP_SELESAI +
    (r.menang ? XP_MENANG : 0) +
    r.kuisBenar * XP_PER_KUIS_BENAR +
    r.streakTerbaik * 5 +
    (sempurna ? XP_SEMPURNA : 0);

  const benarPerGolongan = { ...lama.benarPerGolongan };
  for (const [g, n] of Object.entries(r.benarPerGolongan) as [
    Golongan,
    number,
  ][]) {
    benarPerGolongan[g] = (benarPerGolongan[g] ?? 0) + n;
  }

  const baru: Progres = {
    xp: lama.xp + xpDidapat,
    gameDimainkan: lama.gameDimainkan + 1,
    gameDimenangkan: lama.gameDimenangkan + (r.menang ? 1 : 0),
    gameSempurna: lama.gameSempurna + (sempurna ? 1 : 0),
    kuisBenar: lama.kuisBenar + r.kuisBenar,
    kuisTotal: lama.kuisTotal + r.kuisTotal,
    streakTerbaik: Math.max(lama.streakTerbaik, r.streakTerbaik),
    benarPerGolongan,
    badge: lama.badge,
  };

  const sebelum = new Set(lama.badge.length ? lama.badge : badgeTerbuka(lama));
  const sesudah = badgeTerbuka(baru);
  const badgeBaru = sesudah.filter((id) => !sebelum.has(id));
  baru.badge = sesudah;

  return {
    progres: baru,
    xpDidapat,
    levelSebelum: levelDariXp(lama.xp),
    levelSesudah: levelDariXp(baru.xp),
    badgeBaru,
  };
}

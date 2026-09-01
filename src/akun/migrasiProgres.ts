import type { Golongan } from '../data/types';
import { progresDefault, type Progres } from '../lib/progres';

/**
 * Gabungkan progres di device (localStorage) dengan progres yang tersimpan di
 * akun server. Tiap metrik diambil nilai terbaiknya supaya tidak ada progres
 * yang hilang saat murid membuat / memakai akun di device yang sudah pernah
 * dipakai bermain tanpa akun (SPEC bagian 10, Minggu 1 poin 4).
 *
 * Fungsi murni — tanpa efek samping, mudah diuji.
 */
export function gabungProgres(
  lokal: Progres,
  server: Partial<Progres> | null | undefined,
): Progres {
  const s: Progres = { ...progresDefault(), ...(server ?? {}) };

  const benarPerGolongan: Partial<Record<Golongan, number>> = {
    ...s.benarPerGolongan,
  };
  for (const [g, n] of Object.entries(lokal.benarPerGolongan) as [
    Golongan,
    number,
  ][]) {
    benarPerGolongan[g] = Math.max(benarPerGolongan[g] ?? 0, n);
  }

  return {
    xp: Math.max(lokal.xp, s.xp),
    gameDimainkan: Math.max(lokal.gameDimainkan, s.gameDimainkan),
    gameDimenangkan: Math.max(lokal.gameDimenangkan, s.gameDimenangkan),
    gameSempurna: Math.max(lokal.gameSempurna, s.gameSempurna),
    kuisBenar: Math.max(lokal.kuisBenar, s.kuisBenar),
    kuisTotal: Math.max(lokal.kuisTotal, s.kuisTotal),
    streakTerbaik: Math.max(lokal.streakTerbaik, s.streakTerbaik),
    benarPerGolongan,
    badge: [...new Set([...lokal.badge, ...s.badge])],
  };
}

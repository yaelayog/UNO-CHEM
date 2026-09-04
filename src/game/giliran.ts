import type { GameState } from './types';

/** Ambang AFK: cukup lama diam (tapi masih terhubung) sebelum bot pintar
 * membantu SATU giliran. Dipakai store (solo) & Edge Function (online). */
export const AMBANG_AFK_MS = 20_000;

/**
 * Kunci "apa yang sedang ditunggu" — berubah setiap kali giliran/target
 * kuis berpindah. `null` untuk fase yang bukan giliran murni (pembukaan,
 * peristiwa, game selesai) — AFK-timeout tak berlaku di situ.
 */
function kunciGiliran(s: GameState): string | null {
  if (s.status === 'bermain' || s.status === 'menungguPilihWarna') {
    return `${s.status}:${s.giliran}`;
  }
  if (s.status === 'menungguKuis' && s.efekTertunda) {
    return `kuis:${s.efekTertunda.targetPemainId}`;
  }
  return null;
}

/**
 * Isi/segarkan `giliranSejak` kalau `giliranKunci` berubah (giliran baru).
 * Dipanggil lapisan store (klien) / Edge Function (server) — pakai jam
 * masing-masing, mirip `stampUno`.
 */
export function stampGiliran(state: GameState): GameState {
  const kunci = kunciGiliran(state);
  if (kunci === state.giliranKunci) return state;
  return {
    ...state,
    giliranKunci: kunci,
    giliranSejak: kunci === null ? 0 : Date.now(),
  };
}

/** ms sejak giliran/kuis saat ini mulai menunggu — 0 bila tak relevan. */
export function diamSejakGiliran(state: GameState): number {
  if (state.giliranSejak === 0) return 0;
  return Date.now() - state.giliranSejak;
}

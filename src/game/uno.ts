import { tangkapUno } from './engine';
import type { GameState } from './types';

/** Batas waktu menyatakan "UNO!" sebelum otomatis tertangkap "Lawan". */
export const BATAS_UNO_MS = 4000;

/**
 * Isi `uno.padaMs` untuk status UNO baru (engine set 0). Dipanggil lapisan
 * store (klien) / Edge Function (server) — pakai jam masing-masing sebagai
 * acuan waktu balapan.
 */
export function stampUno(state: GameState): GameState {
  if (state.uno && state.uno.padaMs === 0) {
    return { ...state, uno: { ...state.uno, padaMs: Date.now() } };
  }
  return state;
}

/**
 * Kalau UNO belum dinyatakan dan batas waktu terlewati → pemain tertangkap
 * (penangkap null = "Lawan"). Mengembalikan state apa adanya bila belum lewat.
 */
export function cekUnoKadaluarsa(state: GameState): GameState {
  const u = state.uno;
  if (u && !u.dinyatakan && u.padaMs > 0 && Date.now() - u.padaMs > BATAS_UNO_MS) {
    return tangkapUno(state, null, u.pemainId);
  }
  return state;
}

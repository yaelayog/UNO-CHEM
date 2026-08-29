import { tangkapUno } from './engine';
import type { GameState } from './types';

/** Batas waktu menyatakan "UNO!" sebelum otomatis tertangkap "Lawan". */
export const BATAS_UNO_MS = 10000;

/**
 * true bila sedang ada modal yang menutupi papan → hitung mundur UNO dibekukan.
 * `abaikanKartuFakta`: mode online — kartu Fun Fact / Fakta TIDAK memblokir
 * permainan (ditutup per orang), jadi hitung mundur UNO tetap jalan.
 */
function terhalangModal(s: GameState, abaikanKartuFakta = false): boolean {
  return Boolean(
    s.peristiwaAktif ||
      (!abaikanKartuFakta && (s.funFactAktif || s.faktaReward)) ||
      s.menungguPembukaan ||
      s.status === 'menungguKuis' ||
      s.status === 'menungguPilihWarna',
  );
}

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

/** Reset hitung mundur UNO — dipakai saat modal (Peristiwa/Fun Fact/Fakta) ditutup. */
export function segarkanUno(state: GameState): GameState {
  if (state.uno && !state.uno.dinyatakan) {
    return { ...state, uno: { ...state.uno, padaMs: 0 } };
  }
  return state;
}

/**
 * Kalau UNO belum dinyatakan & batas waktu lewat (dan tak ada modal yang
 * membekukan hitung mundur) → pemain tertangkap "Lawan".
 * `abaikanKartuFakta` dipakai server online (kartu Fun Fact / Fakta tak memblokir).
 */
export function cekUnoKadaluarsa(
  state: GameState,
  opsi: { abaikanKartuFakta?: boolean } = {},
): GameState {
  const u = state.uno;
  if (
    u &&
    !u.dinyatakan &&
    u.padaMs > 0 &&
    !terhalangModal(state, opsi.abaikanKartuFakta) &&
    Date.now() - u.padaMs > BATAS_UNO_MS
  ) {
    return tangkapUno(state, null, u.pemainId);
  }
  return state;
}

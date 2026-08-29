import { SEMUA_FUNFACT } from '../data/funfact';
import { kocok } from './rng';
import type { FunFactAktif, GameState } from './types';

/** Fun Fact muncul tiap 1 putaran penuh = sebanyak `jumlah pemain` giliran. */
export function giliranPerPutaran(state: GameState): number {
  return state.pemain.length;
}

/** Lama tampil kartu Fun Fact (detik) — 15–30, makin panjang teks makin lama. */
export function bacaDetikUntuk(teks: string): number {
  return Math.min(30, Math.max(15, Math.round(teks.length / 9)));
}

/** Deck Fun Fact = daftar id yang sudah dikocok. */
export function buatDeckFunFact(rngState: number): [string[], number] {
  return kocok(
    SEMUA_FUNFACT.map((f) => f.id),
    rngState,
  );
}

/**
 * Memunculkan 1 Fun Fact untuk dibaca semua pemain. Fungsi murni: mengembalikan
 * GameState baru dengan `funFactAktif` terisi. Tidak mengubah kartu siapa pun.
 * Bila deck habis, diisi ulang (dikocok) supaya fakta terus berganti.
 */
export function picuFunFact(state: GameState): GameState {
  const s = structuredClone(state);

  if (s.funFactDrawPile.length === 0) {
    [s.funFactDrawPile, s.rng] = buatDeckFunFact(s.rng);
  }
  if (s.funFactDrawPile.length === 0) return s; // SEMUA_FUNFACT kosong (mustahil)

  const id = s.funFactDrawPile.pop()!;
  const fakta = SEMUA_FUNFACT.find((f) => f.id === id);
  if (!fakta) return s;

  s.funFactAktif = {
    id: fakta.id,
    teks: fakta.teks,
    golongan: fakta.golongan,
    ikon: fakta.ikon,
    bacaDetik: bacaDetikUntuk(fakta.teks),
    bantuSoal: fakta.bantuSoal,
  } satisfies FunFactAktif;
  // Fakta yang muncul → soal terkait jadi lebih mungkin terpilih di kuis nanti.
  s.funFactTerlihat = [...new Set([...s.funFactTerlihat, ...fakta.bantuSoal])];
  // Fun Fact putaran baru menggantikan kartu Fakta streak yang mungkin
  // masih tersisa di state (dismiss kartu bersifat lokal per klien).
  s.faktaReward = null;
  s.log.push(`Fun Fact: ${fakta.teks}`);

  return s;
}

/**
 * Picu Fun Fact bila putaran penuh baru saja tuntas (pakai penanda `funFactRonde`
 * di state supaya tetap muncul di kesempatan 'bermain' berikutnya kalau batas
 * putaran jatuh saat kuis / berbarengan Kartu Peristiwa). Murni.
 */
export function picuFunFactBila(state: GameState): GameState {
  if (state.status !== 'bermain' || state.peristiwaAktif) {
    return state;
  }
  // Catatan: `funFactAktif` yang masih terpasang TIDAK menghalangi — putaran
  // baru menimpanya (dismiss kartu bersifat lokal per klien, bukan state game).
  const ronde = Math.floor(state.giliranKe / giliranPerPutaran(state));
  if (ronde <= state.funFactRonde) return state;
  const next = picuFunFact(state);
  if (next.funFactAktif) next.funFactRonde = ronde;
  return next;
}

// Redaksi state: pisahkan info rahasia (isi tangan tiap pemain) dari state
// publik yang boleh dilihat semua klien. Dipakai Edge Function `aksi`.
import type { GameState, KartuKimia } from './game/index.ts';

export interface PemainPublik {
  id: string;
  nama: string;
  isBot: boolean;
  tanganJumlah: number;
  tangan: [];
}

export type StatePublik = Omit<GameState, 'pemain' | 'drawPile'> & {
  pemain: PemainPublik[];
  drawPile: [];
  drawJumlah: number;
};

/** State yang aman dikirim ke semua klien: isi tangan lawan → jumlah saja. */
export function redaksiState(full: GameState): StatePublik {
  const { pemain, drawPile, discardPile, log, ...sisa } = full;
  return {
    ...sisa,
    pemain: pemain.map((p) => ({
      id: p.id,
      nama: p.nama,
      isBot: p.isBot,
      tanganJumlah: p.tangan.length,
      tangan: [],
    })),
    drawPile: [],
    drawJumlah: drawPile.length,
    // Cukup 2 kartu teratas (untuk render + animasi); sisanya rahasia.
    discardPile: discardPile.slice(-2),
    log: log.slice(-15),
  };
}

/** Isi tangan per pemain (untuk tabel `tangan`, RLS per-pemain). */
export function pisahTangan(
  full: GameState,
): { pemain: string; kartu: KartuKimia[] }[] {
  return full.pemain.map((p) => ({ pemain: p.id, kartu: p.tangan }));
}

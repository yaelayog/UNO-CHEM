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
  const { pemain, drawPile, discardPile, log, soalAktif: _soal, ...sisa } = full;
  return {
    ...sisa,
    // Soal kuis TIDAK disiarkan — hanya pemain yang ditarget yang boleh melihat
    // (dikirim privat lewat tabel `tangan`). Lihat `pisahTangan`.
    soalAktif: null,
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

/**
 * Isi tangan + soal privat per pemain (untuk tabel `tangan`, RLS per-pemain).
 * `soal` hanya terisi untuk pemain yang sedang jadi target kuis.
 */
export function pisahTangan(
  full: GameState,
): { pemain: string; kartu: KartuKimia[]; soal: GameState['soalAktif'] }[] {
  const targetKuis =
    full.status === 'menungguKuis' && full.soalAktif
      ? full.efekTertunda?.targetPemainId
      : undefined;
  return full.pemain.map((p) => ({
    pemain: p.id,
    kartu: p.tangan,
    soal: p.id === targetKuis ? full.soalAktif : null,
  }));
}

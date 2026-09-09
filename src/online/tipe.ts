import type { GameState } from '../game';

export interface PemainPublik {
  id: string;
  nama: string;
  isBot: boolean;
  tanganJumlah: number;
  tangan: [];
}

/** GameState versi publik (isi tangan lawan → jumlah). Dikirim server via Realtime. */
export type StatePublik = Omit<GameState, 'pemain' | 'drawPile'> & {
  pemain: PemainPublik[];
  drawPile: [];
  drawJumlah: number;
};

export interface RosterRow {
  room_code: string;
  pemain: string;
  nama: string;
  is_bot: boolean;
  urutan: number;
  terhubung: boolean;
  last_seen: string;
  /** true = masih ikut sesi ini (join awal atau menekan "Main Lagi"). false =
   * peserta permainan sebelumnya yang belum/tak menekan "Main Lagi" — dianggap
   * keluar, kursinya diisi bot saat host menekan Mulai. */
  siap_lagi: boolean;
  siap_lagi_pada: string;
}

export interface RoomRow {
  code: string;
  host: string;
  status: 'lobby' | 'bermain' | 'selesai';
  target_pemain: number;
  pakai_peristiwa: boolean;
  /** Host yang berlaku sekarang — sama dengan `host`, kecuali host asli belum
   * menekan "Main Lagi" di lobby rematch: giliran host jatuh ke pemain
   * pertama yang sudah menekan "Main Lagi". Dihitung server-side. */
  hostEfektif?: string;
}

export interface HasilSync {
  roster: RosterRow[];
  versi: number;
  statePublik: StatePublik | null;
  tanganku: import('../game').KartuKimia[];
  soalPrivat: import('../game').SoalKuis | null;
}

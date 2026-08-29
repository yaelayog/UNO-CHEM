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
}

export interface RoomRow {
  code: string;
  host: string;
  status: 'lobby' | 'bermain' | 'selesai';
  target_pemain: number;
  pakai_peristiwa: boolean;
}

export interface HasilSync {
  roster: RosterRow[];
  versi: number;
  statePublik: StatePublik | null;
  tanganku: import('../game').KartuKimia[];
  soalPrivat: import('../game').SoalKuis | null;
}

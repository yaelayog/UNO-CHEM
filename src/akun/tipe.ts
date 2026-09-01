import type { Progres } from '../lib/progres';

/** Identitas murid ringan (Nama + PIN). `Budi#4821` = `nama` + `#` + `kodeUnik`. */
export interface AkunMurid {
  id: string;
  nama: string;
  kodeUnik: string;
  kelasId: string | null;
  kelasNama: string | null;
}

/** Progres persisten di akun (lapisan Fase 4 + blob localStorage lama). */
export interface ProgresAkun {
  totalPoin: number;
  peringkatGolonganAktif: number;
  peringkatGolonganRekor: number;
  badgeDiraih: string[];
  riwayatAkurasiPerGolongan: Record<string, { benar: number; total: number }>;
  progresLokal: Partial<Progres>;
}

export interface PilihanAkun {
  kodeUnik: string;
  kelasNama: string | null;
}

/** Balasan Edge Function `akun`. */
export interface HasilAkun {
  murid?: AkunMurid;
  progres?: ProgresAkun | null;
  token?: string;
  /** Diisi bila > 1 akun cocok Nama+PIN — murid harus memilih kode uniknya. */
  pilihan?: PilihanAkun[];
  ok?: boolean;
  error?: string;
}

export const namaTampil = (m: AkunMurid) => `${m.nama}#${m.kodeUnik}`;

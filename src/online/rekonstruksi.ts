import type { GameState, KartuKimia } from '../game';
import type { StatePublik } from './tipe';

const KARTU_KOSONG: Omit<KartuKimia, 'id'> = {
  simbol: '',
  namaUnsur: '',
  nomorAtom: 0,
  periode: 0,
  golongan: null,
  warnaUno: null,
  jenis: 'angka',
};

/**
 * Susun ulang bentuk `GameState` untuk UI dari state publik + tangan sendiri.
 * Tangan lawan & tumpukan tarik cukup diisi kartu placeholder (UI hanya butuh
 * jumlahnya). Cukup untuk render meja, `langkahLegal` pemain sendiri, dsb.
 */
export function rekonstruksiState(
  pub: StatePublik,
  tanganku: KartuKimia[],
  uid: string,
): GameState {
  const isi = (n: number, prefix: string): KartuKimia[] =>
    Array.from({ length: Math.max(0, n) }, (_, i) => ({
      ...KARTU_KOSONG,
      id: `${prefix}-${i}`,
    }));

  return {
    ...pub,
    pemain: pub.pemain.map((p) => ({
      id: p.id,
      nama: p.nama,
      isBot: p.isBot,
      tangan: p.id === uid ? tanganku : isi(p.tanganJumlah, `${p.id}-h`),
    })),
    drawPile: isi(pub.drawJumlah, 'draw'),
  } as GameState;
}

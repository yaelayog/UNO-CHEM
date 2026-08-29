// Fungsi murni inti (bagian 6 dari brief) — sengaja dipisah total dari UI.
// Dipakai ulang nanti untuk validasi langkah di server (Fase 3).

export type HasilKuis = 'benarCepat' | 'benarLambat' | 'salah';

/**
 * Menghitung jumlah kartu penalti akhir setelah pemain yang terkena efek
 * menjawab kuis.
 * - benarCepat  (jawab benar <= 5 detik) -> penalti dihapus total
 * - benarLambat (jawab benar, > 5 detik) -> penalti dibagi dua, dibulatkan bawah
 * - salah / waktu habis                  -> penalti penuh
 */
export function hitungPenaltiAkhir(
  penaltiDasar: number,
  hasilKuis: HasilKuis,
): number {
  if (hasilKuis === 'benarCepat') return 0;
  if (hasilKuis === 'benarLambat') return Math.floor(penaltiDasar / 2);
  return penaltiDasar;
}

// Kuis pindah ke src/game/ agar bisa dipakai ulang di sisi server (Fase 3).
// File ini dipertahankan sebagai re-export supaya import lama tetap jalan.
export {
  pilihSoal,
  BATAS_WAKTU_KUIS_DETIK,
  AMBANG_CEPAT_DETIK,
} from '../game/kuis';

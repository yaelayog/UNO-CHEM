// Antrean laporan akhir sesi solo (`akun/tambahPoin`) di localStorage.
//
// Laporan disimpan DULU, baru dikirim. Bila gagal (sinyal putus, server sibuk),
// laporan tetap di antrean dan dikirim ulang: sesudah permainan berikutnya,
// saat aplikasi dibuka, dan saat perangkat kembali online. `sesiId` unik membuat
// server mengabaikan laporan yang ternyata sudah pernah diproses.

const KUNCI = 'chemuno:laporanTertunda';
/** Laporan lebih tua dari ini dibuang (misi harian-nya pun sudah lewat). */
export const UMUR_MAKS_MS = 3 * 24 * 60 * 60 * 1000;
/** Batas percobaan untuk galat yang bukan jaringan (mis. bug server). */
export const PERCOBAAN_MAKS = 5;

export interface LaporanSesi {
  sesiId: string;
  /** Token murid saat permainan selesai — poin masuk ke akun yang benar. */
  token: string;
  dibuat: number;
  percobaan: number;
  payload: Record<string, unknown>;
}

export function buatSesiId(): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  } catch {
    /* konteks tak aman */
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function bacaAntrian(): LaporanSesi[] {
  try {
    const isi = JSON.parse(localStorage.getItem(KUNCI) ?? '[]');
    return Array.isArray(isi) ? (isi as LaporanSesi[]) : [];
  } catch {
    return [];
  }
}

export function simpanAntrian(daftar: LaporanSesi[]) {
  try {
    if (daftar.length) localStorage.setItem(KUNCI, JSON.stringify(daftar));
    else localStorage.removeItem(KUNCI);
  } catch {
    /* mode privat / storage penuh */
  }
}

/** Galat yang layak dicoba lagi nanti (jaringan / server), bukan sesi tak valid. */
export function galatSementara(pesan: string): boolean {
  return !/tidak valid|token kosong|401/i.test(pesan);
}

/** Buang laporan yang kedaluwarsa atau sudah terlalu sering gagal. */
export function rapikanAntrian(daftar: LaporanSesi[], sekarang = Date.now()): LaporanSesi[] {
  return daftar.filter(
    (l) => sekarang - l.dibuat < UMUR_MAKS_MS && l.percobaan < PERCOBAAN_MAKS,
  );
}

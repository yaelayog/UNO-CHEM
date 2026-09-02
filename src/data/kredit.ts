// Identitas & dokumentasi wajib untuk halaman "Tentang" (lomba media pembelajaran).
// ISI bagian bertanda TODO sesuai data timmu sebelum submit.

export const KREDIT = {
  // ── Identitas pengembang ──────────────────────────────────────────
  pengembang: 'TODO: Nama pengembang / tim', // mis. "Tim ChemUno — Yael A. & ..."
  instansi: 'TODO: Nama sekolah / instansi',
  pembimbing: 'TODO: Nama guru pembimbing (opsional)',
  tahun: '2026',
  kompetisi: 'TODO: Nama lomba media pembelajaran',

  // ── Sasaran ───────────────────────────────────────────────────────
  jenjang: 'SMA (Fase E) / sederajat',
  mataPelajaran: 'Kimia — Struktur Atom & Sistem Periodik Unsur',

  // ── Capaian & tujuan pembelajaran ────────────────────────────────
  capaian:
    'Peserta didik mampu menganalisis kecenderungan sifat keperiodikan unsur ' +
    'dan hubungannya dengan konfigurasi elektron, serta menjelaskan pembentukan ' +
    'ikatan kimia sederhana (ion & kovalen).',
  tujuan: [
    'Mengelompokkan unsur berdasarkan golongan dan periode pada tabel periodik.',
    'Menghubungkan nomor golongan dengan jumlah elektron valensi dan nomor periode dengan jumlah kulit.',
    'Membandingkan sifat keperiodikan (jari-jari atom, energi ionisasi, keelektronegatifan) dalam satu golongan dan satu periode.',
    'Menjelaskan sifat khas golongan alkali, alkali tanah, halogen, gas mulia, dan logam transisi.',
    'Menjelaskan pembentukan ikatan ion dan ikatan kovalen dari kecenderungan unsur mencapai kestabilan.',
  ],

  // ── Petunjuk penggunaan singkat ─────────────────────────────────
  petunjuk: [
    'Buka aplikasi di browser HP atau komputer. Bisa dipasang (PWA) agar jalan tanpa internet.',
    'Pilih "Mulai Main (vs Bot)" untuk latihan sendiri, atau "Main Online" untuk bermain bersama teman lewat kode room.',
    'Cocokkan kartu di tangan dengan kartu teratas berdasarkan WARNA (golongan) atau ANGKA (periode).',
    'Kartu aksi memunculkan kuis kimia — jawaban benar mengurangi hukuman kartu.',
    'Buat akun (Nama + PIN) untuk menyimpan progres, naik Peringkat Golongan, dan ikut leaderboard.',
    'Guru dapat membuat kelas dan memantau progres murid lewat menu Akun → Guru.',
  ],
} as const;

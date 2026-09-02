// Identitas & dokumentasi wajib untuk halaman "Tentang" (lomba media pembelajaran).
// ISI bagian bertanda TODO sesuai data timmu sebelum submit.

export const KREDIT = {
  // ── Identitas pengembang ──────────────────────────────────────────
  namaTim: 'Tim ChemUno',
  anggota: [
    { nama: 'Putra Yoga Nugraha', nim: '2305026024' },
    { nama: 'M. Rian Jafar Shodiq', nim: '2505026010' },
    { nama: 'Fico Fristand Thomas', nim: '2505026024' },
  ],
  instansi: 'Universitas Mulawarman',
  pembimbing: '' as string, // belum ada dosen pembimbing — dikosongkan (tidak ditampilkan)
  tahun: '2026',
  kompetisi:
    'Lomba Media Pembelajaran Digital FORKOM FKIP 2026 — ' +
    'Kategori Gamifikasi Pembelajaran (SAINTEK)',

  // ── Sasaran ───────────────────────────────────────────────────────
  // Ringkas; CP & TP detail ada di layar "CP & Tujuan Pembelajaran".
  jenjang: 'SMA Kelas XI — Mapel Kimia (Fase F) · Materi: Sistem Periodik Unsur',

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

// Sumber: docs/CP-TP_Sistem_Periodik_Unsur.md (versi terbaru).
// Ditampilkan di layar "CP & Tujuan Pembelajaran" (src/screens/CPTPScreen.tsx).

export interface TujuanPembelajaran {
  no: number;
  /** Teks TP; verba operasional ditandai **tebal**. */
  teks: string;
  dimensi: 'C2' | 'C3';
  dimensiLabel: string;
  /** Catatan kecil (mis. TP2 di luar cakupan game). */
  catatan?: string;
}

export const CPTP: {
  mataPelajaran: string;
  fase: string;
  kelas: string;
  elemen: string;
  materi: string;
  cpKutipan: string;
  cpElaborasi: string;
  tujuan: TujuanPembelajaran[];
} = {
  mataPelajaran: 'Kimia',
  fase: 'F',
  kelas: 'XI',
  elemen: 'Pemahaman Kimia',
  materi: 'Sistem Periodik Unsur',

  cpKutipan:
    'menganalisis hubungan struktur atom dengan sistem periodik unsur',
  cpElaborasi:
    'Pada akhir materi ini, murid mampu menganalisis konfigurasi elektron ' +
    'berdasarkan model atom mekanika kuantum, mengaitkannya dengan letak unsur ' +
    '(golongan dan periode) dalam sistem periodik, serta menganalisis dan ' +
    'memprediksi kecenderungan sifat-sifat periodik unsur (jari-jari atom, ' +
    'energi ionisasi, afinitas elektron, keelektronegatifan, dan sifat ' +
    'logam–nonlogam) untuk menjelaskan sifat fisik dan kimia suatu unsur ' +
    'berdasarkan posisinya dalam tabel periodik.',

  tujuan: [
    {
      no: 1,
      dimensi: 'C2',
      dimensiLabel: 'Memahami',
      teks:
        'Peserta didik mampu **menjelaskan** secara singkat perkembangan sistem ' +
        'periodik unsur dari Mendeleev hingga sistem periodik modern (berdasarkan ' +
        'kenaikan nomor atom).',
    },
    {
      no: 2,
      dimensi: 'C3',
      dimensiLabel: 'Menerapkan',
      teks:
        'Peserta didik mampu **menuliskan** konfigurasi elektron unsur golongan ' +
        'utama menggunakan aturan dasar (kulit dan subkulit, aturan Aufbau).',
      catatan: 'Di luar cakupan interaktif — didampingi guru secara terpisah',
    },
    {
      no: 3,
      dimensi: 'C3',
      dimensiLabel: 'Menerapkan',
      teks:
        'Peserta didik mampu **membandingkan** kecenderungan umum jari-jari atom, ' +
        'energi ionisasi, dan keelektronegatifan dalam satu golongan dan satu periode.',
    },
    {
      no: 4,
      dimensi: 'C3',
      dimensiLabel: 'Menerapkan',
      teks:
        'Peserta didik mampu **mengidentifikasi** sifat logam dan nonlogam suatu ' +
        'unsur berdasarkan letaknya pada tabel periodik.',
    },
    {
      no: 5,
      dimensi: 'C3',
      dimensiLabel: 'Menerapkan',
      teks:
        'Peserta didik mampu **mengaitkan** letak unsur dalam sistem periodik ' +
        'dengan contoh penerapannya dalam kehidupan sehari-hari, serta ' +
        'menyampaikan hasil diskusi secara sederhana.',
    },
  ],
};

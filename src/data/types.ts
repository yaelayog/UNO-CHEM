// Tipe domain data (kimia). Tidak ada tipe state permainan di sini —
// itu milik src/game/. File ini murni "kamus" isi game.

export type Golongan =
  | 'alkali'
  | 'alkaliTanah'
  | 'halogen'
  | 'gasMulia'
  | 'transisi';

export type TingkatKesulitan = 'mudah' | 'sedang' | 'sulit';

/** Jenis kartu pada mekanika UNO. */
export type JenisKartu =
  | 'angka'
  | 'skip'
  | 'reverse'
  | 'draw2'
  | 'wild'
  | 'wild4';

/** Metadata satu golongan: dipakai untuk warna kartu & "fakta menarik" reward. */
export interface InfoGolongan {
  key: Golongan;
  nama: string; // "Logam Alkali"
  nomorGolongan: string; // "IA"
  warnaUno: string; // hex
  deskripsi: string;
  fakta: string[]; // ditampilkan sebagai reward saat buang beruntun segolongan
}

/**
 * Data master satu unsur — murni fakta kimia, tanpa identitas kartu.
 * Deck (KartuKimia dengan id & jenis) dibangun dari daftar ini di Tahap 3.
 */
export interface Unsur {
  simbol: string; // "Na"
  namaUnsur: string; // "Natrium"
  nomorAtom: number;
  periode: number; // 1-7 -> dipakai sebagai "angka" UNO
  golongan: Golongan;
  fakta?: string; // fakta level-unsur (opsional)
}

/**
 * Satu kartu kimia dalam deck permainan. Dibuat oleh generator deck (Tahap 3),
 * bukan ditulis manual. Disimpan di sini agar bentuknya sinkron dgn brief §7.
 */
export interface KartuKimia {
  id: string;
  simbol: string;
  namaUnsur: string;
  nomorAtom: number;
  periode: number;
  golongan: Golongan | null; // null utk wild sebelum warna dipilih
  warnaUno: string | null;
  jenis: JenisKartu;
  faktaMenarik?: string;
  judulEfek?: string; // nama bertema untuk kartu spesial, mis. "Ionisasi"
}

export interface SoalKuis {
  id: string;
  pertanyaan: string;
  pilihan: string[];
  jawabanBenar: number; // index pada `pilihan`
  golonganTerkait: Golongan | 'umum';
  tingkatKesulitan: TingkatKesulitan;
  pembahasan?: string; // ditampilkan setelah dijawab (mode belajar / feedback)
}

/**
 * Kartu "Fun Fact" — muncul otomatis tiap 1 putaran penuh (semua pemain sudah
 * jalan). Murni edukasi: tidak mengubah kartu siapa pun. Fakta yang sudah
 * dilihat pemain manusia membuat soal kuis yang `bantuSoal`-nya cocok lebih
 * mungkin terpilih (bias tak terlihat — lihat `pilihSoal`).
 */
export interface FunFact {
  id: string;
  teks: string;
  golongan: Golongan; // untuk tema warna kartu
  ikon: string; // emoji
  bantuSoal: string[]; // id SoalKuis yang jadi lebih mudah kalau fakta ini disimak
}

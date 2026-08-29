import type { Golongan, KartuKimia, SoalKuis } from '../data/types';
import type { HasilKuis } from './penalti';

export type { KartuKimia, Golongan, SoalKuis } from '../data/types';

export type ArahMain = 1 | -1;

export interface Pemain {
  id: string;
  nama: string;
  isBot: boolean;
  tangan: KartuKimia[];
}

export type JenisEfekPeristiwa = 'positif' | 'negatif' | 'netral';

/** Satu kartu "Peristiwa Kimia" — deck kedua terpisah (brief §6b). */
export interface KartuPeristiwa {
  id: string;
  judul: string;
  deskripsi: string;
  jenisEfek: JenisEfekPeristiwa;
  /** Fungsi murni. `s` sudah berupa salinan yang boleh dimutasi. */
  efek: (s: GameState, pemainId: string) => GameState;
}

/** Status "UNO" — muncul saat kartu seorang pemain tinggal 1. Balapan tombol:
 *  yang bersangkutan pencet dulu = aman; pemain lain pencet dulu / waktu habis
 *  = yang lupa ambil +2 kartu. */
export interface StatusUno {
  pemainId: string;
  dinyatakan: boolean;
  /** ms epoch saat status dibuat — diisi lapisan store/server, engine set 0. */
  padaMs: number;
}

/** Pengumuman hasil UNO — transient, UI menampilkan lalu clear. */
export interface PengumumanUno {
  nama: string;
  jenis: 'aman' | 'tertangkap';
  oleh?: string; // nama penangkap atau 'Lawan'
  ambil?: number; // kartu penalti
}

/** Peristiwa yang baru terpicu — transient, UI menampilkan lalu clear. */
export interface PeristiwaAktif {
  id: string;
  judul: string;
  deskripsi: string;
  jenisEfek: JenisEfekPeristiwa;
  ringkasan: string;
  olehBot: boolean;
}

/** Fun Fact yang baru muncul (tiap 1 putaran) — transient, UI menampilkan lalu clear. */
export interface FunFactAktif {
  id: string;
  teks: string;
  golongan: Golongan;
  ikon: string;
  /** Lama tampil sebelum auto-lanjut (15–30 dtk, dari panjang teks). */
  bacaDetik: number;
  /** id SoalKuis yang jadi lebih mungkin muncul setelah fakta ini dilihat. */
  bantuSoal: string[];
}

/**
 * Efek kartu spesial yang belum diterapkan — menunggu hasil kuis dari
 * pemain yang TERKENA efek (brief §6). `penaltiDasar` dalam satuan kartu:
 * skip=0, draw2=2, wild4=4.
 */
export interface EfekTertunda {
  jenis: 'skip' | 'draw2' | 'wild4';
  targetPemainId: string;
  penaltiDasar: number;
  tingkatKuis: 'mudah' | 'sedang' | 'sulit';
}

/**
 * Ringkasan hasil kuis penalti yang baru selesai — transient, UI menampilkan
 * lalu clear (mirip `faktaReward`).
 */
export interface PengumumanKuis {
  namaTarget: string;
  jenis: 'skip' | 'draw2' | 'wild4';
  hasil: HasilKuis;
  penaltiDasar: number;
  penaltiAkhir: number; // jumlah kartu yang benar-benar ditarik
  dilewati: boolean; // true bila target kehilangan giliran
}

export type StatusGame =
  | 'bermain'
  | 'menungguPilihWarna'
  | 'menungguKuis'
  | 'selesai';

export interface GameState {
  pemain: Pemain[];
  giliran: number; // index ke `pemain`
  arah: ArahMain;
  drawPile: KartuKimia[];
  discardPile: KartuKimia[]; // kartu teratas = elemen terakhir
  warnaAktif: Golongan | null; // golongan yang harus dicocokkan
  angkaAktif: number | null; // periode yang harus dicocokkan (null jika kartu atas spesial)
  status: StatusGame;
  efekTertunda: EfekTertunda | null;
  /** true bila wild4 sudah dimainkan tapi warna belum dipilih. */
  wild4Menunggu: boolean;
  pemenangId: string | null;
  rng: number; // state PRNG (lihat rng.ts)
  giliranKe: number; // penghitung giliran global (untuk trigger Fase 2)
  /** Fakta golongan yang baru ter-unlock (reward streak) — UI menampilkan lalu clear. */
  faktaReward: { golongan: Golongan; teks: string } | null;
  /** Ringkasan kuis penalti yang baru selesai — UI menampilkan lalu clear. */
  pengumumanKuis: PengumumanKuis | null;
  /** Deck kedua "Kartu Peristiwa Kimia" (brief §6b) — hanya menyimpan id kartu
   * (fungsi efek dilihat dari SEMUA_PERISTIWA). Kosong bila fitur dimatikan. */
  peristiwaDrawPile: string[];
  /** Peristiwa yang baru terpicu — UI menampilkan lalu clear. */
  peristiwaAktif: PeristiwaAktif | null;
  /** Deck "Fun Fact" (id saja) — dipicu tiap 1 putaran, diisi ulang bila habis. */
  funFactDrawPile: string[];
  /** Fun Fact yang baru muncul — UI menampilkan lalu clear. */
  funFactAktif: FunFactAktif | null;
  /** id soal kuis yang sudah muncul di game ini (anti-ulang). */
  soalTerpakai: string[];
  /** id soal yang "terbuka" karena Fun Fact-nya sudah dilihat pemain. */
  funFactTerlihat: string[];
  /** indeks putaran terakhir yang sudah memunculkan Fun Fact. */
  funFactRonde: number;
  /** Soal yang sedang ditampilkan saat kuis menyasar pemain manusia. */
  soalAktif: SoalKuis | null;
  /** true selama animasi kocok+bagi di awal (mode online dikendalikan host). */
  menungguPembukaan: boolean;
  /** Status "UNO" aktif (pemain dengan 1 kartu belum menyatakan). */
  uno: StatusUno | null;
  /** Pengumuman UNO terbaru — UI menampilkan lalu clear. */
  pengumumanUno: PengumumanUno | null;
  /** Streak buang kartu segolongan per pemain. */
  streak: Record<string, { golongan: Golongan; count: number }>;
  log: string[];
}

/** Keputusan bot pada gilirannya. */
export type AksiBot =
  | {
      tipe: 'main';
      kartuId: string;
      /** id kartu ANGKA lain seperiode yang ikut ditumpuk (house rule UNO). */
      ekstraIds?: string[];
      warnaWild?: Golongan;
    }
  | { tipe: 'tarik' };

export type { HasilKuis };

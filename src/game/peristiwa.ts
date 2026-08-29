import { GOLONGAN } from '../data/golongan';
import type { Golongan } from '../data/types';
import { tarikKartuKe } from './engine';
import { kocok, rngInt } from './rng';
import type { GameState, KartuPeristiwa } from './types';

// ── helper kecil (semua murni, memutasi `s` yang sudah owned) ────────
function idx(s: GameState, pemainId: string): number {
  return s.pemain.findIndex((p) => p.id === pemainId);
}

function ambilAcakDari(s: GameState, dariIdx: number, keIdx: number): boolean {
  const dari = s.pemain[dariIdx];
  if (dari.tangan.length === 0) return false;
  let j: number;
  [j, s.rng] = rngInt(s.rng, dari.tangan.length);
  s.pemain[keIdx].tangan.push(dari.tangan.splice(j, 1)[0]);
  return true;
}

/** Buang 1 kartu acak dari tangan pemain (tidak pernah sampai < 1 kartu). */
function buangAcak(s: GameState, pi: number): boolean {
  if (s.pemain[pi].tangan.length <= 1) return false;
  let j: number;
  [j, s.rng] = rngInt(s.rng, s.pemain[pi].tangan.length);
  const kartu = s.pemain[pi].tangan.splice(j, 1)[0];
  s.drawPile.unshift(kartu); // daur ulang ke dasar tumpukan
  return true;
}

function indeksBerikutnya(s: GameState): number {
  const n = s.pemain.length;
  return (((s.giliran + s.arah) % n) + n) % n;
}

// ── 15 Kartu Peristiwa (5 positif / 5 negatif / 5 netral) ───────────
export const SEMUA_PERISTIWA: KartuPeristiwa[] = [
  // ---------- POSITIF ----------
  {
    id: 'eksoterm',
    judul: 'Reaksi Eksoterm',
    deskripsi: 'Ambil 1 kartu acak dari lawan dengan kartu terbanyak.',
    jenisEfek: 'positif',
    efek: (s, pid) => {
      const me = idx(s, pid);
      const targetIdx = s.pemain
        .map((p, i) => ({ i, n: p.tangan.length }))
        .filter((x) => x.i !== me)
        .sort((a, b) => b.n - a.n)[0]?.i;
      if (targetIdx != null) ambilAcakDari(s, targetIdx, me);
      return s;
    },
  },
  {
    id: 'sintesis',
    judul: 'Sintesis Sempurna',
    deskripsi: 'Ambil 1 kartu acak dari setiap lawan (yang punya ≥ 2 kartu).',
    jenisEfek: 'positif',
    efek: (s, pid) => {
      const me = idx(s, pid);
      s.pemain.forEach((p, i) => {
        if (i !== me && p.tangan.length >= 2) ambilAcakDari(s, i, me);
      });
      return s;
    },
  },
  {
    id: 'katalis-alami',
    judul: 'Katalis Alami',
    deskripsi: 'Buang 1 kartu acak dari tanganmu (tidak sampai habis).',
    jenisEfek: 'positif',
    efek: (s, pid) => {
      buangAcak(s, idx(s, pid));
      return s;
    },
  },
  {
    id: 'pemurnian',
    judul: 'Pemurnian Zat',
    deskripsi: 'Buang hingga 2 kartu angka dengan periode tertinggi di tanganmu.',
    jenisEfek: 'positif',
    efek: (s, pid) => {
      const me = idx(s, pid);
      for (let n = 0; n < 2; n++) {
        const tangan = s.pemain[me].tangan;
        if (tangan.length <= 1) break;
        let terpilih = -1;
        let maks = -1;
        tangan.forEach((k, i) => {
          if (k.jenis === 'angka' && k.periode > maks) {
            maks = k.periode;
            terpilih = i;
          }
        });
        if (terpilih < 0) break;
        s.drawPile.unshift(tangan.splice(terpilih, 1)[0]);
      }
      return s;
    },
  },
  {
    id: 'pendinginan',
    judul: 'Pendinginan Cepat',
    deskripsi: 'Pemain berikutnya mengambil 2 kartu.',
    jenisEfek: 'positif',
    efek: (s) => {
      tarikKartuKe(s, indeksBerikutnya(s), 2);
      return s;
    },
  },

  // ---------- NEGATIF ----------
  {
    id: 'kontaminasi',
    judul: 'Kontaminasi Sampel',
    deskripsi: 'Kamu mengambil 2 kartu.',
    jenisEfek: 'negatif',
    efek: (s, pid) => {
      tarikKartuKe(s, idx(s, pid), 2);
      return s;
    },
  },
  {
    id: 'endoterm',
    judul: 'Reaksi Endoterm',
    deskripsi: 'Kamu mengambil 1 kartu.',
    jenisEfek: 'negatif',
    efek: (s, pid) => {
      tarikKartuKe(s, idx(s, pid), 1);
      return s;
    },
  },
  {
    id: 'tumpahan-reagen',
    judul: 'Tumpahan Reagen',
    deskripsi: 'Berikan 1 kartu acak ke pemain berikutnya.',
    jenisEfek: 'negatif',
    efek: (s, pid) => {
      ambilAcakDari(s, idx(s, pid), indeksBerikutnya(s));
      return s;
    },
  },
  {
    id: 'reaksi-berantai',
    judul: 'Reaksi Berantai',
    deskripsi: 'Kamu mengambil 1 kartu dan arah permainan dibalik.',
    jenisEfek: 'negatif',
    efek: (s, pid) => {
      tarikKartuKe(s, idx(s, pid), 1);
      s.arah = (s.arah * -1) as GameState['arah'];
      return s;
    },
  },
  {
    id: 'ledakan-kecil',
    judul: 'Ledakan Kecil',
    deskripsi: 'Kamu mengambil 3 kartu.',
    jenisEfek: 'negatif',
    efek: (s, pid) => {
      tarikKartuKe(s, idx(s, pid), 3);
      return s;
    },
  },

  // ---------- NETRAL / EDUKASI ----------
  {
    id: 'diskusi-kelompok',
    judul: 'Diskusi Kelompok',
    deskripsi: 'Semua pemain membaca satu fakta kimia. Tidak ada perubahan kartu.',
    jenisEfek: 'netral',
    efek: (s) => {
      const keys = Object.keys(GOLONGAN) as Golongan[];
      let gi: number;
      [gi, s.rng] = rngInt(s.rng, keys.length);
      const g = keys[gi];
      let fi: number;
      [fi, s.rng] = rngInt(s.rng, GOLONGAN[g].fakta.length);
      s.faktaReward = { golongan: g, teks: GOLONGAN[g].fakta[fi] };
      return s;
    },
  },
  {
    id: 'kalibrasi-alat',
    judul: 'Kalibrasi Alat',
    deskripsi: 'Kartu di tanganmu diacak ulang urutannya. Jumlah tetap.',
    jenisEfek: 'netral',
    efek: (s, pid) => {
      const me = idx(s, pid);
      let baru: (typeof s.pemain)[number]['tangan'];
      [baru, s.rng] = kocok(s.pemain[me].tangan, s.rng);
      s.pemain[me].tangan = baru;
      return s;
    },
  },
  {
    id: 'pertukaran-ion',
    judul: 'Pertukaran Ion',
    deskripsi: 'Tukar 1 kartu acak dengan pemain berikutnya.',
    jenisEfek: 'netral',
    efek: (s, pid) => {
      const me = idx(s, pid);
      const lawan = indeksBerikutnya(s);
      const okA = ambilAcakDari(s, lawan, me);
      const okB = ambilAcakDari(s, me, lawan);
      void okA;
      void okB;
      return s;
    },
  },
  {
    id: 'netralisasi',
    judul: 'Netralisasi',
    deskripsi: 'Kamu dan pemain berikutnya sama-sama mengambil 1 kartu.',
    jenisEfek: 'netral',
    efek: (s, pid) => {
      tarikKartuKe(s, idx(s, pid), 1);
      tarikKartuKe(s, indeksBerikutnya(s), 1);
      return s;
    },
  },
  {
    id: 'filtrasi',
    judul: 'Filtrasi',
    deskripsi:
      'Kartu periode tertinggimu dipindah ke dasar tumpukan tarik, lalu kamu ambil 1 kartu.',
    jenisEfek: 'netral',
    efek: (s, pid) => {
      const me = idx(s, pid);
      const tangan = s.pemain[me].tangan;
      if (tangan.length > 1) {
        let terpilih = 0;
        tangan.forEach((k, i) => {
          if (k.periode > tangan[terpilih].periode) terpilih = i;
        });
        s.drawPile.unshift(tangan.splice(terpilih, 1)[0]);
      }
      tarikKartuKe(s, me, 1);
      return s;
    },
  },
];

export const PERISTIWA_TIAP_GILIRAN = 6;

/**
 * Picu Kartu Peristiwa bila penghitung giliran baru melewati kelipatan ambang
 * sejak `giliranKeSebelum`. Murni — kembalikan state apa adanya bila tak memicu.
 */
export function picuPeristiwaBila(
  state: GameState,
  giliranKeSebelum: number,
): GameState {
  if (
    state.status === 'bermain' &&
    !state.peristiwaAktif &&
    state.peristiwaDrawPile.length > 0 &&
    Math.floor(state.giliranKe / PERISTIWA_TIAP_GILIRAN) >
      Math.floor(giliranKeSebelum / PERISTIWA_TIAP_GILIRAN)
  ) {
    return picuPeristiwa(state);
  }
  return state;
}

/** Deck peristiwa = daftar id kartu yang sudah dikocok. */
export function buatDeckPeristiwa(rngState: number): [string[], number] {
  return kocok(
    SEMUA_PERISTIWA.map((k) => k.id),
    rngState,
  );
}

/**
 * Memicu 1 kartu peristiwa untuk pemain yang sedang giliran. Fungsi murni:
 * mengembalikan GameState baru dengan `peristiwaAktif` terisi.
 */
export function picuPeristiwa(state: GameState): GameState {
  const s = structuredClone(state);
  if (s.peristiwaDrawPile.length === 0) return s;

  const id = s.peristiwaDrawPile.pop()!;
  const pemain = s.pemain[s.giliran];

  const asli = SEMUA_PERISTIWA.find((k) => k.id === id);
  if (!asli) return s;
  const jml0 = s.pemain.map((p) => p.tangan.length);
  asli.efek(s, pemain.id);
  const jml1 = s.pemain.map((p) => p.tangan.length);

  const delta = s.pemain
    .map((p, i) => {
      const d = jml1[i] - jml0[i];
      return d === 0 ? null : `${p.nama} ${d > 0 ? '+' : ''}${d} kartu`;
    })
    .filter(Boolean)
    .join(', ');

  s.peristiwaAktif = {
    id: asli.id,
    judul: asli.judul,
    deskripsi: asli.deskripsi,
    jenisEfek: asli.jenisEfek,
    ringkasan: delta || 'Tidak ada perubahan jumlah kartu',
    olehBot: pemain.isBot,
  };
  s.log.push(`Peristiwa: ${asli.judul} (${pemain.nama})`);

  if (s.pemain[s.giliran].tangan.length === 0) {
    s.status = 'selesai';
    s.pemenangId = s.pemain[s.giliran].id;
    s.log.push(`🏆 ${s.pemain[s.giliran].nama} memenangkan permainan!`);
  }

  return s;
}

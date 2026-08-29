import type { Golongan } from '../data/types';
import { GOLONGAN } from '../data/golongan';
import { buatDeck } from './deck';
import { buatDeckFunFact } from './funfact';
import { buatDeckPeristiwa } from './peristiwa';
import { kocok, rngInt, seedDari } from './rng';
import { hitungPenaltiAkhir, type HasilKuis } from './penalti';
import type { GameState, KartuKimia, Pemain } from './types';

export const KARTU_AWAL_PER_PEMAIN = 7;
export const AMBANG_STREAK_FAKTA = 3;

// ── util ────────────────────────────────────────────────────────────
function assert(kondisi: unknown, pesan: string): asserts kondisi {
  if (!kondisi) throw new Error(`[ChemUno] ${pesan}`);
}

function clone(state: GameState): GameState {
  const s = structuredClone(state);
  // Batasi riwayat log agar tidak tumbuh tak terbatas pada permainan panjang.
  if (s.log.length > 80) s.log = s.log.slice(-50);
  return s;
}

export function kartuAtas(state: GameState): KartuKimia {
  const k = state.discardPile[state.discardPile.length - 1];
  assert(k, 'Tumpukan buang kosong');
  return k;
}

export function pemainAktif(state: GameState): Pemain {
  return state.pemain[state.giliran];
}

/** Index pemain `langkah` giliran ke depan, menghormati arah main. */
export function indeksBerikutnya(state: GameState, langkah = 1): number {
  const n = state.pemain.length;
  return (((state.giliran + state.arah * langkah) % n) + n) % n;
}

function majuGiliran(s: GameState, langkah: number): void {
  s.giliran = indeksBerikutnya(s, langkah);
}

// ── setup ───────────────────────────────────────────────────────────
export interface OpsiPemain {
  id: string;
  nama: string;
  isBot: boolean;
}

export function buatGame(
  pemain: OpsiPemain[],
  seed: string | number = Date.now(),
  pakaiPeristiwa = false,
): GameState {
  assert(pemain.length >= 2 && pemain.length <= 7, 'Jumlah pemain harus 2–7');

  let rng = seedDari(seed);
  let deck: KartuKimia[];
  [deck, rng] = kocok(buatDeck(), rng);

  let peristiwaDrawPile: string[] = [];
  if (pakaiPeristiwa) {
    [peristiwaDrawPile, rng] = buatDeckPeristiwa(rng);
  }

  // Fun Fact selalu aktif (tujuan edukasi inti — tanpa toggle).
  let funFactDrawPile: string[];
  [funFactDrawPile, rng] = buatDeckFunFact(rng);

  const tangan: KartuKimia[][] = pemain.map(() => []);
  for (let i = 0; i < KARTU_AWAL_PER_PEMAIN; i++) {
    for (let p = 0; p < pemain.length; p++) {
      tangan[p].push(deck.pop()!);
    }
  }

  // Kartu pembuka: lewati kartu non-angka agar permainan mulai bersih.
  let pembuka = deck.pop()!;
  while (pembuka.jenis !== 'angka') {
    deck.unshift(pembuka);
    pembuka = deck.pop()!;
  }

  return {
    pemain: pemain.map((p, i) => ({ ...p, tangan: tangan[i] })),
    giliran: 0,
    arah: 1,
    drawPile: deck,
    discardPile: [pembuka],
    warnaAktif: pembuka.golongan,
    angkaAktif: pembuka.periode,
    status: 'bermain',
    efekTertunda: null,
    wild4Menunggu: false,
    pemenangId: null,
    rng,
    giliranKe: 0,
    faktaReward: null,
    streak: {},
    pengumumanKuis: null,
    peristiwaDrawPile,
    peristiwaAktif: null,
    funFactDrawPile,
    funFactAktif: null,
    soalTerpakai: [],
    funFactTerlihat: [],
    funFactRonde: 0,
    soalAktif: null,
    menungguPembukaan: false,
    uno: null,
    pengumumanUno: null,
    log: [`Kartu pembuka: ${pembuka.simbol} (periode ${pembuka.periode})`],
  };
}

export const PENALTI_UNO_KARTU = 2;

/** Set status UNO saat pemain turun ke 1 kartu; hapus kalau sudah tak 1 kartu. */
function sinkronUno(s: GameState, pemainBaruSatu?: string): void {
  if (pemainBaruSatu) {
    const p = s.pemain.find((x) => x.id === pemainBaruSatu);
    if (p && p.tangan.length === 1) {
      s.uno = { pemainId: pemainBaruSatu, dinyatakan: false, padaMs: 0 };
    }
  }
  if (s.uno) {
    const p = s.pemain.find((x) => x.id === s.uno!.pemainId);
    if (!p || p.tangan.length !== 1) s.uno = null;
  }
}

/** Pemain menyatakan "UNO!" — aman dari tangkapan. */
export function nyatakanUno(state: GameState, pemainId: string): GameState {
  if (!state.uno || state.uno.pemainId !== pemainId || state.uno.dinyatakan) {
    return state;
  }
  const s = clone(state);
  s.uno!.dinyatakan = true;
  const nama = s.pemain.find((p) => p.id === pemainId)?.nama ?? '';
  s.pengumumanUno = { nama, jenis: 'aman' };
  s.log.push(`${nama}: UNO!`);
  return s;
}

/** Menangkap pemain yang lupa bilang UNO — target ambil +2 kartu.
 *  `penangkapId` null = tertangkap waktu habis ("Lawan"). */
export function tangkapUno(
  state: GameState,
  penangkapId: string | null,
  targetId: string,
): GameState {
  if (
    !state.uno ||
    state.uno.pemainId !== targetId ||
    state.uno.dinyatakan ||
    penangkapId === targetId
  ) {
    return state;
  }
  const s = clone(state);
  const ti = s.pemain.findIndex((p) => p.id === targetId);
  if (ti < 0 || s.pemain[ti].tangan.length !== 1) {
    s.uno = null;
    return s;
  }
  const ambil = tarikKartuKe(s, ti, PENALTI_UNO_KARTU);
  const oleh = penangkapId
    ? (s.pemain.find((p) => p.id === penangkapId)?.nama ?? 'Lawan')
    : 'Lawan';
  s.pengumumanUno = {
    nama: s.pemain[ti].nama,
    jenis: 'tertangkap',
    oleh,
    ambil,
  };
  s.log.push(`${s.pemain[ti].nama} lupa bilang UNO — ${oleh} menangkap (+${ambil} kartu)`);
  s.uno = null;
  return s;
}

// ── validasi langkah ────────────────────────────────────────────────
export function bisaDimainkan(state: GameState, kartu: KartuKimia): boolean {
  if (state.status !== 'bermain') return false;
  if (kartu.jenis === 'wild' || kartu.jenis === 'wild4') return true;

  if (kartu.golongan && kartu.golongan === state.warnaAktif) return true;
  if (
    kartu.jenis === 'angka' &&
    state.angkaAktif !== null &&
    kartu.periode === state.angkaAktif
  ) {
    return true;
  }
  const atas = kartuAtas(state);
  if (kartu.jenis !== 'angka' && atas.jenis === kartu.jenis) return true;
  return false;
}

/** Id kartu yang boleh dimainkan pemain tsb sekarang. */
export function langkahLegal(state: GameState, pemainId: string): string[] {
  const pi = state.pemain.findIndex((p) => p.id === pemainId);
  if (pi !== state.giliran || state.status !== 'bermain') return [];
  return state.pemain[pi].tangan
    .filter((k) => bisaDimainkan(state, k))
    .map((k) => k.id);
}

// ── streak & reward fakta ───────────────────────────────────────────
function perbaruiStreak(
  s: GameState,
  pemainId: string,
  golongan: Golongan | null,
): GameState['faktaReward'] {
  if (!golongan) {
    delete s.streak[pemainId];
    return null;
  }
  const prev = s.streak[pemainId];
  const count = prev && prev.golongan === golongan ? prev.count + 1 : 1;

  if (count >= AMBANG_STREAK_FAKTA) {
    s.streak[pemainId] = { golongan, count: 0 };
    const fakta = GOLONGAN[golongan].fakta;
    let idx: number;
    [idx, s.rng] = rngInt(s.rng, fakta.length);
    return { golongan, teks: fakta[idx] };
  }
  s.streak[pemainId] = { golongan, count };
  return null;
}

// ── menarik kartu ───────────────────────────────────────────────────
export function isiUlangDrawPile(s: GameState): void {
  if (s.discardPile.length <= 1) return;
  const top = s.discardPile.pop()!;
  let kocokan: KartuKimia[];
  [kocokan, s.rng] = kocok(s.discardPile, s.rng);
  s.drawPile = kocokan;
  s.discardPile = [top];
  s.log.push('Tumpukan tarik diisi ulang dari tumpukan buang');
}

export function tarikKartuKe(s: GameState, pi: number, jumlah: number): number {
  let ditarik = 0;
  for (let k = 0; k < jumlah; k++) {
    if (s.drawPile.length === 0) isiUlangDrawPile(s);
    if (s.drawPile.length === 0) break;
    s.pemain[pi].tangan.push(s.drawPile.pop()!);
    ditarik++;
  }
  return ditarik;
}

// ── aksi utama ──────────────────────────────────────────────────────
export interface OpsiMain {
  warnaWild?: Golongan;
}

export function mainkanKartu(
  state: GameState,
  pemainId: string,
  kartuId: string,
  opts: OpsiMain = {},
): GameState {
  const s = clone(state);
  s.faktaReward = null;
  s.pengumumanKuis = null;

  assert(s.status === 'bermain', 'Bukan fase bermain');
  const pi = s.pemain.findIndex((p) => p.id === pemainId);
  assert(pi >= 0, 'Pemain tidak ditemukan');
  assert(pi === s.giliran, 'Bukan giliran pemain ini');

  const p = s.pemain[pi];
  const ci = p.tangan.findIndex((k) => k.id === kartuId);
  assert(ci >= 0, 'Kartu tidak ada di tangan pemain');
  const kartu = p.tangan[ci];
  assert(bisaDimainkan(s, kartu), 'Kartu tidak cocok dengan tumpukan');

  p.tangan.splice(ci, 1);
  s.discardPile.push(kartu);
  s.log.push(`${p.nama} memainkan ${kartu.simbol}${kartu.judulEfek ? ` (${kartu.judulEfek})` : ''}`);

  s.faktaReward = perbaruiStreak(s, pemainId, kartu.golongan);

  if (p.tangan.length === 0) {
    s.status = 'selesai';
    s.pemenangId = pemainId;
    s.uno = null;
    s.log.push(`🏆 ${p.nama} memenangkan permainan!`);
    return s;
  }

  s.giliranKe += 1;
  sinkronUno(s, p.tangan.length === 1 ? pemainId : undefined);

  switch (kartu.jenis) {
    case 'angka':
      s.warnaAktif = kartu.golongan;
      s.angkaAktif = kartu.periode;
      majuGiliran(s, 1);
      break;

    case 'reverse':
      s.warnaAktif = kartu.golongan;
      s.angkaAktif = null;
      if (s.pemain.length === 2) {
        majuGiliran(s, 2); // di 2 pemain, reverse = skip
      } else {
        s.arah = (s.arah * -1) as GameState['arah'];
        majuGiliran(s, 1);
      }
      break;

    case 'skip': {
      s.warnaAktif = kartu.golongan;
      s.angkaAktif = null;
      s.efekTertunda = {
        jenis: 'skip',
        targetPemainId: s.pemain[indeksBerikutnya(s, 1)].id,
        penaltiDasar: 0,
        tingkatKuis: 'mudah',
      };
      s.status = 'menungguKuis';
      break;
    }

    case 'draw2': {
      s.warnaAktif = kartu.golongan;
      s.angkaAktif = null;
      s.efekTertunda = {
        jenis: 'draw2',
        targetPemainId: s.pemain[indeksBerikutnya(s, 1)].id,
        penaltiDasar: 2,
        tingkatKuis: 'mudah',
      };
      s.status = 'menungguKuis';
      break;
    }

    case 'wild':
      s.angkaAktif = null;
      s.wild4Menunggu = false;
      if (opts.warnaWild) {
        s.warnaAktif = opts.warnaWild;
        majuGiliran(s, 1);
        s.status = 'bermain';
      } else {
        s.status = 'menungguPilihWarna';
      }
      break;

    case 'wild4': {
      s.angkaAktif = null;
      let acakTingkat: number;
      [acakTingkat, s.rng] = rngInt(s.rng, 2); // wild4: soal sedang / sulit (brief §6.2)
      s.efekTertunda = {
        jenis: 'wild4',
        targetPemainId: s.pemain[indeksBerikutnya(s, 1)].id,
        penaltiDasar: 4,
        tingkatKuis: acakTingkat === 0 ? 'sedang' : 'sulit',
      };
      if (opts.warnaWild) {
        s.warnaAktif = opts.warnaWild;
        s.wild4Menunggu = false;
        s.status = 'menungguKuis';
      } else {
        s.wild4Menunggu = true;
        s.status = 'menungguPilihWarna';
      }
      break;
    }
  }

  return s;
}

/**
 * Memainkan BEBERAPA kartu sekaligus dalam satu giliran (house rule seperti UNO
 * umum): kartu pertama harus sah dimainkan, sisanya harus kartu ANGKA dengan
 * PERIODE yang sama dengan kartu pertama (boleh beda golongan). Kartu terakhir
 * menentukan golongan & periode aktif berikutnya. Tetap dihitung 1 giliran.
 *
 * Untuk 0/1 id, langsung diteruskan ke `mainkanKartu` (agar kartu spesial/wild
 * tunggal tetap berjalan normal).
 */
export function mainkanBerbarengan(
  state: GameState,
  pemainId: string,
  kartuIds: string[],
  opts: OpsiMain = {},
): GameState {
  if (kartuIds.length <= 1) {
    return mainkanKartu(state, pemainId, kartuIds[0], opts);
  }

  const s = clone(state);
  s.faktaReward = null;
  s.pengumumanKuis = null;

  assert(s.status === 'bermain', 'Bukan fase bermain');
  const pi = s.pemain.findIndex((p) => p.id === pemainId);
  assert(pi >= 0, 'Pemain tidak ditemukan');
  assert(pi === s.giliran, 'Bukan giliran pemain ini');
  assert(
    new Set(kartuIds).size === kartuIds.length,
    'Ada id kartu yang terduplikasi',
  );

  const p = s.pemain[pi];
  const kartuList = kartuIds.map((id) => {
    const k = p.tangan.find((x) => x.id === id);
    assert(k, 'Kartu tidak ada di tangan pemain');
    return k;
  });

  assert(
    kartuList.every((k) => k.jenis === 'angka'),
    'Hanya kartu angka (unsur) yang bisa ditumpuk',
  );
  const per = kartuList[0].periode;
  assert(
    kartuList.every((k) => k.periode === per),
    'Semua kartu yang ditumpuk harus berperiode sama',
  );
  assert(bisaDimainkan(s, kartuList[0]), 'Kartu pertama tidak cocok dengan tumpukan');

  let fakta: GameState['faktaReward'] = null;
  for (const kartu of kartuList) {
    const ci = p.tangan.findIndex((k) => k.id === kartu.id);
    p.tangan.splice(ci, 1);
    s.discardPile.push(kartu);
    const f = perbaruiStreak(s, pemainId, kartu.golongan);
    if (f) fakta = f;
  }
  s.faktaReward = fakta;
  s.log.push(
    `${p.nama} menumpuk ${kartuList.length} kartu periode ${per} (${kartuList.map((k) => k.simbol).join(', ')})`,
  );

  if (p.tangan.length === 0) {
    s.status = 'selesai';
    s.pemenangId = pemainId;
    s.uno = null;
    s.log.push(`🏆 ${p.nama} memenangkan permainan!`);
    return s;
  }

  s.giliranKe += 1;
  sinkronUno(s, p.tangan.length === 1 ? pemainId : undefined);
  const terakhir = kartuList[kartuList.length - 1];
  s.warnaAktif = terakhir.golongan;
  s.angkaAktif = terakhir.periode;
  majuGiliran(s, 1);
  return s;
}

export function pilihWarna(state: GameState, golongan: Golongan): GameState {
  const s = clone(state);
  assert(s.status === 'menungguPilihWarna', 'Tidak sedang menunggu pilih warna');
  s.warnaAktif = golongan;
  s.angkaAktif = null;
  s.log.push(`Warna aktif diganti ke ${GOLONGAN[golongan].nama}`);

  if (s.wild4Menunggu) {
    s.wild4Menunggu = false;
    s.status = 'menungguKuis';
  } else {
    majuGiliran(s, 1);
    s.status = 'bermain';
  }
  return s;
}

/**
 * Menyelesaikan efek kartu spesial setelah pemain yang terkena menjawab kuis
 * (brief §6). Terapkan `hitungPenaltiAkhir` SEBELUM membagikan kartu.
 */
export function selesaikanKuis(state: GameState, hasil: HasilKuis): GameState {
  const s = clone(state);
  assert(s.status === 'menungguKuis' && s.efekTertunda, 'Tidak sedang menunggu kuis');
  const ef = s.efekTertunda;
  const ti = s.pemain.findIndex((p) => p.id === ef.targetPemainId);
  const target = s.pemain[ti];

  let penaltiAkhir = 0;
  let dilewati = false;

  if (ef.jenis === 'skip') {
    if (hasil === 'benarCepat') {
      majuGiliran(s, 1);
      s.log.push(`${target.nama} menjawab cepat & benar — tidak jadi dilewati`);
    } else {
      dilewati = true;
      majuGiliran(s, 2);
      s.log.push(`${target.nama} dilewati (Reaksi Tidak Stabil)`);
    }
  } else {
    penaltiAkhir = tarikKartuKe(s, ti, hitungPenaltiAkhir(ef.penaltiDasar, hasil));
    dilewati = true;
    majuGiliran(s, 2);
    s.log.push(
      `${target.nama} mengambil ${penaltiAkhir} kartu (penalti dasar ${ef.penaltiDasar}, hasil kuis: ${hasil})`,
    );
  }

  s.pengumumanKuis = {
    namaTarget: target.nama,
    jenis: ef.jenis,
    hasil,
    penaltiDasar: ef.penaltiDasar,
    penaltiAkhir,
    dilewati,
  };
  s.efekTertunda = null;
  s.soalAktif = null;
  s.status = 'bermain';
  sinkronUno(s);
  return s;
}

/** Pemain menarik 1 kartu secara sukarela — gilirannya berakhir (house rule). */
export function tarikKartu(state: GameState, pemainId: string): GameState {
  const s = clone(state);
  assert(s.status === 'bermain', 'Bukan fase bermain');
  const pi = s.pemain.findIndex((p) => p.id === pemainId);
  assert(pi === s.giliran, 'Bukan giliran pemain ini');

  s.faktaReward = null;
  s.pengumumanKuis = null;
  const ditarik = tarikKartuKe(s, pi, 1);
  delete s.streak[pemainId];
  s.log.push(`${s.pemain[pi].nama} menarik ${ditarik} kartu & melewati giliran`);
  s.giliranKe += 1;
  sinkronUno(s);
  majuGiliran(s, 1);
  return s;
}

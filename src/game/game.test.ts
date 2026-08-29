import { describe, it, expect } from 'vitest';
import { buatDeck } from './deck';
import {
  buatGame,
  mainkanKartu,
  mainkanBerbarengan,
  pilihWarna,
  selesaikanKuis,
  tarikKartu,
  nyatakanUno,
  tangkapUno,
  bisaDimainkan,
  langkahLegal,
  kartuAtas,
  indeksBerikutnya,
} from './engine';
import { langkahBot, jawabKuisBot } from './bot';
import type { GameState, KartuKimia } from './types';

const PEMAIN = [
  { id: 'p1', nama: 'Kamu', isBot: false },
  { id: 'p2', nama: 'Bot A', isBot: true },
  { id: 'p3', nama: 'Bot B', isBot: true },
];

/** Paksa kartu tertentu ada di tangan pemain giliran (untuk skenario deterministik). */
function selipkanKartu(s: GameState, pemainIdx: number, kartu: KartuKimia): GameState {
  const c = structuredClone(s);
  c.pemain[pemainIdx].tangan.unshift(kartu);
  return c;
}

function kartuAngka(golongan: KartuKimia['golongan'], periode: number): KartuKimia {
  return {
    id: `test-${golongan}-${periode}-${Math.random()}`,
    simbol: 'X',
    namaUnsur: 'Test',
    nomorAtom: 1,
    periode,
    golongan,
    warnaUno: '#fff',
    jenis: 'angka',
  };
}

describe('buatDeck', () => {
  const deck = buatDeck();

  it('id kartu unik', () => {
    expect(new Set(deck.map((k) => k.id)).size).toBe(deck.length);
  });

  it('mengandung wild, wild4, dan kartu spesial tiap golongan', () => {
    expect(deck.filter((k) => k.jenis === 'wild')).toHaveLength(4);
    expect(deck.filter((k) => k.jenis === 'wild4')).toHaveLength(4);
    expect(deck.filter((k) => k.jenis === 'skip')).toHaveLength(10); // 5 golongan × 2
    expect(deck.filter((k) => k.jenis === 'draw2')).toHaveLength(10);
    expect(deck.filter((k) => k.jenis === 'reverse')).toHaveLength(10);
  });

  it('kartu angka = 2 salinan tiap unsur', () => {
    const angka = deck.filter((k) => k.jenis === 'angka');
    expect(angka).toHaveLength(47 * 2);
  });

  it('wild tidak punya golongan/warna', () => {
    for (const k of deck.filter((k) => k.jenis === 'wild' || k.jenis === 'wild4')) {
      expect(k.golongan).toBeNull();
      expect(k.warnaUno).toBeNull();
    }
  });
});

describe('buatGame', () => {
  it('membagikan 7 kartu ke tiap pemain & kartu pembuka berupa angka', () => {
    const s = buatGame(PEMAIN, 'seed-1');
    for (const p of s.pemain) expect(p.tangan).toHaveLength(7);
    expect(kartuAtas(s).jenis).toBe('angka');
    expect(s.status).toBe('bermain');
    expect(s.warnaAktif).not.toBeNull();
  });

  it('deterministik untuk seed sama', () => {
    const a = buatGame(PEMAIN, 'sama');
    const b = buatGame(PEMAIN, 'sama');
    expect(a.pemain.map((p) => p.tangan.map((k) => k.id))).toEqual(
      b.pemain.map((p) => p.tangan.map((k) => k.id)),
    );
    expect(kartuAtas(a).id).toBe(kartuAtas(b).id);
  });

  it('seed berbeda -> pembagian berbeda', () => {
    const a = buatGame(PEMAIN, 'x');
    const b = buatGame(PEMAIN, 'y');
    expect(kartuAtas(a).id).not.toBe(kartuAtas(b).id);
  });

  it('giliran pertama = pemain 0 (host) bila tanpa acak', () => {
    expect(buatGame(PEMAIN, 'g').giliran).toBe(0);
  });

  it('mulaiAcak → giliran pertama diacak & tak pernah host (indeks 0)', () => {
    const tujuh = [
      ...PEMAIN,
      { id: 'p4', nama: 'Bot C', isBot: true },
      { id: 'p5', nama: 'Bot D', isBot: true },
      { id: 'p6', nama: 'Bot E', isBot: true },
      { id: 'p7', nama: 'Bot F', isBot: true },
    ];
    const terlihat = new Set<number>();
    for (let i = 0; i < 60; i++) {
      const g = buatGame(tujuh, `acak-${i}`, false, true).giliran;
      expect(g).toBeGreaterThanOrEqual(1);
      expect(g).toBeLessThanOrEqual(6);
      terlihat.add(g);
    }
    expect(terlihat.size).toBeGreaterThan(1); // benar-benar teracak
    // Deterministik untuk seed yang sama.
    expect(buatGame(tujuh, 'tetap', false, true).giliran).toBe(
      buatGame(tujuh, 'tetap', false, true).giliran,
    );
  });

  it('menerima 2–7 pemain, menolak di luar itu', () => {
    expect(() => buatGame([PEMAIN[0]], 's')).toThrow();
    const tujuh = [
      ...PEMAIN,
      { id: 'p4', nama: 'Bot C', isBot: true },
      { id: 'p5', nama: 'Bot D', isBot: true },
      { id: 'p6', nama: 'Bot E', isBot: true },
      { id: 'p7', nama: 'Bot F', isBot: true },
    ];
    expect(() => buatGame(tujuh, 's')).not.toThrow();
    expect(buatGame(tujuh, 's').pemain).toHaveLength(7);
    for (const p of buatGame(tujuh, 's').pemain) expect(p.tangan).toHaveLength(7);
    expect(() => buatGame([...tujuh, { id: 'p8', nama: 'X', isBot: true }], 's')).toThrow();
  });
});

describe('bisaDimainkan & langkahLegal', () => {
  it('cocok warna atau angka; wild selalu boleh', () => {
    let s = buatGame(PEMAIN, 'match');
    const atas = kartuAtas(s);

    const cocokWarna = kartuAngka(atas.golongan, 9); // periode beda, warna sama
    const cocokAngka = kartuAngka(
      atas.golongan === 'halogen' ? 'alkali' : 'halogen',
      atas.periode,
    );
    const tidakCocok = kartuAngka(
      atas.golongan === 'halogen' ? 'alkali' : 'halogen',
      atas.periode === 7 ? 6 : 7,
    );
    const wild: KartuKimia = {
      id: 'w',
      simbol: '★',
      namaUnsur: 'Katalis',
      nomorAtom: 0,
      periode: 0,
      golongan: null,
      warnaUno: null,
      jenis: 'wild',
    };

    expect(bisaDimainkan(s, cocokWarna)).toBe(true);
    expect(bisaDimainkan(s, cocokAngka)).toBe(true);
    expect(bisaDimainkan(s, tidakCocok)).toBe(false);
    expect(bisaDimainkan(s, wild)).toBe(true);

    s = selipkanKartu(s, 0, cocokWarna);
    expect(langkahLegal(s, 'p1')).toContain(cocokWarna.id);
    expect(langkahLegal(s, 'p2')).toEqual([]); // bukan giliran p2
  });
});

describe('mainkan kartu angka & giliran', () => {
  it('kartu angka memajukan giliran satu langkah', () => {
    let s = buatGame(PEMAIN, 'angka');
    const atas = kartuAtas(s);
    const kartu = kartuAngka(atas.golongan, 9);
    s = selipkanKartu(s, 0, kartu);
    s = mainkanKartu(s, 'p1', kartu.id);
    expect(s.giliran).toBe(1);
    expect(s.warnaAktif).toBe(atas.golongan);
    expect(s.angkaAktif).toBe(9);
  });

  it('menolak kartu yang bukan giliran pemain', () => {
    const s = buatGame(PEMAIN, 'tolak');
    const idLain = s.pemain[1].tangan[0].id;
    expect(() => mainkanKartu(s, 'p2', idLain)).toThrow();
  });
});

describe('mainkanBerbarengan (tumpuk kartu seperiode)', () => {
  function siapkan() {
    let s = buatGame(PEMAIN, 'tumpuk');
    const atas = kartuAtas(s);
    const a = { ...kartuAngka(atas.golongan, 4), id: 'A4' }; // sah lewat golongan
    const b = { ...kartuAngka('transisi', 4), id: 'B4' };
    const c = { ...kartuAngka('halogen', 4), id: 'C4' };
    s = selipkanKartu(s, 0, a);
    s = selipkanKartu(s, 0, b);
    s = selipkanKartu(s, 0, c);
    return { s, atas };
  }

  it('menumpuk 3 kartu periode sama dalam 1 giliran', () => {
    const { s: s0 } = siapkan();
    const jml0 = s0.pemain[0].tangan.length;
    const gk0 = s0.giliranKe;
    const s = mainkanBerbarengan(s0, 'p1', ['A4', 'B4', 'C4']);
    expect(s.pemain[0].tangan.length).toBe(jml0 - 3);
    expect(s.giliran).toBe(1); // maju 1 langkah saja
    expect(s.giliranKe).toBe(gk0 + 1); // 1 giliran
    expect(s.angkaAktif).toBe(4);
    expect(s.warnaAktif).toBe('halogen'); // golongan kartu terakhir (C4)
    expect(kartuAtas(s).id).toBe('C4');
  });

  it('menolak kalau periode tidak semua sama', () => {
    const { s: s0 } = siapkan();
    const beda = { ...kartuAngka('transisi', 5), id: 'X5' };
    const s1 = selipkanKartu(s0, 0, beda);
    expect(() => mainkanBerbarengan(s1, 'p1', ['A4', 'X5'])).toThrow();
  });

  it('menolak kartu spesial dalam tumpukan', () => {
    const { s: s0 } = siapkan();
    const skip = { ...kartuAngka('transisi', 0), jenis: 'skip' as const, id: 'SK' };
    const s1 = selipkanKartu(s0, 0, skip);
    expect(() => mainkanBerbarengan(s1, 'p1', ['A4', 'SK'])).toThrow();
  });

  it('menolak kalau kartu pertama tidak cocok dengan tumpukan', () => {
    let s = buatGame(PEMAIN, 'tumpuk2');
    const atas = kartuAtas(s);
    const salahG = atas.golongan === 'transisi' ? 'halogen' : 'transisi';
    const p = { ...kartuAngka(salahG, 6), id: 'P6' }; // beda golongan & periode
    const q = { ...kartuAngka('alkali', 6), id: 'Q6' };
    s = selipkanKartu(s, 0, p);
    s = selipkanKartu(s, 0, q);
    expect(() => mainkanBerbarengan(s, 'p1', ['P6', 'Q6'])).toThrow();
  });

  it('1 id → sama seperti mainkanKartu (kartu spesial tetap jalan)', () => {
    let s = buatGame(PEMAIN.slice(0, 2), 'satu');
    const atas = kartuAtas(s);
    const d2: KartuKimia = { ...kartuAngka(atas.golongan, 0), jenis: 'draw2', id: 'D2' };
    s = selipkanKartu(s, 0, d2);
    const s2 = mainkanBerbarengan(s, 'p1', ['D2']);
    expect(s2.status).toBe('menungguKuis');
    expect(s2.efekTertunda?.jenis).toBe('draw2');
  });

  it('menang bila kartu terakhir di tangan ditumpuk sekaligus', () => {
    let s = buatGame(PEMAIN, 'menang');
    const atas = kartuAtas(s);
    const a = { ...kartuAngka(atas.golongan, 3), id: 'M3a' };
    const b = { ...kartuAngka('alkali', 3), id: 'M3b' };
    s = { ...s, pemain: s.pemain.map((p, i) => (i === 0 ? { ...p, tangan: [a, b] } : p)) };
    const out = mainkanBerbarengan(s, 'p1', ['M3a', 'M3b']);
    expect(out.status).toBe('selesai');
    expect(out.pemenangId).toBe('p1');
  });
});

describe('UNO', () => {
  /** Beri p1 tepat 2 kartu angka yang cocok, lalu mainkan satu → sisa 1. */
  function turunSatu(seed: string) {
    let s = buatGame(PEMAIN, seed);
    const atas = kartuAtas(s);
    const a = { ...kartuAngka(atas.golongan, 4), id: 'U4a' };
    const b = { ...kartuAngka(atas.golongan, 4), id: 'U4b' };
    s = { ...s, pemain: s.pemain.map((p, i) => (i === 0 ? { ...p, tangan: [a, b] } : p)) };
    return mainkanKartu(s, 'p1', 'U4a');
  }

  it('status uno muncul saat kartu tinggal 1', () => {
    const s = turunSatu('uno-1');
    expect(s.uno).not.toBeNull();
    expect(s.uno!.pemainId).toBe('p1');
    expect(s.uno!.dinyatakan).toBe(false);
    expect(s.uno!.padaMs).toBe(0); // diisi lapisan store/server
  });

  it('nyatakanUno menandai aman & mengumumkan', () => {
    const s = nyatakanUno(turunSatu('uno-2'), 'p1');
    expect(s.uno!.dinyatakan).toBe(true);
    expect(s.pengumumanUno).toEqual({ nama: 'Kamu', jenis: 'aman' });
  });

  it('tangkapUno memberi +2 kartu & menghapus status', () => {
    const s0 = turunSatu('uno-3');
    const s = tangkapUno(s0, 'p2', 'p1');
    expect(s.pemain[0].tangan.length).toBe(3);
    expect(s.uno).toBeNull();
    expect(s.pengumumanUno?.jenis).toBe('tertangkap');
    expect(s.pengumumanUno?.oleh).toBe('Bot A');
    expect(s.pengumumanUno?.ambil).toBe(2);
  });

  it('tangkapUno gagal kalau sudah dinyatakan', () => {
    const s0 = nyatakanUno(turunSatu('uno-4'), 'p1');
    const s = tangkapUno(s0, 'p2', 'p1');
    expect(s.pemain[0].tangan.length).toBe(1); // tak kena penalti
    expect(s.uno!.dinyatakan).toBe(true);
  });

  it('tak bisa menangkap diri sendiri', () => {
    const s0 = turunSatu('uno-5');
    const s = tangkapUno(s0, 'p1', 'p1');
    expect(s.pemain[0].tangan.length).toBe(1);
  });

  it('status uno hilang setelah pemain menarik kartu', () => {
    let s = turunSatu('uno-6');
    // p1 kena +2 lewat tangkap, lalu... uno sudah null. Uji jalur tarik:
    s = turunSatu('uno-6b');
    // paksa giliran ke p1 & tambah kartu lewat tarik sukarela
    s = { ...s, giliran: 0, status: 'bermain' };
    s = tarikKartu(s, 'p1');
    expect(s.uno).toBeNull();
  });

  it('menang: status uno bersih saat kartu habis', () => {
    let s = buatGame(PEMAIN, 'uno-7');
    const atas = kartuAtas(s);
    const a = { ...kartuAngka(atas.golongan, 4), id: 'W1' };
    s = { ...s, pemain: s.pemain.map((p, i) => (i === 0 ? { ...p, tangan: [a] } : p)) };
    s = mainkanKartu(s, 'p1', 'W1');
    expect(s.status).toBe('selesai');
    expect(s.uno).toBeNull();
  });
});

describe('reverse', () => {
  it('membalik arah pada 3 pemain', () => {
    let s = buatGame(PEMAIN, 'rev');
    const atas = kartuAtas(s);
    const rev: KartuKimia = { ...kartuAngka(atas.golongan, 0), jenis: 'reverse', id: 'rev1' };
    s = selipkanKartu(s, 0, rev);
    s = mainkanKartu(s, 'p1', rev.id);
    expect(s.arah).toBe(-1);
    expect(s.giliran).toBe(2); // mundur dari 0
  });

  it('berperan sebagai skip pada 2 pemain', () => {
    let s = buatGame(PEMAIN.slice(0, 2), 'rev2');
    const atas = kartuAtas(s);
    const rev: KartuKimia = { ...kartuAngka(atas.golongan, 0), jenis: 'reverse', id: 'rev2' };
    s = selipkanKartu(s, 0, rev);
    s = mainkanKartu(s, 'p1', rev.id);
    expect(s.giliran).toBe(0); // lawan dilewati, kembali ke p1
  });
});

describe('skip + kuis', () => {
  function siapkanSkip(seed: string) {
    let s = buatGame(PEMAIN, seed);
    const atas = kartuAtas(s);
    const skip: KartuKimia = { ...kartuAngka(atas.golongan, 0), jenis: 'skip', id: 'sk1' };
    s = selipkanKartu(s, 0, skip);
    s = mainkanKartu(s, 'p1', skip.id);
    return s;
  }

  it('menunda efek & menunggu kuis dari target', () => {
    const s = siapkanSkip('skip-a');
    expect(s.status).toBe('menungguKuis');
    expect(s.efekTertunda?.jenis).toBe('skip');
    expect(s.efekTertunda?.targetPemainId).toBe('p2');
  });

  it('jawab benar-cepat membatalkan skip', () => {
    const s = selesaikanKuis(siapkanSkip('skip-b'), 'benarCepat');
    expect(s.status).toBe('bermain');
    expect(s.giliran).toBe(1); // p2 tetap dapat giliran
  });

  it('jawab salah -> p2 dilewati', () => {
    const s = selesaikanKuis(siapkanSkip('skip-c'), 'salah');
    expect(s.giliran).toBe(2);
  });
});

describe('draw2 + pengurangan penalti', () => {
  function siapkanDraw2(seed: string) {
    let s = buatGame(PEMAIN, seed);
    const atas = kartuAtas(s);
    const d2: KartuKimia = { ...kartuAngka(atas.golongan, 0), jenis: 'draw2', id: 'd2' };
    s = selipkanKartu(s, 0, d2);
    return mainkanKartu(s, 'p1', d2.id);
  }

  it('benar-cepat -> target tidak menarik kartu, tapi tetap kehilangan giliran', () => {
    const s0 = siapkanDraw2('d2-a');
    const jml0 = s0.pemain[1].tangan.length;
    const s = selesaikanKuis(s0, 'benarCepat');
    expect(s.pemain[1].tangan.length).toBe(jml0);
    expect(s.giliran).toBe(2); // p2 dilewati
  });

  it('benar-lambat -> target menarik 1 kartu', () => {
    const s0 = siapkanDraw2('d2-b');
    const jml0 = s0.pemain[1].tangan.length;
    const s = selesaikanKuis(s0, 'benarLambat');
    expect(s.pemain[1].tangan.length).toBe(jml0 + 1);
  });

  it('salah -> target menarik 2 kartu', () => {
    const s0 = siapkanDraw2('d2-c');
    const jml0 = s0.pemain[1].tangan.length;
    const s = selesaikanKuis(s0, 'salah');
    expect(s.pemain[1].tangan.length).toBe(jml0 + 2);
  });
});

describe('wild & wild4', () => {
  it('wild: pilih warna lalu giliran maju', () => {
    let s = buatGame(PEMAIN, 'wild-a');
    const wild: KartuKimia = {
      id: 'wa',
      simbol: '★',
      namaUnsur: 'Katalis',
      nomorAtom: 0,
      periode: 0,
      golongan: null,
      warnaUno: null,
      jenis: 'wild',
    };
    s = selipkanKartu(s, 0, wild);
    s = mainkanKartu(s, 'p1', wild.id);
    expect(s.status).toBe('menungguPilihWarna');
    s = pilihWarna(s, 'halogen');
    expect(s.warnaAktif).toBe('halogen');
    expect(s.status).toBe('bermain');
    expect(s.giliran).toBe(1);
  });

  it('wild4: pilih warna -> kuis -> target tarik 4 saat salah', () => {
    let s = buatGame(PEMAIN, 'wild4-a');
    const w4: KartuKimia = {
      id: 'w4',
      simbol: '★',
      namaUnsur: 'Reaksi Eksplosif',
      nomorAtom: 0,
      periode: 0,
      golongan: null,
      warnaUno: null,
      jenis: 'wild4',
    };
    s = selipkanKartu(s, 0, w4);
    s = mainkanKartu(s, 'p1', w4.id);
    expect(s.status).toBe('menungguPilihWarna');
    s = pilihWarna(s, 'transisi');
    expect(s.status).toBe('menungguKuis');
    expect(s.efekTertunda?.penaltiDasar).toBe(4);
    const jml0 = s.pemain[1].tangan.length;
    s = selesaikanKuis(s, 'salah');
    expect(s.pemain[1].tangan.length).toBe(jml0 + 4);
    expect(s.giliran).toBe(2);
  });
});

describe('reward fakta streak', () => {
  it('muncul setelah 3 kartu segolongan berturut-turut oleh pemain yang sama', () => {
    let s = buatGame(PEMAIN, 'streak');
    // paksa golongan aktif alkali periode 3
    s = { ...s, warnaAktif: 'alkali', angkaAktif: 3, giliran: 0, arah: 1 };

    const play = (st: GameState) => {
      const k = kartuAngka('alkali', 3);
      let x = selipkanKartu(st, st.giliran, k);
      x = mainkanKartu(x, x.pemain[x.giliran].id, k.id);
      return x;
    };

    s = play(s); // p1 -> streak 1
    expect(s.faktaReward).toBeNull();
    s = { ...s, giliran: 0 }; // kembalikan giliran ke p1 utk uji streak
    s = play(s); // streak 2
    expect(s.faktaReward).toBeNull();
    s = { ...s, giliran: 0 };
    s = play(s); // streak 3 -> reward
    expect(s.faktaReward?.golongan).toBe('alkali');
    expect(typeof s.faktaReward?.teks).toBe('string');
  });
});

describe('tarik kartu sukarela', () => {
  it('menambah 1 kartu & memajukan giliran', () => {
    const s0 = buatGame(PEMAIN, 'tarik');
    const jml0 = s0.pemain[0].tangan.length;
    const s = tarikKartu(s0, 'p1');
    expect(s.pemain[0].tangan.length).toBe(jml0 + 1);
    expect(s.giliran).toBe(1);
  });
});

describe('pengumumanKuis (Tahap 5)', () => {
  function siapkanDraw2(seed: string) {
    let s = buatGame(PEMAIN, seed);
    const atas = kartuAtas(s);
    const d2: KartuKimia = { ...kartuAngka(atas.golongan, 0), jenis: 'draw2', id: 'd2b' };
    s = selipkanKartu(s, 0, d2);
    return mainkanKartu(s, 'p1', d2.id);
  }

  it('draw2 salah -> pengumuman penuh', () => {
    const s = selesaikanKuis(siapkanDraw2('peng-a'), 'salah');
    expect(s.pengumumanKuis).toMatchObject({
      jenis: 'draw2',
      hasil: 'salah',
      penaltiDasar: 2,
      penaltiAkhir: 2,
      dilewati: true,
    });
  });

  it('draw2 benarCepat -> penaltiAkhir 0, tetap dilewati', () => {
    const s = selesaikanKuis(siapkanDraw2('peng-b'), 'benarCepat');
    expect(s.pengumumanKuis).toMatchObject({ penaltiAkhir: 0, dilewati: true });
  });

  it('dibersihkan pada aksi berikutnya', () => {
    let s = selesaikanKuis(siapkanDraw2('peng-c'), 'salah');
    expect(s.pengumumanKuis).not.toBeNull();
    // pemain berikutnya (p3, karena p2 dilewati) menarik kartu
    s = tarikKartu(s, s.pemain[s.giliran].id);
    expect(s.pengumumanKuis).toBeNull();
  });

  it('wild4 memakai soal sedang atau sulit', () => {
    for (const seed of ['w4a', 'w4b', 'w4c', 'w4d', 'w4e']) {
      let s = buatGame(PEMAIN, seed);
      const w4: KartuKimia = {
        id: 'w4x',
        simbol: '★',
        namaUnsur: 'Reaksi Eksplosif',
        nomorAtom: 0,
        periode: 0,
        golongan: null,
        warnaUno: null,
        jenis: 'wild4',
      };
      s = selipkanKartu(s, 0, w4);
      s = mainkanKartu(s, 'p1', w4.id, { warnaWild: 'alkali' });
      expect(['sedang', 'sulit']).toContain(s.efekTertunda?.tingkatKuis);
    }
  });
});

describe('reshuffle & draw pile habis', () => {
  it('mengisi ulang draw pile dari discard saat kurang kartu untuk penalti', () => {
    let s = buatGame(PEMAIN, 'reshuffle');
    // Sisakan 1 kartu di drawPile, sisanya ke discard (kecuali kartu teratas).
    const semua = [...s.drawPile];
    s = {
      ...s,
      drawPile: semua.slice(0, 1),
      discardPile: [...semua.slice(1), kartuAtas(s)],
    };
    const d2: KartuKimia = { ...kartuAngka(s.warnaAktif, 0), jenis: 'draw2', id: 'dz' };
    s = selipkanKartu(s, 0, d2);
    s = mainkanKartu(s, 'p1', d2.id);
    const jml0 = s.pemain[1].tangan.length;
    s = selesaikanKuis(s, 'salah');
    expect(s.pemain[1].tangan.length).toBe(jml0 + 2); // tetap dapat 2 kartu
    expect(s.log.some((l) => l.includes('diisi ulang'))).toBe(true);
  });

  it('tidak crash & hanya menarik sebanyak kartu yang tersedia', () => {
    let s = buatGame(PEMAIN, 'kosong');
    s = { ...s, drawPile: [], discardPile: [kartuAtas(s)] };
    const d2: KartuKimia = { ...kartuAngka(s.warnaAktif, 0), jenis: 'draw2', id: 'dz2' };
    s = selipkanKartu(s, 0, d2);
    s = mainkanKartu(s, 'p1', d2.id);
    const jml0 = s.pemain[1].tangan.length;
    s = selesaikanKuis(s, 'salah');
    const ditarik = s.pemain[1].tangan.length - jml0;
    expect(ditarik).toBeGreaterThanOrEqual(0);
    expect(ditarik).toBeLessThanOrEqual(2);
    expect(s.status).toBe('bermain');
  });
});

describe('bot', () => {
  it('selalu mengembalikan aksi legal atau tarik', () => {
    let s = buatGame(PEMAIN, 'bot-1');
    s = { ...s, giliran: 1 };
    const aksi = langkahBot(s);
    if (aksi.tipe === 'main') {
      expect(langkahLegal(s, 'p2')).toContain(aksi.kartuId);
    } else {
      expect(aksi.tipe).toBe('tarik');
    }
  });

  it('permainan penuh bot bisa selesai tanpa error', () => {
    let s = buatGame(
      [
        { id: 'b1', nama: 'B1', isBot: true },
        { id: 'b2', nama: 'B2', isBot: true },
      ],
      'auto',
    );
    let langkah = 0;
    while (s.status !== 'selesai' && langkah < 4000) {
      langkah++;
      if (s.status === 'bermain') {
        const aksi = langkahBot(s);
        const p = s.pemain[s.giliran];
        s =
          aksi.tipe === 'main'
            ? mainkanBerbarengan(
                s,
                p.id,
                [aksi.kartuId, ...(aksi.ekstraIds ?? [])],
                { warnaWild: aksi.warnaWild },
              )
            : tarikKartu(s, p.id);
      } else if (s.status === 'menungguPilihWarna') {
        s = pilihWarna(s, 'alkali');
      } else if (s.status === 'menungguKuis') {
        const { hasil, state } = jawabKuisBot(s);
        s = selesaikanKuis(state, hasil);
      }
    }
    expect(s.status).toBe('selesai');
    expect(s.pemenangId).not.toBeNull();
    expect(indeksBerikutnya(s, 1)).toBeTypeOf('number');
  });
});

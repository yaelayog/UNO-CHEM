import { describe, it, expect } from 'vitest';
import {
  progresDefault,
  levelDariXp,
  xpUntukLevel,
  infoLevel,
  tambahHasilGame,
  bacaProgres,
} from './progres';
import { badgeTerbuka } from '../data/badge';

describe('level', () => {
  it('level 1 mulai dari 0 XP', () => {
    expect(levelDariXp(0)).toBe(1);
    expect(xpUntukLevel(1)).toBe(0);
  });

  it('ambang level naik kuadratik & konsisten dua arah', () => {
    for (let n = 1; n <= 10; n++) {
      const xp = xpUntukLevel(n);
      expect(levelDariXp(xp)).toBe(n);
      expect(levelDariXp(xp + 50)).toBe(n); // masih di level n sebelum ambang berikutnya
    }
  });

  it('infoLevel: rasio 0..1', () => {
    const i = infoLevel(150);
    expect(i.rasio).toBeGreaterThanOrEqual(0);
    expect(i.rasio).toBeLessThanOrEqual(1);
    expect(i.xpDiLevel + xpUntukLevel(i.level)).toBe(150);
  });
});

describe('tambahHasilGame', () => {
  it('menang + kuis benar menambah XP & statistik', () => {
    const r = tambahHasilGame(progresDefault(), {
      menang: true,
      kuisBenar: 3,
      kuisTotal: 4,
      streakTerbaik: 2,
      benarPerGolongan: { alkali: 2, halogen: 1 },
    });
    expect(r.progres.gameDimainkan).toBe(1);
    expect(r.progres.gameDimenangkan).toBe(1);
    expect(r.progres.kuisBenar).toBe(3);
    expect(r.progres.benarPerGolongan.alkali).toBe(2);
    // 30 selesai + 120 menang + 3*12 + 2*5 = 196
    expect(r.xpDidapat).toBe(196);
    expect(r.progres.gameSempurna).toBe(0); // 3/4 bukan sempurna
  });

  it('menang dengan semua kuis benar = sempurna + bonus', () => {
    const r = tambahHasilGame(progresDefault(), {
      menang: true,
      kuisBenar: 3,
      kuisTotal: 3,
      streakTerbaik: 3,
      benarPerGolongan: {},
    });
    expect(r.progres.gameSempurna).toBe(1);
    // 30 + 120 + 36 + 15 + 50 sempurna = 251
    expect(r.xpDidapat).toBe(251);
  });

  it('akumulasi lintas game', () => {
    let p = progresDefault();
    p = tambahHasilGame(p, {
      menang: false,
      kuisBenar: 1,
      kuisTotal: 2,
      streakTerbaik: 1,
      benarPerGolongan: { alkali: 1 },
    }).progres;
    p = tambahHasilGame(p, {
      menang: true,
      kuisBenar: 2,
      kuisTotal: 2,
      streakTerbaik: 2,
      benarPerGolongan: { alkali: 2 },
    }).progres;
    expect(p.gameDimainkan).toBe(2);
    expect(p.benarPerGolongan.alkali).toBe(3);
  });

  it('membuka badge saat syarat terpenuhi', () => {
    const r = tambahHasilGame(progresDefault(), {
      menang: true,
      kuisBenar: 0,
      kuisTotal: 0,
      streakTerbaik: 0,
      benarPerGolongan: {},
    });
    expect(r.badgeBaru).toContain('juara-pertama');
    expect(r.progres.badge).toContain('juara-pertama');
  });

  it('master golongan terbuka pada 12 jawaban benar bertema', () => {
    const p = progresDefault();
    p.benarPerGolongan = { alkali: 12 };
    expect(badgeTerbuka(p)).toContain('master-alkali');
    p.benarPerGolongan = { alkali: 11 };
    expect(badgeTerbuka(p)).not.toContain('master-alkali');
  });
});

describe('bacaProgres', () => {
  it('mengembalikan default saat storage tak tersedia', () => {
    expect(bacaProgres()).toEqual(progresDefault());
  });
});

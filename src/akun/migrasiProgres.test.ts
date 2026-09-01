import { describe, it, expect } from 'vitest';
import { gabungProgres } from './migrasiProgres';
import { progresDefault, type Progres } from '../lib/progres';

const isi = (p: Partial<Progres>): Progres => ({ ...progresDefault(), ...p });

describe('gabungProgres', () => {
  it('server kosong → pakai progres lokal apa adanya', () => {
    const lokal = isi({ xp: 300, badge: ['juara-pertama'] });
    expect(gabungProgres(lokal, null)).toEqual(lokal);
  });

  it('ambil nilai terbaik tiap metrik', () => {
    const lokal = isi({ xp: 100, kuisBenar: 10, gameDimenangkan: 1 });
    const server = { xp: 250, kuisBenar: 4, gameDimenangkan: 3 };
    const g = gabungProgres(lokal, server);
    expect(g.xp).toBe(250);
    expect(g.kuisBenar).toBe(10);
    expect(g.gameDimenangkan).toBe(3);
  });

  it('gabungkan badge (union) & benarPerGolongan (max per golongan)', () => {
    const lokal = isi({
      badge: ['a', 'b'],
      benarPerGolongan: { alkali: 5, halogen: 2 },
    });
    const server: Partial<Progres> = {
      badge: ['b', 'c'],
      benarPerGolongan: { alkali: 3, gasMulia: 4 },
    };
    const g = gabungProgres(lokal, server);
    expect([...g.badge].sort()).toEqual(['a', 'b', 'c']);
    expect(g.benarPerGolongan).toEqual({ alkali: 5, halogen: 2, gasMulia: 4 });
  });

  it('server partial (field hilang) tetap aman', () => {
    const lokal = isi({ xp: 50 });
    const g = gabungProgres(lokal, { xp: 80 } as Partial<Progres>);
    expect(g.xp).toBe(80);
    expect(g.benarPerGolongan).toEqual({});
    expect(g.badge).toEqual([]);
  });
});

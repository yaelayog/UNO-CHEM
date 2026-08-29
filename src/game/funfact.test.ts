import { describe, it, expect } from 'vitest';
import { BANK_SOAL } from '../data/kuis';
import { SEMUA_FUNFACT } from '../data/funfact';
import { buatGame } from './engine';
import {
  buatDeckFunFact,
  picuFunFact,
  bacaDetikUntuk,
  giliranPerPutaran,
} from './funfact';
import type { GameState } from './types';

const PEMAIN = [
  { id: 'p1', nama: 'Kamu', isBot: false },
  { id: 'p2', nama: 'Bot A', isBot: true },
  { id: 'p3', nama: 'Bot B', isBot: true },
];

describe('bank Fun Fact', () => {
  it('id unik & semua bantuSoal menunjuk soal yang ada', () => {
    expect(SEMUA_FUNFACT.length).toBeGreaterThan(10);
    expect(new Set(SEMUA_FUNFACT.map((f) => f.id)).size).toBe(
      SEMUA_FUNFACT.length,
    );
    const idSoal = new Set(BANK_SOAL.map((q) => q.id));
    for (const f of SEMUA_FUNFACT) {
      expect(f.bantuSoal.length).toBeGreaterThan(0);
      for (const sid of f.bantuSoal) expect(idSoal.has(sid)).toBe(true);
    }
  });

  it('bacaDetikUntuk selalu di rentang 15–30', () => {
    for (const f of SEMUA_FUNFACT) {
      const d = bacaDetikUntuk(f.teks);
      expect(d).toBeGreaterThanOrEqual(15);
      expect(d).toBeLessThanOrEqual(30);
    }
    expect(bacaDetikUntuk('x')).toBe(15);
    expect(bacaDetikUntuk('x'.repeat(999))).toBe(30);
  });

  it('buatDeckFunFact deterministik & berisi semua id', () => {
    const [a] = buatDeckFunFact(77);
    const [b] = buatDeckFunFact(77);
    expect(a).toEqual(b);
    expect([...a].sort()).toEqual(SEMUA_FUNFACT.map((f) => f.id).sort());
  });
});

describe('picuFunFact', () => {
  function game(seed: string): GameState {
    return buatGame(PEMAIN, seed, true);
  }

  it('mengisi funFactAktif tanpa mengubah jumlah kartu siapa pun', () => {
    const s0 = game('ff-1');
    const jml0 = s0.pemain.map((p) => p.tangan.length);
    const s = picuFunFact(s0);
    expect(s.funFactAktif).not.toBeNull();
    expect(s.funFactAktif!.bacaDetik).toBeGreaterThanOrEqual(15);
    expect(s.pemain.map((p) => p.tangan.length)).toEqual(jml0);
    expect(s.funFactDrawPile.length).toBe(s0.funFactDrawPile.length - 1);
  });

  it('mengisi ulang deck saat habis (tak pernah kehabisan fakta)', () => {
    let s = { ...game('ff-2'), funFactDrawPile: [] as string[] };
    s = picuFunFact(s);
    expect(s.funFactAktif).not.toBeNull();
    expect(s.funFactDrawPile.length).toBe(SEMUA_FUNFACT.length - 1);
  });

  it('giliranPerPutaran = jumlah pemain', () => {
    expect(giliranPerPutaran(game('ff-3'))).toBe(3);
  });

  it('deterministik untuk seed yang sama', () => {
    expect(picuFunFact(game('sama')).funFactAktif!.id).toBe(
      picuFunFact(game('sama')).funFactAktif!.id,
    );
  });
});

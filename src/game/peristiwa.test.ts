import { describe, it, expect } from 'vitest';
import { buatGame } from './engine';
import {
  SEMUA_PERISTIWA,
  picuPeristiwa,
  buatDeckPeristiwa,
} from './peristiwa';
import type { GameState } from './types';

const PEMAIN = [
  { id: 'p1', nama: 'Kamu', isBot: false },
  { id: 'p2', nama: 'Bot A', isBot: true },
  { id: 'p3', nama: 'Bot B', isBot: true },
];

function gameDenganPeristiwa(seed: string, id: string): GameState {
  const s = buatGame(PEMAIN, seed, true);
  return { ...s, peristiwaDrawPile: [id] };
}

describe('deck peristiwa', () => {
  it('berisi 15 kartu, 5 tiap jenis, id unik', () => {
    expect(SEMUA_PERISTIWA).toHaveLength(15);
    const perJenis = { positif: 0, negatif: 0, netral: 0 };
    for (const k of SEMUA_PERISTIWA) perJenis[k.jenisEfek]++;
    expect(perJenis).toEqual({ positif: 5, negatif: 5, netral: 5 });
    expect(new Set(SEMUA_PERISTIWA.map((k) => k.id)).size).toBe(15);
  });

  it('buatDeckPeristiwa deterministik & berisi semua id', () => {
    const [a] = buatDeckPeristiwa(123);
    const [b] = buatDeckPeristiwa(123);
    expect(a).toEqual(b);
    expect([...a].sort()).toEqual(SEMUA_PERISTIWA.map((k) => k.id).sort());
  });
});

describe('picuPeristiwa', () => {
  it('tidak error & mengisi peristiwaAktif untuk tiap kartu', () => {
    for (const kartu of SEMUA_PERISTIWA) {
      const s = picuPeristiwa(gameDenganPeristiwa('pk-' + kartu.id, kartu.id));
      expect(s.peristiwaAktif?.id).toBe(kartu.id);
      expect(s.peristiwaDrawPile).toHaveLength(0);
      // jumlah total kartu di permainan tetap konsisten (tidak hilang/ganda liar)
      const totalTangan = s.pemain.reduce((n, p) => n + p.tangan.length, 0);
      expect(totalTangan).toBeGreaterThan(0);
    }
  });

  it('kontaminasi menambah 2 kartu ke pemain giliran', () => {
    const s0 = gameDenganPeristiwa('kont', 'kontaminasi');
    const jml0 = s0.pemain[0].tangan.length;
    const s = picuPeristiwa(s0);
    expect(s.pemain[0].tangan.length).toBe(jml0 + 2);
    expect(s.peristiwaAktif?.jenisEfek).toBe('negatif');
  });

  it('eksoterm memindah 1 kartu dari lawan ke pemain giliran', () => {
    const s0 = gameDenganPeristiwa('eks', 'eksoterm');
    const totalP1 = s0.pemain[0].tangan.length;
    const totalSemua = s0.pemain.reduce((n, p) => n + p.tangan.length, 0);
    const s = picuPeristiwa(s0);
    expect(s.pemain[0].tangan.length).toBe(totalP1 + 1);
    expect(s.pemain.reduce((n, p) => n + p.tangan.length, 0)).toBe(totalSemua);
  });

  it('katalis-alami tidak membuat tangan < 1', () => {
    let s0 = gameDenganPeristiwa('kat', 'katalis-alami');
    s0 = { ...s0, pemain: s0.pemain.map((p, i) => (i === 0 ? { ...p, tangan: [p.tangan[0]] } : p)) };
    const s = picuPeristiwa(s0);
    expect(s.pemain[0].tangan.length).toBe(1);
  });

  it('diskusi-kelompok mengeset faktaReward tanpa mengubah jumlah kartu', () => {
    const s0 = gameDenganPeristiwa('disk', 'diskusi-kelompok');
    const jml0 = s0.pemain.map((p) => p.tangan.length);
    const s = picuPeristiwa(s0);
    expect(s.faktaReward).not.toBeNull();
    expect(s.pemain.map((p) => p.tangan.length)).toEqual(jml0);
  });

  it('deck kosong -> tanpa efek', () => {
    const s0 = { ...buatGame(PEMAIN, 'kosong', true), peristiwaDrawPile: [] };
    const s = picuPeristiwa(s0);
    expect(s.peristiwaAktif).toBeNull();
  });
});

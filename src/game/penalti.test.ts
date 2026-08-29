import { describe, it, expect } from 'vitest';
import { hitungPenaltiAkhir } from './penalti';

describe('hitungPenaltiAkhir', () => {
  it('menghapus penalti saat jawab benar cepat', () => {
    expect(hitungPenaltiAkhir(2, 'benarCepat')).toBe(0);
    expect(hitungPenaltiAkhir(4, 'benarCepat')).toBe(0);
  });

  it('membagi dua (bulat bawah) saat jawab benar lambat', () => {
    expect(hitungPenaltiAkhir(2, 'benarLambat')).toBe(1);
    expect(hitungPenaltiAkhir(4, 'benarLambat')).toBe(2);
    expect(hitungPenaltiAkhir(5, 'benarLambat')).toBe(2);
  });

  it('menerapkan penalti penuh saat salah / waktu habis', () => {
    expect(hitungPenaltiAkhir(2, 'salah')).toBe(2);
    expect(hitungPenaltiAkhir(4, 'salah')).toBe(4);
  });
});

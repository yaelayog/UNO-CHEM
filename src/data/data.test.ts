import { describe, it, expect } from 'vitest';
import { DAFTAR_UNSUR } from './unsur';
import { BANK_SOAL } from './kuis';
import { GOLONGAN } from './golongan';
import { soalByKesulitan, unsurByGolongan, cariUnsur, soalAcak } from './index';
import type { Golongan } from './types';

describe('DAFTAR_UNSUR', () => {
  it('berisi minimal 40 unsur (brief: 40+)', () => {
    expect(DAFTAR_UNSUR.length).toBeGreaterThanOrEqual(40);
  });

  it('nomor atom unik', () => {
    const set = new Set(DAFTAR_UNSUR.map((u) => u.nomorAtom));
    expect(set.size).toBe(DAFTAR_UNSUR.length);
  });

  it('simbol unik', () => {
    const set = new Set(DAFTAR_UNSUR.map((u) => u.simbol));
    expect(set.size).toBe(DAFTAR_UNSUR.length);
  });

  it('periode selalu 1-7', () => {
    for (const u of DAFTAR_UNSUR) {
      expect(u.periode).toBeGreaterThanOrEqual(1);
      expect(u.periode).toBeLessThanOrEqual(7);
    }
  });

  it('golongan valid & kelima golongan terisi', () => {
    const keys = Object.keys(GOLONGAN) as Golongan[];
    for (const k of keys) {
      expect(unsurByGolongan(k).length).toBeGreaterThan(0);
    }
  });

  it('nomor atom & periode konsisten (unsur ber-periode tinggi punya nomor atom lebih besar dari periode 1)', () => {
    const p1 = DAFTAR_UNSUR.filter((u) => u.periode === 1);
    for (const u of p1) expect(u.nomorAtom).toBeLessThanOrEqual(2);
  });

  it('cariUnsur bekerja case-insensitive', () => {
    expect(cariUnsur('na')?.namaUnsur).toBe('Natrium');
    expect(cariUnsur('FE')?.namaUnsur).toBe('Besi');
    expect(cariUnsur('xx')).toBeUndefined();
  });
});

describe('BANK_SOAL', () => {
  it('bank soal cukup luas (>= 50, cakupan CP Fase 4 M4)', () => {
    expect(BANK_SOAL.length).toBeGreaterThanOrEqual(50);
  });

  it('id soal unik', () => {
    const set = new Set(BANK_SOAL.map((q) => q.id));
    expect(set.size).toBe(BANK_SOAL.length);
  });

  it('setiap soal punya tepat 4 pilihan & jawabanBenar index valid', () => {
    for (const q of BANK_SOAL) {
      expect(q.pilihan).toHaveLength(4);
      expect(q.jawabanBenar).toBeGreaterThanOrEqual(0);
      expect(q.jawabanBenar).toBeLessThan(q.pilihan.length);
    }
  });

  it('tidak ada pilihan duplikat dalam satu soal', () => {
    for (const q of BANK_SOAL) {
      expect(new Set(q.pilihan).size).toBe(q.pilihan.length);
    }
  });

  it('ketiga tingkat kesulitan tersedia untuk QuizModal', () => {
    expect(soalByKesulitan('mudah').length).toBeGreaterThanOrEqual(5);
    expect(soalByKesulitan('sedang').length).toBeGreaterThanOrEqual(5);
    expect(soalByKesulitan('sulit').length).toBeGreaterThanOrEqual(5);
  });

  it('soalAcak deterministik dengan rng ter-inject', () => {
    const q = soalAcak('mudah', () => 0);
    expect(q).toBe(soalByKesulitan('mudah')[0]);
  });
});

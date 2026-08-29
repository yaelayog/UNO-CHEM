import { describe, it, expect } from 'vitest';
import { pilihSoal } from './kuis';
import { BANK_SOAL } from '../data/kuis';
import { soalByKesulitan } from '../data';

describe('pilihSoal', () => {
  it('mengembalikan soal pada tingkat kesulitan yang diminta', () => {
    const [soal] = pilihSoal('sulit', null, 12345);
    expect(soal.tingkatKesulitan).toBe('sulit');
  });

  it('mengutamakan soal segolongan bila ada', () => {
    const [soal] = pilihSoal('mudah', 'gasMulia', 999);
    // beberapa soal mudah bertag gasMulia; hasil harus salah satunya
    const kandidat = BANK_SOAL.filter(
      (q) => q.tingkatKesulitan === 'mudah' && q.golonganTerkait === 'gasMulia',
    );
    expect(kandidat.map((q) => q.id)).toContain(soal.id);
  });

  it('tidak mengulang soal sampai pool tingkat itu habis', () => {
    const total = soalByKesulitan('sulit').length;
    const terpakai = new Set<string>();
    let rng = 42;
    for (let i = 0; i < total; i++) {
      const [soal, next] = pilihSoal('sulit', null, rng, terpakai);
      rng = next;
      expect(terpakai.has(soal.id)).toBe(false);
      terpakai.add(soal.id);
    }
    expect(terpakai.size).toBe(total);
    // Pemanggilan berikutnya boleh mengulang (pool habis).
    const [soalUlang] = pilihSoal('sulit', null, rng, terpakai);
    expect(terpakai.has(soalUlang.id)).toBe(true);
  });

  it('deterministik untuk rng state yang sama', () => {
    const a = pilihSoal('sedang', null, 7);
    const b = pilihSoal('sedang', null, 7);
    expect(a[0].id).toBe(b[0].id);
    expect(a[1]).toBe(b[1]);
  });
});

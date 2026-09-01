import { describe, it, expect } from 'vitest';
import {
  poinJawabanBenar,
  poinBonusMenangOnline,
  kebutuhanPoinGolongan,
  hitungGolonganDariPoin,
  tambahPoin,
  terapkanResetMingguan,
  resetMingguan,
  GOLONGAN_MAKS,
  type KeadaanPeringkat,
} from './peringkat';

describe('sumber poin', () => {
  it('poin kuis dibobot kesulitan', () => {
    expect(poinJawabanBenar('mudah')).toBe(10);
    expect(poinJawabanBenar('sedang')).toBe(20);
    expect(poinJawabanBenar('sulit')).toBe(30);
  });

  it('bonus menang online jauh lebih besar dari poin kuis', () => {
    expect(poinBonusMenangOnline()).toBeGreaterThan(poinJawabanBenar('sulit') * 5);
  });
});

describe('kebutuhanPoinGolongan (kuadratik)', () => {
  it('sesuai contoh SPEC', () => {
    expect(kebutuhanPoinGolongan(1)).toBe(0);
    expect(kebutuhanPoinGolongan(2)).toBe(400);
    expect(kebutuhanPoinGolongan(3)).toBe(900);
    expect(kebutuhanPoinGolongan(18)).toBe(32400);
  });

  it('makin curam di level atas', () => {
    const d1 = kebutuhanPoinGolongan(3) - kebutuhanPoinGolongan(2); // 500
    const d2 = kebutuhanPoinGolongan(18) - kebutuhanPoinGolongan(17); // 3500
    expect(d2).toBeGreaterThan(d1);
  });

  it('g di atas 18 dibatasi', () => {
    expect(kebutuhanPoinGolongan(99)).toBe(kebutuhanPoinGolongan(18));
  });
});

describe('hitungGolonganDariPoin', () => {
  it('0 poin → golongan 1', () => {
    expect(hitungGolonganDariPoin(0)).toBe(1);
  });

  it('belum cukup untuk naik → tetap di golongan bawah', () => {
    expect(hitungGolonganDariPoin(399)).toBe(1);
    expect(hitungGolonganDariPoin(400)).toBe(2);
    expect(hitungGolonganDariPoin(899)).toBe(2);
    expect(hitungGolonganDariPoin(900)).toBe(3);
  });

  it('batas atas golongan 18', () => {
    expect(hitungGolonganDariPoin(32400)).toBe(18);
    expect(hitungGolonganDariPoin(9_999_999)).toBe(GOLONGAN_MAKS);
  });
});

describe('tambahPoin (ratchet naik)', () => {
  const awal: KeadaanPeringkat = {
    totalPoin: 0,
    peringkatAktif: 1,
    peringkatRekor: 1,
  };

  it('naik peringkat saat poin cukup', () => {
    const r = tambahPoin(awal, 400);
    expect(r.totalPoin).toBe(400);
    expect(r.peringkatAktif).toBe(2);
    expect(r.peringkatRekor).toBe(2);
  });

  it('peringkat aktif tak turun walau golongan-dari-poin lebih rendah', () => {
    const naik = tambahPoin(awal, 900); // aktif 3
    const stlhReset = resetMingguan(naik); // aktif turun, poin 0
    const r = tambahPoin(stlhReset, 10); // sedikit poin
    expect(r.peringkatAktif).toBe(stlhReset.peringkatAktif); // tetap di lantai, tak jatuh ke 1
  });

  it('rekor hanya naik', () => {
    let k = tambahPoin(awal, 900); // rekor 3
    k = resetMingguan(k); // rekor tetap 3
    expect(k.peringkatRekor).toBe(3);
    k = tambahPoin(k, 5);
    expect(k.peringkatRekor).toBe(3);
  });
});

describe('terapkanResetMingguan', () => {
  it('turun 3 golongan dari puncak', () => {
    expect(terapkanResetMingguan(10, 10)).toBe(7);
    expect(terapkanResetMingguan(15, 15)).toBe(12);
  });

  it('lantai golongan 3 bila rekor pernah >= 3', () => {
    expect(terapkanResetMingguan(4, 5)).toBe(3); // 4-3=1 → diangkat ke 3
    expect(terapkanResetMingguan(5, 18)).toBe(3); // 5-3=2 → 3
    expect(terapkanResetMingguan(6, 6)).toBe(3); // 6-3=3
  });

  it('tanpa lantai bila rekor belum pernah capai 3', () => {
    expect(terapkanResetMingguan(2, 2)).toBe(1); // 2-3 → clamp 1
    expect(terapkanResetMingguan(1, 1)).toBe(1);
  });

  it('tak pernah menghasilkan < 1', () => {
    expect(terapkanResetMingguan(1, 1)).toBeGreaterThanOrEqual(1);
  });
});

describe('resetMingguan', () => {
  it('nol-kan poin minggu, turunkan aktif, rekor tetap', () => {
    const k: KeadaanPeringkat = {
      totalPoin: 5000,
      peringkatAktif: 12,
      peringkatRekor: 14,
    };
    const r = resetMingguan(k);
    expect(r.totalPoin).toBe(0);
    expect(r.peringkatAktif).toBe(9);
    expect(r.peringkatRekor).toBe(14);
  });
});

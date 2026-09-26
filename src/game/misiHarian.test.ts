import { describe, it, expect } from 'vitest';
import {
  tanggalWIB,
  geserTanggal,
  msSampaiReset,
  golonganHariIni,
  faktaHariIni,
  misiHarianUntuk,
  bonusLengkap,
  streakSetelahLengkap,
  streakAktif,
  badgeHarianBaru,
  POIN_HARIAN,
  WARNA_KARTU,
} from './misiHarian';
import { kemajuanMisi, targetMisi, type KonteksSesi } from './misi';
import { MISI_BADGE } from '../data/misiBadge';
import { GOLONGAN } from '../data/golongan';

const sesi = (o: Partial<KonteksSesi> = {}): KonteksSesi => ({
  menang: false,
  online: false,
  kuisBenar: 0,
  kuisSalah: 0,
  benarPerGolongan: {},
  ...o,
});
const capaian = { peringkatRekor: 1, jumlahBadgeMaster: 0 };

describe('tanggal WIB', () => {
  it('berganti tepat pukul 00:00 WIB (17:00 UTC)', () => {
    expect(tanggalWIB(new Date('2026-09-26T16:59:59Z'))).toBe('2026-09-26');
    expect(tanggalWIB(new Date('2026-09-26T17:00:00Z'))).toBe('2026-09-27');
  });
  it('geserTanggal melewati batas bulan/tahun', () => {
    expect(geserTanggal('2026-09-30', 1)).toBe('2026-10-01');
    expect(geserTanggal('2027-01-01', -1)).toBe('2026-12-31');
  });
  it('msSampaiReset menghitung mundur ke 00:00 WIB berikutnya', () => {
    expect(msSampaiReset(new Date('2026-09-26T16:00:00Z'))).toBe(60 * 60 * 1000);
    expect(msSampaiReset(new Date('2026-09-26T17:00:00Z'))).toBe(24 * 60 * 60 * 1000);
  });
});

describe('misiHarianUntuk', () => {
  const HARI = Array.from({ length: 60 }, (_, i) => geserTanggal('2026-09-01', i));

  it('deterministik: tanggal sama → misi sama', () => {
    expect(misiHarianUntuk('2026-09-27')).toEqual(misiHarianUntuk('2026-09-27'));
  });

  it('selalu 3 misi, satu per tingkat, reward sesuai tingkat, target valid', () => {
    for (const t of HARI) {
      const m = misiHarianUntuk(t);
      expect(m.map((x) => x.tingkat)).toEqual(['pemanasan', 'belajar', 'tantangan']);
      for (const x of m) {
        expect(x.poinReward).toBe(POIN_HARIAN[x.tingkat]);
        expect(targetMisi(x)).toBeGreaterThan(0);
        expect(new Set(m.map((y) => y.id)).size).toBe(3);
      }
    }
  });

  it('tak pernah dua misi bertema golongan di hari yang sama', () => {
    for (const t of HARI) {
      expect(misiHarianUntuk(t).filter((x) => x.bertemaGolongan).length).toBeLessThanOrEqual(1);
    }
  });

  it('misi bertema golongan memakai Golongan Hari Ini', () => {
    for (const t of HARI) {
      const g = golonganHariIni(t);
      for (const x of misiHarianUntuk(t).filter((y) => y.bertemaGolongan)) {
        expect(x.target.golongan).toBe(g);
        expect(x.deskripsi).toContain(GOLONGAN[g].nama);
        expect(x.deskripsi).toContain(WARNA_KARTU[g]);
      }
    }
  });

  it('bervariasi antarhari (tidak macet di satu kombinasi)', () => {
    const kombinasi = new Set(HARI.map((t) => misiHarianUntuk(t).map((x) => x.id).join('|')));
    expect(kombinasi.size).toBeGreaterThan(10);
    const semuaId = new Set(HARI.flatMap((t) => misiHarianUntuk(t).map((x) => x.id)));
    expect(semuaId.size).toBe(11); // semua templat pernah muncul dalam 60 hari
  });

  it('golongan hari ini berputar tiap hari; fakta berasal dari golongan itu', () => {
    const lima = HARI.slice(0, 5).map(golonganHariIni);
    expect(new Set(lima).size).toBe(5);
    for (const t of HARI) {
      expect(GOLONGAN[golonganHariIni(t)].fakta).toContain(faktaHariIni(t));
    }
  });
});

describe('tipe misi baru (dipakai Misi Harian)', () => {
  const [m] = misiHarianUntuk('2026-09-27');
  const dengan = (tipe: typeof m.tipe, target: Record<string, unknown>) => ({
    ...m,
    tipe,
    target,
  });

  it('kuisBenarTP menjumlahkan benar untuk TP yang dituju', () => {
    const x = dengan('kuisBenarTP', { tp: 2, jumlah: 2 });
    expect(kemajuanMisi(x, 0, sesi({ benarPerTP: { '2': 1, '3': 5 } }), capaian).progres).toBe(1);
    expect(kemajuanMisi(x, 1, sesi({ benarPerTP: { '2': 3 } }), capaian)).toMatchObject({
      progres: 2,
      selesai: true,
    });
    expect(kemajuanMisi(x, 0, sesi(), capaian).progres).toBe(0);
  });

  it('kuisBenarSesi hanya dihitung bila satu sesi mencapai minBenar', () => {
    const x = dengan('kuisBenarSesi', { jumlah: 1, minBenar: 5 });
    expect(kemajuanMisi(x, 0, sesi({ kuisBenar: 4 }), capaian).selesai).toBe(false);
    expect(kemajuanMisi(x, 0, sesi({ kuisBenar: 5 }), capaian).selesai).toBe(true);
  });

  it('kartuGolongan menjumlahkan kartu golongan yang dituju', () => {
    const x = dengan('kartuGolongan', { golongan: 'halogen', jumlah: 4 });
    expect(
      kemajuanMisi(x, 1, sesi({ kartuPerGolongan: { halogen: 2, alkali: 5 } }), capaian).progres,
    ).toBe(3);
    expect(kemajuanMisi(x, 3, sesi({ kartuPerGolongan: { halogen: 3 } }), capaian)).toMatchObject({
      progres: 4,
      selesai: true,
    });
    expect(kemajuanMisi(x, 0, sesi(), capaian).progres).toBe(0);
  });

  it('akurasiSesi butuh akurasi ≥ persen DAN jumlah soal minimum', () => {
    const x = dengan('akurasiSesi', { jumlah: 1, persen: 80, minKuis: 4 });
    expect(kemajuanMisi(x, 0, sesi({ kuisBenar: 4, kuisSalah: 1 }), capaian).selesai).toBe(true); // 80%
    expect(kemajuanMisi(x, 0, sesi({ kuisBenar: 3, kuisSalah: 1 }), capaian).selesai).toBe(false); // 75%
    expect(kemajuanMisi(x, 0, sesi({ kuisBenar: 3, kuisSalah: 0 }), capaian).selesai).toBe(false); // < 4 soal
  });
});

describe('bonus & streak', () => {
  it('bonus lengkap naik 25/hari, mentok di hari ke-7', () => {
    expect(bonusLengkap(1)).toBe(100);
    expect(bonusLengkap(3)).toBe(150);
    expect(bonusLengkap(7)).toBe(250);
    expect(bonusLengkap(30)).toBe(250);
    expect(bonusLengkap(0)).toBe(100);
  });

  it('streak bertambah bila kemarin lengkap, reset bila bolong', () => {
    expect(streakSetelahLengkap(null, 0, '2026-09-27')).toBe(1);
    expect(streakSetelahLengkap('2026-09-26', 4, '2026-09-27')).toBe(5);
    expect(streakSetelahLengkap('2026-09-25', 4, '2026-09-27')).toBe(1);
    expect(streakSetelahLengkap('2026-09-27', 5, '2026-09-27')).toBe(5);
  });

  it('streak tampil tetap menyala sampai akhir hari berikutnya', () => {
    expect(streakAktif('2026-09-27', 5, '2026-09-27')).toBe(5);
    expect(streakAktif('2026-09-26', 5, '2026-09-27')).toBe(5);
    expect(streakAktif('2026-09-25', 5, '2026-09-27')).toBe(0);
    expect(streakAktif(null, 5, '2026-09-27')).toBe(0);
  });

  it('lencana harian diberikan sekali sesuai ambang', () => {
    expect(badgeHarianBaru(2, 2, [])).toEqual([]);
    expect(badgeHarianBaru(3, 3, [])).toEqual(['harian-streak-3']);
    expect(badgeHarianBaru(7, 10, ['harian-streak-3'])).toEqual([
      'harian-streak-7',
      'harian-total-10',
    ]);
  });

  it('semua lencana harian punya metadata tampil', () => {
    for (const id of ['harian-streak-3', 'harian-streak-7', 'harian-total-10']) {
      expect(MISI_BADGE.some((b) => b.id === id)).toBe(true);
    }
  });
});

import { describe, it, expect } from 'vitest';
import {
  kemajuanMisi,
  cekMisiSelesai,
  targetMisi,
  misiAgregat,
  type Misi,
  type KonteksSesi,
  type CapaianMurid,
} from './misi';

const sesi = (o: Partial<KonteksSesi> = {}): KonteksSesi => ({
  menang: false,
  online: false,
  kuisBenar: 0,
  kuisSalah: 0,
  benarPerGolongan: {},
  ...o,
});
const capaian = (o: Partial<CapaianMurid> = {}): CapaianMurid => ({
  peringkatRekor: 1,
  jumlahBadgeMaster: 0,
  ...o,
});
const misi = (tipe: Misi['tipe'], target: Record<string, unknown>): Misi => ({
  id: 't',
  judul: 't',
  deskripsi: 't',
  tipe,
  target,
  poinReward: 100,
  badgeReward: null,
});

describe('menang (kejadian)', () => {
  it('counter naik hanya saat menang; filter online & tanpaSalah', () => {
    const m = misi('menang', { jumlah: 3, online: true });
    expect(kemajuanMisi(m, 1, sesi({ menang: true, online: true }), capaian()).progres).toBe(2);
    expect(kemajuanMisi(m, 1, sesi({ menang: true, online: false }), capaian()).progres).toBe(1);
    expect(kemajuanMisi(m, 1, sesi({ menang: false, online: true }), capaian()).progres).toBe(1);

    const tc = misi('menang', { jumlah: 1, tanpaSalah: true });
    expect(kemajuanMisi(tc, 0, sesi({ menang: true, kuisSalah: 0 }), capaian()).selesai).toBe(true);
    expect(kemajuanMisi(tc, 0, sesi({ menang: true, kuisSalah: 2 }), capaian()).selesai).toBe(false);
  });

  it('tak melebihi target', () => {
    const m = misi('menang', { jumlah: 3 });
    expect(kemajuanMisi(m, 3, sesi({ menang: true }), capaian()).progres).toBe(3);
  });
});

describe('kuisBenarGolongan (kejadian, kumulatif)', () => {
  it('tambah jumlah benar golongan itu dari sesi', () => {
    const m = misi('kuisBenarGolongan', { jumlah: 20, golongan: 'halogen' });
    const r = kemajuanMisi(m, 15, sesi({ benarPerGolongan: { halogen: 3, alkali: 2 } }), capaian());
    expect(r.progres).toBe(18);
    expect(r.selesai).toBe(false);
    expect(kemajuanMisi(m, 19, sesi({ benarPerGolongan: { halogen: 5 } }), capaian()).selesai).toBe(true);
  });
});

describe('kejadian: mainGame / kuisBenarTotal', () => {
  it('mainGame +1 per sesi', () => {
    expect(kemajuanMisi(misi('mainGame', { jumlah: 15 }), 14, sesi(), capaian()).selesai).toBe(true);
    expect(kemajuanMisi(misi('mainGame', { jumlah: 15 }), 3, sesi(), capaian()).progres).toBe(4);
  });
  it('kuisBenarTotal += kuisBenar sesi', () => {
    expect(kemajuanMisi(misi('kuisBenarTotal', { jumlah: 100 }), 84, sesi({ kuisBenar: 3 }), capaian()).progres).toBe(87);
  });
});

describe('agregat', () => {
  it('badgeMaster pakai nilai capaian', () => {
    expect(kemajuanMisi(misi('badgeMaster', { jumlah: 3 }), 0, sesi(), capaian({ jumlahBadgeMaster: 4 })).selesai).toBe(true);
  });

  it('peringkatGolongan: target = golongan, progres = rekor', () => {
    const m = misi('peringkatGolongan', { golongan: 10 });
    expect(targetMisi(m)).toBe(10);
    expect(kemajuanMisi(m, 0, sesi(), capaian({ peringkatRekor: 7 })).progres).toBe(7);
    expect(kemajuanMisi(m, 0, sesi(), capaian({ peringkatRekor: 12 })).selesai).toBe(true);
  });

  it('misiAgregat menandai tipe dengan benar', () => {
    expect(misiAgregat(misi('badgeMaster', {}))).toBe(true);
    expect(misiAgregat(misi('peringkatGolongan', {}))).toBe(true);
    expect(misiAgregat(misi('menang', {}))).toBe(false);
    expect(misiAgregat(misi('mainGame', {}))).toBe(false);
  });
});

describe('cekMisiSelesai', () => {
  it('bandingkan progres dengan target', () => {
    expect(cekMisiSelesai(misi('menang', { jumlah: 3 }), 3)).toBe(true);
    expect(cekMisiSelesai(misi('menang', { jumlah: 3 }), 2)).toBe(false);
  });
});

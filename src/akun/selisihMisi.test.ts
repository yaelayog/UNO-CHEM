import { describe, it, expect } from 'vitest';
import { selisihMisi, type StatusMisi } from './selisihMisi';
import { misiHarianUntuk, type Misi } from '../game';

const TGL = '2026-09-27';
const [a, b, c] = misiHarianUntuk(TGL);
const tetap: Misi[] = [
  {
    id: 'langkah-pertama',
    judul: 'Langkah Pertama',
    deskripsi: '',
    tipe: 'menang',
    target: { jumlah: 1 },
    poinReward: 100,
    badgeReward: null,
  },
];
const status = (o: Partial<StatusMisi> = {}): StatusMisi => ({
  misiProgres: [],
  harian: null,
  badgeDiraih: [],
  ...o,
});
const harian = (selesai: string[], lengkap = false, tanggal = TGL, streak = 1) => ({
  tanggal,
  progres: selesai.map((misiId) => ({ misiId, progres: 1, selesai: true })),
  streak,
  streakTerbaik: streak,
  totalLengkap: lengkap ? 1 : 0,
  lengkapHariIni: lengkap,
});

describe('selisihMisi', () => {
  it('kosong bila tak ada yang berubah', () => {
    const s = status({ harian: harian([a.id]) });
    expect(selisihMisi(s, s, tetap)).toEqual([]);
  });

  it('melaporkan misi tetap & harian yang baru selesai', () => {
    const r = selisihMisi(
      status({ harian: harian([a.id]) }),
      status({
        misiProgres: [
          { misiId: 'langkah-pertama', progres: 1, selesai: true, selesaiPada: null },
        ],
        harian: harian([a.id, b.id]),
      }),
      tetap,
    );
    expect(r.map((x) => [x.jenis, x.id])).toEqual([
      ['misi', 'langkah-pertama'],
      ['harian', b.id],
    ]);
  });

  it('bonus lengkap + lencana harian baru', () => {
    const r = selisihMisi(
      status({ harian: harian([a.id, b.id], false, TGL, 2), badgeDiraih: ['x'] }),
      status({
        harian: harian([a.id, b.id, c.id], true, TGL, 3),
        badgeDiraih: ['x', 'harian-streak-3'],
      }),
      tetap,
    );
    expect(r.map((x) => x.jenis)).toEqual(['harian', 'lengkap', 'lencana']);
    expect(r[1].poinReward).toBe(150);
    expect(r[2].badgeReward).toBe('harian-streak-3');
  });

  it('pergantian hari: progres kemarin tidak menyembunyikan misi hari ini', () => {
    const kemarin = harian([a.id, b.id, c.id], true, '2026-09-26');
    const baru = harian([a.id], false);
    expect(
      selisihMisi(status({ harian: kemarin }), status({ harian: baru }), tetap).map((x) => x.id),
    ).toEqual([a.id]);
  });
});

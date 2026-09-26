import { describe, it, expect } from 'vitest';
import {
  buatSesiId,
  galatSementara,
  rapikanAntrian,
  PERCOBAAN_MAKS,
  UMUR_MAKS_MS,
  type LaporanSesi,
} from './antrianLaporan';

const l = (o: Partial<LaporanSesi> = {}): LaporanSesi => ({
  sesiId: 'x',
  token: 't',
  dibuat: 1_000_000,
  percobaan: 0,
  payload: {},
  ...o,
});

describe('antrian laporan sesi', () => {
  it('sesiId unik', () => {
    expect(buatSesiId()).not.toBe(buatSesiId());
  });

  it('galat jaringan/server dicoba lagi; sesi tak valid tidak', () => {
    expect(galatSementara('Failed to send a request to the Edge Function')).toBe(true);
    expect(galatSementara('Edge Function returned a non-2xx status code')).toBe(true);
    expect(galatSementara('sesi tidak valid — masuk ulang dengan Nama + PIN')).toBe(false);
    expect(galatSementara('token kosong')).toBe(false);
  });

  it('membuang laporan kedaluwarsa & yang gagal terlalu sering', () => {
    const now = 1_000_000 + UMUR_MAKS_MS;
    const daftar = [
      l({ sesiId: 'lama', dibuat: 1_000_000 }),
      l({ sesiId: 'baru', dibuat: now - 1000 }),
      l({ sesiId: 'gagal', dibuat: now - 1000, percobaan: PERCOBAAN_MAKS }),
    ];
    expect(rapikanAntrian(daftar, now).map((x) => x.sesiId)).toEqual(['baru']);
  });
});

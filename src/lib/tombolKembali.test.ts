import { describe, expect, it } from 'vitest';
import { tujuanKembali } from './tombolKembali';

describe('tujuanKembali (tombol kembali HP)', () => {
  it('layar info & fitur kembali ke menu', () => {
    for (const l of ['aturan', 'tentang', 'cptp', 'belajar', 'profil', 'misi', 'akun', 'leaderboard'] as const) {
      expect(tujuanKembali(l, false)).toBe('menu');
    }
  });

  it('dashboard guru kembali ke layar akun', () => {
    expect(tujuanKembali('dashboard-guru', false)).toBe('akun');
  });

  it('di tengah permainan ditahan (solo maupun online)', () => {
    expect(tujuanKembali('main', false)).toBeNull();
    expect(tujuanKembali('main', true)).toBeNull();
  });

  it('lobby online: ditahan bila di dalam room, ke menu bila belum', () => {
    expect(tujuanKembali('online', true)).toBeNull();
    expect(tujuanKembali('online', false)).toBe('menu');
  });
});

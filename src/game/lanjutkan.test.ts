import { describe, it, expect } from 'vitest';
import { buatGame } from './engine';
import { lanjutkanOtomatis } from './lanjutkan';
import type { GameState } from './types';

const BOT2 = [
  { id: 'b1', nama: 'B1', isBot: true },
  { id: 'b2', nama: 'B2', isBot: true },
];
const HUMAN_BOT = [
  { id: 'human', nama: 'Kamu', isBot: false },
  { id: 'b1', nama: 'B1', isBot: true },
  { id: 'b2', nama: 'B2', isBot: true },
];

/** Jalankan sampai selesai, tutup otomatis tiap modal (peran "manusia"). */
function mainkanSampaiSelesai(s: GameState): GameState {
  for (let i = 0; i < 800 && s.status !== 'selesai'; i++) {
    s = lanjutkanOtomatis(s);
    if (s.status === 'selesai') break;
    if (s.peristiwaAktif) s = { ...s, peristiwaAktif: null };
    else if (s.funFactAktif) s = { ...s, funFactAktif: null };
    else if (s.faktaReward) s = { ...s, faktaReward: null };
    else if (s.menungguPembukaan) s = { ...s, menungguPembukaan: false };
    else break; // butuh input manusia (tak ada di skenario semua-bot)
  }
  return s;
}

describe('lanjutkanOtomatis', () => {
  it('permainan semua-bot berjalan sampai selesai (modal ditutup otomatis)', () => {
    const s = mainkanSampaiSelesai(buatGame(BOT2, 'auto-1', true));
    expect(s.status).toBe('selesai');
    expect(s.pemenangId).not.toBeNull();
    expect(s.log.some((l) => l.startsWith('Fun Fact:'))).toBe(true);
  });

  it('deterministik untuk seed sama', () => {
    const a = mainkanSampaiSelesai(buatGame(BOT2, 'sama', true));
    const b = mainkanSampaiSelesai(buatGame(BOT2, 'sama', true));
    expect(a.pemenangId).toBe(b.pemenangId);
    expect(a.giliranKe).toBe(b.giliranKe);
  });

  it('berhenti saat giliran manusia', () => {
    const s0 = buatGame(HUMAN_BOT, 'stop-human', false); // giliran 0 = human
    const s = lanjutkanOtomatis(s0);
    expect(s.status).toBe('bermain');
    expect(s.pemain[s.giliran].id).toBe('human');
    expect(s.pemain[0].tangan.length).toBe(7); // human belum jalan
  });

  it('menyiapkan soalAktif saat kuis menyasar manusia lalu berhenti', () => {
    const s0 = buatGame(HUMAN_BOT, 'kuis', false);
    const kuis: GameState = {
      ...s0,
      status: 'menungguKuis',
      efekTertunda: {
        jenis: 'draw2',
        targetPemainId: 'human',
        penaltiDasar: 2,
        tingkatKuis: 'mudah',
      },
      soalAktif: null,
    };
    const s = lanjutkanOtomatis(kuis);
    expect(s.status).toBe('menungguKuis');
    expect(s.soalAktif).not.toBeNull();
    expect(s.soalAktif!.tingkatKesulitan).toBe('mudah');
    expect(s.soalTerpakai).toContain(s.soalAktif!.id);
  });

  it('bot menjawab kuisnya sendiri tanpa berhenti', () => {
    const s0 = buatGame(HUMAN_BOT, 'kuis-bot', false);
    const kuis: GameState = {
      ...s0,
      giliran: 1,
      status: 'menungguKuis',
      efekTertunda: {
        jenis: 'draw2',
        targetPemainId: 'b2',
        penaltiDasar: 2,
        tingkatKuis: 'mudah',
      },
      soalAktif: null,
    };
    const s = lanjutkanOtomatis(kuis);
    // setelah bot b2 kena/jawab, lanjut sampai giliran human
    expect(s.status).toBe('bermain');
    expect(s.pemain[s.giliran].id).toBe('human');
  });

  it('memicu Fun Fact saat putaran penuh tuntas', () => {
    const s0 = buatGame(BOT2, 'ff', false);
    const s = lanjutkanOtomatis({ ...s0, giliranKe: 1, funFactRonde: 0 });
    // b1 jalan → giliranKe 2 → floor(2/2)=1 > 0 → Fun Fact muncul & berhenti
    expect(s.funFactAktif).not.toBeNull();
  });

  it('memicu Kartu Peristiwa saat ambang giliran terlewati', () => {
    const s0 = buatGame(BOT2, 'pk', true);
    const s = lanjutkanOtomatis({
      ...s0,
      giliranKe: 5,
      funFactRonde: 999,
    });
    expect(s.peristiwaAktif).not.toBeNull();
  });

  it('berhenti tanpa perubahan saat menungguPembukaan', () => {
    const s0 = { ...buatGame(BOT2, 'buka', false), menungguPembukaan: true };
    const s = lanjutkanOtomatis(s0);
    expect(s.menungguPembukaan).toBe(true);
    expect(s.pemain[0].tangan.length).toBe(7);
  });
});

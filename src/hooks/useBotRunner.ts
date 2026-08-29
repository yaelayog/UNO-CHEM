import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';

/** Jeda antar-aksi bot (ms) supaya pemain sempat mengikuti. */
const JEDA_BOT_MS = 850;

/**
 * Menjalankan giliran bot secara otomatis. Setiap kali GameState berubah,
 * cek apakah ada aksi bot yang tertunda; jika ya, jadwalkan `stepBot`.
 * Berhenti sendiri saat giliran pemain / menunggu input pemain / permainan usai.
 */
export function useBotRunner() {
  const state = useGameStore((s) => s.state);
  const humanId = useGameStore((s) => s.humanId);
  const stepBot = useGameStore((s) => s.stepBot);
  const sedangMembuka = useGameStore((s) => s.sedangMembuka);
  const mode = useGameStore((s) => s.mode);

  useEffect(() => {
    if (mode === 'online') return; // bot digerakkan server
    if (!state || state.status === 'selesai') return;
    if (sedangMembuka) return; // tunggu animasi kocok + bagi selesai
    if (state.peristiwaAktif) return; // tunggu pemain menutup kartu peristiwa
    if (state.funFactAktif) return; // tunggu pemain menutup kartu Fun Fact
    if (state.faktaReward) return; // tunggu pemain menutup kartu Fakta

    const current = state.pemain[state.giliran];
    const botHarusJalan =
      (state.status === 'bermain' && current.isBot) ||
      (state.status === 'menungguPilihWarna' && current.isBot) ||
      (state.status === 'menungguKuis' &&
        state.efekTertunda?.targetPemainId !== humanId);

    if (!botHarusJalan) return;

    const t = setTimeout(() => stepBot(), JEDA_BOT_MS);
    return () => clearTimeout(t);
  }, [state, humanId, stepBot, sedangMembuka, mode]);
}

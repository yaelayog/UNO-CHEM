import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { sfx } from '../lib/audio';

/**
 * Memainkan efek suara berdasarkan perubahan GameState. Suara yang berasal
 * langsung dari aksi (mainkan/tarik/jawab kuis) dibunyikan di store; hook ini
 * menangani yang bersifat turunan state: kartu mendarat, kocok awal, reward,
 * giliranmu, kemenangan, ledakan +4, dan peristiwa.
 */
export function useSoundEffects() {
  const state = useGameStore((s) => s.state);
  const humanId = useGameStore((s) => s.humanId);

  const prev = useRef<{
    ada: boolean;
    status?: string;
    giliranHuman?: boolean;
    rewardAda?: boolean;
    peristiwaId?: string | null;
    discardTop?: string;
    pengumumanId?: number;
  }>({ ada: false });

  useEffect(() => {
    const p = prev.current;

    if (!state) {
      prev.current = { ada: false };
      return;
    }

    const giliranHuman =
      state.status === 'bermain' && state.pemain[state.giliran].id === humanId;
    const rewardAda = Boolean(state.faktaReward);
    const peristiwaId = state.peristiwaAktif?.id ?? null;
    const discardTop = state.discardPile[state.discardPile.length - 1]?.id;

    // Kocok/bagi awal ditangani PembukaanMeja; hook ini mengabaikan state pertama.
    if (p.ada) {
      if (discardTop && discardTop !== p.discardTop) sfx.pop();

      if (peristiwaId && peristiwaId !== p.peristiwaId) {
        const j = state.peristiwaAktif!.jenisEfek;
        if (j === 'positif') sfx.reward();
        else if (j === 'negatif') sfx.salah();
        else sfx.giliran();
      }

      if (state.pengumumanKuis) {
        const pk = state.pengumumanKuis;
        if (pk.jenis === 'wild4' && pk.penaltiAkhir >= 3) sfx.ledakan();
      }

      if (rewardAda && !p.rewardAda) sfx.reward();
      if (giliranHuman && !p.giliranHuman && state.status === 'bermain') {
        sfx.giliran();
      }
      if (state.status === 'selesai' && p.status !== 'selesai') {
        if (state.pemenangId === humanId) sfx.menang();
      }
    }

    prev.current = {
      ada: true,
      status: state.status,
      giliranHuman,
      rewardAda,
      peristiwaId,
      discardTop,
    };
  }, [state, humanId]);
}

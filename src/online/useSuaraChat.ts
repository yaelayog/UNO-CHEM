import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { suaraChat } from './suaraChat';

/**
 * Menyalakan / mematikan voice chat mesh sesuai `suaraMode` & keanggotaan room.
 * Dipasang sekali (headless) di App. Status koneksi dikembalikan ke store.
 */
export function useSuaraChat() {
  const modeMain = useGameStore((s) => s.mode);
  const code = useGameStore((s) => s.online?.code ?? null);
  const uid = useGameStore((s) => s.online?.uid ?? null);
  const suaraMode = useGameStore((s) => s.suaraMode);
  const setStatus = useGameStore((s) => s._setSuaraStatus);
  const setPeers = useGameStore((s) => s._setSuaraPeers);

  useEffect(() => {
    suaraChat.onStatus = setStatus;
    suaraChat.onPeers = setPeers;
    return () => {
      suaraChat.onStatus = undefined;
      suaraChat.onPeers = undefined;
    };
  }, [setStatus, setPeers]);

  useEffect(() => {
    const aktif = modeMain === 'online' && !!code && !!uid && suaraMode !== 'off';
    if (!aktif) {
      suaraChat.putus();
      return;
    }
    void suaraChat.sambung(code!, uid!);
    suaraChat.setMode(suaraMode);
  }, [modeMain, code, uid, suaraMode]);

  useEffect(() => () => suaraChat.putus(), []);
}

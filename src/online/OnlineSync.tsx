import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { useRoomOnline } from './useRoomOnline';

/**
 * Komponen tak-tampak: menyalurkan update Realtime room ke store selama
 * `store.online` terisi. Dipasang sekali di App.
 */
export function OnlineSync() {
  const online = useGameStore((s) => s.online);
  const pasang = useGameStore((s) => s.pasangDataOnline);
  const data = useRoomOnline(online?.code ?? null, online?.uid ?? null);

  useEffect(() => {
    if (online) pasang(data);
  }, [data, pasang, online]);

  return null;
}

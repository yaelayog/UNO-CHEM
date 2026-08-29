import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';

/**
 * Selama ada status UNO yang belum dinyatakan, panggil `cekUno` berkala supaya
 * batas waktu tetap ditegakkan walau tak ada aksi lain.
 * Solo: `cekUnoKadaluarsa` lokal (murah) → 300 ms.
 * Online: tiap tik = 1 request ke Edge Function → 1500 ms sudah cukup
 * (denyut 12 dtk juga jadi backstop di server).
 */
export function useUnoTick() {
  const aktif = useGameStore(
    (s) => Boolean(s.state?.uno && !s.state.uno.dinyatakan),
  );
  const online = useGameStore((s) => s.mode === 'online');
  const cekUno = useGameStore((s) => s.cekUno);

  useEffect(() => {
    if (!aktif) return;
    const id = setInterval(cekUno, online ? 1500 : 300);
    return () => clearInterval(id);
  }, [aktif, online, cekUno]);
}

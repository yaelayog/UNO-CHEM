import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';

/**
 * Selama ada status UNO yang belum dinyatakan, panggil `cekUno` berkala supaya
 * batas waktu tetap ditegakkan walau tak ada aksi lain.
 * Solo: `cekUnoKadaluarsa` lokal (murah) → 400 ms.
 * Online: tiap tik = 1 request ke Edge Function → 3000 ms (auto-tangkap "Lawan"
 * cukup jadi backstop; pemain punya waktu penuh untuk balapan). Denyut 12 dtk
 * juga menegakkan di server.
 */
export function useUnoTick() {
  const aktif = useGameStore(
    (s) => Boolean(s.state?.uno && !s.state.uno.dinyatakan),
  );
  const online = useGameStore((s) => s.mode === 'online');
  const cekUno = useGameStore((s) => s.cekUno);

  useEffect(() => {
    if (!aktif) return;
    const id = setInterval(cekUno, online ? 3000 : 400);
    return () => clearInterval(id);
  }, [aktif, online, cekUno]);
}

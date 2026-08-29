import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';

/**
 * Selama ada status UNO yang belum dinyatakan, panggil `cekUno` tiap 300 ms
 * supaya batas waktu 4 detik tetap ditegakkan walau tak ada aksi lain
 * (solo: terapkan lokal · online: kirim ke server yang menegakkan otoritatif).
 */
export function useUnoTick() {
  const aktif = useGameStore(
    (s) => Boolean(s.state?.uno && !s.state.uno.dinyatakan),
  );
  const cekUno = useGameStore((s) => s.cekUno);

  useEffect(() => {
    if (!aktif) return;
    const id = setInterval(cekUno, 300);
    return () => clearInterval(id);
  }, [aktif, cekUno]);
}

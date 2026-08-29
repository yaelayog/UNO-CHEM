import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store/gameStore';

/**
 * Mengembalikan `true` sebentar (~450ms) saat terjadi kejadian besar:
 * penalti Reaksi Eksplosif (+3 kartu) atau peristiwa negatif berat.
 * Dipakai untuk kelas `animasi-guncang` di papan.
 */
export function useGuncang(): boolean {
  const pengumumanKuis = useGameStore((s) => s.state?.pengumumanKuis);
  const [guncang, setGuncang] = useState(false);
  const terakhir = useRef<string>('');

  useEffect(() => {
    if (!pengumumanKuis) return;
    const kunci = `${pengumumanKuis.namaTarget}-${pengumumanKuis.jenis}-${pengumumanKuis.penaltiAkhir}`;
    if (kunci === terakhir.current) return;
    terakhir.current = kunci;

    if (pengumumanKuis.jenis === 'wild4' && pengumumanKuis.penaltiAkhir >= 3) {
      setGuncang(true);
      const t = setTimeout(() => setGuncang(false), 450);
      return () => clearTimeout(t);
    }
  }, [pengumumanKuis]);

  return guncang;
}

import { useEffect } from 'react';
import type { PengumumanUno } from '../game';

interface Props {
  pengumuman: PengumumanUno | null;
  onTutup: () => void;
}

export function UnoToast({ pengumuman, onTutup }: Props) {
  useEffect(() => {
    if (!pengumuman) return;
    const id = setTimeout(onTutup, 3800);
    return () => clearTimeout(id);
  }, [pengumuman, onTutup]);

  if (!pengumuman) return null;
  const aman = pengumuman.jenis === 'aman';
  const teks = aman
    ? `${pengumuman.nama}: UNO! 🎉`
    : `${pengumuman.nama} lupa bilang UNO — ${pengumuman.oleh} menangkap, +${pengumuman.ambil} kartu`;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-52 z-40 flex justify-center px-3">
      <div
        className={`animasi-turun max-w-md rounded-2xl border px-4 py-2 text-center text-sm font-bold shadow-empuk ${
          aman
            ? 'border-gas-mulia/30 bg-gas-mulia-050 text-gas-mulia-700'
            : 'border-alkali/30 bg-alkali-050 text-alkali-700'
        }`}
      >
        {teks}
      </div>
    </div>
  );
}

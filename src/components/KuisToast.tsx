import { useEffect } from 'react';
import type { PengumumanKuis } from '../game';

interface Props {
  pengumuman: PengumumanKuis | null;
  onTutup: () => void;
}

function ringkas(p: PengumumanKuis): { teks: string; baik: boolean } {
  if (p.jenis === 'skip') {
    return p.dilewati
      ? { teks: `${p.namaTarget} dilewati — Reaksi Tidak Stabil`, baik: false }
      : { teks: `${p.namaTarget} lolos! Tidak jadi dilewati 🎉`, baik: true };
  }

  const label =
    p.hasil === 'benarCepat'
      ? `jawaban cepat & benar — ${p.penaltiDasar} → 0 kartu 🎉`
      : p.hasil === 'benarLambat'
        ? `benar — ${p.penaltiDasar} → ${p.penaltiAkhir} kartu`
        : `jawaban salah — ambil ${p.penaltiAkhir} kartu`;

  return { teks: `${p.namaTarget}: ${label}`, baik: p.hasil !== 'salah' };
}

export function KuisToast({ pengumuman, onTutup }: Props) {
  useEffect(() => {
    if (!pengumuman) return;
    const id = setTimeout(onTutup, 3800);
    return () => clearTimeout(id);
  }, [pengumuman, onTutup]);

  if (!pengumuman) return null;
  const { teks, baik } = ringkas(pengumuman);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-40 z-40 flex justify-center px-3">
      <div
        className={`animasi-turun max-w-md rounded-2xl border px-4 py-2 text-center text-sm font-bold shadow-empuk ${
          baik
            ? 'border-gas-mulia/30 bg-gas-mulia-050 text-gas-mulia-700'
            : 'border-alkali/30 bg-alkali-050 text-alkali-700'
        }`}
      >
        {teks}
      </div>
    </div>
  );
}

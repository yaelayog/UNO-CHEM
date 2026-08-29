import { useEffect } from 'react';
import type { PeristiwaAktif } from '../game';

interface Props {
  peristiwa: PeristiwaAktif;
  onTutup: () => void;
}

const GAYA = {
  positif: {
    label: 'Menguntungkan',
    kelas: 'border-gas-mulia bg-gas-mulia-050 text-gas-mulia-700',
    emoji: '✨',
  },
  negatif: {
    label: 'Merugikan',
    kelas: 'border-alkali bg-alkali-050 text-alkali-700',
    emoji: '💥',
  },
  netral: {
    label: 'Netral',
    kelas: 'border-transisi bg-transisi-050 text-transisi-700',
    emoji: '⚖️',
  },
} as const;

export function PeristiwaModal({ peristiwa, onTutup }: Props) {
  const g = GAYA[peristiwa.jenisEfek];

  // Auto-tutup sebagai jaring pengaman (terutama saat peristiwa milik bot).
  useEffect(() => {
    const id = setTimeout(onTutup, peristiwa.olehBot ? 3500 : 8000);
    return () => clearTimeout(id);
  }, [peristiwa, onTutup]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        className={`animasi-pop w-full max-w-sm rounded-3xl border-2 bg-white p-5 text-center shadow-empuk ${g.kelas.split(' ')[0]}`}
      >
        <div className="text-4xl">{g.emoji}</div>
        <p className="mt-1 text-xs font-extrabold uppercase tracking-wide text-tinta/50">
          Kartu Peristiwa Kimia · {g.label}
        </p>
        <h2 className="mt-1 font-display text-xl font-extrabold text-tinta">
          {peristiwa.judul}
        </h2>
        <p className="mt-2 text-sm text-tinta/75">{peristiwa.deskripsi}</p>

        <div className={`mt-3 rounded-2xl border px-3 py-2 text-sm font-bold ${g.kelas}`}>
          {peristiwa.ringkasan}
        </div>

        <button
          type="button"
          onClick={onTutup}
          className="mt-4 w-full rounded-2xl bg-lab px-4 py-2.5 font-display font-extrabold text-white shadow-empuk transition hover:brightness-110 cursor-pointer"
        >
          Lanjut
        </button>
      </div>
    </div>
  );
}

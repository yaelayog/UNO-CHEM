import { useEffect } from 'react';
import { GOLONGAN } from '../data/golongan';
import type { Golongan } from '../data/types';
import { GAYA_GOLONGAN } from '../lib/tampilan';

interface Props {
  reward: { golongan: Golongan; teks: string } | null;
  onTutup: () => void;
}

export function RewardToast({ reward, onTutup }: Props) {
  useEffect(() => {
    if (!reward) return;
    const id = setTimeout(onTutup, 4500);
    return () => clearTimeout(id);
  }, [reward, onTutup]);

  if (!reward) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-2 z-40 flex justify-center px-3">
      <div
        className={`animasi-turun max-w-md rounded-2xl border border-black/10 px-4 py-2.5 text-center shadow-empuk ${GAYA_GOLONGAN[reward.golongan].soft}`}
      >
        <p className="text-xs font-extrabold uppercase tracking-wide opacity-70">
          Fakta {GOLONGAN[reward.golongan].nama} 🔬
        </p>
        <p className="text-sm font-bold">{reward.teks}</p>
      </div>
    </div>
  );
}

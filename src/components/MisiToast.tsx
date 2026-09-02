import { useEffect } from 'react';
import { useAkunStore } from '../akun/akunStore';
import { misiBadge } from '../data/misiBadge';

/** Toast global saat satu/lebih Misi baru selesai. */
export function MisiToast() {
  const selesai = useAkunStore((s) => s.misiSelesaiBaru);
  const bersihkan = useAkunStore((s) => s.bersihkanMisiSelesai);

  useEffect(() => {
    if (selesai.length === 0) return;
    const t = setTimeout(bersihkan, 6000);
    return () => clearTimeout(t);
  }, [selesai, bersihkan]);

  if (selesai.length === 0) return null;

  return (
    <div className="animasi-turun pointer-events-none fixed inset-x-0 top-3 z-[70] flex flex-col items-center gap-2 px-4">
      {selesai.map((m, i) => (
        <div
          key={`${m.id}-${i}`}
          className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl border border-lab/30 bg-white px-4 py-3 shadow-empuk"
          onClick={bersihkan}
        >
          <span className="text-2xl">
            {m.badgeReward ? (misiBadge(m.badgeReward)?.ikon ?? '🎯') : '🎯'}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-extrabold uppercase tracking-wide text-lab">
              Misi selesai!
            </p>
            <p className="truncate text-sm font-extrabold text-tinta">
              {m.judul}
            </p>
          </div>
          <span className="flex-none text-sm font-extrabold text-lab">
            +{m.poinReward}
          </span>
        </div>
      ))}
    </div>
  );
}

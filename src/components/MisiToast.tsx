import { useEffect } from 'react';
import { useAkunStore } from '../akun/akunStore';
import type { MisiSelesai } from '../akun/tipe';
import { misiBadge } from '../data/misiBadge';

const LABEL: Record<NonNullable<MisiSelesai['jenis']>, string> = {
  misi: 'Misi selesai!',
  harian: 'Misi Harian selesai!',
  lengkap: 'Bonus Harian!',
  lencana: 'Lencana baru!',
};

function ikon(m: MisiSelesai): string {
  if (m.badgeReward) return misiBadge(m.badgeReward)?.ikon ?? '🎖️';
  if (m.jenis === 'lengkap') return '🔥';
  if (m.jenis === 'harian') return '📅';
  return '🎯';
}

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
          className={`pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl border px-4 py-3 shadow-empuk ${
            m.jenis === 'lengkap' ? 'border-alkali/40 bg-alkali-050' : 'border-lab/30 bg-white'
          }`}
          onClick={bersihkan}
        >
          <span className="text-2xl">{ikon(m)}</span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-extrabold uppercase tracking-wide text-lab">
              {LABEL[m.jenis ?? 'misi']}
            </p>
            <p className="truncate text-sm font-extrabold text-tinta">
              {m.jenis === 'lencana' && m.badgeReward
                ? (misiBadge(m.badgeReward)?.nama ?? m.judul)
                : m.judul}
            </p>
          </div>
          {m.poinReward > 0 && (
            <span className="flex-none text-sm font-extrabold text-lab">
              +{m.poinReward}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

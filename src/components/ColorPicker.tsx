import type { Golongan } from '../data/types';
import { SEMUA_GOLONGAN } from '../data/golongan';
import { GAYA_GOLONGAN } from '../lib/tampilan';

interface Props {
  judul?: string;
  onPilih: (g: Golongan) => void;
}

export function ColorPicker({ judul = 'Katalis', onPilih }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="animasi-pop w-full max-w-sm rounded-3xl border border-black/10 bg-white p-5 shadow-empuk">
        <h2 className="font-display text-lg font-extrabold text-tinta">
          {judul} — pilih golongan baru
        </h2>
        <p className="mt-1 text-xs font-bold text-tinta/60">
          Warna aktif akan berganti ke golongan yang kamu pilih.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-2">
          {SEMUA_GOLONGAN.map((g) => (
            <button
              key={g.key}
              type="button"
              onClick={() => onPilih(g.key)}
              className={`flex items-center justify-between rounded-2xl px-4 py-3 font-extrabold shadow-empuk transition hover:brightness-105 cursor-pointer ${GAYA_GOLONGAN[g.key].fill}`}
            >
              <span>{g.nama}</span>
              <span className="opacity-80">{g.nomorGolongan}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

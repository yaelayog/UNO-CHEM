import { useEffect, useState } from 'react';
import { BATAS_UNO_MS, type GameState } from '../game';

interface Props {
  state: GameState;
  humanId: string;
  onNyatakan: () => void;
  onTangkap: (targetId: string) => void;
}

function modalTerbuka(s: GameState): boolean {
  return Boolean(
    s.peristiwaAktif ||
      s.funFactAktif ||
      s.faktaReward ||
      s.menungguPembukaan ||
      s.status === 'menungguKuis' ||
      s.status === 'menungguPilihWarna',
  );
}

/**
 * Tombol balapan "UNO!". Muncul untuk semua pemain saat kartu seorang pemain
 * tinggal 1 & belum dinyatakan. Pemain bersangkutan → "UNO!" (aman).
 * Pemain lain → "Tangkap {nama}" (+2 kartu buat yang lupa). Hitung mundur
 * dibekukan selama ada modal yang menutupi papan.
 */
export function TombolUno({ state, humanId, onNyatakan, onTangkap }: Props) {
  const u = state.uno;
  const [, paksa] = useState(0);

  useEffect(() => {
    if (!u || u.dinyatakan) return;
    const id = setInterval(() => paksa((n) => n + 1), 120);
    return () => clearInterval(id);
  }, [u]);

  if (!u || u.dinyatakan || u.padaMs === 0) return null;
  const holder = state.pemain.find((p) => p.id === u.pemainId);
  if (!holder || holder.tangan.length !== 1) return null;
  // Selama modal menutupi papan hitung mundur dibekukan — sembunyikan tombol,
  // muncul lagi (dengan waktu segar) begitu modal ditutup.
  if (modalTerbuka(state)) return null;

  const sisa = Math.max(0, BATAS_UNO_MS - (Date.now() - u.padaMs));
  const persen = (sisa / BATAS_UNO_MS) * 100;
  const detik = Math.ceil(sisa / 1000);
  const akuKena = u.pemainId === humanId;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-28 z-[80] flex justify-center px-4">
      <button
        type="button"
        onClick={() => (akuKena ? onNyatakan() : onTangkap(u.pemainId))}
        className={`pointer-events-auto relative overflow-hidden rounded-full px-10 py-4 font-display text-2xl font-black text-white shadow-empuk ring-4 ring-white/70 transition active:scale-95 cursor-pointer
          ${akuKena ? 'bg-alkali animasi-denyut' : 'bg-lab-tinta'}`}
      >
        <span
          className="absolute inset-y-0 left-0 bg-white/25 transition-[width] duration-100"
          style={{ width: `${persen}%` }}
        />
        <span className="relative">
          {akuKena ? `UNO! (${detik})` : `⚡ Tangkap ${holder.nama}! (${detik})`}
        </span>
      </button>
    </div>
  );
}

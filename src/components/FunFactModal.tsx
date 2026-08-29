import { useEffect, useRef, useState } from 'react';
import { GOLONGAN } from '../data/golongan';
import { GAYA_GOLONGAN } from '../lib/tampilan';
import type { FunFactAktif } from '../game';

interface Props {
  fakta: FunFactAktif;
  onTutup: () => void;
}

/**
 * Kartu "Fun Fact" — muncul tiap 1 putaran. Tampil selama `fakta.bacaDetik`
 * detik (15–30, dari panjang teks) dengan bilah hitung mundur, lalu auto-lanjut.
 * Pemain bisa menekan "Lanjut" untuk melewati lebih cepat.
 */
export function FunFactModal({ fakta, onTutup }: Props) {
  const gaya = GAYA_GOLONGAN[fakta.golongan];
  const warna = GOLONGAN[fakta.golongan].warnaUno;
  const total = fakta.bacaDetik;
  const mulai = useRef(performance.now());
  const [sisa, setSisa] = useState(total);

  useEffect(() => {
    mulai.current = performance.now();
    setSisa(total);
    const id = setInterval(() => {
      const lewat = (performance.now() - mulai.current) / 1000;
      const s = Math.max(0, total - lewat);
      setSisa(s);
      if (s <= 0) onTutup();
    }, 200);
    return () => clearInterval(id);
  }, [fakta.id, total, onTutup]);

  const persen = (sisa / total) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div
        className="animasi-pop w-full max-w-sm overflow-hidden rounded-3xl border-2 bg-white text-center shadow-empuk"
        style={{ borderColor: warna }}
      >
        <div className={`px-5 pt-5 pb-4 ${gaya.soft}`}>
          <div className="text-4xl">{fakta.ikon}</div>
          <p className="mt-1 text-xs font-extrabold uppercase tracking-widest opacity-70">
            Fun Fact · {GOLONGAN[fakta.golongan].nama}
          </p>
        </div>

        <div className="px-5 pt-4 pb-5">
          <p className="text-[15px] font-bold leading-relaxed text-tinta">
            {fakta.teks}
          </p>

          <p className="mt-3 text-[11px] font-bold text-tinta/45">
            💡 Simak baik-baik — bisa membantu kuis nanti
          </p>

          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/10">
            <div
              className="h-full rounded-full transition-[width] duration-200 ease-linear"
              style={{ width: `${persen}%`, backgroundColor: warna }}
            />
          </div>

          <button
            type="button"
            onClick={onTutup}
            className="mt-4 w-full rounded-2xl bg-lab px-4 py-2.5 font-display font-extrabold text-white shadow-empuk transition hover:brightness-110 cursor-pointer"
          >
            Lanjut{sisa > 0 ? ` (${Math.ceil(sisa)})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}

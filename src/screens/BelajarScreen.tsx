import { useState } from 'react';
import { SEMUA_GOLONGAN, WARNA_GOLONGAN } from '../data/golongan';
import { DAFTAR_UNSUR } from '../data/unsur';
import type { Golongan, KartuKimia } from '../data/types';
import { GAYA_GOLONGAN } from '../lib/tampilan';
import { Card } from '../components/Card';
import { useGameStore } from '../store/gameStore';

function kartuDariUnsur(u: (typeof DAFTAR_UNSUR)[number]): KartuKimia {
  return {
    id: u.simbol,
    simbol: u.simbol,
    namaUnsur: u.namaUnsur,
    nomorAtom: u.nomorAtom,
    periode: u.periode,
    golongan: u.golongan,
    warnaUno: WARNA_GOLONGAN[u.golongan],
    jenis: 'angka',
  };
}

export function BelajarScreen() {
  const keLayar = useGameStore((s) => s.keLayar);
  const [aktif, setAktif] = useState<Golongan>('alkali');

  const info = SEMUA_GOLONGAN.find((g) => g.key === aktif)!;
  const unsur = DAFTAR_UNSUR.filter((u) => u.golongan === aktif).sort(
    (a, b) => a.nomorAtom - b.nomorAtom,
  );

  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col gap-4 p-5 no-select">
      <button
        type="button"
        onClick={() => keLayar('menu')}
        className="w-fit rounded-full bg-white px-3 py-1 text-xs font-bold text-tinta/70 shadow-empuk cursor-pointer hover:bg-kertas"
      >
        ← Menu
      </button>

      <h1 className="font-display text-2xl font-extrabold text-lab">Mode Belajar</h1>
      <p className="-mt-2 text-sm text-tinta/60">
        Jelajahi unsur tiap golongan. Tanpa skor — santai saja.
      </p>

      <div className="scroll-halus flex gap-2 overflow-x-auto">
        {SEMUA_GOLONGAN.map((g) => (
          <button
            key={g.key}
            type="button"
            onClick={() => setAktif(g.key)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-extrabold transition cursor-pointer ${
              aktif === g.key
                ? GAYA_GOLONGAN[g.key].fill
                : 'bg-white text-tinta/60 shadow-empuk hover:bg-kertas'
            }`}
          >
            {g.nama}
          </button>
        ))}
      </div>

      <section
        className={`rounded-3xl border border-black/10 p-4 shadow-empuk ${GAYA_GOLONGAN[aktif].soft}`}
      >
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-lg font-extrabold">{info.nama}</h2>
          <span className="text-xs font-bold opacity-70">
            Golongan {info.nomorGolongan}
          </span>
        </div>
        <p className="mt-1 text-sm">{info.deskripsi}</p>
        <ul className="mt-2 list-inside list-disc text-xs opacity-80">
          {info.fakta.slice(0, 3).map((f, i) => (
            <li key={i}>{f}</li>
          ))}
        </ul>
      </section>

      <div className="flex flex-col gap-3 pb-6">
        {unsur.map((u) => (
          <div
            key={u.simbol}
            className="flex gap-3 rounded-2xl border border-black/10 bg-white p-3 shadow-empuk"
          >
            <Card kartu={kartuDariUnsur(u)} ukuran="sm" />
            <div className="min-w-0">
              <p className="font-display text-sm font-extrabold text-tinta">
                {u.namaUnsur}{' '}
                <span className="text-tinta/50">
                  ({u.simbol}) · No. {u.nomorAtom} · Periode {u.periode}
                </span>
              </p>
              {u.fakta && (
                <p className="mt-0.5 text-xs text-tinta/70">{u.fakta}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

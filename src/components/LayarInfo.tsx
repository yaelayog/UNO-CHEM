import type { ReactNode } from 'react';
import { useGameStore } from '../store/gameStore';

/** Kerangka layar info (Tentang, CP & TP, Cara Main) — tombol kembali + judul. */
export function KerangkaInfo({
  judul,
  children,
}: {
  judul: string;
  children: ReactNode;
}) {
  const keLayar = useGameStore((s) => s.keLayar);
  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col gap-4 p-5 no-select">
      <button
        type="button"
        onClick={() => keLayar('menu')}
        className="w-fit rounded-full bg-white px-3 py-1 text-xs font-bold text-tinta/70 shadow-empuk cursor-pointer hover:bg-kertas"
      >
        ← Menu
      </button>
      <h1 className="font-display text-2xl font-extrabold text-lab">{judul}</h1>
      <div className="flex flex-col gap-3 text-sm leading-relaxed text-tinta/80">
        {children}
      </div>
    </main>
  );
}

export function BagianInfo({
  judul,
  children,
}: {
  judul: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-white p-3 shadow-empuk">
      <h2 className="mb-1.5 font-display text-sm font-extrabold text-lab">
        {judul}
      </h2>
      <div className="flex flex-col gap-1.5 text-[13px] leading-relaxed text-tinta/80">
        {children}
      </div>
    </section>
  );
}

/** Render teks dengan penanda **tebal** sederhana. */
export function TeksTebal({ teks }: { teks: string }) {
  const bagian = teks.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {bagian.map((b, i) =>
        b.startsWith('**') && b.endsWith('**') ? (
          <b key={i} className="text-tinta">
            {b.slice(2, -2)}
          </b>
        ) : (
          <span key={i}>{b}</span>
        ),
      )}
    </>
  );
}

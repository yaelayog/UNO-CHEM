import type { Golongan } from '../data/types';
import { GOLONGAN } from '../data/golongan';
import type { KartuKimia } from '../game';
import { Card } from './Card';
import { GAYA_GOLONGAN } from '../lib/tampilan';

interface Props {
  atas: KartuKimia;
  warnaAktif: Golongan | null;
  angkaAktif: number | null;
  /** true = tanpa indikator "Cocokkan" (dipakai di meja; indikator ada di dekat tangan). */
  ringkas?: boolean;
}

export function DiscardPile({ atas, warnaAktif, angkaAktif, ringkas }: Props) {
  return (
    <div className="flex flex-col items-center gap-2">
      {!ringkas && (
        <TargetCocok warnaAktif={warnaAktif} angkaAktif={angkaAktif} />
      )}
      <div className="relative">
        <div className="absolute -left-2 top-1 h-full w-full rotate-[-6deg] rounded-3xl border border-black/10 bg-white/70" />
        <div className="absolute -right-2 top-0.5 h-full w-full rotate-[5deg] rounded-3xl border border-black/10 bg-white/70" />
        <div key={atas.id} className="animasi-pop relative">
          <Card kartu={atas} ukuran="lg" />
        </div>
      </div>
    </div>
  );
}

/** Panel "Cocokkan [golongan] atau [Periode N]" — selalu terlihat jelas. */
export function TargetCocok({
  warnaAktif,
  angkaAktif,
}: {
  warnaAktif: Golongan | null;
  angkaAktif: number | null;
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5">
      <span className="text-[10px] font-bold uppercase tracking-wide text-tinta/45">
        Cocokkan
      </span>
      {warnaAktif && (
        <span
          className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-extrabold shadow-empuk ${GAYA_GOLONGAN[warnaAktif].fill}`}
        >
          <span className="h-2 w-2 rounded-full bg-current opacity-80" />
          {GOLONGAN[warnaAktif].nama}
        </span>
      )}
      <span className="text-[10px] font-bold text-tinta/45">atau</span>
      {angkaAktif !== null ? (
        <span className="rounded-full bg-tinta px-2.5 py-1 text-xs font-extrabold text-white shadow-empuk">
          Periode {angkaAktif}
        </span>
      ) : (
        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-tinta/50 shadow-empuk">
          periode bebas
        </span>
      )}
    </div>
  );
}

import { GOLONGAN } from '../data/golongan';
import { GAYA_GOLONGAN } from '../lib/tampilan';
import type { Golongan } from '../data/types';

interface Props {
  ikon: string;
  /** Label kecil di atas, mis. "Fun Fact" / "Fakta Kimia". */
  kicker: string;
  golongan: Golongan;
  teks: string;
  catatan?: string;
  /** Sisa & total detik hitung mundur. Kosongkan → tombol "Lanjut" murni. */
  sisaDetik?: number;
  totalDetik?: number;
  onLanjut: () => void;
}

/**
 * Kartu fakta layar-penuh — dipakai Fun Fact & Fakta streak golongan. Menutupi
 * seluruh papan; pemain wajib menekan "Lanjut" untuk melanjutkan (opsional
 * hitung mundur auto-lanjut untuk Fun Fact).
 */
export function KartuFaktaLayar({
  ikon,
  kicker,
  golongan,
  teks,
  catatan,
  sisaDetik,
  totalDetik,
  onLanjut,
}: Props) {
  const gaya = GAYA_GOLONGAN[golongan];
  const warna = GOLONGAN[golongan].warnaUno;
  const adaMundur =
    typeof sisaDetik === 'number' &&
    typeof totalDetik === 'number' &&
    totalDetik > 0;
  const persen = adaMundur ? (sisaDetik! / totalDetik!) * 100 : 0;

  return (
    <div
      className={`animasi-pop fixed inset-0 z-50 flex items-center justify-center ${gaya.soft} px-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]`}
    >
      <div className="flex w-full max-w-md flex-col items-center text-center">
        <div
          className="mb-6 h-1.5 w-16 rounded-full"
          style={{ backgroundColor: warna }}
        />

        <div className="text-6xl">{ikon}</div>
        <p className="mt-3 text-sm font-extrabold uppercase tracking-[0.2em] opacity-70">
          {kicker} · {GOLONGAN[golongan].nama}
        </p>

        <p className="mt-8 mb-8 max-h-[45vh] overflow-y-auto text-xl font-bold leading-relaxed text-tinta sm:text-2xl">
          {teks}
        </p>

        {catatan && (
          <p className="mb-4 max-w-xs text-xs font-bold text-tinta/45">
            {catatan}
          </p>
        )}

        {adaMundur && (
          <div className="mb-4 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-black/10">
            <div
              className="h-full rounded-full transition-[width] duration-200 ease-linear"
              style={{ width: `${persen}%`, backgroundColor: warna }}
            />
          </div>
        )}

        <button
          type="button"
          onClick={onLanjut}
          className="w-full max-w-sm rounded-2xl bg-lab px-6 py-4 font-display text-lg font-extrabold text-white shadow-empuk transition hover:brightness-110 active:scale-95 cursor-pointer"
        >
          Lanjut
          {adaMundur && sisaDetik! > 0 ? ` (${Math.ceil(sisaDetik!)})` : ''}
        </button>
      </div>
    </div>
  );
}

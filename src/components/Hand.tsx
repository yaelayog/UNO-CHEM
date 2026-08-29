import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { KartuKimia } from '../game';
import { Card } from './Card';
// Bar tumpuk pakai CSS keyframe (`.animasi-turun`), BUKAN AnimatePresence —
// animasi exit Framer bisa "beku" & menyisakan bar hantu (gotcha Tahap 5).

interface HandProps {
  kartu: KartuKimia[];
  legalIds: Set<string>;
  giliranPemain: boolean;
  /** Mainkan 1 kartu, atau tumpuk beberapa kartu angka seperiode sekaligus. */
  onMainkan: (kartuIds: string[]) => void;
}

export function Hand({ kartu, legalIds, giliranPemain, onMainkan }: HandProps) {
  const adaLangkah = giliranPemain && legalIds.size > 0;

  // Kartu yang sedang dipilih untuk dimainkan; index 0 = kartu "utama".
  const [terpilih, setTerpilih] = useState<string[]>([]);

  // Animasi "kartu dibagikan" hanya pada mount pertama.
  const [membagikan, setMembagikan] = useState(true);
  const sudah = useRef(false);
  useEffect(() => {
    if (sudah.current) return;
    sudah.current = true;
    const t = setTimeout(() => setMembagikan(false), 900);
    return () => clearTimeout(t);
  }, []);

  // Bereskan pilihan saat bukan giliran kita atau kartu di tangan berubah.
  const idsSekarang = kartu.map((k) => k.id).join(',');
  useEffect(() => {
    setTerpilih((t) => {
      if (!giliranPemain) return t.length ? [] : t;
      const ada = new Set(kartu.map((k) => k.id));
      const bersih = t.filter((id) => ada.has(id));
      return bersih.length === t.length ? t : bersih;
    });
  }, [giliranPemain, idsSekarang, kartu]);

  const byId = useMemo(() => {
    const m = new Map<string, KartuKimia>();
    for (const k of kartu) m.set(k.id, k);
    return m;
  }, [kartu]);

  const utama = terpilih.length ? byId.get(terpilih[0]) : undefined;
  const periodeTumpuk =
    utama && utama.jenis === 'angka' ? utama.periode : null;

  /** Bisa ikut ditumpuk = kartu angka, periode sama dengan kartu utama. */
  function bisaDitambah(k: KartuKimia): boolean {
    return (
      periodeTumpuk !== null &&
      k.jenis === 'angka' &&
      k.periode === periodeTumpuk &&
      !terpilih.includes(k.id)
    );
  }

  function tap(k: KartuKimia) {
    if (!giliranPemain) return;
    if (terpilih.length === 0) {
      if (legalIds.has(k.id)) setTerpilih([k.id]);
      return;
    }
    if (k.id === terpilih[0]) {
      setTerpilih([]); // batal via tap kartu utama
      return;
    }
    if (terpilih.includes(k.id)) {
      setTerpilih((t) => t.filter((id) => id !== k.id));
      return;
    }
    if (bisaDitambah(k)) {
      setTerpilih((t) => [...t, k.id]);
      return;
    }
    if (legalIds.has(k.id)) setTerpilih([k.id]); // ganti kartu utama
  }

  function konfirmasi() {
    if (terpilih.length === 0) return;
    onMainkan(terpilih);
    setTerpilih([]);
  }

  const memilih = terpilih.length > 0;

  return (
    <div className="relative">
      {memilih && (
        <div className="animasi-turun absolute inset-x-0 -top-11 z-[60] flex justify-center px-3">
          <div className="flex items-center gap-1.5 rounded-full bg-tinta/95 p-1 pl-2 text-white shadow-empuk backdrop-blur-sm">
            <button
              type="button"
              onClick={() => setTerpilih([])}
              className="rounded-full px-2 py-1.5 text-xs font-bold text-white/70 hover:text-white cursor-pointer"
            >
              ✕ batal
            </button>
            <button
              type="button"
              onClick={konfirmasi}
              className="rounded-full bg-lab px-4 py-1.5 text-sm font-extrabold shadow-empuk transition hover:brightness-110 cursor-pointer"
            >
              Mainkan {terpilih.length} kartu
              {terpilih.length > 1 && periodeTumpuk
                ? ` · periode ${periodeTumpuk}`
                : ''}
            </button>
          </div>
        </div>
      )}

      <div className="scroll-halus flex max-w-full items-end gap-0 overflow-x-auto px-4 pb-3 pt-4">
        <AnimatePresence initial={membagikan}>
          {kartu.map((k, i) => {
            const dipilih = terpilih.includes(k.id);
            const tambah = memilih && bisaDitambah(k);
            const primerBisa = giliranPemain && legalIds.has(k.id);
            // Saat memilih: kartu yang bukan pilihan / bukan kandidat tambah /
            // bukan kartu sah lain → diredupkan.
            const redup = memilih
              ? !dipilih && !tambah && !primerBisa
              : adaLangkah && !primerBisa;
            const bisaTap =
              giliranPemain && (primerBisa || dipilih || tambah);

            return (
              <motion.div
                key={k.id}
                layout="position"
                initial={
                  membagikan
                    ? { x: -220, y: -90, scale: 0.35, opacity: 0, rotate: -12 }
                    : { scale: 0.3, y: 26 }
                }
                animate={{ x: 0, y: 0, scale: 1, opacity: 1, rotate: 0 }}
                exit={{ scale: 0.3, y: -34, opacity: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 480,
                  damping: 34,
                  delay: membagikan ? i * 0.07 : 0,
                }}
                style={{
                  marginLeft: i === 0 ? 0 : -18,
                  zIndex: dipilih ? 90 + i : bisaTap ? 50 + i : i,
                }}
                className="relative"
              >
                {dipilih && (
                  <span className="pointer-events-none absolute -right-1 -top-1 z-[70] flex h-5 w-5 items-center justify-center rounded-full bg-lab text-[11px] font-black text-white shadow-empuk">
                    {terpilih.indexOf(k.id) + 1}
                  </span>
                )}
                {tambah && (
                  <span className="pointer-events-none absolute -right-1 -top-1 z-[70] flex h-5 w-5 items-center justify-center rounded-full bg-lab text-sm font-black text-white shadow-empuk">
                    +
                  </span>
                )}
                <Card
                  kartu={k}
                  ukuran="md"
                  bisaDimainkan={primerBisa && !memilih}
                  terpilih={dipilih}
                  bisaDitambah={tambah}
                  dim={redup}
                  onClick={bisaTap ? () => tap(k) : undefined}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

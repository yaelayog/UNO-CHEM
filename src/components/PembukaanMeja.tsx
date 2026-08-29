import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { sfx } from '../lib/audio';

interface Props {
  jumlahPemain: number;
  onSelesai: () => void;
}

type Fase = 'kocok' | 'bagi' | 'selesai';

const DUR_KOCOK = 1050;
const DUR_BAGI = 1350;
const DUR_TUTUP = 350;

/** Titik tujuan bagi kartu (persen layar) menurut jumlah pemain. Indeks 0 = kamu. */
function tujuanPemain(n: number): { x: number; y: number }[] {
  const kamu = { x: 50, y: 88 };
  const lawan: Record<number, { x: number; y: number }[]> = {
    1: [{ x: 50, y: 12 }],
    2: [{ x: 20, y: 16 }, { x: 80, y: 16 }],
    3: [{ x: 12, y: 44 }, { x: 50, y: 10 }, { x: 88, y: 44 }],
    4: [
      { x: 13, y: 42 },
      { x: 35, y: 12 },
      { x: 65, y: 12 },
      { x: 87, y: 42 },
    ],
    5: [
      { x: 11, y: 42 },
      { x: 28, y: 13 },
      { x: 50, y: 8 },
      { x: 72, y: 13 },
      { x: 89, y: 42 },
    ],
    6: [
      { x: 10, y: 44 },
      { x: 22, y: 16 },
      { x: 40, y: 9 },
      { x: 60, y: 9 },
      { x: 78, y: 16 },
      { x: 90, y: 44 },
    ],
  };
  return [kamu, ...(lawan[Math.max(1, Math.min(6, n - 1))] ?? lawan[1])];
}

function Belakang({ kecil }: { kecil?: boolean }) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl border border-white/40 bg-gradient-to-br from-lab to-lab-tinta text-white/90 shadow-kartu ${
        kecil ? 'h-14 w-10' : 'h-24 w-16'
      }`}
    >
      <span className={kecil ? 'text-sm' : 'text-xl'}>⚛</span>
      {!kecil && (
        <span className="font-display text-[8px] font-extrabold tracking-widest">
          CHEMUNO
        </span>
      )}
    </div>
  );
}

export function PembukaanMeja({ jumlahPemain, onSelesai }: Props) {
  const [fase, setFase] = useState<Fase>('kocok');

  useEffect(() => {
    sfx.kocok();
    const t1 = setTimeout(() => {
      setFase('bagi');
      sfx.kocok();
    }, DUR_KOCOK);
    const t2 = setTimeout(() => setFase('selesai'), DUR_KOCOK + DUR_BAGI);
    const t3 = setTimeout(onSelesai, DUR_KOCOK + DUR_BAGI + DUR_TUTUP);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onSelesai]);

  const tujuan = useMemo(() => tujuanPemain(jumlahPemain), [jumlahPemain]);

  // 3 putaran bagi ke tiap pemain, round-robin.
  const penerbangan = useMemo(() => {
    const list: { x: number; y: number; delay: number; id: number }[] = [];
    let id = 0;
    for (let putaran = 0; putaran < 3; putaran++) {
      for (const t of tujuan) {
        list.push({ x: t.x, y: t.y, delay: id * 0.055, id: id++ });
      }
    }
    return list;
  }, [tujuan]);

  return (
    <motion.div
      className="fixed inset-0 z-[70] flex items-center justify-center overflow-hidden"
      initial={{ opacity: 1 }}
      animate={{ opacity: fase === 'selesai' ? 0 : 1 }}
      transition={{ duration: DUR_TUTUP / 1000 }}
      onClick={onSelesai}
    >
      <div className="absolute inset-0 bg-kertas/95 backdrop-blur-sm" />

      <div className="relative flex flex-col items-center gap-4">
        {/* Tumpukan kartu yang dikocok */}
        <div className="relative h-24 w-16">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <motion.div
              key={i}
              className="absolute inset-0"
              style={{ zIndex: i }}
              animate={
                fase === 'kocok'
                  ? {
                      x: [0, i % 2 ? 46 : -46, i % 2 ? 4 : -4, 0],
                      y: [0, -i * 1.5, 3, 0],
                      rotate: [0, i % 2 ? 7 : -7, i % 2 ? 1 : -1, 0],
                    }
                  : { x: 0, y: 0, rotate: 0 }
              }
              transition={{
                duration: 0.5,
                ease: 'easeInOut',
                repeat: fase === 'kocok' ? 1 : 0,
                delay: i * 0.02,
              }}
            >
              <Belakang />
            </motion.div>
          ))}
        </div>

        <p className="font-display text-sm font-extrabold text-lab-tinta">
          {fase === 'kocok' ? 'Mengocok kartu…' : 'Membagikan…'}
        </p>
      </div>

      {/* Kartu terbang ke tiap pemain saat fase bagi */}
      <AnimatePresence>
        {fase === 'bagi' &&
          penerbangan.map((f) => (
            <motion.div
              key={f.id}
              className="absolute left-1/2 top-1/2"
              initial={{ x: '-50%', y: '-50%', scale: 1, opacity: 1 }}
              animate={{
                left: `${f.x}%`,
                top: `${f.y}%`,
                x: '-50%',
                y: '-50%',
                scale: 0.55,
                opacity: [1, 1, 0],
                rotate: (f.id % 3) * 8 - 8,
              }}
              transition={{ duration: 0.42, delay: f.delay, ease: 'easeOut' }}
            >
              <Belakang kecil />
            </motion.div>
          ))}
      </AnimatePresence>
    </motion.div>
  );
}

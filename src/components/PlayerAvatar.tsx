import { motion } from 'framer-motion';
import type { Pemain } from '../game';

interface Props {
  pemain: Pemain;
  aktif: boolean;
  menang?: boolean;
}

// Wajah ilmuwan per bot (bertema tokoh kimia).
const WAJAH: Record<string, string> = {
  bot1: '🧑‍🔬',
  bot2: '👩‍🔬',
  bot3: '🧑‍🏫',
  bot4: '👨‍🔬',
};

export function PlayerAvatar({ pemain, aktif, menang }: Props) {
  const jml = pemain.tangan.length;
  const wajah = menang ? '🏆' : (WAJAH[pemain.id] ?? '🧑‍🔬');

  return (
    <motion.div
      animate={aktif ? { scale: 1.06, y: [0, -2, 0] } : { scale: 1, y: 0 }}
      transition={
        aktif
          ? { y: { repeat: Infinity, duration: 1.6 }, scale: { duration: 0.2 } }
          : { duration: 0.2 }
      }
      className={`relative flex min-w-[64px] flex-col items-center gap-1 rounded-2xl border px-2 py-1.5 shadow-empuk transition-colors
        ${aktif ? 'border-lab bg-white' : 'border-black/10 bg-white/70'}`}
    >
      {aktif && (
        <span className="absolute -inset-1 -z-10 rounded-2xl bg-lab/25 blur-md" />
      )}

      <div className="relative">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-full text-lg ${aktif ? 'bg-lab/15' : 'bg-black/5'}`}
        >
          {wajah}
        </div>
        <span
          className={`absolute -bottom-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full border px-1 text-[10px] font-extrabold
            ${jml === 1 && !menang ? 'border-alkali bg-alkali text-white' : 'border-black/10 bg-white text-tinta'}`}
        >
          {jml === 1 && !menang ? 'UNO' : jml}
        </span>
      </div>

      <span className="max-w-[64px] truncate text-[11px] font-bold text-tinta">
        {pemain.nama}
      </span>

      {aktif && pemain.isBot && !menang && (
        <span className="flex gap-0.5" aria-label="berpikir">
          {[0, 1, 2].map((d) => (
            <span
              key={d}
              className="h-1 w-1 rounded-full bg-lab"
              style={{
                animation: 'titikBerpikir 1.1s ease-in-out infinite',
                animationDelay: `${d * 0.18}s`,
              }}
            />
          ))}
        </span>
      )}
    </motion.div>
  );
}

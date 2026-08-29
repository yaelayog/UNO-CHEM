import { motion } from 'framer-motion';

interface Props {
  jumlah: number;
  bisaTarik: boolean;
  /** Giliran pemain & tak ada kartu cocok → tumpukan berkedip petir putih. */
  wajibTarik?: boolean;
  onTarik: () => void;
}

export function DrawPile({ jumlah, bisaTarik, wajibTarik = false, onTarik }: Props) {
  return (
    <div className="flex flex-col items-center gap-2">
      <motion.button
        type="button"
        onClick={onTarik}
        disabled={!bisaTarik}
        whileHover={bisaTarik ? { y: -4 } : undefined}
        whileTap={bisaTarik ? { scale: 0.95 } : undefined}
        aria-label="Tarik kartu dari tumpukan"
        className={`relative h-[184px] w-32 rounded-3xl border border-black/10 bg-lab shadow-kartu
          ${bisaTarik ? 'cursor-pointer ring-4 ring-lab/40' : 'opacity-70'}
          ${wajibTarik ? 'animasi-petir' : ''}`}
      >
        <span className="absolute -left-1.5 top-1.5 h-full w-full -rotate-3 rounded-3xl border border-black/10 bg-lab-tinta" />
        <span className="relative flex h-full flex-col items-center justify-center gap-1 font-display text-white">
          <span className="text-2xl">{wajibTarik ? '⚡' : '⚛'}</span>
          <span className="text-xs font-extrabold tracking-widest">TARIK</span>
        </span>
      </motion.button>
      <span className="rounded-full bg-white/70 px-2.5 py-0.5 text-xs font-bold text-tinta">
        {jumlah} kartu
      </span>
    </div>
  );
}

import { motion } from 'framer-motion';
import type { JenisKartu } from '../data/types';
import { WARNA_GOLONGAN } from '../data/golongan';
import type { KartuKimia } from '../game';
import { GAYA_GOLONGAN, IKON_JENIS, LABEL_MEKANIK } from '../lib/tampilan';

export type UkuranKartu = 'sm' | 'md' | 'lg';

const UKURAN: Record<
  UkuranKartu,
  {
    box: string;
    badge: string;
    hantu: string;
    simbol: string;
    ikon: string;
    mekanik: string;
    sub: string;
  }
> = {
  sm: {
    box: 'w-12 h-[70px] rounded-xl',
    badge: 'text-[13px] px-1',
    hantu: 'text-[46px]',
    simbol: 'text-base',
    ikon: 'text-sm',
    mekanik: 'text-[7px]',
    sub: 'text-[6px]',
  },
  md: {
    box: 'w-[72px] h-[104px] rounded-2xl',
    badge: 'text-lg px-1.5',
    hantu: 'text-[74px]',
    simbol: 'text-2xl',
    ikon: 'text-lg',
    mekanik: 'text-[11px]',
    sub: 'text-[9px]',
  },
  lg: {
    box: 'w-32 h-[184px] rounded-3xl',
    badge: 'text-4xl px-2.5',
    hantu: 'text-[150px]',
    simbol: 'text-6xl',
    ikon: 'text-4xl',
    mekanik: 'text-lg',
    sub: 'text-sm',
  },
};

const SEMUA_WARNA = Object.values(WARNA_GOLONGAN);

interface CardProps {
  kartu: KartuKimia;
  ukuran?: UkuranKartu;
  faceDown?: boolean;
  bisaDimainkan?: boolean;
  /** kartu ini sedang dipilih untuk dimainkan (mode tumpuk) */
  terpilih?: boolean;
  /** kartu ini bisa ditambahkan ke tumpukan (angka seperiode) */
  bisaDitambah?: boolean;
  dim?: boolean;
  onClick?: () => void;
  className?: string;
}

export function Card({
  kartu,
  ukuran = 'md',
  faceDown = false,
  bisaDimainkan = false,
  terpilih = false,
  bisaDitambah = false,
  dim = false,
  onClick,
  className = '',
}: CardProps) {
  const u = UKURAN[ukuran];
  const bisaDiklik = Boolean(onClick);

  if (faceDown) {
    return (
      <div
        className={`${u.box} shrink-0 border border-black/10 bg-lab shadow-kartu ${className}`}
        aria-hidden
      >
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-white/90">
          <span className="font-display text-[10px] font-extrabold tracking-widest">
            CHEM
          </span>
          <span className="text-lg">⚛</span>
          <span className="font-display text-[10px] font-extrabold tracking-widest">
            UNO
          </span>
        </div>
      </div>
    );
  }

  const isWild = kartu.golongan === null;
  const gaya = kartu.golongan ? GAYA_GOLONGAN[kartu.golongan] : null;
  const isAngka = kartu.jenis === 'angka';
  const ikonSpesial = isAngka
    ? ''
    : IKON_JENIS[kartu.jenis as Exclude<JenisKartu, 'angka'>];

  // Isi badge pojok = "yang dicocokkan": periode utk kartu angka, ikon utk lainnya.
  const isiBadge = isAngka ? String(kartu.periode) : ikonSpesial;
  const Wrapper = bisaDiklik ? motion.button : motion.div;
  const interaktif = bisaDimainkan || bisaDitambah || terpilih;

  return (
    <Wrapper
      type={bisaDiklik ? 'button' : undefined}
      onClick={onClick}
      disabled={bisaDiklik ? dim : undefined}
      animate={terpilih ? { y: -18 } : { y: 0 }}
      whileHover={interaktif ? { y: terpilih ? -22 : -14, scale: 1.05, rotate: -2 } : undefined}
      whileTap={interaktif ? { scale: 0.95, rotate: 0 } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
      aria-label={
        isAngka
          ? `${kartu.namaUnsur} (${kartu.simbol}), nomor atom ${kartu.nomorAtom}, periode ${kartu.periode}`
          : `Kartu ${kartu.judulEfek ?? kartu.jenis}${kartu.golongan ? ', ' + kartu.namaUnsur : ''}`
      }
      className={`${u.box} kilau-kartu relative shrink-0 overflow-hidden border border-black/10 text-left shadow-kartu no-select
        ${isWild ? 'bg-tinta text-white' : gaya!.fill}
        ${terpilih ? 'z-30 ring-4 ring-lab ring-offset-2 ring-offset-white/70 cursor-pointer' : ''}
        ${bisaDitambah && !terpilih ? 'z-20 outline-2 outline-dashed outline-lab outline-offset-2 cursor-pointer' : ''}
        ${bisaDimainkan && !terpilih && !bisaDitambah ? 'animasi-denyut z-20 ring-4 ring-lab ring-offset-2 ring-offset-white/70 cursor-pointer' : ''}
        ${dim ? 'opacity-40 saturate-50' : ''}
        ${className}`}
    >
      {/* Kartu Katalis / Reaksi Eksplosif: pita 5 warna golongan (isyarat "ganti warna") */}
      {isWild && (
        <>
          <div className="absolute inset-x-0 top-0 flex h-1/4">
            {SEMUA_WARNA.map((c, i) => (
              <span key={i} className="flex-1" style={{ background: c }} />
            ))}
          </div>
          <div className="absolute inset-x-0 bottom-0 flex h-1/4">
            {SEMUA_WARNA.map((c, i) => (
              <span key={i} className="flex-1" style={{ background: c }} />
            ))}
          </div>
        </>
      )}

      {/* Angka periode besar & samar di belakang simbol — kesan "angka UNO" */}
      {isAngka && (
        <span
          className={`pointer-events-none absolute inset-0 flex items-center justify-center font-display font-black leading-none opacity-[0.22] ${u.hantu}`}
        >
          {kartu.periode}
        </span>
      )}

      <div className="relative flex h-full w-full flex-col justify-between p-1.5">
        {/* Pojok kiri atas: badge PERIODE (yang menentukan bisa/tidaknya dimainkan) */}
        <div className="flex items-start justify-between">
          <span
            className={`inline-flex items-center justify-center rounded-lg bg-white font-display font-black leading-none ${u.badge} ${isWild ? 'text-tinta' : gaya!.tinta}`}
          >
            {isiBadge}
          </span>
          {isAngka && (
            <span className={`${u.sub} font-extrabold opacity-70`}>
              P{kartu.periode}
            </span>
          )}
        </div>

        {/* Tengah */}
        {isAngka ? (
          <div className="flex flex-col items-center text-center">
            <span className={`font-display font-extrabold leading-none ${u.simbol}`}>
              {kartu.simbol}
            </span>
            <span className={`mt-0.5 font-bold leading-tight ${u.sub} opacity-90`}>
              {kartu.namaUnsur}
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center leading-none">
            <span className={u.ikon}>{ikonSpesial}</span>
            <span
              className={`mt-1 font-display font-black tracking-tight ${u.mekanik}`}
            >
              {LABEL_MEKANIK[kartu.jenis as Exclude<JenisKartu, 'angka'>]}
            </span>
            <span className={`mt-0.5 font-bold ${u.sub} opacity-70`}>
              {kartu.judulEfek}
            </span>
          </div>
        )}

        {/* Pojok kanan bawah: badge periode lagi (tegak, agar 6/9 tak tertukar) */}
        <div className="flex items-end justify-end">
          <span
            className={`inline-flex items-center justify-center rounded-lg bg-white/85 font-display font-black leading-none ${u.badge} ${isWild ? 'text-tinta' : gaya!.tinta}`}
          >
            {isiBadge}
          </span>
        </div>
      </div>
    </Wrapper>
  );
}

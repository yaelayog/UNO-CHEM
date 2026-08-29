import { useMemo } from 'react';
import { WARNA_GOLONGAN } from '../data/golongan';

const WARNA = [...Object.values(WARNA_GOLONGAN), '#0f766e', '#5eead4'];

/** Konfeti kemenangan berbasis CSS (nol dependency). */
export function Confetti({ jumlah = 90 }: { jumlah?: number }) {
  const bit = useMemo(
    () =>
      Array.from({ length: jumlah }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 1.2,
        dur: 2.6 + Math.random() * 2.4,
        warna: WARNA[i % WARNA.length],
        rot: Math.random() * 360,
        w: 6 + Math.random() * 8,
        bulat: Math.random() < 0.35,
      })),
    [jumlah],
  );

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-40 overflow-hidden"
    >
      {bit.map((b, i) => (
        <span
          key={i}
          className={`absolute top-0 block ${b.bulat ? 'rounded-full' : 'rounded-[2px]'}`}
          style={{
            left: `${b.left}%`,
            width: b.w,
            height: b.bulat ? b.w : b.w * 1.7,
            background: b.warna,
            transform: `rotate(${b.rot}deg)`,
            animation: `konfeti ${b.dur}s ${b.delay}s ease-in forwards`,
          }}
        />
      ))}
    </div>
  );
}

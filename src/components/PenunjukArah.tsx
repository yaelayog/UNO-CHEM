import { useEffect, useRef, useState } from 'react';

/**
 * Cincin anak panah di sekeliling meja oval yang menunjukkan arah giliran.
 *
 * Posisi tiap panah dihitung dengan trigonometri di dalam koordinat viewBox SVG
 * sendiri: x = cx + rx·cos θ, y = cy + ry·sin θ, lalu diputar mengikuti garis
 * singgung oval. viewBox otomatis menskala ke kontainer (yang ukurannya relatif
 * terhadap `.meja-lantai`), jadi tetap benar saat layar berubah tanpa perlu
 * mengukur piksel.
 *
 * `arah`: 1 = searah jarum jam, -1 = berlawanan. Saat berbalik, aliran DAN
 * kepala panah ikut terbalik.
 */

const JUMLAH = 8;
// Koordinat viewBox — rasio ~ sama dengan meja (aspect-ratio 5 / 3.15).
const CX = 100;
const CY = 63;
const RX = 92;
const RY = 55;
const DEG = 180 / Math.PI;
const KECEPATAN = 0.09; // putaran per detik

export function PenunjukArah({ arah }: { arah: 1 | -1 }) {
  const [fase, setFase] = useState(0);
  const [kilat, setKilat] = useState(false);
  const pertama = useRef(true);

  // Loop aliran panah.
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      setFase((f) => (f + dt * KECEPATAN + 1) % 1);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Kilatan sesaat ketika arah giliran berubah.
  useEffect(() => {
    if (pertama.current) {
      pertama.current = false;
      return;
    }
    setKilat(true);
    const t = setTimeout(() => setKilat(false), 480);
    return () => clearTimeout(t);
  }, [arah]);

  return (
    <svg
      className={`penunjuk-arah ${kilat ? 'animasi-kilat-arah' : ''}`}
      viewBox="0 0 200 126"
      aria-hidden
    >
      <ellipse
        cx={CX}
        cy={CY}
        rx={RX}
        ry={RY}
        fill="none"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      {Array.from({ length: JUMLAH }, (_, i) => {
        // Sudut posisi: merata, ditambah fase yang berjalan sesuai arah.
        const t = (i / JUMLAH + fase * arah) * Math.PI * 2;
        const x = CX + RX * Math.cos(t);
        const y = CY + RY * Math.sin(t);
        // Garis singgung oval saat θ naik: (-rx·sinθ, ry·cosθ).
        let sudut = Math.atan2(RY * Math.cos(t), -RX * Math.sin(t)) * DEG;
        // Arah berlawanan → gerak & kepala panah terbalik.
        if (arah === -1) sudut += 180;
        return (
          <path
            key={i}
            d="M -8 -7 L 5 0 L -8 7"
            fill="none"
            stroke="rgba(255,255,255,0.5)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            transform={`translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${sudut.toFixed(1)})`}
          />
        );
      })}
    </svg>
  );
}

import { useMemo } from 'react';

/**
 * Ledakan partikel singkat di tengah layar — dipakai saat jawaban kuis benar.
 * Render selama beberapa ratus ms lalu unmount oleh pemanggil.
 */
export function Ledakan({
  warna = '#22c55e',
  jumlah = 18,
}: {
  warna?: string;
  jumlah?: number;
}) {
  const bit = useMemo(
    () =>
      Array.from({ length: jumlah }, (_, i) => {
        const sudut = (i / jumlah) * Math.PI * 2 + Math.random() * 0.4;
        const jarak = 70 + Math.random() * 90;
        return {
          dx: Math.cos(sudut) * jarak,
          dy: Math.sin(sudut) * jarak,
          size: 6 + Math.random() * 8,
          dur: 0.5 + Math.random() * 0.35,
        };
      }),
    [jumlah],
  );

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center"
    >
      {bit.map((b, i) => (
        <span
          key={i}
          className="absolute rounded-full"
          style={
            {
              width: b.size,
              height: b.size,
              background: warna,
              '--dx': `${b.dx}px`,
              '--dy': `${b.dy}px`,
              animation: `pecahPartikel ${b.dur}s ease-out forwards`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

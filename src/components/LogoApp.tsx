import { useState } from 'react';

/**
 * Logo ChemUno (sudah termasuk wordmark). Taruh `public/logo-chemuno.png`
 * (transparan) dan otomatis dipakai. Selama file belum ada → fallback ke
 * teks + emoji, tidak error.
 *
 * `lebarMaks` = lebar tampil maksimum (px). Tinggi mengikuti rasio gambar.
 */
export function LogoApp({
  lebarMaks = 260,
  goyang = true,
}: {
  lebarMaks?: number;
  goyang?: boolean;
}) {
  const [gagal, setGagal] = useState(false);
  const anim = goyang
    ? { animation: 'goyangLogo 3.4s ease-in-out infinite' }
    : undefined;

  if (gagal) {
    return (
      <div className="flex flex-col items-center gap-1" style={anim}>
        <span className="text-5xl leading-none">⚗️</span>
        <span className="font-display text-4xl font-extrabold tracking-tight text-lab">
          ChemUno
        </span>
      </div>
    );
  }
  return (
    <img
      src="/logo-chemuno.png"
      alt="ChemUno"
      onError={() => setGagal(true)}
      style={{ width: 'min(72vw, ' + lebarMaks + 'px)', height: 'auto', ...anim }}
      className="object-contain"
    />
  );
}

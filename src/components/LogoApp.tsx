import { useState } from 'react';

/**
 * Logo ChemUno di dalam app. Taruh `public/logo-chemuno.png` (transparan,
 * disarankan ≥ 512 px sisi terpanjang) dan otomatis dipakai. Selama file
 * belum ada, jatuh ke emoji ⚗️ — tidak error.
 */
export function LogoApp({
  ukuran = 96,
  goyang = true,
}: {
  ukuran?: number;
  goyang?: boolean;
}) {
  const [gagal, setGagal] = useState(false);
  const anim = goyang
    ? { animation: 'goyangLogo 3.2s ease-in-out infinite' }
    : undefined;

  if (gagal) {
    return (
      <span
        className="inline-block leading-none"
        style={{ fontSize: ukuran * 0.75, ...anim }}
      >
        ⚗️
      </span>
    );
  }
  return (
    <img
      src="/logo-chemuno.png"
      alt="ChemUno"
      onError={() => setGagal(true)}
      style={{ height: ukuran, width: 'auto', ...anim }}
      className="object-contain"
    />
  );
}

import { useState } from 'react';

/**
 * Slot logo wajib panitia lomba (SPEC bagian 11). Taruh file PNG asli di
 * `public/logos/` dengan nama di bawah — kalau belum ada, tampil kotak
 * placeholder abu-abu bertuliskan nama logo. Tak perlu ubah kode.
 */
const LOGO: { file: string; nama: string }[] = [
  { file: 'dikti-saintek.png', nama: 'Dikti Saintek' },
  { file: 'unpatti.png', nama: 'Unpatti' },
  { file: 'forkom.png', nama: 'Forkom' },
  { file: 'forkom-2026.png', nama: 'Forkom 2026' },
];

function Slot({ file, nama, tinggi }: { file: string; nama: string; tinggi: number }) {
  const [gagal, setGagal] = useState(false);
  if (gagal) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-dashed border-black/15 bg-black/5 px-2 text-center text-[8px] font-bold leading-tight text-tinta/40"
        style={{ height: tinggi, minWidth: tinggi }}
        title={`Letakkan public/logos/${file}`}
      >
        {nama}
      </div>
    );
  }
  return (
    <img
      src={`/logos/${file}`}
      alt={`Logo ${nama}`}
      onError={() => setGagal(true)}
      style={{ height: tinggi }}
      className="w-auto object-contain"
    />
  );
}

export function LogoPanitia({
  tinggi = 34,
  judul,
}: {
  tinggi?: number;
  judul?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      {judul && (
        <p className="text-[10px] font-bold uppercase tracking-wide text-tinta/40">
          {judul}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {LOGO.map((l) => (
          <Slot key={l.file} {...l} tinggi={tinggi} />
        ))}
      </div>
    </div>
  );
}

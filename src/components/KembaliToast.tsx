import { useEffect } from 'react';
import { useToastKembali } from '../lib/tombolKembali';

/** Pemberitahuan saat tombol kembali HP ditahan (di tengah permainan / room). */
export function KembaliToast() {
  const pesan = useToastKembali((s) => s.pesan);
  const tutup = useToastKembali((s) => s.tutup);

  useEffect(() => {
    if (!pesan) return;
    const id = setTimeout(tutup, 2800);
    return () => clearTimeout(id);
  }, [pesan, tutup]);

  if (!pesan) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-14 z-50 flex justify-center px-3">
      <div className="animasi-turun max-w-md rounded-2xl border border-tinta/10 bg-white px-4 py-2 text-center text-sm font-bold text-tinta shadow-empuk">
        {pesan}
      </div>
    </div>
  );
}

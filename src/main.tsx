import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

// Catatan: StrictMode sengaja tidak dipakai — double-invoke dev-nya membuat
// animasi mount Framer Motion (modal) macet di tengah. Logika inti diverifikasi
// lewat unit test, bukan StrictMode.
createRoot(document.getElementById('root')!).render(<App />);

// PWA: begitu service worker baru mengambil alih (autoUpdate → skipWaiting +
// clientsClaim), muat ulang sekali supaya aset & env terbaru langsung dipakai —
// tanpa perlu tutup semua tab manual. Hanya bila SEBELUMNYA sudah dikontrol SW
// (bukan kunjungan pertama).
if ('serviceWorker' in navigator) {
  const adaControllerAwal = Boolean(navigator.serviceWorker.controller);
  let memuatUlang = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (adaControllerAwal && !memuatUlang) {
      memuatUlang = true;
      window.location.reload();
    }
  });
}

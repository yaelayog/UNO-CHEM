import { createRoot } from 'react-dom/client';
// Hanya subset latin + latin-ext (cukup utk Bahasa Indonesia) — file `NNN.css`
// tanpa awalan subset membawa SEMUA aksara (cyrillic/devanagari/vietnamese/dst),
// membengkakkan precache PWA tanpa guna karena tak pernah dipakai.
import '@fontsource/baloo-2/latin-500.css';
import '@fontsource/baloo-2/latin-600.css';
import '@fontsource/baloo-2/latin-700.css';
import '@fontsource/baloo-2/latin-800.css';
import '@fontsource/baloo-2/latin-ext-500.css';
import '@fontsource/baloo-2/latin-ext-600.css';
import '@fontsource/baloo-2/latin-ext-700.css';
import '@fontsource/baloo-2/latin-ext-800.css';
import '@fontsource/nunito/latin-400.css';
import '@fontsource/nunito/latin-600.css';
import '@fontsource/nunito/latin-700.css';
import '@fontsource/nunito/latin-800.css';
import '@fontsource/nunito/latin-ext-400.css';
import '@fontsource/nunito/latin-ext-600.css';
import '@fontsource/nunito/latin-ext-700.css';
import '@fontsource/nunito/latin-ext-800.css';
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

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
import { mulaiPembaruanOtomatis } from './lib/pembaruan';

// Catatan: StrictMode sengaja tidak dipakai — double-invoke dev-nya membuat
// animasi mount Framer Motion (modal) macet di tengah. Logika inti diverifikasi
// lewat unit test, bukan StrictMode.
createRoot(document.getElementById('root')!).render(<App />);

// PWA: cek & terapkan versi baru otomatis (hanya saat di menu utama).
mulaiPembaruanOtomatis();

// Chunk lazy versi lama sudah tak ada di server (mis. halaman lama diambil alih
// SW baru) → muat ulang sekali ke versi terbaru, jangan layar kosong. Kunci
// mencegah loop muat ulang; dihapus lagi setelah halaman berjalan normal.
const kunciMuatUlangChunk = 'chemuno:muat-ulang-chunk';
setTimeout(() => {
  try {
    sessionStorage.removeItem(kunciMuatUlangChunk);
  } catch {
    /* abaikan */
  }
}, 15_000);
window.addEventListener('vite:preloadError', (e) => {
  e.preventDefault();
  const kunci = kunciMuatUlangChunk;
  try {
    if (sessionStorage.getItem(kunci)) return;
    sessionStorage.setItem(kunci, '1');
  } catch {
    return;
  }
  window.location.reload();
});

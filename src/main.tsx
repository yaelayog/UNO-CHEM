import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

// Catatan: StrictMode sengaja tidak dipakai — double-invoke dev-nya membuat
// animasi mount Framer Motion (modal) macet di tengah. Logika inti diverifikasi
// lewat unit test, bukan StrictMode.
createRoot(document.getElementById('root')!).render(<App />);

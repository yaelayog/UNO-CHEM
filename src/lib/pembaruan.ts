// Pembaruan aplikasi (PWA / APK TWA) otomatis, tapi tak pernah di tengah main.
//
// Mode `prompt` vite-plugin-pwa: service worker versi baru diunduh lalu
// MENUNGGU (aset versi lama tetap di cache, jadi layar yang dimuat belakangan
// tidak 404). Begitu pemain berada di menu utama, versi baru diaktifkan dan
// halaman dimuat ulang sekali.
//
// Cek versi baru bukan cuma saat aplikasi dibuka: aplikasi di HP sering
// dibiarkan terbuka di latar belakang berjam-jam, jadi dicek juga setiap kali
// kembali ke depan (visibilitychange) dan tiap 20 menit.
import { registerSW } from 'virtual:pwa-register';
import { useGameStore } from '../store/gameStore';

const INTERVAL_CEK_MS = 20 * 60 * 1000;

let adaVersiBaru = false;
let sedangMenerapkan = false;
let terapkanVersiBaru: ((muatUlang?: boolean) => Promise<void>) | null = null;

function amanDiperbarui(): boolean {
  return useGameStore.getState().layar === 'menu';
}

function cobaPerbarui() {
  if (!adaVersiBaru || sedangMenerapkan || !terapkanVersiBaru) return;
  if (!amanDiperbarui()) return;
  sedangMenerapkan = true;
  void terapkanVersiBaru(true);
}

export function mulaiPembaruanOtomatis() {
  if (!('serviceWorker' in navigator)) return;

  terapkanVersiBaru = registerSW({
    immediate: true,
    onNeedRefresh() {
      adaVersiBaru = true;
      cobaPerbarui();
    },
    onRegisteredSW(_url, reg) {
      if (!reg) return;
      const cek = () => {
        if (navigator.onLine) void reg.update().catch(() => {});
      };
      setInterval(cek, INTERVAL_CEK_MS);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') cek();
      });
    },
  });

  // Versi baru siap tapi pemain sedang main → terapkan saat kembali ke menu.
  useGameStore.subscribe((s, sebelum) => {
    if (s.layar !== sebelum.layar) cobaPerbarui();
  });
}

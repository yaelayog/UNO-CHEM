// Diimpor ke sw.js buatan Workbox (vite.config.ts → workbox.importScripts).
//
// Masalah: SW mode `prompt` baru aktif setelah halaman mengirim SKIP_WAITING
// (src/lib/pembaruan.ts). Halaman versi lama (sebelum mode prompt) tidak punya
// kode itu, jadi SW baru terus MENUNGGU selama aplikasi lama masih hidup di
// latar belakang (sering terjadi di APK TWA) — pemain terjebak di tampilan lama.
//
// Solusi: SW yang sudah memakai model ini menandai dirinya lewat cache
// PENANDA. Kalau SW yang sedang aktif belum punya penanda (= SW warisan),
// SW baru langsung ambil alih dan memuat ulang semua halaman lama sekali.
// Pembaruan berikutnya kembali lewat alur normal (hanya saat di menu).
const PENANDA = 'uno-chem-model-sw-v1';
// Diset saat install bila mengambil alih SW warisan; dibaca saat activate.
// Disimpan di cache (bukan variabel) karena SW bisa dimatikan di antaranya.
const AMBIL_ALIH = 'uno-chem-ambil-alih';

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      if (self.registration.active && !(await caches.has(PENANDA))) {
        await caches.open(AMBIL_ALIH);
        await self.skipWaiting();
      }
    })(),
  );
});

self.addEventListener('activate', (event) => {
  const halamanLama = (async () => {
    await caches.open(PENANDA);
    if (!(await caches.delete(AMBIL_ALIH))) return [];
    // navigate() hanya boleh untuk halaman yang dikendalikan SW ini → claim dulu.
    await self.clients.claim();
    return self.clients.matchAll({ type: 'window' });
  })();
  event.waitUntil(halamanLama);
  // Muat ulang agar memakai index.html & aset versi baru. JANGAN di dalam
  // waitUntil: request navigasinya baru dilayani setelah aktivasi selesai,
  // jadi menunggunya di sini = deadlock (tab membeku).
  void halamanLama.then((halaman) => {
    setTimeout(() => {
      for (const h of halaman) if (h.navigate) h.navigate(h.url).catch(() => {});
    }, 0);
  });
});

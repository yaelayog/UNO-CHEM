# ChemUno

Game kartu edukasi kimia berbasis UNO untuk lomba media pembelajaran (SMP/SMA).
Warna kartu = golongan unsur, angka kartu = periode. Kartu aksi memicu kuis kimia.

## Menjalankan

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # build produksi + service worker PWA
npm run preview  # cek hasil build
npm test         # unit test (Vitest)
node scripts/gen-icons.mjs  # regenerate ikon PWA placeholder
```

## Tech stack

| Bidang        | Pilihan                        | Alasan singkat |
|---------------|--------------------------------|----------------|
| Build/UI      | Vite 6 + React 18 + TypeScript | cepat, PWA-ready |
| Styling       | Tailwind CSS v4 (`@tailwindcss/vite`) | konfigurasi minim, konsisten, mobile-first |
| Animasi       | Framer Motion (dipakai mulai Tahap 6) | flip/slide kartu tanpa 3D berat |
| State         | Zustand (dipakai mulai Tahap 3) | store ringan, mudah dipisah dari logic murni |
| PWA           | `vite-plugin-pwa` (Workbox)    | installable + offline cache aset |
| Test          | Vitest                         | jalan di atas config Vite yang sama |

## Keputusan arsitektur (bagian 6c brief)

Seluruh aturan main ditulis sebagai **fungsi murni** di `src/game/` — menerima
state, mengembalikan state baru, tanpa efek samping (tidak menyentuh DOM/storage).
Contoh awal: `src/game/penalti.ts` (`hitungPenaltiAkhir`). Nanti di Fase 3 (online
multiplayer) fungsi yang sama dipakai ulang untuk validasi langkah di sisi server.
UI React hanya memanggil fungsi-fungsi ini dan menampilkan hasilnya.

## Struktur folder

```
src/
  game/        fungsi murni aturan main + unit test (inti, no React)
    rng.ts        PRNG mulberry32 deterministik + Fisher–Yates
    penalti.ts    hitungPenaltiAkhir (brief §6)
    deck.ts       buatDeck — komposisi kartu ChemUno
    engine.ts     buatGame, mainkanKartu, pilihWarna, selesaikanKuis, tarikKartu
    bot.ts        langkahBot, jawabKuisBot
    types.ts      GameState, Pemain, EfekTertunda, PengumumanKuis
  lib/
    audio.ts      efek suara sintetis Web Audio API (nol file) + mute (localStorage)
    kuis.ts       pilihSoal (anti-ulang + per-golongan)
    tampilan.ts   kelas Tailwind per golongan
    progres.ts    XP/level, tambahHasilGame (pure), simpan/baca localStorage
  data/badge.ts   12 lencana + badgeTerbuka()
  screens/        MainMenu, InfoScreen, ProfilScreen, BelajarScreen
  components/   Card, Hand, DiscardPile, DrawPile, PlayerAvatar,
                QuizModal, ColorPicker, RewardToast, GameOver, GameBoard
  screens/      MainMenu, InfoScreen (RulesScreen + AboutScreen)
  store/        gameStore.ts — Zustand, membungkus src/game
  hooks/        useBotRunner.ts — auto-jalan giliran bot (setTimeout)
  lib/          tampilan.ts (kelas warna golongan), kuis.ts (pilihSoal)
  data/         data unsur & bank soal kuis
  App.tsx       switch layar (menu / main / aturan / tentang)
public/        ikon PWA, favicon, robots.txt
scripts/       util build (generator ikon)
```

### Komposisi deck (132 kartu)

- **94 kartu angka** — 2 salinan tiap unsur (47 unsur); "angka" = periode.
- **30 kartu spesial berwarna** — 2× skip/reverse/draw2 per golongan, berwajah
  unsur wakil (Na, Ca, Cl, He, Fe).
- **4 wild ("Katalis") + 4 wild4 ("Reaksi Eksplosif")**.

### Alur kartu spesial + kuis (brief §6)

`mainkanKartu` **menunda** efek skip/draw2/wild4 → `status: 'menungguKuis'` dengan
`efekTertunda`. UI menampilkan QuizModal ke pemain target, lalu memanggil
`selesaikanKuis(state, hasil)` yang menerapkan `hitungPenaltiAkhir` sebelum
membagikan kartu. Wild/wild4 → `status: 'menungguPilihWarna'` dulu (`pilihWarna`).
Reverse & wild biasa tidak memicu kuis.

## Roadmap

- **Fase 1 — solo vs bot** (prioritas lomba)
  1. ✅ Setup project (Vite + React + TS + Tailwind + PWA + Vitest)
  2. ✅ Data 47 unsur & bank soal 42 (`src/data/`)
  3. ✅ Logic inti UNO — pure functions di `src/game/` (deck, RNG deterministik, engine, bot). 41 test.
  4. ✅ Komponen UI + Zustand store — game solo vs bot dapat dimainkan penuh
  5. ✅ Integrasi kuis matang: soal anti-ulang + per-golongan, KuisToast, edge case teruji (51 test)
  6. ✅ Animasi (Framer layout + CSS keyframes) + efek suara Web Audio API (53 test)
  7. ✅ XP/level, 12 lencana, layar Profil & Pencapaian + Mode Belajar (62 test)
- **Fase 2**
  8. ✅ Deck "Kartu Peristiwa Kimia" — 15 kartu (5/5/5), picu tiap 6 giliran (70 test)
  9. ✅ Code-splitting per layar (bundle awal 104→63 KB gzip), safe-area, hint landscape
  10. ✅ Manifest PWA lengkap + ikon maskable + tombol pasang + `docs/APK.md` (Capacitor)
- **Fase 3 (paling akhir)**
  11. ⬜ Online multiplayer lintas kelas (room code, Firebase/Supabase Realtime)
```

## Kartu Peristiwa Kimia (`src/game/peristiwa.ts`)

Deck kedua terpisah, aktif bila dicentang di menu. `picuPeristiwa(state)` (fungsi
murni) menarik 1 kartu tiap `PERISTIWA_TIAP_GILIRAN` (6) giliran global, menerapkan
`efek(s, pemainId)`, dan mengisi `state.peristiwaAktif` (transient) untuk
`PeristiwaModal`. Deck disimpan sebagai `string[]` (id saja) di GameState agar
`structuredClone` aman. 5 positif / 5 negatif / 5 netral — semua auto-resolve.

## PWA / Offline

`vite-plugin-pwa` (Workbox generateSW): precache seluruh aset build +
`navigateFallback`, `runtimeCaching` untuk Google Fonts. `beforeinstallprompt`
ditangani `src/lib/pwa.ts` → tombol "Pasang Aplikasi" di menu. Untuk APK lihat
[`docs/APK.md`](docs/APK.md).

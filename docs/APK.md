# Membungkus ChemUno menjadi APK Android (Capacitor)

ChemUno adalah PWA — di HP Android/Chrome sudah bisa "Pasang Aplikasi" langsung
dari browser (tombol muncul di menu utama). Panduan ini **hanya** diperlukan bila
kamu butuh file **.apk** untuk dibagikan/diinstal manual (mis. laptop panitia
lomba tanpa internet).

## Prasyarat

- Node.js (sudah ada untuk proyek ini)
- **Android Studio** + Android SDK (sekali pasang) — https://developer.android.com/studio
- JDK 17 (biasanya sudah dibundel Android Studio)

## Langkah

### 1. Pasang Capacitor

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
```

### 2. Inisialisasi

```bash
npx cap init ChemUno com.chemuno.app --web-dir=dist
```

`com.chemuno.app` = application id (boleh diganti, harus unik & format domain terbalik).

### 3. Build web + tambahkan platform Android

```bash
npm run build
npx cap add android
npx cap sync
```

`npx cap sync` menyalin isi `dist/` ke proyek Android dan menyinkronkan plugin.
**Ulangi `npm run build && npx cap sync` setiap kali kode berubah.**

### 4. Ikon & splash (opsional tapi disarankan)

```bash
npm install -D @capacitor/assets
# taruh 1 file ikon 1024x1024 di resources/icon.png dan resources/splash.png
npx capacitor-assets generate --android
```

Atau pakai ikon PWA yang sudah ada (`public/pwa-512x512.png`) sebagai dasar.

### 5. Buka di Android Studio & build APK

```bash
npx cap open android
```

Di Android Studio:

- **Build → Build Bundle(s)/APK(s) → Build APK(s)**
- APK debug ada di `android/app/build/outputs/apk/debug/app-debug.apk`
- Untuk APK rilis yang ditandatangani: **Build → Generate Signed Bundle / APK**,
  buat keystore baru, pilih **APK**, varian **release**.

### 6. Pasang di HP

Kirim file `.apk` ke HP, buka, izinkan "Instal aplikasi tidak dikenal".

## Catatan

- **Orientasi**: kunci ke potret di `android/app/src/main/AndroidManifest.xml`
  pada `<activity ... android:screenOrientation="portrait">`.
- **Offline**: karena aset di-bundle di dalam APK, game jalan penuh tanpa internet.
  Font Google (Baloo 2 / Nunito) tetap butuh internet pada pemakaian pertama —
  bila harus 100% offline, self-host font: unduh file `.woff2`, taruh di
  `public/fonts/`, dan ganti `@import`/`<link>` di `index.html` + `src/index.css`
  dengan `@font-face` lokal.
- **Update**: setiap rilis baru = `npm run build && npx cap sync` lalu build APK lagi.
- Ukuran APK ± 4–6 MB.

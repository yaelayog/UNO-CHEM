# APK Android ChemUno (TWA)

APK ChemUno adalah **Trusted Web Activity (TWA)**: aplikasi Android yang membuka
`https://uno-chem.vercel.app` layar penuh lewat Chrome. Karena isinya website yang
sama, pemain APK, website, dan PWA **main online di room yang sama** (backend
Supabase yang sama), dan setiap deploy ke Vercel langsung terbawa ke APK tanpa
build ulang.

- Package: `com.chemuno.app`
- Proyek Android: `android-twa/` (di-generate Bubblewrap dari `twa-manifest.json`)
- Verifikasi domain: `public/.well-known/assetlinks.json` — **harus ter-deploy**,
  kalau tidak APK tetap jalan tapi menampilkan address bar Chrome di atas.

## Kunci tanda tangan (PENTING)

`android-twa/chemuno-release.keystore` + `android-twa/keystore-rahasia.txt`
(password) **tidak di-commit**. Backup keduanya ke tempat aman. Kalau hilang:
APK baru tidak bisa meng-update APK lama, dan fingerprint di `assetlinks.json`
harus diganti.

## Prasyarat (sekali pasang, macOS)

```bash
brew install openjdk@17
brew install --cask android-commandlinetools
export JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home
SDK=$HOME/Library/Android/sdk
yes | sdkmanager --sdk_root=$SDK --licenses
sdkmanager --sdk_root=$SDK "platform-tools" "platforms;android-36" "build-tools;36.1.0"
```

## Build ulang APK

Hanya perlu bila ganti ikon/nama/versi aplikasi — perubahan game cukup deploy ke Vercel.
Naikkan `appVersionCode`/`appVersionName` di `android-twa/twa-manifest.json` dan
`versionCode`/`versionName` di `android-twa/app/build.gradle`, lalu:

```bash
cd android-twa
export JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home
export ANDROID_HOME=$HOME/Library/Android/sdk
BT=$ANDROID_HOME/build-tools/36.1.0
PW=$(grep storePassword keystore-rahasia.txt | cut -d= -f2)

./gradlew assembleRelease
$BT/zipalign -f -p 4 app/build/outputs/apk/release/app-release-unsigned.apk /tmp/aligned.apk
$BT/apksigner sign --ks chemuno-release.keystore --ks-key-alias chemuno \
  --ks-pass pass:$PW --key-pass pass:$PW --out ChemUno-<versi>.apk /tmp/aligned.apk
$BT/apksigner verify ChemUno-<versi>.apk
```

## Pasang di HP

Kirim `.apk` ke HP, buka, izinkan "Instal aplikasi tidak dikenal". Butuh Chrome
terpasang (bawaan hampir semua HP Android) dan internet.

## Catatan

- **Voice chat**: izin mikrofon diminta Chrome seperti di website biasa.
- **Login**: sesi APK terpisah dari sesi browser — login ulang sekali; datanya sama.
- **Mode bot offline**: jalan setelah APK pernah dibuka online sekali (service worker PWA).

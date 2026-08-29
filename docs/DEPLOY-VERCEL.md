# Deploy ke Vercel

App ini SPA (Vite + PWA). Vercel mendeteksi framework `vite` otomatis
(`npm run build` → `dist/`). `vercel.json` hanya mengatur cache header
(service worker jangan di-cache, aset `assets/*` di-cache 1 tahun).

## 1. Import repo

1. Login **vercel.com** dengan akun GitHub.
2. **Add New → Project** → pilih repo **`yaelayog/UNO-CHEM`** → **Import**.
3. Framework Preset akan otomatis **Vite**. Build/Output biarkan default
   (`npm run build` / `dist`).

## 2. Environment Variables

Di layar import (atau **Project → Settings → Environment Variables**), tambah
**untuk Production + Preview**:

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://lyhlrcgrmbumpwowtqgx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | *(anon key dari `.env` — Supabase → Settings → API)* |

> Nilai `VITE_*` di-*inline* saat build. Kalau diubah, harus **Redeploy**.

## 3. Deploy

Klik **Deploy**. Selesai → dapat URL `https://uno-chem-xxxx.vercel.app`.
Setiap `git push` ke `main` → auto-deploy.

## 4. Setelah punya URL

- **Supabase → Authentication → URL Configuration** → set **Site URL** ke URL
  Vercel (ganti `http://localhost:3000`).
- Test PWA: buka di HP, "Add to Home Screen", coba mode offline (solo tetap
  jalan; online butuh sinyal).
- Test online lintas HP: buat room di satu HP, gabung kode dari HP lain.

## Catatan PWA

`registerType: 'autoUpdate'` (vite.config.ts) — service worker versi baru
otomatis aktif saat semua tab ditutup lalu dibuka lagi. Header di `vercel.json`
memastikan `sw.js` selalu di-revalidasi supaya update cepat sampai.

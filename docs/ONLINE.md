# ChemUno — Mode Online Multiplayer (Fase 3)

Siswa lintas kelas main bareng real-time lewat **kode room**. Slot kosong diisi
**bot** otomatis (mis. 4 pemain, hanya 2 yang online → 2 bot).

- **Otoritas**: Supabase **Edge Function** (`aksi`) menjalankan engine murni yang
  sama dengan klien (`src/game/`). Klien hanya mengirim aksi & menerima update
  via Realtime — tak menghitung sendiri (anti-cheat).
- **Tangan lawan** tak pernah dikirim ke klien lain: `game_publik` hanya berisi
  jumlah kartu; isi tangan ada di tabel `tangan` dengan RLS per pemain.

---

## 1. Buat project Supabase

1. [supabase.com](https://supabase.com) → **New project** (region terdekat, mis.
   Southeast Asia / Singapore).
2. **Project Settings → API**: salin **Project URL** dan **anon public key**.
3. Buat file `.env` di root repo (contoh: `.env.example`):

   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```

4. **Authentication → Sign In / Providers → Anonymous** → **Enable**.
   (Tiap browser dapat identitas via anonymous sign-in; dipakai RLS tabel `tangan`.)

---

## 2. Skema database

### Opsi A — Supabase CLI (disarankan)

```bash
npm i -g supabase          # atau: brew install supabase/tap/supabase
supabase login
supabase link --project-ref <ref>     # <ref> = subdomain project URL
supabase db push                       # jalankan supabase/migrations/*.sql
```

### Opsi B — Dashboard (tanpa CLI)

Buka **SQL Editor → New query**, tempel isi **`supabase/skema.sql`**, **Run**.

---

## 3. Deploy Edge Function `aksi`

Engine disalin dulu ke `supabase/functions/_shared/` (folder ini di-`.gitignore`,
di-generate dari `src/game` + `src/data`):

```bash
npm run sync:supabase
```

### Opsi A — CLI

```bash
supabase functions deploy aksi --no-verify-jwt
```

`--no-verify-jwt` supaya preflight CORS lolos; JWT tetap diverifikasi di dalam
fungsi (`supabase.auth.getUser`).

### Opsi B — Dashboard

**Edge Functions → Create a function** → nama `aksi` → **Verify JWT: OFF**.
Salin isi `supabase/functions/aksi/index.ts` (fungsi mengimpor dari
`../_shared/...`; kalau dashboard tak mendukung multi-file, gunakan CLI).
Env `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` sudah
otomatis tersedia untuk Edge Function.

---

## 4. Jalankan

```bash
npm run dev
```

Tombol **🌐 Main Online (kode room)** di menu kini aktif.

- **Buat room**: isi nama, pilih 2–4 pemain, (opsional) Kartu Peristiwa → dapat
  kode 5 huruf → bagikan.
- **Gabung**: isi nama + kode.
- Host menekan **Mulai Main** kapan saja → kursi kosong jadi bot.
- Pemain terputus bisa **gabung lagi** dengan kode yang sama (state tersimpan di
  server). Giliran yang macet > 30 dtk di-resolve otomatis (kuis → salah,
  giliran → tarik kartu).

---

## Setiap kali engine (`src/game`) berubah

```bash
npm run sync:supabase
supabase functions deploy aksi --no-verify-jwt
```

## Struktur

| berkas | isi |
|---|---|
| `supabase/migrations/0001_online.sql` · `supabase/skema.sql` | tabel, RLS, Realtime |
| `supabase/functions/aksi/index.ts` | Edge Function otoritatif (router semua aksi) |
| `supabase/functions/_shared/redaksi.ts` | pisah state publik ↔ tangan rahasia |
| `supabase/functions/_shared/{game,data}/` | engine hasil `npm run sync:supabase` |
| `src/lib/supabase.ts` | klien (dynamic import — bundle solo tetap ringan) |
| `src/online/*` | adapter, hook Realtime, rekonstruksi state, `OnlineSync` |
| `src/screens/OnlineLobby.tsx` | layar buat/gabung room + lobby |

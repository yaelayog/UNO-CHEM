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

---

## Akun & Kelas (Fase 4 — Minggu 1)

Sistem identitas guru–murid + progres persisten. **Terpisah** dari sistem room.

### Skema

```bash
supabase db push          # 0004..0009 (akun, RLS, leaderboard, pin terbaca, misi + dashboard guru)
```

| tabel | isi | RLS |
|---|---|---|
| `kelas` | `id, nama_kelas, kode_kelas UNIK, guru_id, dibuat_pada` | guru CRUD kelas miliknya (`guru_id = auth.uid()`) |
| `murid` | `nama, pin (4 digit, APA ADANYA — media belajar, guru bisa bantu murid lupa PIN), kode_unik "4821" UNIK, kelas_id NULLABLE, auth_uid, sesi_token_hash` | klien deny-all; guru boleh BACA murid di kelasnya |
| `progres_murid` | `total_poin, peringkat_golongan_aktif/rekor, badge_diraih, progres_lokal (blob XP lama), …` | klien deny-all; guru BACA murid di kelasnya |

Semua tulis data murid lewat **Edge Function `akun` (service role)** — bukan RLS klien.

### Auth

- **Guru** = Supabase Auth email+password. Di dashboard: **Authentication →
  Providers → Email** enable. Untuk demo cepat, matikan **Confirm email**
  (Authentication → Providers → Email → *Confirm email* OFF) supaya guru bisa
  langsung masuk setelah daftar.
- **Murid** = Nama + PIN 4 digit (identitas ringan, bukan principal auth).
  Session token disimpan di `localStorage: chemuno:sesiMurid`; Nama+PIN dipakai
  untuk pemulihan di device lain. Satu token aktif per murid (login di device
  baru meng-invalidasi token device lama).

### Deploy Edge Function `akun` + `aksi`

Sejak Minggu 2 keduanya memakai `_shared/game/peringkat.ts` + `_shared/poin.ts`:

```bash
npm run sync:supabase
supabase functions deploy akun --no-verify-jwt
supabase functions deploy aksi --no-verify-jwt
```

### Endpoint `akun` (body `{ tipe, ... }`)

| tipe | payload | hasil |
|---|---|---|
| `daftar` | `nama, pin, kodeKelas?, progresLokal?` | `{ murid, progres, token }` |
| `masuk` | `nama, pin, kodeUnik?` | `{ murid, progres, token }` atau `{ pilihan: [...] }` bila >1 akun cocok |
| `sesi` | `token` | `{ murid, progres, token }` (restore saat app dibuka) |
| `gabungKelas` | `token, kodeKelas` | `{ murid, progres }` |
| `tambahPoin` | `token, poin, akurasi` | `{ ok, progres }` — laporan poin sesi SOLO |
| `sinkronProgres` | `token, progresLokal` | `{ ok: true }` |
| `keluar` | `token` | `{ ok: true }` |

### Poin Peringkat Golongan (Minggu 2)

- **Online** → Edge Function `aksi` memberi poin **server-side** saat kuis benar
  (`poinJawabanBenar`, dibobot kesulitan) & saat menang room. Bonus menang
  **berjenjang** per jumlah pemain MANUSIA di room (`poinBonusMenangOnline(n)`:
  2 manusia=250, 3=350, … 7=750; <2 manusia = 0, mencegah farming lawan bot).
  Cari murid via `murid.auth_uid`. Tamu/guru → no-op (tak dapat poin).
- **Solo** → klien akumulasi poin selama game, kirim `akun/tambahPoin` sekali di akhir.
  Menang vs bot TIDAK dapat bonus 250.
- **Leaderboard**: RPC `leaderboard_kelas(kelas_id)` / `leaderboard_global(limit)` /
  `leaderboard_sesi(uids[])` (`SECURITY DEFINER`, kolom aman saja).
  Layar `src/screens/LeaderboardScreen.tsx` + ringkasan sesi di `GameOver` (mode online).

### Reset mingguan (cron)

Edge Function `reset-mingguan` — turunkan peringkat aktif ~3 golongan dari puncak
minggu ini (lantai 3), nol-kan poin minggu. Rekor tak berubah. Rumus di
`_shared/game/peringkat.ts`.

```bash
npm run sync:supabase
supabase functions deploy reset-mingguan --no-verify-jwt
supabase secrets set CRON_SECRET=<acak-panjang>
```

**Jadwal terpasang (SQL Editor, pg_cron + pg_net):**
```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.schedule('chemuno-reset-mingguan', '0 3 * * 4', $$
  select net.http_post(
    url := 'https://lyhlrcgrmbumpwowtqgx.supabase.co/functions/v1/reset-mingguan',
    headers := '{"Authorization":"Bearer <CRON_SECRET>"}'::jsonb
  );
$$);
```
`0 3 * * 4` = **Kamis 03:00 UTC = Kamis 10:00 WIB**. pg_cron pakai UTC.

Cek: `select jobname, schedule, active from cron.job;`
Riwayat: `select * from cron.job_run_details order by start_time desc limit 5;`

Tes manual: `curl -X POST .../functions/v1/reset-mingguan -H "Authorization: Bearer <CRON_SECRET>"`
→ `{"ok":true,"direset":N}`. Aman dipanggil berkali-kali (skip murid yang sudah
di-reset < 6 hari lalu).

### Challenge / Misi (Minggu 3)

- Tabel `misi` (seed 11 di migration 0009) + `misi_progres_murid`.
- Fungsi murni `_shared/game/misi.ts` (`kemajuanMisi`); evaluasi `_shared/misi.ts`
  (`evaluasiMisi`) dipanggil `akun` (solo, dari konteks sesi klien) & `aksi`
  (online, tiap pemain manusia saat game usai — pakai `GameState.skorKuisSesi`).
- Selesai → `poin_reward` (via `beriPoinMurid`) + `badge_reward` masuk `badge_diraih`.
- Klien: `akunStore.misi`/`misiProgres`, `MisiToast`, list di `ProfilScreen`.
- **Dashboard guru**: RPC `murid_kelas(kelas_id)` (SECURITY DEFINER, guard guru
  pemilik). Layar `src/screens/DashboardGuruScreen.tsx` (dari panel Guru di Akun).

### Berkas

| berkas | isi |
|---|---|
| `supabase/migrations/0004_akun_kelas.sql` · `0005_akun_rpc.sql` · `0006_pin_terbaca.sql` | tabel, RLS, RPC, PIN terbaca |
| `supabase/functions/akun/index.ts` | Edge Function identitas murid |
| `src/akun/*` | `akunStore` (Zustand), `klienAkun`, `migrasiProgres` (pure + test), `tipe` |
| `src/screens/AkunScreen.tsx` | layar `akun` — tab Murid / Guru |

-- "Main Lagi" online (rematch di room yang sama) + ubah jumlah target pemain
-- tanpa bikin room baru. Lihat `supabase/functions/aksi/index.ts` (aksi
-- `mainLagi` / `ubahTarget`) dan `efektifHost` (host asli yang tak ikut
-- lanjut digantikan pemain pertama yang menekan "Main Lagi").

alter table public.room_pemain
  add column if not exists siap_lagi boolean not null default true,
  add column if not exists siap_lagi_pada timestamptz not null default now();

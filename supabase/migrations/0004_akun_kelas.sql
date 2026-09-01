-- ChemUno Fase 4 — Minggu 1: fondasi akun guru-murid, kelas, progres persisten.
--
-- Guru  = Supabase Auth (email+password) -> auth.uid(). CRUD kelas via RLS langsung.
-- Murid = identitas ringan (Nama + PIN 4 digit). BUKAN principal auth.
--         Semua tulis/baca data murid lewat Edge Function `akun` (service role).
--         auth_uid        = sesi anonim device yang sedang login (tautan ke game online).
--         sesi_token_hash = token localStorage device (hash), utk pemulihan di device lain.

create extension if not exists pgcrypto with schema extensions;

-- == Generator kode acak =============================================
-- SECURITY DEFINER: cek tabrakan butuh melihat SEMUA baris, lepas dari RLS pemanggil.
create or replace function public.kode_kelas_baru()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  alfabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  hasil text;
  i int;
begin
  loop
    hasil := '';
    for i in 1..6 loop
      hasil := hasil || substr(alfabet, 1 + floor(random() * length(alfabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.kelas where kode_kelas = hasil);
  end loop;
  return hasil;
end;
$$;
grant execute on function public.kode_kelas_baru() to authenticated;

create or replace function public.kode_unik_baru()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  hasil text;
  n int := 0;
begin
  loop
    hasil := lpad(floor(random() * 10000)::int::text, 4, '0');   -- "0000".."9999"
    exit when not exists (select 1 from public.murid where kode_unik = hasil);
    n := n + 1;
    if n > 300 then
      raise exception 'ruang kode_unik hampir penuh';
    end if;
  end loop;
  return hasil;
end;
$$;

-- == kelas ===========================================================
create table if not exists public.kelas (
  id          uuid primary key default gen_random_uuid(),
  nama_kelas  text not null check (char_length(btrim(nama_kelas)) between 1 and 60),
  kode_kelas  text not null unique default public.kode_kelas_baru(),
  guru_id     uuid not null references auth.users(id) on delete cascade,
  dibuat_pada timestamptz not null default now()
);
create index if not exists idx_kelas_guru on public.kelas(guru_id);

-- == murid ===========================================================
create table if not exists public.murid (
  id              uuid primary key default gen_random_uuid(),
  nama            text not null check (char_length(btrim(nama)) between 1 and 24),
  pin_hash        text not null,
  kode_unik       text not null unique default public.kode_unik_baru()
                    check (kode_unik ~ '^[0-9]{4}$'),
  kelas_id        uuid references public.kelas(id) on delete set null,  -- null = akun bebas
  auth_uid        uuid unique,        -- sesi anon device aktif (opsional)
  sesi_token_hash text,               -- token localStorage (hash)
  dibuat_pada     timestamptz not null default now()
);
create index if not exists idx_murid_nama  on public.murid(lower(btrim(nama)));
create index if not exists idx_murid_kelas on public.murid(kelas_id);

-- == progres_murid (1:1 dgn murid) ===================================
create table if not exists public.progres_murid (
  murid_id                     uuid primary key references public.murid(id) on delete cascade,
  total_poin                   bigint not null default 0 check (total_poin >= 0),
  peringkat_golongan_aktif     int not null default 1 check (peringkat_golongan_aktif between 1 and 18),
  peringkat_golongan_rekor     int not null default 1 check (peringkat_golongan_rekor between 1 and 18),
  minggu_reset_terakhir        date not null default current_date,
  riwayat_akurasi_per_golongan jsonb not null default '{}'::jsonb,
  badge_diraih                 jsonb not null default '[]'::jsonb,
  progres_lokal                jsonb not null default '{}'::jsonb,   -- blob Progres lama (poin 4)
  diperbarui_pada              timestamptz not null default now()
);

-- rekor tak boleh < aktif; stempel waktu otomatis
create or replace function public.progres_murid_sebelum_tulis()
returns trigger
language plpgsql
as $$
begin
  new.diperbarui_pada := now();
  if new.peringkat_golongan_rekor < new.peringkat_golongan_aktif then
    new.peringkat_golongan_rekor := new.peringkat_golongan_aktif;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_progres_murid_tulis on public.progres_murid;
create trigger trg_progres_murid_tulis
  before insert or update on public.progres_murid
  for each row execute function public.progres_murid_sebelum_tulis();

-- setiap murid baru -> baris progres kosong
create or replace function public.murid_buat_progres()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.progres_murid (murid_id) values (new.id)
  on conflict (murid_id) do nothing;
  return new;
end;
$$;
drop trigger if exists trg_murid_progres on public.murid;
create trigger trg_murid_progres
  after insert on public.murid
  for each row execute function public.murid_buat_progres();

-- == RLS ============================================================
alter table public.kelas         enable row level security;
alter table public.murid         enable row level security;
alter table public.progres_murid enable row level security;

-- kelas: guru penuh atas kelas miliknya sendiri
drop policy if exists "kelas guru baca"  on public.kelas;
drop policy if exists "kelas guru buat"  on public.kelas;
drop policy if exists "kelas guru ubah"  on public.kelas;
drop policy if exists "kelas guru hapus" on public.kelas;
create policy "kelas guru baca"  on public.kelas for select to authenticated using (guru_id = auth.uid());
create policy "kelas guru buat"  on public.kelas for insert to authenticated with check (guru_id = auth.uid());
create policy "kelas guru ubah"  on public.kelas for update to authenticated using (guru_id = auth.uid()) with check (guru_id = auth.uid());
create policy "kelas guru hapus" on public.kelas for delete to authenticated using (guru_id = auth.uid());

-- murid: klien TIDAK menulis langsung (Edge Function `akun` / service role).
--        guru boleh BACA murid yang tergabung di kelasnya.
drop policy if exists "murid guru baca kelasnya" on public.murid;
create policy "murid guru baca kelasnya" on public.murid for select to authenticated using (
  kelas_id in (select id from public.kelas where guru_id = auth.uid())
);

-- progres_murid: sama polanya
drop policy if exists "progres guru baca kelasnya" on public.progres_murid;
create policy "progres guru baca kelasnya" on public.progres_murid for select to authenticated using (
  murid_id in (
    select m.id from public.murid m
    join public.kelas k on k.id = m.kelas_id
    where k.guru_id = auth.uid()
  )
);

-- == RPC utk Edge Function `akun` (service role saja) ================
-- cocokkan Nama+PIN -> daftar akun yang match (utk pemulihan di device lain).
create or replace function public.murid_cocok_pin(p_nama text, p_pin text)
returns table (id uuid, nama text, kode_unik text, kelas_id uuid)
language sql
security definer
set search_path = public, extensions
as $$
  select m.id, m.nama, m.kode_unik, m.kelas_id
  from public.murid m
  where lower(btrim(m.nama)) = lower(btrim(p_nama))
    and m.pin_hash = extensions.crypt(p_pin, m.pin_hash);
$$;
revoke all on function public.murid_cocok_pin(text, text) from public, anon, authenticated;
grant execute on function public.murid_cocok_pin(text, text) to service_role;

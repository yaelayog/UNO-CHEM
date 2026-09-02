-- ChemUno — mode online multiplayer (Fase 3)
-- Otoritas permainan = Edge Function `aksi` (service role). Klien hanya membaca.

-- ── Kode room acak (5 char, tanpa huruf/angka ambigu) ─────────────────
create or replace function public.kode_room()
returns text
language plpgsql
as $$
declare
  alfabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  hasil text := '';
  i int;
begin
  for i in 1..5 loop
    hasil := hasil || substr(alfabet, 1 + floor(random() * length(alfabet))::int, 1);
  end loop;
  return hasil;
end;
$$;

-- ── Tabel ────────────────────────────────────────────────────────────
create table if not exists public.rooms (
  code            text primary key default public.kode_room(),
  host            uuid not null,
  status          text not null default 'lobby' check (status in ('lobby','bermain','selesai')),
  target_pemain   int2 not null default 4 check (target_pemain between 2 and 7),
  pakai_peristiwa boolean not null default false,
  seed            int8,
  dibuat          timestamptz not null default now(),
  diperbarui      timestamptz not null default now()
);

create table if not exists public.room_pemain (
  room_code  text not null references public.rooms(code) on delete cascade,
  pemain     text not null,          -- uid manusia, atau 'bot-<urutan>' untuk bot
  nama       text not null,
  is_bot     boolean not null default false,
  urutan     int2 not null,
  terhubung  boolean not null default true,
  last_seen  timestamptz not null default now(),
  primary key (room_code, pemain),
  unique (room_code, urutan)
);

create table if not exists public.game_publik (
  room_code  text primary key references public.rooms(code) on delete cascade,
  versi      int8 not null default 0,
  state      jsonb not null,
  diperbarui timestamptz not null default now()
);

create table if not exists public.tangan (
  room_code text not null references public.rooms(code) on delete cascade,
  pemain    uuid not null,
  kartu     jsonb not null default '[]'::jsonb,
  -- Soal kuis aktif untuk pemain ini (kalau sedang jadi target kuis). Privat
  -- lewat RLS — TIDAK disiarkan di game_publik supaya lawan tak ikut melihat.
  soal      jsonb,
  primary key (room_code, pemain)
);
alter table public.tangan add column if not exists soal jsonb;

-- FULL GameState (semua kartu) — HANYA service role. Tak ada policy → deny-all klien.
create table if not exists public.game_core (
  room_code text primary key references public.rooms(code) on delete cascade,
  versi     int8 not null default 0,
  state     jsonb not null
);

-- ── RLS ──────────────────────────────────────────────────────────────
alter table public.rooms       enable row level security;
alter table public.room_pemain enable row level security;
alter table public.game_publik enable row level security;
alter table public.tangan      enable row level security;
alter table public.game_core   enable row level security;

-- rooms & roster & state publik: boleh dibaca siapa saja yang login (anon auth).
drop policy if exists "rooms baca" on public.rooms;
create policy "rooms baca" on public.rooms for select to authenticated using (true);

drop policy if exists "roster baca" on public.room_pemain;
create policy "roster baca" on public.room_pemain for select to authenticated using (true);

drop policy if exists "state publik baca" on public.game_publik;
create policy "state publik baca" on public.game_publik for select to authenticated using (true);

-- tangan: hanya pemiliknya.
drop policy if exists "tangan sendiri" on public.tangan;
create policy "tangan sendiri" on public.tangan for select to authenticated using (pemain = auth.uid());

-- game_core: sengaja tanpa policy apa pun (klien tak bisa akses).

-- ── Realtime ─────────────────────────────────────────────────────────
alter table public.room_pemain replica identity full;
alter table public.tangan      replica identity full;

do $$
declare
  t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  foreach t in array array['rooms','room_pemain','game_publik','tangan'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ── Housekeeping: hapus room lama (>6 jam) otomatis saat ada room baru ─
create or replace function public.bersihkan_room_lama()
returns trigger language plpgsql as $$
begin
  delete from public.rooms where diperbarui < now() - interval '6 hours';
  return new;
end;
$$;

drop trigger if exists trg_bersihkan_room on public.rooms;
create trigger trg_bersihkan_room
  after insert on public.rooms
  execute function public.bersihkan_room_lama();
-- Naikkan batas pemain per room dari 4 → 7 (untuk DB yang sudah ter-deploy).
alter table public.rooms drop constraint if exists rooms_target_pemain_check;
alter table public.rooms
  add constraint rooms_target_pemain_check check (target_pemain between 2 and 7);

-- ════════════════════════════════════════════════════════════════════
-- Fase 4 — Minggu 1: akun guru-murid, kelas, progres persisten.
-- (identik dengan supabase/migrations/0004_akun_kelas.sql)
-- ════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto with schema extensions;

-- SECURITY DEFINER: cek tabrakan butuh melihat SEMUA baris, lepas dari RLS pemanggil.
create or replace function public.kode_kelas_baru()
returns text language plpgsql security definer set search_path = public as $$
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
returns text language plpgsql security definer set search_path = public as $$
declare
  hasil text;
  n int := 0;
begin
  loop
    hasil := lpad(floor(random() * 10000)::int::text, 4, '0');
    exit when not exists (select 1 from public.murid where kode_unik = hasil);
    n := n + 1;
    if n > 300 then raise exception 'ruang kode_unik hampir penuh'; end if;
  end loop;
  return hasil;
end;
$$;

create table if not exists public.kelas (
  id          uuid primary key default gen_random_uuid(),
  nama_kelas  text not null check (char_length(btrim(nama_kelas)) between 1 and 60),
  kode_kelas  text not null unique default public.kode_kelas_baru(),
  guru_id     uuid not null references auth.users(id) on delete cascade,
  dibuat_pada timestamptz not null default now()
);
create index if not exists idx_kelas_guru on public.kelas(guru_id);

create table if not exists public.murid (
  id              uuid primary key default gen_random_uuid(),
  nama            text not null check (char_length(btrim(nama)) between 1 and 24),
  pin             text not null check (pin similar to '[0-9][0-9][0-9][0-9]'),  -- apa adanya (media belajar, lihat 0006)
  kode_unik       text not null unique default public.kode_unik_baru()
                    check (kode_unik ~ '^[0-9]{4}$'),
  kelas_id        uuid references public.kelas(id) on delete set null,
  auth_uid        uuid unique,
  sesi_token_hash text,
  dibuat_pada     timestamptz not null default now()
);
create index if not exists idx_murid_nama  on public.murid(lower(btrim(nama)));
create index if not exists idx_murid_kelas on public.murid(kelas_id);

create table if not exists public.progres_murid (
  murid_id                     uuid primary key references public.murid(id) on delete cascade,
  total_poin                   bigint not null default 0 check (total_poin >= 0),
  peringkat_golongan_aktif     int not null default 1 check (peringkat_golongan_aktif between 1 and 18),
  peringkat_golongan_rekor     int not null default 1 check (peringkat_golongan_rekor between 1 and 18),
  minggu_reset_terakhir        date not null default current_date,
  riwayat_akurasi_per_golongan jsonb not null default '{}'::jsonb,
  badge_diraih                 jsonb not null default '[]'::jsonb,
  progres_lokal                jsonb not null default '{}'::jsonb,
  diperbarui_pada              timestamptz not null default now()
);

create or replace function public.progres_murid_sebelum_tulis()
returns trigger language plpgsql as $$
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

create or replace function public.murid_buat_progres()
returns trigger language plpgsql security definer set search_path = public as $$
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

alter table public.kelas         enable row level security;
alter table public.murid         enable row level security;
alter table public.progres_murid enable row level security;

drop policy if exists "kelas guru baca"  on public.kelas;
drop policy if exists "kelas guru buat"  on public.kelas;
drop policy if exists "kelas guru ubah"  on public.kelas;
drop policy if exists "kelas guru hapus" on public.kelas;
create policy "kelas guru baca"  on public.kelas for select to authenticated using (guru_id = auth.uid());
create policy "kelas guru buat"  on public.kelas for insert to authenticated with check (guru_id = auth.uid());
create policy "kelas guru ubah"  on public.kelas for update to authenticated using (guru_id = auth.uid()) with check (guru_id = auth.uid());
create policy "kelas guru hapus" on public.kelas for delete to authenticated using (guru_id = auth.uid());

drop policy if exists "murid guru baca kelasnya" on public.murid;
create policy "murid guru baca kelasnya" on public.murid for select to authenticated using (
  kelas_id in (select id from public.kelas where guru_id = auth.uid())
);

drop policy if exists "progres guru baca kelasnya" on public.progres_murid;
create policy "progres guru baca kelasnya" on public.progres_murid for select to authenticated using (
  murid_id in (
    select m.id from public.murid m
    join public.kelas k on k.id = m.kelas_id
    where k.guru_id = auth.uid()
  )
);

create or replace function public.murid_cocok_pin(p_nama text, p_pin text)
returns table (id uuid, nama text, kode_unik text, kelas_id uuid)
language sql security definer set search_path = public as $body$
  select m.id, m.nama, m.kode_unik, m.kelas_id
  from public.murid m
  where lower(btrim(m.nama)) = lower(btrim(p_nama))
    and m.pin = p_pin
$body$;
revoke all on function public.murid_cocok_pin(text, text) from public, anon, authenticated;
grant execute on function public.murid_cocok_pin(text, text) to service_role;

grant select, insert, update, delete on public.kelas to authenticated;
grant select on public.murid to authenticated;
grant select on public.progres_murid to authenticated;

-- ── Leaderboard (0007): agregat aman lintas-murid ───────────────────
create or replace function public.leaderboard_kelas(p_kelas_id uuid)
returns table (nama text, kode_unik text, peringkat_aktif int, peringkat_rekor int, total_poin bigint)
language sql security definer set search_path = public as $body$
  select m.nama, m.kode_unik,
         pm.peringkat_golongan_aktif, pm.peringkat_golongan_rekor, pm.total_poin
  from public.murid m
  join public.progres_murid pm on pm.murid_id = m.id
  where m.kelas_id = p_kelas_id
  order by pm.peringkat_golongan_aktif desc, pm.total_poin desc, m.nama asc
$body$;

create or replace function public.leaderboard_global(p_limit int default 100)
returns table (nama text, kode_unik text, peringkat_aktif int, peringkat_rekor int, total_poin bigint)
language sql security definer set search_path = public as $body$
  select m.nama, m.kode_unik,
         pm.peringkat_golongan_aktif, pm.peringkat_golongan_rekor, pm.total_poin
  from public.murid m
  join public.progres_murid pm on pm.murid_id = m.id
  order by pm.peringkat_golongan_aktif desc, pm.total_poin desc, m.nama asc
  limit greatest(1, least(coalesce(p_limit, 100), 500))
$body$;

create or replace function public.leaderboard_sesi(p_uids uuid[])
returns table (auth_uid uuid, nama text, kode_unik text, peringkat_aktif int, total_poin bigint)
language sql security definer set search_path = public as $body$
  select m.auth_uid, m.nama, m.kode_unik, pm.peringkat_golongan_aktif, pm.total_poin
  from public.murid m
  join public.progres_murid pm on pm.murid_id = m.id
  where m.auth_uid = any(p_uids)
$body$;

grant execute on function public.leaderboard_kelas(uuid) to anon, authenticated;
grant execute on function public.leaderboard_global(int) to anon, authenticated;
grant execute on function public.leaderboard_sesi(uuid[]) to anon, authenticated;

-- ════════════════════════════════════════════════════════════════════
-- Fase 4 — Minggu 3: Challenge / Misi + dashboard guru (= migration 0009)
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.misi (
  id text primary key, judul text not null, deskripsi text not null,
  tipe text not null, target jsonb not null default '{}'::jsonb,
  poin_reward int not null default 0, badge_reward text, urutan int not null default 0
);
create table if not exists public.misi_progres_murid (
  murid_id uuid not null references public.murid(id) on delete cascade,
  misi_id text not null references public.misi(id) on delete cascade,
  progres int not null default 0, selesai boolean not null default false,
  selesai_pada timestamptz, primary key (murid_id, misi_id)
);
create index if not exists idx_misi_progres_murid on public.misi_progres_murid(murid_id);

alter table public.misi enable row level security;
alter table public.misi_progres_murid enable row level security;
drop policy if exists "misi baca" on public.misi;
create policy "misi baca" on public.misi for select to anon, authenticated using (true);
drop policy if exists "misi progres guru baca" on public.misi_progres_murid;
create policy "misi progres guru baca" on public.misi_progres_murid for select to authenticated using (
  murid_id in (select m.id from public.murid m join public.kelas k on k.id = m.kelas_id where k.guru_id = auth.uid())
);
grant select on public.misi to anon, authenticated;
grant select on public.misi_progres_murid to authenticated;

insert into public.misi (id, judul, deskripsi, tipe, target, poin_reward, badge_reward, urutan) values
 ('langkah-pertama','Langkah Pertama','Menangkan 1 permainan','menang','{"jumlah":1}',100,null,1),
 ('rajin-berlatih','Rajin Berlatih','Mainkan 15 permainan','mainGame','{"jumlah":15}',150,null,2),
 ('cendekiawan','Cendekiawan','Jawab 100 soal kuis dengan benar','kuisBenarTotal','{"jumlah":100}',200,null,3),
 ('ahli-halogen','Ahli Halogen','Jawab 20 kuis golongan Halogen dengan benar','kuisBenarGolongan','{"jumlah":20,"golongan":"halogen"}',150,'misi-ahli-halogen',4),
 ('ahli-alkali','Ahli Alkali','Jawab 20 kuis golongan Alkali dengan benar','kuisBenarGolongan','{"jumlah":20,"golongan":"alkali"}',150,'misi-ahli-alkali',5),
 ('kolektor-master','Kolektor Master','Raih 3 lencana Master Golongan','badgeMaster','{"jumlah":3}',200,'misi-kolektor',6),
 ('tanpa-cela','Tanpa Cela','Menang 1 permainan tanpa sekali pun salah kuis','menang','{"jumlah":1,"tanpaSalah":true}',150,'misi-tanpa-cela',7),
 ('juara-ruang','Juara Ruang','Menangkan 3 sesi online','menang','{"jumlah":3,"online":true}',300,'misi-juara-ruang',8),
 ('naik-kelas','Naik Kelas','Capai Peringkat Golongan 5','peringkatGolongan','{"golongan":5}',250,'misi-golongan-5',9),
 ('pendaki','Pendaki','Capai Peringkat Golongan 10','peringkatGolongan','{"golongan":10}',500,'misi-golongan-10',10),
 ('puncak-periodik','Puncak Periodik','Capai Peringkat Golongan 18','peringkatGolongan','{"golongan":18}',1000,'misi-golongan-18',11)
on conflict (id) do update set
  judul=excluded.judul, deskripsi=excluded.deskripsi, tipe=excluded.tipe, target=excluded.target,
  poin_reward=excluded.poin_reward, badge_reward=excluded.badge_reward, urutan=excluded.urutan;

create or replace function public.murid_kelas(p_kelas_id uuid)
returns table (murid_id uuid, nama text, kode_unik text, peringkat_aktif int, peringkat_rekor int,
               total_poin bigint, riwayat_akurasi jsonb, misi_selesai int, dibuat_pada timestamptz)
language sql security definer set search_path = public as $body$
  select m.id, m.nama, m.kode_unik,
         pm.peringkat_golongan_aktif, pm.peringkat_golongan_rekor, pm.total_poin,
         pm.riwayat_akurasi_per_golongan,
         (select count(*)::int from public.misi_progres_murid mp where mp.murid_id = m.id and mp.selesai),
         m.dibuat_pada
  from public.murid m
  join public.progres_murid pm on pm.murid_id = m.id
  where m.kelas_id = p_kelas_id
    and exists (select 1 from public.kelas k where k.id = p_kelas_id and k.guru_id = auth.uid())
  order by pm.peringkat_golongan_aktif desc, pm.total_poin desc, m.nama asc
$body$;
grant execute on function public.murid_kelas(uuid) to authenticated;

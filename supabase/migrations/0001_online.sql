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
  target_pemain   int2 not null default 4 check (target_pemain between 2 and 4),
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
  primary key (room_code, pemain)
);

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

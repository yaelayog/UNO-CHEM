-- ChemUno Fase 4 — Minggu 3: Challenge / Misi + RPC dashboard guru.

create table if not exists public.misi (
  id           text primary key,
  judul        text not null,
  deskripsi    text not null,
  tipe         text not null,
  target       jsonb not null default '{}'::jsonb,
  poin_reward  int not null default 0,
  badge_reward text,
  urutan       int not null default 0
);

create table if not exists public.misi_progres_murid (
  murid_id     uuid not null references public.murid(id) on delete cascade,
  misi_id      text not null references public.misi(id) on delete cascade,
  progres      int not null default 0,
  selesai      boolean not null default false,
  selesai_pada timestamptz,
  primary key (murid_id, misi_id)
);
create index if not exists idx_misi_progres_murid on public.misi_progres_murid(murid_id);

alter table public.misi               enable row level security;
alter table public.misi_progres_murid enable row level security;

-- Definisi misi: publik.
drop policy if exists "misi baca" on public.misi;
create policy "misi baca" on public.misi for select to anon, authenticated using (true);

-- Progres misi: tulis via service role (Edge Function). Guru baca murid kelasnya.
drop policy if exists "misi progres guru baca" on public.misi_progres_murid;
create policy "misi progres guru baca" on public.misi_progres_murid for select to authenticated using (
  murid_id in (
    select m.id from public.murid m
    join public.kelas k on k.id = m.kelas_id
    where k.guru_id = auth.uid()
  )
);

grant select on public.misi to anon, authenticated;
grant select on public.misi_progres_murid to authenticated;

-- ── Seed misi (idempoten) ───────────────────────────────────────────
insert into public.misi (id, judul, deskripsi, tipe, target, poin_reward, badge_reward, urutan) values
 ('langkah-pertama', 'Langkah Pertama', 'Menangkan 1 permainan',                       'menang',            '{"jumlah":1}',                       100, null,                  1),
 ('rajin-berlatih',  'Rajin Berlatih',  'Mainkan 15 permainan',                        'mainGame',          '{"jumlah":15}',                     150, null,                  2),
 ('cendekiawan',     'Cendekiawan',     'Jawab 100 soal kuis dengan benar',            'kuisBenarTotal',    '{"jumlah":100}',                    200, null,                  3),
 ('ahli-halogen',    'Ahli Halogen',    'Jawab 20 kuis golongan Halogen dengan benar', 'kuisBenarGolongan', '{"jumlah":20,"golongan":"halogen"}', 150, 'misi-ahli-halogen',   4),
 ('ahli-alkali',     'Ahli Alkali',     'Jawab 20 kuis golongan Alkali dengan benar',  'kuisBenarGolongan', '{"jumlah":20,"golongan":"alkali"}',  150, 'misi-ahli-alkali',    5),
 ('kolektor-master', 'Kolektor Master', 'Raih 3 lencana Master Golongan',              'badgeMaster',       '{"jumlah":3}',                      200, 'misi-kolektor',       6),
 ('tanpa-cela',      'Tanpa Cela',      'Menang 1 permainan tanpa sekali pun salah kuis','menang',           '{"jumlah":1,"tanpaSalah":true}',     150, 'misi-tanpa-cela',     7),
 ('juara-ruang',     'Juara Ruang',     'Menangkan 3 sesi online',                     'menang',            '{"jumlah":3,"online":true}',         300, 'misi-juara-ruang',    8),
 ('naik-kelas',      'Naik Kelas',      'Capai Peringkat Golongan 5',                  'peringkatGolongan', '{"golongan":5}',                    250, 'misi-golongan-5',     9),
 ('pendaki',         'Pendaki',         'Capai Peringkat Golongan 10',                 'peringkatGolongan', '{"golongan":10}',                   500, 'misi-golongan-10',   10),
 ('puncak-periodik', 'Puncak Periodik', 'Capai Peringkat Golongan 18',                 'peringkatGolongan', '{"golongan":18}',                  1000, 'misi-golongan-18',   11)
on conflict (id) do update set
  judul = excluded.judul, deskripsi = excluded.deskripsi, tipe = excluded.tipe,
  target = excluded.target, poin_reward = excluded.poin_reward,
  badge_reward = excluded.badge_reward, urutan = excluded.urutan;

-- ── RPC dashboard guru: murid satu kelas + progres lengkap ──────────
-- SECURITY DEFINER + guard: hanya guru pemilik kelas yang dapat baris.
create or replace function public.murid_kelas(p_kelas_id uuid)
returns table (
  murid_id            uuid,
  nama                text,
  kode_unik           text,
  peringkat_aktif     int,
  peringkat_rekor     int,
  total_poin          bigint,
  riwayat_akurasi     jsonb,
  misi_selesai        int,
  dibuat_pada         timestamptz
)
language sql
security definer
set search_path = public
as $body$
  select m.id, m.nama, m.kode_unik,
         pm.peringkat_golongan_aktif, pm.peringkat_golongan_rekor, pm.total_poin,
         pm.riwayat_akurasi_per_golongan,
         (select count(*)::int from public.misi_progres_murid mp
          where mp.murid_id = m.id and mp.selesai),
         m.dibuat_pada
  from public.murid m
  join public.progres_murid pm on pm.murid_id = m.id
  where m.kelas_id = p_kelas_id
    and exists (
      select 1 from public.kelas k
      where k.id = p_kelas_id and k.guru_id = auth.uid()
    )
  order by pm.peringkat_golongan_aktif desc, pm.total_poin desc, m.nama asc
$body$;

grant execute on function public.murid_kelas(uuid) to authenticated;

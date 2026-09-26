-- UNO-Chem — Misi Harian (reset 00:00 WIB) + streak.
--
-- Definisi misi harian TIDAK disimpan di DB: dipilih deterministik dari tanggal
-- oleh `game/misiHarian.ts` (sama di klien & Edge Function). DB hanya menyimpan
-- kemajuan per (murid, tanggal WIB, misi). "Reset" terjadi dengan sendirinya
-- karena tanggal baru = baris baru — tidak butuh cron.

create table if not exists public.misi_harian_progres (
  murid_id     uuid not null references public.murid(id) on delete cascade,
  tanggal      date not null,
  misi_id      text not null,
  progres      int not null default 0,
  selesai      boolean not null default false,
  selesai_pada timestamptz,
  primary key (murid_id, tanggal, misi_id)
);
create index if not exists idx_misi_harian_murid on public.misi_harian_progres(murid_id, tanggal);

alter table public.misi_harian_progres enable row level security;

-- Tulis via service role (Edge Function). Guru baca murid kelasnya.
drop policy if exists "misi harian guru baca" on public.misi_harian_progres;
create policy "misi harian guru baca" on public.misi_harian_progres for select to authenticated using (
  murid_id in (
    select m.id from public.murid m
    join public.kelas k on k.id = m.kelas_id
    where k.guru_id = auth.uid()
  )
);
grant select on public.misi_harian_progres to authenticated;

-- Streak: hari berturut-turut ketiga misi harian selesai.
alter table public.progres_murid
  add column if not exists harian_streak         int  not null default 0,
  add column if not exists harian_streak_terbaik int  not null default 0,
  add column if not exists harian_terakhir       date,
  add column if not exists harian_total          int  not null default 0;

-- RPC dashboard guru: + kolom streak harian (tipe balikan berubah → drop dulu).
drop function if exists public.murid_kelas(uuid);
create function public.murid_kelas(p_kelas_id uuid)
returns table (
  murid_id              uuid,
  nama                  text,
  kode_unik             text,
  peringkat_aktif       int,
  peringkat_rekor       int,
  total_poin            bigint,
  riwayat_akurasi       jsonb,
  misi_selesai          int,
  dibuat_pada           timestamptz,
  harian_streak         int,
  harian_streak_terbaik int,
  harian_terakhir       date,
  harian_total          int
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
         m.dibuat_pada,
         pm.harian_streak, pm.harian_streak_terbaik, pm.harian_terakhir, pm.harian_total
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

-- ChemUno Fase 4 — Minggu 2: RPC leaderboard (agregat aman).
--
-- Murid TIDAK boleh baca baris `murid`/`progres_murid` orang lain (RLS deny).
-- Leaderboard butuh data agregat lintas-murid → SECURITY DEFINER, hanya
-- kembalikan kolom yang aman ditampilkan publik (nama + kode_unik + peringkat + poin).

-- Leaderboard satu kelas (murid yang tergabung ke kelas itu).
create or replace function public.leaderboard_kelas(p_kelas_id uuid)
returns table (
  nama              text,
  kode_unik         text,
  peringkat_aktif   int,
  peringkat_rekor   int,
  total_poin        bigint
)
language sql
security definer
set search_path = public
as $body$
  select m.nama, m.kode_unik,
         pm.peringkat_golongan_aktif, pm.peringkat_golongan_rekor, pm.total_poin
  from public.murid m
  join public.progres_murid pm on pm.murid_id = m.id
  where m.kelas_id = p_kelas_id
  order by pm.peringkat_golongan_aktif desc, pm.total_poin desc, m.nama asc
$body$;

-- Leaderboard global (semua murid, termasuk akun bebas). Batasi jumlah baris.
create or replace function public.leaderboard_global(p_limit int default 100)
returns table (
  nama              text,
  kode_unik         text,
  peringkat_aktif   int,
  peringkat_rekor   int,
  total_poin        bigint
)
language sql
security definer
set search_path = public
as $body$
  select m.nama, m.kode_unik,
         pm.peringkat_golongan_aktif, pm.peringkat_golongan_rekor, pm.total_poin
  from public.murid m
  join public.progres_murid pm on pm.murid_id = m.id
  order by pm.peringkat_golongan_aktif desc, pm.total_poin desc, m.nama asc
  limit greatest(1, least(coalesce(p_limit, 100), 500))
$body$;

grant execute on function public.leaderboard_kelas(uuid)  to anon, authenticated;
grant execute on function public.leaderboard_global(int)   to anon, authenticated;

-- ChemUno Fase 4 — Minggu 2: RPC ringkasan leaderboard SESI (akhir game room).
-- Ambil Peringkat Golongan + poin beberapa murid sekaligus lewat auth_uid mereka.
-- SECURITY DEFINER + kolom aman saja (sama pola leaderboard_kelas/global).

create or replace function public.leaderboard_sesi(p_uids uuid[])
returns table (
  auth_uid        uuid,
  nama            text,
  kode_unik       text,
  peringkat_aktif int,
  total_poin      bigint
)
language sql
security definer
set search_path = public
as $body$
  select m.auth_uid, m.nama, m.kode_unik,
         pm.peringkat_golongan_aktif, pm.total_poin
  from public.murid m
  join public.progres_murid pm on pm.murid_id = m.id
  where m.auth_uid = any(p_uids)
$body$;

grant execute on function public.leaderboard_sesi(uuid[]) to anon, authenticated;

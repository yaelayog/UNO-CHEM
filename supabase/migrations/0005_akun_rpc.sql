-- ChemUno Fase 4 — RPC pendukung Edge Function `akun` (identitas murid) + grant.
-- Hanya service_role (Edge Function) yang boleh memanggil RPC di sini.

-- hash PIN memakai bcrypt (pgcrypto). Tak menyentuh tabel apa pun.
create or replace function public.hash_pin(p_pin text)
returns text
language sql
set search_path = extensions
as $$
  select crypt(p_pin, gen_salt('bf'));
$$;
revoke all on function public.hash_pin(text) from public, anon, authenticated;
grant execute on function public.hash_pin(text) to service_role;

-- Grant tabel (Supabase umumnya sudah set via default privileges; ini jaga-jaga).
-- Akses sebenarnya tetap dibatasi RLS dari 0004:
--  · kelas  → guru CRUD kelas miliknya
--  · murid / progres_murid → tulis via service role, guru hanya BACA kelasnya
grant select, insert, update, delete on public.kelas to authenticated;
grant select on public.murid to authenticated;
grant select on public.progres_murid to authenticated;

-- ChemUno Fase 4 — PIN murid disimpan APA ADANYA (bukan hash).
--
-- Alasan: ini media pembelajaran, bukan game kompetitif. Guru perlu bisa
-- membantu murid yang lupa PIN (lihat lewat Table Editor / Dashboard Guru).
-- RLS `murid` membatasi guru hanya melihat murid di kelasnya sendiri.
-- PIN 4 digit memang lemah — imbau murid tidak memakai PIN ATM/HP.

alter table public.murid add column if not exists pin text;

alter table public.murid drop constraint if exists murid_pin_format;
alter table public.murid add constraint murid_pin_format
  check (pin is null or pin similar to '[0-9][0-9][0-9][0-9]');

-- pin_hash tidak dipakai lagi (biarkan nullable; drop manual nanti bila yakin).
alter table public.murid alter column pin_hash drop not null;

-- Cocokkan Nama + PIN langsung (tanpa bcrypt). SECURITY DEFINER supaya bisa
-- membaca seluruh baris `murid` lepas dari RLS. service_role only.
create or replace function public.murid_cocok_pin(p_nama text, p_pin text)
returns table (id uuid, nama text, kode_unik text, kelas_id uuid)
language sql
security definer
set search_path = public
as $body$
  select m.id, m.nama, m.kode_unik, m.kelas_id
  from public.murid m
  where lower(btrim(m.nama)) = lower(btrim(p_nama))
    and m.pin = p_pin
$body$;
revoke all on function public.murid_cocok_pin(text, text) from public, anon, authenticated;
grant execute on function public.murid_cocok_pin(text, text) to service_role;

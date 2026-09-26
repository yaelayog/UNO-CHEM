-- UNO-Chem — idempotensi laporan sesi solo (`akun/tambahPoin`).
--
-- Klien kini MENGIRIM ULANG laporan akhir permainan bila gagal (sinyal putus).
-- Tiap laporan membawa `sesiId` unik; baris di sini mencegah laporan yang sama
-- dihitung dua kali (mis. server sudah memproses tapi balasannya hilang).

create table if not exists public.laporan_sesi (
  murid_id    uuid not null references public.murid(id) on delete cascade,
  sesi_id     text not null,
  dibuat_pada timestamptz not null default now(),
  primary key (murid_id, sesi_id)
);

-- Hanya Edge Function (service role) yang menulis/membaca. Tanpa policy = tertutup.
alter table public.laporan_sesi enable row level security;

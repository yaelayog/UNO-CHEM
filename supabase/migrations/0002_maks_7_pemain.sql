-- Naikkan batas pemain per room dari 4 → 7 (untuk DB yang sudah ter-deploy).
alter table public.rooms drop constraint if exists rooms_target_pemain_check;
alter table public.rooms
  add constraint rooms_target_pemain_check check (target_pemain between 2 and 7);

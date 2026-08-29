-- Soal kuis TIDAK lagi disiarkan lewat game_publik (lawan bisa ikut melihat).
-- Server menaruh soal aktif di baris `tangan` pemain yang ditarget kuis;
-- RLS `tangan` (pemain = auth.uid()) menjaga hanya dia yang bisa membaca.
alter table public.tangan add column if not exists soal jsonb;

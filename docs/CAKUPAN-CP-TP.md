# Cakupan CP & TP di ChemUno

Rincian teknis bagaimana tiap Tujuan Pembelajaran (TP) pada
`docs/CP-TP_Sistem_Periodik_Unsur.md` (bagian D — Catatan Implementasi)
diwujudkan di aplikasi.

| TP | Dimensi | Status | Wujud di ChemUno |
|----|---------|--------|------------------|
| **TP1** — menjelaskan perkembangan sistem periodik (Mendeleev → modern) | C2 | ✅ Ditambahkan (Fase 4 Minggu 4) | Fun Fact `ff-mendeleev`, `ff-nomor-atom-moseley`, `ff-periodik-berkembang` · soal kuis `m25` (penyusun tabel periodik), `s27` (dasar tabel modern = nomor atom) |
| **TP2** — membandingkan tren jari-jari atom, energi ionisasi, keelektronegatifan (satu golongan & satu periode) | C3 | ✅ Ditambahkan (Fase 4 Minggu 4) | Soal kuis `s22`/`s23` (arah tren jari-jari), `s25` (keelektronegatifan tertinggi), `x11` (urutan jari-jari periode 3), `x12` (urutan keelektronegatifan halogen), `x16` (tren energi ionisasi satu periode) · Fun Fact `ff-jari-atom`, `ff-energi-ionisasi-2`, `ff-keelektronegatifan` |
| **TP3** — mengidentifikasi sifat logam/nonlogam dari letak unsur | C3 | ✅ Sudah tercakup desain inti | Mekanik permainan: warna kartu = golongan, angka pojok = periode. Bermain berulang melatih pembacaan letak unsur. Diperkuat soal `x17` (unsur paling logam periode 3). |
| **TP4** — mengaitkan letak unsur dengan penerapan sehari-hari + menyampaikan hasil diskusi | C3 | ✅ Tercakup sebagian | 40+ Fun Fact mengaitkan unsur ke fenomena nyata (mis. argon pada bola lampu, kalsium pada tulang, klor pada disinfektan air). Bagian "menyampaikan hasil diskusi" = aktivitas susulan di kelas, dipandu guru. |

## Ringkasan

- **Ditambahkan konten baru Minggu 4:** TP1 (sejarah) & TP2 (tren periodik) —
  total +5 soal kuis dan +3 Fun Fact bertema kedua TP tersebut.
- Materi konfigurasi elektron dihapus sepenuhnya dari alur TP (lihat
  `docs/CP-TP_Sistem_Periodik_Unsur.md`, bagian C & D) — tidak lagi
  didokumentasikan maupun ditampilkan di aplikasi.
- **Sudah tercakup sebelumnya:** TP3 & TP4.

Sumber kurikulum: `docs/CP-TP_Sistem_Periodik_Unsur.md`.
Tampilan di aplikasi: layar **CP & Tujuan Pembelajaran** (`src/screens/CPTPScreen.tsx`,
data di `src/data/cptp.ts`).

# Prompt untuk Claude Code — ChemUno (Game Edukasi Kimia Berbasis UNO)

## 1. Ringkasan Proyek
Buatkan aplikasi web (progressive web app) bernama "ChemUno" — game kartu edukasi kimia yang mengadaptasi mekanisme UNO, ditujukan untuk lomba media pembelajaran kimia tingkat SMA/SMP. Target pemain: siswa yang belajar unsur kimia, golongan, dan periode dalam tabel periodik. Game harus bisa dimainkan di browser desktop maupun mobile (Android), dan idealnya dapat di-install sebagai PWA / dibungkus jadi APK.

## 2. Konsep Gameplay
Dasar aturan sama seperti UNO: pemain mencocokkan kartu di tangan dengan kartu teratas di tumpukan buang, berdasarkan WARNA atau ANGKA yang sama.

- **WARNA kartu = Golongan unsur kimia**:
  - Merah = Logam Alkali (Golongan IA)
  - Oranye = Logam Alkali Tanah (Golongan IIA)
  - Kuning = Halogen (Golongan VIIA)
  - Hijau = Gas Mulia (Golongan VIIIA)
  - Biru = Logam Transisi
- **ANGKA kartu = Periode unsur** (1–7)
- Setiap kartu menampilkan: simbol unsur, nama unsur, nomor atom, dan nomor periode secara visual jelas dan mudah dibaca di layar kecil.

### Kartu spesial (dengan efek quiz edukatif)
- **Skip** → "Reaksi Tidak Stabil": giliran lawan dilewati, DAN lawan harus menjawab 1 soal kuis kimia singkat (pilihan ganda) sebelum lanjut; jawaban benar mengurangi penalti.
- **Reverse** → "Reaksi Balik": arah permainan dibalik.
- **Draw Two** → "Ionisasi": pemain berikutnya ambil 2 kartu, kecuali menjawab soal kuis dengan benar.
- **Wild** → "Katalis": pemain memilih golongan (warna) baru secara bebas.
- **Wild Draw Four** → "Reaksi Eksplosif": pemain berikutnya ambil 4 kartu + soal kuis level lebih sulit.

### Reward edukasi instan
Setiap kali pemain berhasil membuang beberapa kartu dari golongan yang sama secara berurutan, tampilkan "fakta menarik" singkat tentang golongan tersebut sebagai reward.

## 3. Fitur yang harus ada
1. Single-player melawan 2–3 bot AI (prioritas utama untuk demo lomba; multiplayer real-time adalah fitur opsional/lanjutan, bukan prioritas).
2. Sistem kuis terintegrasi ke setiap kartu aksi spesial (bank soal minimal 30–50 soal seputar unsur, golongan, periode, dan ikatan kimia sederhana).
3. Sistem skor & motivasi: poin per jawaban benar, streak jawaban benar, lencana/badge (misal "Master Golongan Alkali"), progress bar level.
4. Efek suara & animasi (kartu dikocok, kartu dimainkan, quiz benar/salah, victory).
5. Desain responsif mobile-first, dioptimalkan untuk layar sentuh.
6. Dapat dimainkan offline (PWA, service worker, cache assets).
7. Halaman menu utama, halaman aturan main, dan halaman "Tentang" (kredit media pembelajaran).
8. Opsional: mode "Belajar" terpisah dari mode "Bermain" — menampilkan seluruh unsur & penjelasan tanpa unsur kompetisi/skor.
9. (Fase 3, dikerjakan PALING TERAKHIR) Mode online multiplayer lintas kelas menggunakan kode room, mirip UNO online pada umumnya — detail lengkap di bagian 9.
10. (Fase 4, dikerjakan setelah Fase 3 stabil) Sistem akun guru-murid, rank/divisi persisten, leaderboard berlapis, dan Challenge/Mission dengan reward badge — detail lengkap di bagian 10.
11. Slot logo PNG kosong untuk logo wajib panitia lomba — detail di bagian 11.

## 4. Tech Stack yang direkomendasikan
- React + TypeScript + Vite (build cepat, PWA-ready)
- Tailwind CSS untuk styling cepat & konsisten
- Framer Motion untuk animasi kartu (flip, slide, scale) — memberi kesan modern tanpa perlu render 3D penuh
- Zustand atau React Context untuk state management (state permainan, tangan pemain, tumpukan kartu, skor)
- (Opsional, untuk efek visual lebih premium) React Three Fiber / Three.js HANYA untuk efek kartu 3D flip atau partikel kemenangan — bukan untuk seluruh scene permainan, supaya tetap ringan di HP
- vite-plugin-pwa untuk konfigurasi PWA (installable, offline-capable)
- (Opsional lanjutan) Capacitor.js untuk membungkus PWA menjadi APK Android jika dibutuhkan instalasi APK langsung

## 5. Gaya Visual
Desain modern, bersih, flat design dengan sedikit sentuhan depth (soft shadow, subtle gradient) — bukan 3D penuh ala meja poker. Palet warna cerah namun tidak norak, terinspirasi tema kimia (lab, molekul, elemen). Font mudah dibaca untuk konten edukasi. Kartu harus tetap jelas terbaca simbol & informasinya bahkan di layar HP kecil.

## 6. Mekanisme Pengurangan Punishment via Kuis (WAJIB, bagian dari inti gameplay)
Setiap kali kartu Skip, Draw Two, atau Wild Draw Four dimainkan, JANGAN langsung terapkan efeknya. Alurnya:

1. Sistem otomatis memunculkan QuizModal ke pemain yang TERKENA efek (bukan yang memainkan kartu).
2. Tingkat kesulitan soal disesuaikan besar penalti dasar: Draw Two → soal mudah; Wild Draw Four → soal sedang/sulit.
3. Beri batas waktu menjawab (misal 10 detik) untuk menambah ketegangan.
4. Hasil jawaban menentukan penalti akhir:
   - Jawab benar dalam batas waktu cepat (≤5 detik) → penalti dihapus total (0 kartu tambahan)
   - Jawab benar tapi lebih lambat → penalti dikurangi separuh (dibulatkan ke bawah)
   - Jawab salah / waktu habis → penalti penuh diterima
5. Reverse dan Wild (tanpa draw) TIDAK memakai mekanisme ini karena tidak ada penalti kartu yang bisa dikurangi.

Implementasikan sebagai fungsi murni yang mudah diuji, contoh:
```typescript
type HasilKuis = 'benarCepat' | 'benarLambat' | 'salah';

function hitungPenaltiAkhir(penaltiDasar: number, hasilKuis: HasilKuis): number {
  if (hasilKuis === 'benarCepat') return 0;
  if (hasilKuis === 'benarLambat') return Math.floor(penaltiDasar / 2);
  return penaltiDasar;
}
```

## 6b. Kartu Peristiwa / Kesempatan (mirip Chance/Community Chest di Monopoli) — Fase 2
Setelah mekanik inti (poin 2–6) berjalan stabil, tambahkan deck kedua "Kartu Peristiwa Kimia" yang terpisah dari deck UNO utama:

- **Trigger kemunculan**: pilih salah satu (atau kombinasi) — saat sisa kartu pemain tinggal 2, setiap kelipatan giliran tertentu (misal tiap 5 giliran), atau sebagai reward saat streak jawaban kuis benar tercapai.
- **Isi kartu** — campuran tiga jenis efek bertema reaksi kimia:
  - Positif: contoh "Reaksi Eksoterm! Ambil 1 kartu incaran dari tangan lawan mana pun."
  - Negatif: contoh "Kontaminasi Sampel! Buang kartu dengan angka tertinggi di tanganmu."
  - Netral/edukasi: contoh "Reaksi Tak Terduga — jawab soal ini dalam 10 detik untuk menghindari efek acak yang akan dipilih sistem."
- Buat minimal 15-20 kartu peristiwa dengan proporsi seimbang antara positif, negatif, dan netral agar permainan tetap adil.
- Tandai fitur ini sebagai opsional/lanjutan pada roadmap — implementasikan setelah mekanik inti UNO + kuis penalti (poin 6) sudah stabil dan teruji, bukan di iterasi pertama.

## 6c. Catatan Arsitektur Penting (dibaca sejak awal, walau multiplayer baru dikerjakan di Fase 3)
Sejak membangun logic inti game di tahap awal (lihat bagian 8, poin 3), tulis seluruh aturan main sebagai kumpulan **fungsi murni (pure functions)** yang terpisah total dari kode UI React — menerima state game sebagai input, mengembalikan state game baru sebagai output, tanpa efek samping (tidak langsung mengubah DOM, tidak langsung menulis ke storage). Contoh: `mainkanKartu(state, kartu)`, `ambilKartuBot(state)`, dan `hitungPenaltiAkhir(...)` yang sudah dirancang di bagian 6.

Alasannya: nanti saat mode online (Fase 3, bagian 9) dikerjakan, fungsi-fungsi yang sama persis bisa dipakai ulang untuk memvalidasi langkah di sisi server/cloud function, tanpa perlu menulis ulang logic game dari nol. Ini satu-satunya keputusan arsitektur yang perlu diperhatikan sejak awal — bagian UI, animasi, dan tampilan tetap bisa dikerjakan sesuai rencana semula tanpa perubahan.

## 7. Struktur Data Contoh
```typescript
interface KartuPeristiwa {
  id: string;
  judul: string;          // "Reaksi Eksoterm!"
  deskripsi: string;
  jenisEfek: 'positif' | 'negatif' | 'netral';
  efek: (state: GameState) => GameState; // fungsi murni yang mengubah state game
}

interface KartuKimia {
  id: string;
  simbol: string;        // "Na", "Cl", dst
  namaUnsur: string;      // "Natrium"
  nomorAtom: number;
  periode: number;        // 1-7, dipakai sebagai "angka" UNO
  golongan: 'alkali' | 'alkaliTanah' | 'halogen' | 'gasMulia' | 'transisi';
  warnaUno: string;       // hex warna sesuai golongan
  jenis: 'angka' | 'skip' | 'reverse' | 'draw2' | 'wild' | 'wild4';
  faktaMenarik?: string;
}

interface SoalKuis {
  id: string;
  pertanyaan: string;
  pilihan: string[];
  jawabanBenar: number;  // index jawaban benar
  golonganTerkait: string;
  tingkatKesulitan: 'mudah' | 'sedang' | 'sulit';
}
```

## 8. Instruksi Pengerjaan Bertahap
Mohon bangun secara modular dan bertahap, jangan langsung semua sekaligus:

1. Setup project Vite + React + TypeScript + Tailwind + plugin PWA.
2. Buat data model unsur kimia (minimal 40 unsur representatif dari 5 golongan di atas) dan bank soal kuis (30–50 soal).
3. Bangun logic inti game UNO: pembuatan deck, shuffle, distribusi kartu, validasi langkah (cocok warna/angka/kartu spesial), giliran pemain & bot, deteksi menang.
4. Bangun komponen UI: Card, Hand, DiscardPile, PlayerAvatar, GameBoard, QuizModal, ScoreBoard.
5. Integrasikan sistem kuis ke kartu aksi spesial, termasuk mekanisme pengurangan penalti (bagian 6) — munculkan modal kuis ke pemain terkena efek, terapkan `hitungPenaltiAkhir` sebelum membagikan kartu tambahan.
6. Tambahkan animasi (Framer Motion) dan efek suara sederhana.
7. Tambahkan sistem skor, badge, dan progress belajar.
8. (Fase 2, setelah poin 1-7 stabil) Tambahkan deck "Kartu Peristiwa Kimia" sesuai bagian 6b: buat 15-20 kartu, tentukan trigger kemunculan, dan integrasikan ke game loop.
9. Uji responsivitas di mobile & desktop, optimasi performa.
10. Setup build PWA agar installable, dan siapkan panduan singkat membungkusnya via Capacitor jika dibutuhkan APK.
11. (Fase 3, PALING TERAKHIR — hanya dikerjakan setelah poin 1-10 stabil dan teruji) Bangun mode online multiplayer lintas kelas sesuai bagian 9.
12. (Fase 4, dikerjakan setelah Fase 3 stabil) Bangun sistem akun guru-murid, rank/divisi, leaderboard berlapis, dan Challenge/Mission sesuai bagian 10 — ikuti urutan mingguan yang tercantum di bagian tersebut.
13. Tambahkan slot logo PNG wajib panitia sesuai bagian 11.

Tolong jelaskan progress dan pilihan teknis di setiap tahap sebelum lanjut ke tahap berikutnya, supaya saya bisa review dan berikan feedback sebelum lanjut ke tahap selanjutnya.

## 9. Fase 3 (Lanjutan): Mode Online Multiplayer Lintas Kelas
Dikerjakan PALING TERAKHIR, setelah versi solo vs bot (Fase 1) dan kartu peristiwa (Fase 2) sudah stabil dan teruji. Tujuannya: siswa dari kelas berbeda bisa main bareng secara real-time, mirip UNO online pada umumnya.

### Tech yang direkomendasikan
Gunakan layanan realtime seperti **Firebase (Firestore + Realtime Database)** atau **Supabase Realtime** — pilih salah satu. Tidak perlu membangun backend server custom dari nol; kedua layanan ini punya tingkat gratis yang cukup untuk skala kelas dan sudah menyediakan sinkronisasi data otomatis antar klien.

### Sistem room (lobby)
- Pemain pertama (host) membuat room baru; sistem meng-generate kode room acak (4–6 karakter, mudah diucapkan/diketik).
- Pemain lain memasukkan kode room tersebut untuk bergabung ke lobby yang sama.
- Lobby menampilkan daftar nama pemain yang sudah bergabung secara realtime; host menekan tombol "Mulai" saat semua siap.
- Batasi jumlah pemain wajar per room (misal maksimal 4) agar giliran tidak terlalu lama.

### Sinkronisasi state permainan
- Setiap aksi (kartu dimainkan, hasil kuis, giliran berpindah, kartu peristiwa terpicu) diproses lewat fungsi-fungsi murni dari bagian 6c, hasilnya ditulis ke database bersama, lalu semua klien menerima update lewat realtime listener — bukan tiap klien menghitung sendiri secara independen.
- Kartu di tangan tiap pemain sebaiknya disimpan di path/dokumen terpisah per pemain (bukan satu dokumen besar yang bisa dibaca semua orang) supaya tidak mudah dicurangi lewat developer tools browser.

### Penanganan koneksi
- Jika ada pemain terputus (sinyal HP hilang, app ditutup tidak sengaja), simpan state permainan terakhir di database dan izinkan pemain tersebut bergabung kembali dengan kode room yang sama tanpa kehilangan progress permainan.

### Ruang lingkup yang wajar untuk versi lomba
Cukup dukung satu room = satu sesi permainan aktif (tidak perlu sistem banyak room bersamaan yang rumit atau matchmaking otomatis). Fokus ke pengalaman "buat room, share kode, semua join, main" yang sederhana dan andal, bukan fitur online yang kompleks.

## 10. Fase 4 (Lanjutan): Sistem Akun, Rank/Divisi, Leaderboard, Dashboard Guru-Murid, dan Challenge/Mission
Dikerjakan setelah Fase 3 (online multiplayer) stabil. Fitur ini menjawab langsung kriteria penilaian lomba kategori Gamifikasi Pembelajaran, terutama aspek "Penerapan unsur gamifikasi" (leaderboard/ranking, badge, level, challenge/mission) dan "Manfaat/efektivitas pembelajaran" (progres belajar terukur per siswa).

### Keputusan desain (ikuti ini sebagai spesifikasi, bukan sekadar saran)
- **Identitas murid**: identitas ringan, hanya Nama + PIN 4 digit. Kode kelas dari guru bersifat OPSIONAL — murid bisa membuat akun tanpa kode kelas sama sekali (akun bebas, tetap ikut leaderboard global, tidak terikat ke kelas manapun), atau memasukkan kode kelas untuk tergabung ke kelas tertentu.
- **Kode unik anti-tabrakan**: setiap akun murid otomatis diberi kode pendek unik yang digabung ke nama saat ditampilkan, contoh **"Budi#4821"** — supaya walau banyak murid pakai nama+PIN yang sama, identitasnya tetap bisa dibedakan. Simpan token sesi di device (localStorage) supaya murid tidak perlu masukin ulang Nama+PIN tiap kali buka aplikasi di device yang sama. Nama+PIN dipakai untuk pemulihan akun di device lain — jika ada lebih dari satu akun dengan kombinasi nama+PIN yang sama, tampilkan daftar kode unik yang cocok agar murid memilih akunnya sendiri.
- **Identitas guru**: akun penuh via Supabase Auth (email + password).
- **Sistem rank pemain: "Peringkat Golongan 1–18"**, mengikuti penomoran golongan modern IUPAC pada tabel periodik. PENTING — istilah "Golongan" di sini berbeda konteks dari "Golongan" warna kartu (Alkali/Halogen/dst) yang sudah ada. Untuk menghindari kebingungan pemain, SELALU sebut rank pemain sebagai **"Peringkat Golongan [angka]"** di seluruh UI (bukan cuma "Golongan [angka]"), sementara istilah kartu tetap seperti sekarang ("Golongan Alkali", "Golongan Halogen", dst).
- **Kurva kesulitan naik peringkat**: KUADRATIK — makin tinggi peringkat golongan yang mau dicapai, makin besar poin kumulatif yang dibutuhkan, dengan jarak antar level yang makin lebar di level atas (bukan linear).
- **Sumber poin** (dua sumber, bobot berbeda jauh):
  1. Jawaban kuis benar (solo maupun online) — poin kecil, dibobot tingkat kesulitan.
  2. **Bonus kemenangan di sesi ONLINE** — poin besar, jauh lebih besar dari akumulasi kuis biasa. Kemenangan melawan bot (solo) TIDAK mendapat bonus besar ini, hanya poin dari jawaban benar seperti biasa.
- **Reset mingguan otomatis** (bukan demosi karena kalah — reset berbasis waktu):
  - Setiap minggu, peringkat aktif diturunkan sekitar 3–4 golongan dari puncak tertinggi yang pernah dicapai minggu itu (bukan direset total ke Golongan 1).
  - **Floor/lantai**: begitu seorang murid pernah mencapai Peringkat Golongan 3 atau lebih tinggi, peringkat aktifnya TIDAK PERNAH boleh turun di bawah Golongan 3 lagi pada reset mingguan mana pun berikutnya.
  - Sistem tetap menyimpan **rekor peringkat tertinggi yang pernah diraih** secara permanen di akun (terpisah dari peringkat aktif yang naik-turun tiap minggu), ditampilkan sebagai semacam "rekor pribadi" di profil murid.
- **Tiga lapis leaderboard**:
  1. Leaderboard sesi online — ringkasan ranking di layar akhir setiap sesi room (siapa menang, skor, jumlah jawaban benar tiap pemain di sesi itu).
  2. Leaderboard kelas — membandingkan murid-murid dalam satu kelas yang sama (hanya murid yang tergabung ke kelas tertentu).
  3. Leaderboard global — membandingkan seluruh murid terdaftar di aplikasi (termasuk akun bebas tanpa kelas).
  Semua leaderboard menampilkan Peringkat Golongan sebagai identitas utama (ikon/lencana golongan), bukan cuma angka urutan 1/2/3.

### Skema data (perluasan dari Supabase yang sudah dipakai di Fase 3)
Tabel baru yang perlu ditambahkan:
```
guru              -- via Supabase Auth bawaan
kelas             (id, nama_kelas, kode_kelas UNIK, guru_id, dibuat_pada)
murid             (id, nama, pin_hash, kode_unik UNIK (contoh "4821"),
                    kelas_id NULLABLE (null = akun bebas, tidak terikat kelas),
                    dibuat_pada)
progres_murid     (murid_id, total_poin,
                    peringkat_golongan_aktif INT (1-18, naik-turun per reset mingguan),
                    peringkat_golongan_rekor INT (1-18, HANYA naik, catatan permanen),
                    minggu_reset_terakhir DATE,
                    riwayat_akurasi_per_golongan JSONB, badge_diraih JSONB,
                    diperbarui_pada)
misi              (id, judul, deskripsi, target JSONB, badge_reward_id)
misi_progres_murid (murid_id, misi_id, status, progres_saat_ini)
```
RLS wajib: guru hanya bisa baca/tulis kelas & murid miliknya sendiri (kelas_id cocok guru_id yang login). Murid hanya bisa baca/tulis data dirinya sendiri; leaderboard ditampilkan sebagai data agregat (nama+kode_unik + peringkat + poin saja), bukan data pribadi murid lain secara detail.

### Fungsi murni baru (WAJIB ikuti pola arsitektur di bagian 6c — taruh di `src/game/`, tanpa efek samping, mudah diuji)
```typescript
// Poin dari jawaban kuis benar — kecil, dibobot kesulitan (angka contoh, boleh disetel ulang)
function poinJawabanBenar(kesulitan: 'mudah' | 'sedang' | 'sulit'): number { /* mudah=10, sedang=20, sulit=30 */ }

// Bonus BESAR khusus menang di sesi ONLINE (menang lawan bot tidak dapat bonus ini)
function poinBonusMenangOnline(): number { /* contoh: 250, jauh lebih besar dari poin kuis biasa */ }

// Kebutuhan poin KUMULATIF untuk mencapai peringkat golongan tertentu — KUADRATIK
function kebutuhanPoinGolongan(golongan: number): number {
  const BASE = 100;
  return BASE * golongan * golongan; // golongan 2 = 400, golongan 3 = 900, ... golongan 18 = 32400
}

// Cari peringkat golongan tertinggi yang totalPoin sudah cukup untuk dicapai (maks 18)
function hitungGolonganDariPoin(totalPoin: number): number { /* ... */ }

// Reset mingguan: turun 3-4 golongan dari puncak minggu ini, TIDAK PERNAH di bawah 3
// jika peringkat_golongan_rekor pernah mencapai >= 3
function terapkanResetMingguan(golonganAktifSaatIni: number, golonganRekor: number): number {
  const PENURUNAN = 3; // boleh disetel 3-4
  const hasilTurun = Math.max(golonganAktifSaatIni - PENURUNAN, 1);
  return golonganRekor >= 3 ? Math.max(hasilTurun, 3) : hasilTurun;
}

function cekMisiSelesai(progresMurid: ProgresMurid, misi: Misi): boolean { /* ... */ }
```
Fungsi-fungsi ini harus punya unit test seperti pola 102 test yang sudah ada di project (termasuk kasus tepi: floor di golongan 3, batas atas golongan 18, penurunan tidak boleh minus). Dipakai ulang baik di alur solo maupun online — jangan hitung poin/peringkat secara terpisah di dua tempat berbeda. Reset mingguan sebaiknya dijalankan sebagai scheduled job di Supabase Edge Function (cron), bukan dihitung ulang tiap kali murid buka aplikasi.

### Urutan pengerjaan mingguan (sesuaikan dengan sisa waktu yang ada)

**Minggu 1 — Fondasi data & akun:**
1. Setup Supabase Auth untuk guru. Buat migration SQL untuk tabel `kelas`, `murid` (kelas_id nullable + kode_unik otomatis), `progres_murid` di atas, lengkap dengan RLS policy.
2. Alur "Guru buat kelas baru" → sistem generate kode kelas unik yang ditampilkan ke guru.
3. Alur "Murid buat akun": masukkan Nama + PIN, kode kelas bersifat opsional (boleh dikosongkan untuk akun bebas). Sistem generate kode_unik otomatis (contoh "Budi#4821"), simpan token sesi di localStorage device.
4. Migrasikan progres yang sekarang tersimpan di localStorage (XP, badge) supaya otomatis tersimpan ke `progres_murid` begitu murid membuat akun — bukan cuma tersimpan di device seperti sekarang.

**Minggu 2 — Rank & Leaderboard:**
5. Implementasikan `poinJawabanBenar`, `poinBonusMenangOnline`, `kebutuhanPoinGolongan`, `hitungGolonganDariPoin`, dan `terapkanResetMingguan` sebagai fungsi murni, lengkap unit test (termasuk kasus tepi floor golongan 3 dan batas atas golongan 18).
6. Setup scheduled job (Supabase Edge Function cron) untuk menjalankan `terapkanResetMingguan` ke semua murid setiap minggu.
7. Bangun layar leaderboard sesi online (ringkasan di akhir permainan tiap room).
8. Bangun layar leaderboard kelas dan leaderboard global — tampilkan lencana/ikon "Peringkat Golongan [angka]" secara visual, bukan cuma angka urutan.

**Minggu 3 — Dashboard & Challenge/Mission:**
9. Dashboard Guru: daftar kelas miliknya, daftar murid di kelas terpilih beserta progres masing-masing (peringkat golongan aktif, rekor tertinggi, poin, akurasi per golongan kartu).
10. Dashboard Murid: profil pribadi (peringkat golongan aktif, rekor tertinggi, badge diraih, riwayat akurasi per golongan), tombol untuk gabung ke kelas baru (opsional) menggunakan kode kelas.
11. Sistem Challenge/Mission: implementasikan tabel `misi` + `misi_progres_murid`, cek otomatis progres misi setiap kali murid menjawab kuis atau menyelesaikan sesi permainan (pakai `cekMisiSelesai`), berikan reward badge + bonus poin saat misi selesai. Buat minimal 8-10 misi awal (contoh: "Jawab 5 soal Golongan Halogen tanpa salah", "Menangkan 3 sesi online berturut-turut", "Raih 4 dari 5 badge Master Golongan").
12. Sambungkan seluruh alur ini ke gameplay solo dan online yang sudah ada, supaya poin/peringkat golongan/progres misi otomatis ter-update setiap kali sesi permainan selesai — baik solo maupun online.

**Minggu 4 (paralel dengan penyelesaian Fase 4 kalau masih berjalan) — Konten & finalisasi:**
13. Tambah soal kuis dan fun fact baru agar mencakup seluruh materi Capaian Pembelajaran (CP) yang relevan, bukan hanya 42 soal yang sudah ada.
14. Isi slot logo PNG (bagian 11) dan lengkapi dokumentasi wajib di halaman "Tentang" (identitas pengembang, jenjang & mata pelajaran, capaian & tujuan pembelajaran, petunjuk penggunaan).
15. Uji menyeluruh lintas perangkat/browser, khususnya alur akun murid, leaderboard, dan reset mingguan yang baru dibangun.

### Catatan risiko dan prioritas
Fitur ini setara besar dengan Fase 3. Kalau waktu mepet menjelang deadline, PRIORITASKAN Minggu 1–2 (fondasi akun, peringkat golongan, leaderboard) karena ini yang paling langsung menjawab indikator rubrik penilaian dengan bobot terbesar (Penerapan unsur gamifikasi, 20%). Dashboard guru-murid detail (Minggu 3) boleh disederhanakan ke versi paling minimal sebagai fallback, tapi leaderboard dan sistem peringkat golongan harus tetap ada dan berfungsi.

## 11. Slot Logo Wajib Panitia Lomba
Sediakan area placeholder logo PNG kosong yang mudah diisi belakangan (begitu file logo resmi sudah diunduh dari panitia), di minimal dua lokasi:
- Splash screen / halaman menu utama (footer atau header)
- Halaman "Tentang" (InfoScreen.tsx)

Buat sebagai komponen `LogoPanitia.tsx` yang membaca 4 file gambar dari folder `public/logos/` (misal `dikti-saintek.png`, `unpatti.png`, `forkom.png`, `forkom-2026.png`), dengan placeholder abu-abu bertuliskan nama logo kalau filenya belum ada — supaya nanti tinggal taruh file PNG asli di folder itu tanpa perlu ubah kode lagi.

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

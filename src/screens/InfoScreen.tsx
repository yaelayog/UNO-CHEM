import type { ReactNode } from 'react';
import { useGameStore } from '../store/gameStore';

function Kerangka({ judul, children }: { judul: string; children: ReactNode }) {
  const keLayar = useGameStore((s) => s.keLayar);
  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col gap-4 p-5 no-select">
      <button
        type="button"
        onClick={() => keLayar('menu')}
        className="w-fit rounded-full bg-white px-3 py-1 text-xs font-bold text-tinta/70 shadow-empuk cursor-pointer hover:bg-kertas"
      >
        ← Menu
      </button>
      <h1 className="font-display text-2xl font-extrabold text-lab">{judul}</h1>
      <div className="flex flex-col gap-3 text-sm leading-relaxed text-tinta/80">
        {children}
      </div>
    </main>
  );
}

export function RulesScreen() {
  return (
    <Kerangka judul="Cara Main">
      <p>
        <b>Tujuan:</b> jadi yang pertama menghabiskan kartu di tangan.
      </p>
      <p>
        Setiap giliran, buang 1 kartu yang cocok dengan kartu teratas berdasarkan{' '}
        <b>warna (golongan)</b> atau <b>angka besar di pojok (periode)</b>. Tidak
        punya kartu cocok? Tarik 1 kartu dari tumpukan.
      </p>
      <div className="rounded-2xl bg-white p-3 shadow-empuk">
        <p className="font-extrabold text-tinta">Tumpuk kartu seperiode</p>
        <p className="mt-1 text-sm">
          Punya beberapa kartu unsur <b>berperiode sama</b>? Tap kartu pertama
          yang sah, lalu tap kartu seperiode lainnya (bergaris putus-putus) untuk
          menumpuknya sekaligus dalam 1 giliran — walau golongannya beda. Kartu
          terakhir menentukan golongan &amp; periode berikutnya.
        </p>
      </div>
      <div className="rounded-2xl bg-white p-3 shadow-empuk">
        <p className="font-extrabold text-tinta">Warna = Golongan</p>
        <ul className="mt-1 list-inside list-disc">
          <li>Merah — Logam Alkali (IA)</li>
          <li>Oranye — Logam Alkali Tanah (IIA)</li>
          <li>Kuning — Halogen (VIIA)</li>
          <li>Hijau — Gas Mulia (VIIIA)</li>
          <li>Biru — Logam Transisi</li>
        </ul>
        <p className="mt-2 font-extrabold text-tinta">
          Angka di pojok kartu = Periode (1–7)
        </p>
        <p className="mt-1 text-xs text-tinta/60">
          Simbol besar di tengah adalah unsurnya (untuk belajar) — yang menentukan
          kartu bisa dimainkan adalah <b>warna</b> &amp; <b>angka pojok</b>. Panel
          "Cocokkan" di atas tumpukan buang selalu menunjukkan target saat ini.
        </p>
      </div>
      <div className="rounded-2xl bg-white p-3 shadow-empuk">
        <p className="font-extrabold text-tinta">
          Kartu Katalis / Reaksi Eksplosif
        </p>
        <p className="mt-1 text-sm">
          Kartu berpita 5 warna — bisa dimainkan kapan saja, lalu kamu{' '}
          <b>pilih golongan (warna) baru</b> secara bebas.
        </p>
      </div>
      <div className="rounded-2xl bg-white p-3 shadow-empuk">
        <p className="font-extrabold text-tinta">Kartu spesial</p>
        <ul className="mt-1 space-y-1">
          <li>
            <b>Reaksi Tidak Stabil (Skip):</b> lawan menjawab kuis; jika benar &amp;
            cepat, ia tidak jadi dilewati.
          </li>
          <li>
            <b>Reaksi Balik (Reverse):</b> arah permainan dibalik.
          </li>
          <li>
            <b>Ionisasi (+2):</b> lawan berikutnya ambil 2 kartu — kecuali lolos
            kuis (benar cepat = 0 kartu, benar = 1 kartu).
          </li>
          <li>
            <b>Katalis (Wild):</b> pilih golongan baru bebas.
          </li>
          <li>
            <b>Reaksi Eksplosif (+4):</b> lawan ambil 4 kartu + kuis sulit.
          </li>
        </ul>
      </div>
      <p>
        Buang 3 kartu segolongan berturut-turut → dapat <b>fakta kimia</b> bonus.
      </p>
      <div className="rounded-2xl bg-white p-3 shadow-empuk">
        <p className="font-extrabold text-tinta">Fun Fact 📖</p>
        <p className="mt-1 text-sm">
          Tiap 1 putaran penuh (semua pemain sudah jalan) muncul kartu{' '}
          <b>Fun Fact</b> berisi fakta kimia singkat, tampil 15–30 detik. Fakta
          tidak mengubah kartu — tapi kalau kamu menyimaknya, <b>kuis</b>{' '}
          berikutnya lebih sering menanyakan hal yang barusan kamu baca.
        </p>
      </div>
    </Kerangka>
  );
}

export function AboutScreen() {
  return (
    <Kerangka judul="Tentang">
      <p>
        <b>ChemUno</b> adalah media pembelajaran kimia berbentuk permainan kartu
        yang mengadaptasi mekanisme UNO untuk mengenalkan golongan unsur, periode,
        dan ikatan kimia sederhana kepada siswa SMP/SMA.
      </p>
      <p>
        Dibuat untuk lomba media pembelajaran kimia. Dapat dimainkan di browser
        HP maupun komputer, dan bisa dipasang sebagai aplikasi (PWA) untuk
        digunakan tanpa koneksi internet.
      </p>
      <p className="text-xs text-tinta/50">
        Data: 47 unsur representatif dari 5 golongan · 42 soal kuis · 32 Fun
        Fact. Konten edukasi bersifat penyederhanaan untuk tingkat sekolah.
      </p>
    </Kerangka>
  );
}

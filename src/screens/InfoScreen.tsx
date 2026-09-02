import { KREDIT } from '../data/kredit';
import { LogoPanitia } from '../components/LogoPanitia';
import { BagianInfo, KerangkaInfo } from '../components/LayarInfo';

export function RulesScreen() {
  return (
    <KerangkaInfo judul="Cara Main">
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
      <div className="rounded-2xl bg-white p-3 shadow-empuk">
        <p className="font-extrabold text-tinta">Bilang "UNO!" 🔔</p>
        <p className="mt-1 text-sm">
          Saat kartumu <b>tinggal 1</b>, tombol <b>UNO!</b> muncul buat semua
          pemain. Kamu harus pencet dalam <b>4 detik</b>. Kalau kelamaan atau
          keburu dipencet lawan (tombol "Tangkap"), kamu <b>ambil 2 kartu</b>.
        </p>
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
    </KerangkaInfo>
  );
}

export function AboutScreen() {
  return (
    <KerangkaInfo judul="Tentang">
      <p>
        <b>ChemUno</b> adalah media pembelajaran kimia berbentuk permainan kartu
        yang mengadaptasi mekanisme UNO: <b>warna kartu = golongan unsur</b>,{' '}
        <b>angka kartu = periode</b>. Kartu aksi memunculkan kuis kimia singkat.
      </p>

      <BagianInfo judul="Identitas Pengembang">
        <p className="font-bold text-tinta">{KREDIT.namaTim}</p>
        <ul className="list-disc pl-4">
          {KREDIT.anggota.map((a) => (
            <li key={a.nim}>
              {a.nama} <span className="text-tinta/50">(NIM {a.nim})</span>
            </li>
          ))}
        </ul>
        <p>{KREDIT.instansi}</p>
        {KREDIT.pembimbing && !KREDIT.pembimbing.startsWith('TODO') && (
          <p>Pembimbing: {KREDIT.pembimbing}</p>
        )}
        <p className="text-tinta/55">Dikembangkan untuk {KREDIT.kompetisi}.</p>
      </BagianInfo>

      <BagianInfo judul="Jenjang & Mata Pelajaran">
        <p>{KREDIT.jenjang}</p>
        <p className="text-tinta/55">
          Rincian Capaian &amp; Tujuan Pembelajaran ada di layar{' '}
          <b>CP &amp; Tujuan Pembelajaran</b> (menu utama).
        </p>
      </BagianInfo>

      <BagianInfo judul="Petunjuk Penggunaan">
        <ol className="list-decimal pl-4">
          {KREDIT.petunjuk.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ol>
      </BagianInfo>

      <p className="text-xs text-tinta/50">
        Konten: 47 unsur dari 5 golongan · bank soal kuis bertingkat · Fun Fact
        edukatif. Materi disederhanakan untuk jenjang sekolah.
      </p>

      <div className="pt-2">
        <LogoPanitia judul="Diselenggarakan oleh" tinggi={40} />
      </div>
    </KerangkaInfo>
  );
}

import { useEffect, useRef, useState } from 'react';
import type { SoalKuis } from '../data/types';
import { hitungPenaltiAkhir, type HasilKuis } from '../game';
import { sfx } from '../lib/audio';
import { Ledakan } from './Ledakan';
import {
  AMBANG_CEPAT_DETIK,
  BATAS_WAKTU_KUIS_DETIK,
} from '../lib/kuis';

interface Props {
  soal: SoalKuis;
  penaltiDasar: number;
  jenisEfek: 'skip' | 'draw2' | 'wild4';
  judulKartu: string;
  namaTarget: string;
  onSelesai: (hasil: HasilKuis) => void;
}

const LABEL_HASIL: Record<'skip' | 'kartu', Record<HasilKuis, string>> = {
  skip: {
    benarCepat: 'Benar & cepat! Kamu tidak jadi dilewati 🎉',
    benarLambat: 'Benar, tapi kurang cepat — giliranmu tetap dilewati',
    salah: 'Belum tepat — giliranmu dilewati',
  },
  kartu: {
    benarCepat: 'Benar & cepat! Tidak ambil kartu 🎉',
    benarLambat: 'Benar! Kartu tambahan dikurangi separuh',
    salah: 'Belum tepat — ambil kartu penuh',
  },
};

export function QuizModal({
  soal,
  penaltiDasar,
  jenisEfek,
  judulKartu,
  namaTarget,
  onSelesai,
}: Props) {
  const mulai = useRef(performance.now());
  const [sisa, setSisa] = useState(BATAS_WAKTU_KUIS_DETIK);
  const [dipilih, setDipilih] = useState<number | null>(null);
  const [hasil, setHasil] = useState<HasilKuis | null>(null);

  // Hitung mundur
  useEffect(() => {
    if (hasil) return;
    const id = setInterval(() => {
      const lewat = (performance.now() - mulai.current) / 1000;
      const sisaBaru = Math.max(0, BATAS_WAKTU_KUIS_DETIK - lewat);
      setSisa(sisaBaru);
      if (sisaBaru <= 0) {
        setHasil('salah');
        sfx.salah();
      }
    }, 100);
    return () => clearInterval(id);
  }, [hasil]);

  // Setelah ada hasil, tampilkan pembahasan sebentar lalu tutup
  useEffect(() => {
    if (!hasil) return;
    const id = setTimeout(() => onSelesai(hasil), 2200);
    return () => clearTimeout(id);
  }, [hasil, onSelesai]);

  function pilih(idx: number) {
    if (hasil) return;
    const lewat = (performance.now() - mulai.current) / 1000;
    const benar = idx === soal.jawabanBenar;
    setDipilih(idx);
    const h: HasilKuis = benar
      ? lewat <= AMBANG_CEPAT_DETIK
        ? 'benarCepat'
        : 'benarLambat'
      : 'salah';
    setHasil(h);
    if (h === 'salah') sfx.salah();
    else sfx.benar();
  }

  const persen = (sisa / BATAS_WAKTU_KUIS_DETIK) * 100;
  const skip = jenisEfek === 'skip';
  const labelHasil = LABEL_HASIL[skip ? 'skip' : 'kartu'];
  const benar = hasil === 'benarCepat' || hasil === 'benarLambat';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm sm:items-center">
      {benar && <Ledakan warna="#22c55e" />}
      <div className="animasi-pop w-full max-w-md rounded-3xl border border-black/10 bg-white p-5 shadow-empuk">
        <div className="flex items-center justify-between text-xs font-bold text-tinta/60">
          <span>
            {judulKartu} · untuk {namaTarget}
          </span>
          <span className="flex items-center gap-2">
            <span className="uppercase">{soal.tingkatKesulitan}</span>
            {!hasil && (
              <span
                className={`tabular-nums ${sisa <= 3 ? 'text-alkali' : ''}`}
              >
                {Math.ceil(sisa)} dtk
              </span>
            )}
          </span>
        </div>

        {/* timer */}
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/10">
          <div
            className={`h-full rounded-full transition-[width] duration-100 ${
              persen > 50 ? 'bg-gas-mulia' : persen > 20 ? 'bg-halogen' : 'bg-alkali'
            }`}
            style={{ width: `${hasil ? 100 : persen}%` }}
          />
        </div>

        <h2 className="mt-3 font-display text-lg font-extrabold leading-snug text-tinta">
          {soal.pertanyaan}
        </h2>

        <div className="mt-3 grid gap-2">
          {soal.pilihan.map((opsi, idx) => {
            const benar = idx === soal.jawabanBenar;
            const status = !hasil
              ? 'netral'
              : benar
                ? 'benar'
                : idx === dipilih
                  ? 'salah'
                  : 'redup';
            return (
              <button
                key={idx}
                type="button"
                onClick={() => pilih(idx)}
                disabled={Boolean(hasil)}
                className={`rounded-2xl border-2 px-4 py-2.5 text-left text-sm font-bold transition
                  ${status === 'netral' ? 'border-black/10 bg-white hover:border-lab hover:bg-lab/5 cursor-pointer' : ''}
                  ${status === 'benar' ? 'border-gas-mulia bg-gas-mulia-050 text-gas-mulia-700' : ''}
                  ${status === 'salah' ? 'border-alkali bg-alkali-050 text-alkali-700' : ''}
                  ${status === 'redup' ? 'border-black/10 opacity-50' : ''}`}
              >
                {opsi}
              </button>
            );
          })}
        </div>

        {hasil ? (
          <div className="mt-3 rounded-2xl bg-kertas p-3 text-sm">
            <p className="font-extrabold text-tinta">{labelHasil[hasil]}</p>
            {soal.pembahasan && (
              <p className="mt-1 text-tinta/70">{soal.pembahasan}</p>
            )}
          </div>
        ) : (
          <p className="mt-3 text-center text-xs font-bold text-tinta/50">
            {skip
              ? `Benar & <${AMBANG_CEPAT_DETIK} dtk → tidak dilewati · selain itu → giliranmu dilewati`
              : `Benar & <${AMBANG_CEPAT_DETIK} dtk → 0 kartu · Benar → ${hitungPenaltiAkhir(penaltiDasar, 'benarLambat')} kartu · Salah → ${penaltiDasar} kartu`}
          </p>
        )}
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import {
  bonusLengkap,
  faktaHariIni,
  golonganHariIni,
  misiHarianUntuk,
  msSampaiReset,
  tanggalWIB,
  targetMisi,
  WARNA_KARTU,
  type MisiHarian,
  type TingkatHarian,
} from '../game';
import { GOLONGAN } from '../data/golongan';
import { misiBadge } from '../data/misiBadge';
import { useGameStore } from '../store/gameStore';
import { useAkunStore } from '../akun/akunStore';

const TINGKAT: Record<TingkatHarian, { label: string; kelas: string }> = {
  pemanasan: { label: 'Pemanasan', kelas: 'bg-gas-mulia-050 text-gas-mulia-700' },
  belajar: { label: 'Belajar', kelas: 'bg-transisi-050 text-transisi-700' },
  tantangan: { label: 'Tantangan', kelas: 'bg-alkali-050 text-alkali-700' },
};

const LENCANA_HARIAN = [
  { id: 'harian-streak-3', syarat: '3 hari beruntun' },
  { id: 'harian-streak-7', syarat: '7 hari beruntun' },
  { id: 'harian-total-10', syarat: '10 hari lengkap (total)' },
];

function formatSisa(ms: number): string {
  const menit = Math.max(0, Math.ceil(ms / 60000));
  const j = Math.floor(menit / 60);
  const m = menit % 60;
  return j > 0 ? `${j}j ${m}m` : `${m}m`;
}

export function MisiScreen() {
  const keLayar = useGameStore((s) => s.keLayar);
  const murid = useAkunStore((s) => s.murid);
  const harian = useAkunStore((s) => s.harian);
  const progresAkun = useAkunStore((s) => s.progresAkun);
  const badgeDiraih = progresAkun?.badgeDiraih ?? [];
  const segarkanAkun = useAkunStore((s) => s.segarkanAkun);
  const [sekarang, setSekarang] = useState(() => new Date());
  const tanggalDisegarkan = useRef<string | null>(null);

  useEffect(() => {
    if (murid) void segarkanAkun();
  }, [murid, segarkanAkun]);

  useEffect(() => {
    const t = setInterval(() => setSekarang(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  // Lewat tengah malam saat layar terbuka → ambil misi hari yang baru.
  const hariIniKlien = tanggalWIB(sekarang);
  useEffect(() => {
    if (
      murid &&
      harian &&
      harian.tanggal !== hariIniKlien &&
      tanggalDisegarkan.current !== hariIniKlien
    ) {
      tanggalDisegarkan.current = hariIniKlien;
      void segarkanAkun();
    }
  }, [murid, harian, hariIniKlien, segarkanAkun]);

  const tanggal = harian?.tanggal ?? hariIniKlien;
  const daftar = misiHarianUntuk(tanggal);
  const g = golonganHariIni(tanggal);
  const info = GOLONGAN[g];
  const prMap = new Map((harian?.progres ?? []).map((p) => [p.misiId, p]));
  const jumlahSelesai = daftar.filter((m) => prMap.get(m.id)?.selesai).length;
  const streak = harian?.streak ?? 0;
  const lengkap = harian?.lengkapHariIni ?? false;
  // Streak yang akan tercapai bila hari ini dilengkapi.
  const streakBerikut = lengkap ? streak : streak + 1;
  const aktif = Boolean(murid && harian);

  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col gap-3 p-5 no-select">
      <button
        type="button"
        onClick={() => keLayar('menu')}
        className="w-fit rounded-full bg-white px-3 py-1 text-xs font-bold text-tinta/70 shadow-empuk cursor-pointer hover:bg-kertas"
      >
        ← Menu
      </button>

      <div className="flex items-end justify-between gap-2">
        <h1 className="font-display text-2xl font-extrabold text-lab">Misi Harian</h1>
        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-tinta/60 shadow-empuk">
          ⏳ ganti dalam {formatSisa(msSampaiReset(sekarang))}
        </span>
      </div>

      {!murid && (
        <button
          type="button"
          onClick={() => keLayar('akun')}
          className="rounded-2xl border-2 border-dashed border-lab/40 bg-white p-3 text-left shadow-empuk cursor-pointer hover:bg-kertas"
        >
          <p className="text-sm font-extrabold text-lab">🔒 Masuk untuk mulai</p>
          <p className="text-[11px] font-bold text-tinta/60">
            Buat akun (Nama + PIN) supaya kemajuan misi, streak 🔥, dan poin peringkat
            tersimpan. →
          </p>
        </button>
      )}
      {murid && !harian && (
        <p className="rounded-2xl bg-white p-3 text-[11px] font-bold text-tinta/60 shadow-empuk">
          Kemajuan Misi Harian belum bisa dimuat. Coba lagi sebentar lagi.
        </p>
      )}

      {/* Streak + kemajuan hari ini */}
      <section className="flex items-center gap-3 rounded-3xl border border-black/10 bg-white p-4 shadow-empuk">
        <div
          className={`flex h-16 w-16 flex-none flex-col items-center justify-center rounded-2xl ${
            streak > 0 ? 'bg-alkali-050' : 'bg-kertas'
          }`}
        >
          <span className={`text-2xl leading-none ${streak > 0 ? '' : 'grayscale opacity-50'}`}>
            🔥
          </span>
          <span className="font-display text-lg font-extrabold leading-tight text-tinta">
            {streak}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-base font-extrabold text-tinta">
            {streak > 0 ? `${streak} hari beruntun` : 'Mulai streak hari ini!'}
          </p>
          <p className="text-[11px] font-bold text-tinta/55">
            {lengkap
              ? 'Hari ini beres! Kembali besok supaya api tetap menyala.'
              : `Selesaikan 3 misi → bonus +${bonusLengkap(streakBerikut)} poin & 🔥 ${streakBerikut}`}
          </p>
          <div className="mt-1.5 flex gap-1">
            {daftar.map((m) => (
              <span
                key={m.id}
                className={`h-2 flex-1 rounded-full ${
                  prMap.get(m.id)?.selesai ? 'bg-lab' : 'bg-black/10'
                }`}
              />
            ))}
          </div>
          <p className="mt-0.5 text-right text-[10px] font-bold text-tinta/45">
            {jumlahSelesai}/3 selesai
          </p>
        </div>
      </section>

      {/* Golongan Hari Ini — kaitan langsung ke materi */}
      <section
        className="rounded-3xl border-l-8 bg-white p-4 shadow-empuk"
        style={{ borderLeftColor: info.warnaUno }}
      >
        <p className="text-[10px] font-extrabold uppercase tracking-wide text-tinta/45">
          Golongan Hari Ini
        </p>
        <p className="font-display text-lg font-extrabold text-tinta">
          {info.nama}{' '}
          <span className="text-sm text-tinta/45">({info.nomorGolongan})</span>
        </p>
        <p className="mt-1 text-xs leading-relaxed text-tinta/75">{faktaHariIni(tanggal)}</p>
        <p className="mt-2 rounded-xl bg-kertas px-2.5 py-1.5 text-[11px] font-bold text-tinta/70">
          🃏 Kartu <span style={{ color: info.warnaUno }}>{WARNA_KARTU[g]}</span> = unsur{' '}
          {info.nama}. Perhatikan simbol &amp; periode di kartunya saat kamu memainkannya!
        </p>
        <p className="mt-1.5 px-1 text-[10px] leading-snug text-tinta/50">
          Kuis muncul saat kamu terkena kartu Skip / +2 / +4 lawan — temanya mengikuti warna
          kartu serangan itu.
        </p>
      </section>

      {/* 3 misi */}
      <section className="flex flex-col gap-2">
        {daftar.map((m) => (
          <KartuMisiHarian
            key={m.id}
            misi={m}
            progres={prMap.get(m.id)?.progres ?? 0}
            selesai={prMap.get(m.id)?.selesai ?? false}
            terkunci={!aktif}
          />
        ))}
      </section>

      {/* Lencana streak */}
      <section>
        <h2 className="mb-1.5 font-display text-base font-extrabold text-tinta">
          Lencana Harian
        </h2>
        <div className="grid grid-cols-3 gap-2">
          {LENCANA_HARIAN.map((l) => {
            const b = misiBadge(l.id);
            const ada = badgeDiraih.includes(l.id);
            return (
              <div
                key={l.id}
                className={`flex flex-col items-center rounded-2xl p-2 text-center shadow-empuk ${
                  ada ? 'bg-white' : 'bg-black/5 opacity-70'
                }`}
              >
                <span className={`text-2xl ${ada ? '' : 'grayscale'}`}>
                  {ada ? b?.ikon : '🔒'}
                </span>
                <span className="text-[11px] font-extrabold leading-tight text-tinta">
                  {b?.nama}
                </span>
                <span className="text-[10px] leading-tight text-tinta/50">{l.syarat}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl bg-white p-3 text-[11px] leading-relaxed text-tinta/65 shadow-empuk">
        <p className="font-extrabold text-tinta">Cara kerja</p>
        <ul className="mt-1 list-disc pl-4">
          <li>Tiga misi baru setiap hari pukul 00.00 WIB, sama untuk semua murid.</li>
          <li>Berlaku di mode vs Bot maupun Online.</li>
          <li>
            Poin misi masuk ke poin minggu ini, jadi ikut menaikkan{' '}
            <b>Peringkat Golongan</b> kamu.
          </li>
          <li>Bonus lengkap naik +25 tiap hari beruntun (maks. hari ke-7).</li>
        </ul>
      </section>

      <button
        type="button"
        onClick={() => keLayar('profil')}
        className="rounded-2xl border border-black/10 bg-white px-4 py-2.5 text-sm font-extrabold text-lab shadow-empuk cursor-pointer hover:bg-kertas"
      >
        Misi jangka panjang &amp; semua lencana →
      </button>
    </main>
  );
}

function KartuMisiHarian({
  misi,
  progres,
  selesai,
  terkunci,
}: {
  misi: MisiHarian;
  progres: number;
  selesai: boolean;
  terkunci: boolean;
}) {
  const target = targetMisi(misi);
  const nilai = Math.min(progres, target);
  const t = TINGKAT[misi.tingkat];
  const tp = misi.tipe === 'kuisBenarTP' ? Number(misi.target.tp) : null;
  return (
    <div
      className={`rounded-2xl border p-3 shadow-empuk ${
        selesai ? 'border-lab/30 bg-lab/5' : 'border-black/10 bg-white'
      }`}
    >
      <div className="flex items-center gap-1.5">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${t.kelas}`}>
          {t.label}
        </span>
        {tp !== null && (
          <span className="rounded-full bg-kertas px-2 py-0.5 text-[10px] font-extrabold text-lab-tinta">
            TP {tp}
          </span>
        )}
        {misi.bertemaGolongan && (
          <span className="rounded-full bg-kertas px-2 py-0.5 text-[10px] font-extrabold text-lab-tinta">
            Golongan Hari Ini
          </span>
        )}
        <span className="ml-auto flex-none text-xs font-extrabold text-lab">
          +{misi.poinReward}
        </span>
      </div>
      <p className="mt-1 text-sm font-extrabold text-tinta">
        {selesai ? '✅ ' : ''}
        {misi.judul}
      </p>
      <p className="text-[11px] text-tinta/60">{misi.deskripsi}</p>
      {!terkunci && (
        <>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-black/10">
            <div
              className="h-full rounded-full bg-lab transition-[width] duration-500"
              style={{ width: `${Math.round((nilai / target) * 100)}%` }}
            />
          </div>
          <p className="mt-0.5 text-right text-[10px] font-bold text-tinta/45">
            {nilai}/{target}
          </p>
        </>
      )}
    </div>
  );
}

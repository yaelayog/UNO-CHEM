import { useMemo, useState } from 'react';
import { WARNA_GOLONGAN } from '../data/golongan';
import { infoLevel } from '../lib/progres';
import { picuPasang } from '../lib/pwa';
import { onlineTersedia } from '../lib/supabase';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import { useGameStore } from '../store/gameStore';
import { useAkunStore } from '../akun/akunStore';
import { namaTampil } from '../akun/tipe';
import { LencanaPeringkat } from '../components/LencanaPeringkat';
import { LogoApp } from '../components/LogoApp';
import { LogoPanitia } from '../components/LogoPanitia';
import { PengaturanSuara } from '../components/PengaturanSuara';

const WARNA = Object.values(WARNA_GOLONGAN);

export function MainMenu() {
  const mulaiGame = useGameStore((s) => s.mulaiGame);
  const keLayar = useGameStore((s) => s.keLayar);
  const progres = useGameStore((s) => s.progres);
  const murid = useAkunStore((s) => s.murid);
  const guruEmail = useAkunStore((s) => s.guruEmail);
  const progresAkun = useAkunStore((s) => s.progresAkun);
  const [jumlahBot, setJumlahBot] = useState(2);
  const [pakaiPeristiwa, setPakaiPeristiwa] = useState(false);
  const bisaPasang = useInstallPrompt();

  const lvl = infoLevel(progres.xp);

  const partikel = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        left: 4 + Math.random() * 92,
        delay: Math.random() * 8,
        dur: 7 + Math.random() * 7,
        size: 5 + Math.random() * 9,
        warna: WARNA[i % WARNA.length],
      })),
    [],
  );

  return (
    <main className="relative mx-auto flex min-h-full max-w-md flex-col items-center justify-center gap-3 overflow-hidden px-4 py-4 text-center no-select">
      {/* Pengaturan suara — selalu terjangkau dari menu */}
      <div className="absolute right-3 top-3 z-20">
        <PengaturanSuara />
      </div>

      {/* Partikel molekul melayang */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        {partikel.map((p, i) => (
          <span
            key={i}
            className="absolute bottom-0 rounded-full"
            style={{
              left: `${p.left}%`,
              width: p.size,
              height: p.size,
              background: p.warna,
              opacity: 0.5,
              animation: `apungPartikel ${p.dur}s ${p.delay}s ease-in infinite`,
            }}
          />
        ))}
      </div>

      <div className="w-full rounded-xl border border-black/5 bg-white/70 px-3 py-1 backdrop-blur-sm">
        <LogoPanitia judul="FORKOM FKIP 2026 · Gamifikasi Pembelajaran" tinggi={18} />
      </div>

      <div className="flex flex-col items-center gap-1">
        <LogoApp lebarMaks={208} />
        <h1 className="sr-only">ChemUno</h1>
        <p className="text-xs font-bold text-tinta/55">
          Belajar golongan &amp; periode unsur sambil bermain
        </p>
      </div>

      {/* Akun + Level dalam satu baris ringkas */}
      <div className="flex w-full gap-2">
        <button
          type="button"
          onClick={() => keLayar('akun')}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-black/10 bg-white px-2.5 py-2 text-left text-xs font-extrabold shadow-empuk transition hover:bg-kertas cursor-pointer"
        >
          {murid ? (
            <>
              {progresAkun && (
                <LencanaPeringkat
                  golongan={progresAkun.peringkatGolonganAktif}
                  ukuran="sm"
                />
              )}
              <span className="min-w-0 truncate text-lab">
                {namaTampil(murid)}
              </span>
            </>
          ) : guruEmail ? (
            <span className="truncate text-lab">Guru · {guruEmail}</span>
          ) : (
            <span className="text-tinta/70">Buat akun / Masuk →</span>
          )}
        </button>

        <button
          type="button"
          onClick={() => keLayar('profil')}
          className="flex flex-none items-center gap-1.5 rounded-xl border border-black/10 bg-white px-2.5 py-2 text-xs font-extrabold text-lab-tinta shadow-empuk transition hover:bg-kertas cursor-pointer"
          title={`${progres.badge.length} lencana`}
        >
          Lvl {lvl.level}
          <span className="h-1.5 w-10 overflow-hidden rounded-full bg-black/10">
            <span
              className="block h-full rounded-full bg-lab"
              style={{ width: `${Math.round(lvl.rasio * 100)}%` }}
            />
          </span>
        </button>
      </div>

      <div className="w-full rounded-2xl border border-black/10 bg-white p-3 shadow-empuk">
        <p className="text-[11px] font-bold text-tinta/55">Jumlah lawan bot</p>
        <div className="mt-1 flex flex-wrap justify-center gap-1.5">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setJumlahBot(n)}
              className={`h-8 w-8 rounded-lg font-display text-sm font-extrabold transition cursor-pointer
                ${jumlahBot === n ? 'bg-lab text-white' : 'bg-kertas text-tinta hover:bg-black/5'}`}
            >
              {n}
            </button>
          ))}
        </div>
        <label className="mt-2 flex cursor-pointer items-center justify-between gap-2 rounded-lg bg-kertas px-2.5 py-1.5 text-[11px] font-bold text-tinta">
          <span>
            Kartu Peristiwa Kimia{' '}
            <span className="text-tinta/40">(opsional, default nonaktif)</span>
          </span>
          <input
            type="checkbox"
            checked={pakaiPeristiwa}
            onChange={(e) => setPakaiPeristiwa(e.target.checked)}
            className="h-4 w-4 flex-none accent-lab"
          />
        </label>
        <button
          type="button"
          onClick={() => mulaiGame(jumlahBot, undefined, pakaiPeristiwa)}
          className="mt-2.5 w-full rounded-xl bg-lab px-4 py-2.5 font-display text-base font-extrabold text-white shadow-empuk transition hover:brightness-110 cursor-pointer"
        >
          Mulai Main (vs Bot)
        </button>
        <button
          type="button"
          disabled={!onlineTersedia}
          onClick={() => keLayar('online')}
          className="mt-1.5 w-full rounded-xl border-2 border-lab bg-white px-4 py-2 font-display text-sm font-extrabold text-lab shadow-empuk transition hover:bg-lab/5 disabled:opacity-40 cursor-pointer"
        >
          🌐 Main Online (kode room)
        </button>
      </div>

      <div className="flex flex-wrap justify-center gap-1.5">
        <MenuLink label="Leaderboard" onClick={() => keLayar('leaderboard')} />
        <MenuLink label="Mode Belajar" onClick={() => keLayar('belajar')} />
        <MenuLink label="Cara Main" onClick={() => keLayar('aturan')} />
        <MenuLink label="Tentang" onClick={() => keLayar('tentang')} />
        <MenuLink label="CP & Tujuan" onClick={() => keLayar('cptp')} />
        {bisaPasang && (
          <MenuLink label="📲 Pasang Aplikasi" onClick={() => void picuPasang()} />
        )}
      </div>
    </main>
  );
}

function MenuLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-black/10 bg-white px-3 py-1.5 text-xs font-bold text-tinta transition hover:bg-kertas cursor-pointer"
    >
      {label}
    </button>
  );
}

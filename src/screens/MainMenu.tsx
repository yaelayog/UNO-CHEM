import { useMemo, useState } from 'react';
import { SEMUA_GOLONGAN, WARNA_GOLONGAN } from '../data/golongan';
import { GAYA_GOLONGAN } from '../lib/tampilan';
import { infoLevel } from '../lib/progres';
import { picuPasang } from '../lib/pwa';
import { onlineTersedia } from '../lib/supabase';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import { useGameStore } from '../store/gameStore';
import { useAkunStore } from '../akun/akunStore';
import { namaTampil } from '../akun/tipe';
import { LencanaPeringkat } from '../components/LencanaPeringkat';
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
    <main className="relative mx-auto flex min-h-full max-w-md flex-col items-center justify-center gap-5 overflow-hidden p-6 text-center no-select">
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

      <div className="w-full rounded-2xl border border-black/5 bg-white/70 px-3 py-2 backdrop-blur-sm">
        <LogoPanitia judul="Lomba Media Pembelajaran Digital FORKOM FKIP 2026" tinggi={26} />
      </div>

      <div className="relative flex flex-col items-center gap-1">
        <span
          className="inline-block text-5xl"
          style={{ animation: 'goyangLogo 3.2s ease-in-out infinite' }}
        >
          ⚗️
        </span>
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-lab">
          ChemUno
        </h1>
        <p className="text-sm font-bold text-tinta/60">
          Cocokkan golongan &amp; periode unsur — belajar kimia sambil bermain
        </p>
      </div>

      <button
        type="button"
        onClick={() => keLayar('akun')}
        className="flex w-full items-center justify-between rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-left text-sm font-extrabold shadow-empuk transition hover:bg-kertas cursor-pointer"
      >
        {murid ? (
          <>
            <span className="flex items-center gap-2 text-lab">
              {progresAkun && (
                <LencanaPeringkat
                  golongan={progresAkun.peringkatGolonganAktif}
                  ukuran="sm"
                />
              )}
              {namaTampil(murid)}
            </span>
            <span className="text-[11px] font-bold text-tinta/50">
              {murid.kelasNama ? `Kelas ${murid.kelasNama}` : 'Akun bebas'} →
            </span>
          </>
        ) : guruEmail ? (
          <>
            <span className="text-lab">Guru</span>
            <span className="max-w-[60%] truncate text-[11px] font-bold text-tinta/50">
              {guruEmail} →
            </span>
          </>
        ) : (
          <>
            <span className="text-tinta/70">Buat akun / Masuk</span>
            <span className="text-[11px] font-bold text-tinta/45">
              simpan progres &amp; ikut leaderboard →
            </span>
          </>
        )}
      </button>

      <button
        type="button"
        onClick={() => keLayar('profil')}
        className="w-full rounded-2xl border border-black/10 bg-white p-3 text-left shadow-empuk transition hover:bg-kertas cursor-pointer"
      >
        <div className="flex items-center justify-between text-xs font-extrabold text-lab-tinta">
          <span>Level {lvl.level}</span>
          <span className="text-tinta/50">
            {progres.badge.length} lencana · lihat pencapaian →
          </span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-black/10">
          <div
            className="h-full rounded-full bg-lab"
            style={{ width: `${Math.round(lvl.rasio * 100)}%` }}
          />
        </div>
      </button>

      <div className="flex gap-1.5">
        {SEMUA_GOLONGAN.map((g) => (
          <div
            key={g.key}
            className={`flex h-14 w-9 items-end justify-center rounded-lg p-1 text-center text-[7.2px] leading-tight font-extrabold shadow-empuk ${GAYA_GOLONGAN[g.key].fill}`}
          >
            {g.nomorGolongan}
          </div>
        ))}
      </div>

      <div className="w-full rounded-3xl border border-black/10 bg-white p-4 shadow-empuk">
        <p className="text-xs font-bold text-tinta/60">
          Jumlah lawan bot <span className="text-tinta/40">(maks. 1 meja = 7 pemain)</span>
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setJumlahBot(n)}
              className={`h-9 w-9 rounded-xl font-display font-extrabold transition cursor-pointer
                ${jumlahBot === n ? 'bg-lab text-white' : 'bg-kertas text-tinta hover:bg-black/5'}`}
            >
              {n}
            </button>
          ))}
        </div>
        <label className="mt-3 flex cursor-pointer items-center justify-between rounded-xl bg-kertas px-3 py-2 text-xs font-bold text-tinta">
          <span>
            Kartu Peristiwa Kimia <span className="text-tinta/40">(opsional)</span>
            <span className="block text-[10px] font-normal text-tinta/50">
              Kejutan reaksi tiap beberapa giliran — default: nonaktif
            </span>
          </span>
          <input
            type="checkbox"
            checked={pakaiPeristiwa}
            onChange={(e) => setPakaiPeristiwa(e.target.checked)}
            className="h-5 w-5 accent-lab"
          />
        </label>
        <button
          type="button"
          onClick={() => mulaiGame(jumlahBot, undefined, pakaiPeristiwa)}
          className="mt-4 w-full rounded-2xl bg-lab px-4 py-3 font-display text-lg font-extrabold text-white shadow-empuk transition hover:brightness-110 cursor-pointer"
        >
          Mulai Main (vs Bot)
        </button>
        <button
          type="button"
          disabled={!onlineTersedia}
          onClick={() => keLayar('online')}
          className="mt-2 w-full rounded-2xl border-2 border-lab bg-white px-4 py-2.5 font-display font-extrabold text-lab shadow-empuk transition hover:bg-lab/5 disabled:opacity-40 cursor-pointer"
        >
          🌐 Main Online (kode room)
        </button>
        {!onlineTersedia && (
          <p className="mt-1 text-[10px] font-normal text-tinta/45">
            Mode online belum dikonfigurasi (lihat docs/ONLINE.md)
          </p>
        )}
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        <MenuLink label="Leaderboard" onClick={() => keLayar('leaderboard')} />
        <MenuLink label="Mode Belajar" onClick={() => keLayar('belajar')} />
        <MenuLink label="Cara Main" onClick={() => keLayar('aturan')} />
        <MenuLink label="Tentang" onClick={() => keLayar('tentang')} />
      </div>

      {bisaPasang && (
        <button
          type="button"
          onClick={() => void picuPasang()}
          className="rounded-2xl bg-lab-tinta px-4 py-2 text-sm font-extrabold text-white shadow-empuk transition hover:brightness-110 cursor-pointer"
        >
          📲 Pasang Aplikasi
        </button>
      )}
    </main>
  );
}

function MenuLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border-2 border-black/10 bg-white px-4 py-2 text-sm font-bold text-tinta transition hover:bg-kertas cursor-pointer"
    >
      {label}
    </button>
  );
}

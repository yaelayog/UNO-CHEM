import { useState } from 'react';
import { SEMUA_BADGE } from '../data/badge';
import { infoLevel, resetProgres } from '../lib/progres';
import { useGameStore } from '../store/gameStore';

export function ProfilScreen() {
  const keLayar = useGameStore((s) => s.keLayar);
  const progres = useGameStore((s) => s.progres);
  const segarkanProgres = useGameStore((s) => s.segarkanProgres);
  const [konfirmReset, setKonfirmReset] = useState(false);

  const lvl = infoLevel(progres.xp);
  const akurasi =
    progres.kuisTotal > 0
      ? Math.round((progres.kuisBenar / progres.kuisTotal) * 100)
      : 0;
  const terbuka = new Set(progres.badge);

  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col gap-4 p-5 no-select">
      <button
        type="button"
        onClick={() => keLayar('menu')}
        className="w-fit rounded-full bg-white px-3 py-1 text-xs font-bold text-tinta/70 shadow-empuk cursor-pointer hover:bg-kertas"
      >
        ← Menu
      </button>

      <h1 className="font-display text-2xl font-extrabold text-lab">Pencapaian</h1>

      <section className="rounded-3xl border border-black/10 bg-white p-4 shadow-empuk">
        <div className="flex items-baseline justify-between">
          <span className="font-display text-3xl font-extrabold text-lab">
            Level {lvl.level}
          </span>
          <span className="text-xs font-bold text-tinta/50">
            {progres.xp} XP total
          </span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-black/10">
          <div
            className="h-full rounded-full bg-lab"
            style={{ width: `${Math.round(lvl.rasio * 100)}%` }}
          />
        </div>
        <p className="mt-1 text-[11px] font-bold text-tinta/50">
          {lvl.xpDiLevel}/{lvl.xpButuh} XP menuju level {lvl.level + 1}
        </p>
      </section>

      <section className="grid grid-cols-2 gap-2">
        <Stat label="Main" nilai={progres.gameDimainkan} />
        <Stat label="Menang" nilai={progres.gameDimenangkan} />
        <Stat label="Kuis benar" nilai={`${progres.kuisBenar}/${progres.kuisTotal}`} />
        <Stat label="Akurasi" nilai={`${akurasi}%`} />
        <Stat label="Streak terbaik" nilai={progres.streakTerbaik} />
        <Stat label="Menang sempurna" nilai={progres.gameSempurna} />
      </section>

      <section>
        <h2 className="mb-2 font-display text-lg font-extrabold text-tinta">
          Lencana ({terbuka.size}/{SEMUA_BADGE.length})
        </h2>
        <div className="grid grid-cols-1 gap-2">
          {SEMUA_BADGE.map((b) => {
            const ada = terbuka.has(b.id);
            return (
              <div
                key={b.id}
                className={`flex items-center gap-3 rounded-2xl border p-3 shadow-empuk ${
                  ada
                    ? 'border-black/10 bg-white'
                    : 'border-transparent bg-black/5 opacity-60'
                }`}
              >
                <span className={`text-2xl ${ada ? '' : 'grayscale'}`}>
                  {ada ? b.ikon : '🔒'}
                </span>
                <div>
                  <p className="text-sm font-extrabold text-tinta">{b.nama}</p>
                  <p className="text-xs text-tinta/60">{b.deskripsi}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="pt-2">
        {konfirmReset ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                resetProgres();
                segarkanProgres();
                setKonfirmReset(false);
              }}
              className="flex-1 rounded-2xl bg-alkali px-4 py-2 text-sm font-extrabold text-white cursor-pointer"
            >
              Ya, hapus semua
            </button>
            <button
              type="button"
              onClick={() => setKonfirmReset(false)}
              className="flex-1 rounded-2xl border-2 border-black/10 px-4 py-2 text-sm font-bold text-tinta cursor-pointer"
            >
              Batal
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setKonfirmReset(true)}
            className="text-xs font-bold text-tinta/40 underline cursor-pointer"
          >
            Reset progres
          </button>
        )}
      </div>
    </main>
  );
}

function Stat({ label, nilai }: { label: string; nilai: number | string }) {
  return (
    <div className="rounded-2xl bg-white p-3 text-center shadow-empuk">
      <div className="font-display text-xl font-extrabold text-tinta">{nilai}</div>
      <div className="text-[11px] font-bold text-tinta/60">{label}</div>
    </div>
  );
}

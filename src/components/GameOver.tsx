import type { GameState } from '../game';
import type { StatistikKuis } from '../store/gameStore';
import { SEMUA_BADGE } from '../data/badge';
import { infoLevel, type HasilRekam } from '../lib/progres';

interface Props {
  state: GameState;
  humanId: string;
  statistik: StatistikKuis;
  rekam: HasilRekam | null;
  onMainLagi: () => void;
  onMenu: () => void;
}

export function GameOver({
  state,
  humanId,
  statistik,
  rekam,
  onMainLagi,
  onMenu,
}: Props) {
  const pemenang = state.pemain.find((p) => p.id === state.pemenangId);
  const menang = state.pemenangId === humanId;
  const akurasi =
    statistik.total > 0
      ? Math.round((statistik.benar / statistik.total) * 100)
      : 0;

  const level = rekam ? infoLevel(rekam.progres.xp) : null;
  const naikLevel = rekam ? rekam.levelSesudah > rekam.levelSebelum : false;
  const badgeBaru = rekam
    ? SEMUA_BADGE.filter((b) => rekam.badgeBaru.includes(b.id))
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="animasi-pop w-full max-w-sm rounded-3xl border border-black/10 bg-white p-6 text-center shadow-empuk">
        <div className="text-5xl">{menang ? '🏆' : '🧪'}</div>
        <h2 className="mt-2 font-display text-2xl font-extrabold text-tinta">
          {menang ? 'Kamu Menang!' : `${pemenang?.nama} Menang`}
        </h2>

        <div className="mt-4 grid grid-cols-3 gap-2 text-tinta">
          <Stat label="Kuis benar" nilai={`${statistik.benar}/${statistik.total}`} />
          <Stat label="Akurasi" nilai={`${akurasi}%`} />
          <Stat label="Streak" nilai={String(statistik.streakTerbaik)} />
        </div>

        {rekam && level && (
          <div className="mt-4 rounded-2xl bg-lab/10 p-3 text-left">
            <div className="flex items-center justify-between text-sm font-extrabold text-lab-tinta">
              <span>+{rekam.xpDidapat} XP</span>
              <span>{naikLevel ? `Naik ke Level ${rekam.levelSesudah}! 🎉` : `Level ${level.level}`}</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-black/10">
              <div
                className="h-full rounded-full bg-lab transition-[width] duration-500"
                style={{ width: `${Math.round(level.rasio * 100)}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] font-bold text-tinta/50">
              {level.xpDiLevel}/{level.xpButuh} XP menuju level {level.level + 1}
            </p>
          </div>
        )}

        {badgeBaru.length > 0 && (
          <div className="mt-3 rounded-2xl bg-halogen-050 p-3">
            <p className="text-xs font-extrabold uppercase tracking-wide text-halogen-700">
              Lencana baru!
            </p>
            <div className="mt-1.5 flex flex-wrap justify-center gap-2">
              {badgeBaru.map((b) => (
                <span
                  key={b.id}
                  className="flex items-center gap-1 rounded-full bg-white px-2 py-1 text-xs font-bold text-tinta shadow-empuk"
                  title={b.deskripsi}
                >
                  <span>{b.ikon}</span>
                  {b.nama}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={onMainLagi}
            className="rounded-2xl bg-lab px-4 py-3 font-display font-extrabold text-white shadow-empuk transition hover:brightness-110 cursor-pointer"
          >
            Main Lagi
          </button>
          <button
            type="button"
            onClick={onMenu}
            className="rounded-2xl border-2 border-black/10 px-4 py-2.5 font-bold text-tinta transition hover:bg-kertas cursor-pointer"
          >
            Menu Utama
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, nilai }: { label: string; nilai: string }) {
  return (
    <div className="rounded-2xl bg-kertas p-2">
      <div className="font-display text-lg font-extrabold">{nilai}</div>
      <div className="text-[10px] font-bold text-tinta/60">{label}</div>
    </div>
  );
}

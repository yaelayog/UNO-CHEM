import { useEffect, useState } from 'react';
import type { GameState } from '../game';
import { useGameStore, type StatistikKuis } from '../store/gameStore';
import { SEMUA_BADGE } from '../data/badge';
import { infoLevel, type HasilRekam } from '../lib/progres';
import { getSupabase } from '../lib/supabase';
import { LencanaPeringkat } from './LencanaPeringkat';

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

        <RingkasanSesi state={state} humanId={humanId} />

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

/** Ringkasan peringkat sesi room (mode online) — urutan selesai + Peringkat Golongan. */
function RingkasanSesi({
  state,
  humanId,
}: {
  state: GameState;
  humanId: string;
}) {
  const mode = useGameStore((s) => s.mode);
  const [peringkat, setPeringkat] = useState<
    Record<string, { peringkat_aktif: number; total_poin: number }>
  >({});

  const urutan = [...state.pemain].sort((a, b) => {
    if (a.id === state.pemenangId) return -1;
    if (b.id === state.pemenangId) return 1;
    return a.tangan.length - b.tangan.length;
  });
  const uidManusia = state.pemain.filter((p) => !p.isBot).map((p) => p.id);

  useEffect(() => {
    if (mode !== 'online' || uidManusia.length === 0) return;
    let hidup = true;
    void (async () => {
      const sb = await getSupabase();
      if (!sb) return;
      const { data } = await sb.rpc('leaderboard_sesi', { p_uids: uidManusia });
      if (!hidup || !data) return;
      const map: Record<string, { peringkat_aktif: number; total_poin: number }> =
        {};
      for (const r of data as {
        auth_uid: string;
        peringkat_aktif: number;
        total_poin: number;
      }[]) {
        map[r.auth_uid] = {
          peringkat_aktif: r.peringkat_aktif,
          total_poin: r.total_poin,
        };
      }
      setPeringkat(map);
    })();
    return () => {
      hidup = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, uidManusia.join(',')]);

  if (mode !== 'online') return null;

  return (
    <div className="mt-4 rounded-2xl bg-kertas p-3 text-left">
      <p className="mb-2 text-xs font-extrabold text-tinta/60">Peringkat sesi</p>
      <ol className="flex flex-col gap-1">
        {urutan.map((p, i) => {
          const pr = peringkat[p.id];
          const aku = p.id === humanId;
          return (
            <li
              key={p.id}
              className={`flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm ${
                aku ? 'bg-lab/10 font-extrabold text-lab' : 'text-tinta'
              }`}
            >
              <span className="w-4 flex-none text-center text-xs text-tinta/40">
                {i + 1}
              </span>
              {pr ? (
                <LencanaPeringkat golongan={pr.peringkat_aktif} ukuran="sm" />
              ) : (
                <span className="h-8 w-8 flex-none rounded-xl bg-black/5" />
              )}
              <span className="min-w-0 flex-1 truncate">
                {p.isBot ? '🤖 ' : ''}
                {p.nama}
              </span>
              <span className="flex-none text-xs text-tinta/50">
                {p.id === state.pemenangId
                  ? '🏆 menang'
                  : `${p.tangan.length} kartu`}
              </span>
            </li>
          );
        })}
      </ol>
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

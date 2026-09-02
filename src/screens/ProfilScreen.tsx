import { useEffect, useState } from 'react';
import { SEMUA_BADGE } from '../data/badge';
import { MISI_BADGE } from '../data/misiBadge';
import { infoLevel, resetProgres } from '../lib/progres';
import { targetMisi } from '../game';
import { useGameStore } from '../store/gameStore';
import { useAkunStore } from '../akun/akunStore';
import { LencanaPeringkat, pitaPeringkat } from '../components/LencanaPeringkat';

export function ProfilScreen() {
  const keLayar = useGameStore((s) => s.keLayar);
  const progres = useGameStore((s) => s.progres);
  const segarkanProgres = useGameStore((s) => s.segarkanProgres);
  const murid = useAkunStore((s) => s.murid);
  const progresAkun = useAkunStore((s) => s.progresAkun);
  const misi = useAkunStore((s) => s.misi);
  const misiProgres = useAkunStore((s) => s.misiProgres);
  const segarkanAkun = useAkunStore((s) => s.segarkanAkun);
  const [konfirmReset, setKonfirmReset] = useState(false);

  useEffect(() => {
    if (murid) void segarkanAkun();
  }, [murid, segarkanAkun]);

  const lvl = infoLevel(progres.xp);
  const akurasi =
    progres.kuisTotal > 0
      ? Math.round((progres.kuisBenar / progres.kuisTotal) * 100)
      : 0;
  const terbukaLokal = new Set(progres.badge);
  const badgeAkun = new Set(progresAkun?.badgeDiraih ?? []);
  const prMap = new Map(misiProgres.map((m) => [m.misiId, m]));

  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col gap-4 p-5 no-select">
      <button
        type="button"
        onClick={() => keLayar('menu')}
        className="w-fit rounded-full bg-white px-3 py-1 text-xs font-bold text-tinta/70 shadow-empuk cursor-pointer hover:bg-kertas"
      >
        ← Menu
      </button>

      <h1 className="font-display text-2xl font-extrabold text-lab">
        {murid ? 'Profil' : 'Pencapaian'}
      </h1>

      {/* Peringkat Golongan (butuh akun) */}
      {murid && progresAkun && (
        <section className="flex items-center gap-3 rounded-3xl border border-black/10 bg-white p-4 shadow-empuk">
          <LencanaPeringkat golongan={progresAkun.peringkatGolonganAktif} ukuran="lg" />
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg font-extrabold text-lab">
              Peringkat Golongan {progresAkun.peringkatGolonganAktif}
            </p>
            <p className="text-[11px] font-bold text-tinta/55">
              {pitaPeringkat(progresAkun.peringkatGolonganAktif).nama} · rekor
              tertinggi G{progresAkun.peringkatGolonganRekor} ·{' '}
              {progresAkun.totalPoin} poin minggu ini
            </p>
          </div>
          <button
            type="button"
            onClick={() => keLayar('leaderboard')}
            className="flex-none rounded-xl bg-kertas px-2.5 py-1 text-[11px] font-extrabold text-lab cursor-pointer"
          >
            Papan →
          </button>
        </section>
      )}

      {/* Level (riwayat belajar, permanen) */}
      <section className="rounded-3xl border border-black/10 bg-white p-4 shadow-empuk">
        <div className="flex items-baseline justify-between">
          <span className="font-display text-2xl font-extrabold text-tinta">
            Level {lvl.level}
          </span>
          <span className="text-xs font-bold text-tinta/50">
            {progres.xp} XP · riwayat belajar
          </span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-black/10">
          <div
            className="h-full rounded-full bg-lab"
            style={{ width: `${Math.round(lvl.rasio * 100)}%` }}
          />
        </div>
      </section>

      <section className="grid grid-cols-3 gap-2">
        <Stat label="Main" nilai={progres.gameDimainkan} />
        <Stat label="Menang" nilai={progres.gameDimenangkan} />
        <Stat label="Akurasi" nilai={`${akurasi}%`} />
      </section>

      {/* Misi (butuh akun) */}
      {murid && misi.length > 0 && (
        <section>
          <h2 className="mb-2 font-display text-lg font-extrabold text-tinta">
            Misi ({misiProgres.filter((m) => m.selesai).length}/{misi.length})
          </h2>
          <div className="flex flex-col gap-2">
            {misi.map((m) => {
              const p = prMap.get(m.id);
              const target = targetMisi(m);
              const nilai = p?.progres ?? 0;
              const selesai = p?.selesai ?? false;
              return (
                <div
                  key={m.id}
                  className={`rounded-2xl border p-3 shadow-empuk ${
                    selesai
                      ? 'border-lab/30 bg-lab/5'
                      : 'border-black/10 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-extrabold text-tinta">
                      {selesai ? '✅ ' : ''}
                      {m.judul}
                    </p>
                    <span className="flex-none text-[11px] font-bold text-lab">
                      +{m.poinReward}
                    </span>
                  </div>
                  <p className="text-[11px] text-tinta/55">{m.deskripsi}</p>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-black/10">
                    <div
                      className="h-full rounded-full bg-lab"
                      style={{
                        width: `${Math.min(100, Math.round((nilai / target) * 100))}%`,
                      }}
                    />
                  </div>
                  <p className="mt-0.5 text-right text-[10px] font-bold text-tinta/45">
                    {Math.min(nilai, target)}/{target}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Lencana — 2 seksi */}
      <section>
        <h2 className="mb-2 font-display text-lg font-extrabold text-tinta">
          Lencana Pencapaian ({terbukaLokal.size}/{SEMUA_BADGE.length})
        </h2>
        <div className="grid grid-cols-1 gap-2">
          {SEMUA_BADGE.map((b) => (
            <BarisBadge
              key={b.id}
              ikon={b.ikon}
              nama={b.nama}
              deskripsi={b.deskripsi}
              ada={terbukaLokal.has(b.id)}
            />
          ))}
        </div>
      </section>

      {murid && (
        <section>
          <h2 className="mb-2 font-display text-lg font-extrabold text-tinta">
            Lencana Misi (
            {MISI_BADGE.filter((b) => badgeAkun.has(b.id)).length}/{MISI_BADGE.length})
          </h2>
          <div className="grid grid-cols-1 gap-2">
            {MISI_BADGE.map((b) => (
              <BarisBadge
                key={b.id}
                ikon={b.ikon}
                nama={b.nama}
                deskripsi="Reward misi"
                ada={badgeAkun.has(b.id)}
              />
            ))}
          </div>
        </section>
      )}

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
            Reset progres lokal (XP &amp; lencana device)
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

function BarisBadge({
  ikon,
  nama,
  deskripsi,
  ada,
}: {
  ikon: string;
  nama: string;
  deskripsi: string;
  ada: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border p-3 shadow-empuk ${
        ada ? 'border-black/10 bg-white' : 'border-transparent bg-black/5 opacity-60'
      }`}
    >
      <span className={`text-2xl ${ada ? '' : 'grayscale'}`}>{ada ? ikon : '🔒'}</span>
      <div>
        <p className="text-sm font-extrabold text-tinta">{nama}</p>
        <p className="text-xs text-tinta/60">{deskripsi}</p>
      </div>
    </div>
  );
}

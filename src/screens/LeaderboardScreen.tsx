import { useCallback, useEffect, useState } from 'react';
import { getSupabase, onlineTersedia } from '../lib/supabase';
import { useAkunStore } from '../akun/akunStore';
import { useGameStore } from '../store/gameStore';
import { LencanaPeringkat, pitaPeringkat } from '../components/LencanaPeringkat';

interface BarisLB {
  nama: string;
  kode_unik: string;
  peringkat_aktif: number;
  peringkat_rekor: number;
  total_poin: number;
}

type Tab = 'kelas' | 'global';

export function LeaderboardScreen() {
  const keLayar = useGameStore((s) => s.keLayar);
  const murid = useAkunStore((s) => s.murid);

  const [tab, setTab] = useState<Tab>(murid?.kelasId ? 'kelas' : 'global');
  const [baris, setBaris] = useState<BarisLB[]>([]);
  const [memuat, setMemuat] = useState(false);
  const [pesan, setPesan] = useState('');

  const muat = useCallback(async () => {
    setMemuat(true);
    setPesan('');
    setBaris([]);
    const sb = await getSupabase();
    if (!sb) {
      setMemuat(false);
      return setPesan('Mode online belum dikonfigurasi.');
    }
    const { data, error } =
      tab === 'kelas' && murid?.kelasId
        ? await sb.rpc('leaderboard_kelas', { p_kelas_id: murid.kelasId })
        : await sb.rpc('leaderboard_global', { p_limit: 100 });
    setMemuat(false);
    if (error) return setPesan(error.message);
    setBaris((data as BarisLB[] | null) ?? []);
  }, [tab, murid?.kelasId]);

  useEffect(() => {
    void muat();
  }, [muat]);

  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col gap-4 p-5 no-select">
      <button
        type="button"
        onClick={() => keLayar('menu')}
        className="w-fit rounded-full bg-white px-3 py-1 text-xs font-bold text-tinta/70 shadow-empuk cursor-pointer hover:bg-kertas"
      >
        ← Menu
      </button>
      <h1 className="font-display text-2xl font-extrabold text-lab">Leaderboard</h1>
      <p className="-mt-2 text-[11px] text-tinta/45">
        Peringkat Golongan 1–18 · reset tiap minggu (turun 3, lantai 3)
      </p>

      {!onlineTersedia ? (
        <p className="text-sm text-tinta/70">Mode online belum dikonfigurasi.</p>
      ) : (
        <>
          <div className="flex gap-1 rounded-2xl bg-kertas p-1">
            {(['kelas', 'global'] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                disabled={t === 'kelas' && !murid?.kelasId}
                onClick={() => setTab(t)}
                className={`flex-1 rounded-xl px-3 py-2 text-sm font-extrabold capitalize transition disabled:opacity-30 cursor-pointer ${
                  tab === t ? 'bg-white text-lab shadow-empuk' : 'text-tinta/60'
                }`}
              >
                {t === 'kelas'
                  ? murid?.kelasNama
                    ? `Kelas ${murid.kelasNama}`
                    : 'Kelas'
                  : 'Global'}
              </button>
            ))}
          </div>

          {memuat && <p className="text-center text-xs text-tinta/50">Memuat…</p>}
          {pesan && (
            <p className="text-center text-xs font-bold text-alkali">{pesan}</p>
          )}
          {!memuat && !pesan && baris.length === 0 && (
            <p className="text-center text-xs text-tinta/50">
              Belum ada data. Main dulu untuk kumpulkan poin!
            </p>
          )}

          <ol className="flex flex-col gap-1.5">
            {baris.map((b, i) => {
              const sayaSendiri = murid?.kodeUnik === b.kode_unik;
              return (
                <li
                  key={`${b.kode_unik}-${i}`}
                  className={`flex items-center gap-3 rounded-2xl px-3 py-2 shadow-empuk ${
                    sayaSendiri ? 'bg-lab/10 ring-1 ring-lab' : 'bg-white'
                  }`}
                >
                  <span className="w-5 flex-none text-center text-xs font-bold text-tinta/40">
                    {i + 1}
                  </span>
                  <LencanaPeringkat golongan={b.peringkat_aktif} ukuran="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-tinta">
                      {b.nama}
                      <span className="text-[11px] font-normal text-tinta/40">
                        {' '}
                        #{b.kode_unik}
                      </span>
                    </span>
                    <span className="text-[10px] text-tinta/45">
                      {pitaPeringkat(b.peringkat_aktif).nama} · rekor G
                      {b.peringkat_rekor}
                    </span>
                  </span>
                  <span className="flex-none text-right text-xs font-extrabold text-lab">
                    {b.total_poin}
                    <span className="block text-[9px] font-normal text-tinta/40">
                      poin/mgg
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </main>
  );
}

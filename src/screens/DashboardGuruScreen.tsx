import { useCallback, useEffect, useState } from 'react';
import { getSupabase } from '../lib/supabase';
import { SEMUA_GOLONGAN } from '../data/golongan';
import { CPTP } from '../data/cptp';
import { BANK_SOAL } from '../data/kuis';
import type { Golongan } from '../data/types';
import { GAYA_GOLONGAN } from '../lib/tampilan';
import { useGameStore } from '../store/gameStore';
import { LencanaPeringkat } from '../components/LencanaPeringkat';

/** Buang penanda **tebal** dari teks TP untuk dipakai di atribut `title`. */
const polos = (teks: string) => teks.replace(/\*\*/g, '');

/**
 * Pecahan (0–1) soal per golongan yang menguji tiap TP — dihitung dari
 * `BANK_SOAL` (soal boleh menguji >1 TP, jadi total per golongan bisa >1
 * sebelum dinormalisasi). Dipakai HANYA untuk mengestimasi progres TP murid
 * lama (yang datanya masih berupa agregat per golongan, direkam sebelum
 * pelacakan per-TP ada) — bukan angka riil dari `riwayat_akurasi`.
 */
const BOBOT_TP_PER_GOLONGAN: Partial<Record<Golongan, Record<number, number>>> = (() => {
  const hitung: Partial<Record<Golongan, Record<number, number>>> = {};
  for (const soal of BANK_SOAL) {
    if (soal.golonganTerkait === 'umum') continue;
    const g = soal.golonganTerkait;
    const peta = (hitung[g] ??= {});
    for (const tp of soal.tpTerkait) peta[tp] = (peta[tp] ?? 0) + 1;
  }
  for (const peta of Object.values(hitung)) {
    const total = Object.values(peta).reduce((a, b) => a + b, 0);
    for (const tp of Object.keys(peta)) peta[+tp] /= total;
  }
  return hitung;
})();

/**
 * Estimasi akurasi TP murid lama dari riwayat per-golongan (proporsional
 * menurut `BOBOT_TP_PER_GOLONGAN`). Dipakai sebagai fallback saat murid
 * belum punya `tp{n}` asli (belum pernah menjawab soal sejak pelacakan
 * per-TP aktif) — TAPI ini cuma perkiraan kasar, BUKAN bukti soal yang
 * benar-benar menguji TP tersebut.
 */
function estimasiTp(
  riwayat: Record<string, { benar: number; total: number }> | undefined,
  tpNo: number,
): number | null {
  let benar = 0;
  let total = 0;
  for (const g of SEMUA_GOLONGAN) {
    const bobot = BOBOT_TP_PER_GOLONGAN[g.key]?.[tpNo];
    const a = riwayat?.[g.key];
    if (!bobot || !a || a.total === 0) continue;
    benar += a.benar * bobot;
    total += a.total * bobot;
  }
  return total >= 1 ? Math.round((benar / total) * 100) : null;
}

interface KelasRow {
  id: string;
  nama_kelas: string;
  kode_kelas: string;
}
interface MuridRow {
  murid_id: string;
  nama: string;
  kode_unik: string;
  peringkat_aktif: number;
  peringkat_rekor: number;
  total_poin: number;
  riwayat_akurasi: Record<string, { benar: number; total: number }>;
  misi_selesai: number;
}

export function DashboardGuruScreen() {
  const keLayar = useGameStore((s) => s.keLayar);
  const [kelas, setKelas] = useState<KelasRow[]>([]);
  const [pilih, setPilih] = useState<string>('');
  const [murid, setMurid] = useState<MuridRow[]>([]);
  const [memuat, setMemuat] = useState(false);
  const [pesan, setPesan] = useState('');

  useEffect(() => {
    void (async () => {
      const sb = await getSupabase();
      if (!sb) return setPesan('Mode online belum dikonfigurasi.');
      const { data } = await sb
        .from('kelas')
        .select('id, nama_kelas, kode_kelas')
        .order('dibuat_pada', { ascending: true });
      const rows = (data as KelasRow[] | null) ?? [];
      setKelas(rows);
      if (rows[0]) setPilih(rows[0].id);
      if (rows.length === 0) setPesan('Belum ada kelas. Buat kelas dulu di menu Akun.');
    })();
  }, []);

  const muatMurid = useCallback(async () => {
    if (!pilih) return;
    setMemuat(true);
    setPesan('');
    const sb = await getSupabase();
    if (!sb) return setMemuat(false);
    const { data, error } = await sb.rpc('murid_kelas', { p_kelas_id: pilih });
    setMemuat(false);
    if (error) return setPesan(error.message);
    setMurid((data as MuridRow[] | null) ?? []);
  }, [pilih]);

  useEffect(() => {
    void muatMurid();
  }, [muatMurid]);

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
        Progres Murid
      </h1>

      {kelas.length > 0 && (
        <select
          value={pilih}
          onChange={(e) => setPilih(e.target.value)}
          className="w-full rounded-2xl border border-black/10 bg-white px-4 py-2.5 text-sm font-bold text-tinta shadow-empuk outline-none focus:border-lab"
        >
          {kelas.map((k) => (
            <option key={k.id} value={k.id}>
              {k.nama_kelas} ({k.kode_kelas})
            </option>
          ))}
        </select>
      )}

      {memuat && <p className="text-center text-xs text-tinta/50">Memuat…</p>}
      {pesan && (
        <p className="text-center text-xs font-bold text-alkali">{pesan}</p>
      )}
      {!memuat && !pesan && murid.length === 0 && (
        <p className="text-center text-xs text-tinta/50">
          Belum ada murid yang gabung kelas ini.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {murid.map((m, i) => (
          <div
            key={m.murid_id}
            className="rounded-2xl border border-black/10 bg-white p-3 shadow-empuk"
          >
            <div className="flex items-center gap-3">
              <span className="w-4 flex-none text-center text-xs font-bold text-tinta/40">
                {i + 1}
              </span>
              <LencanaPeringkat golongan={m.peringkat_aktif} ukuran="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-extrabold text-tinta">
                  {m.nama}
                  <span className="text-[11px] font-normal text-tinta/40">
                    {' '}
                    #{m.kode_unik}
                  </span>
                </p>
                <p className="text-[10px] font-bold text-tinta/45">
                  rekor G{m.peringkat_rekor} · {m.total_poin} poin/mgg ·{' '}
                  {m.misi_selesai} misi
                </p>
              </div>
            </div>

            <p className="mt-2 text-[9px] font-bold uppercase tracking-wide text-tinta/35">
              Akurasi kuis per golongan
            </p>
            <div className="mt-1 grid grid-cols-5 gap-1">
              {SEMUA_GOLONGAN.map((g) => {
                const a = m.riwayat_akurasi?.[g.key];
                const pct =
                  a && a.total > 0
                    ? Math.round((a.benar / a.total) * 100)
                    : null;
                return (
                  <div
                    key={g.key}
                    className={`rounded-lg py-1 text-center text-[9px] font-extrabold ${GAYA_GOLONGAN[g.key].fill}`}
                    title={`${g.nama}: ${a ? `${a.benar}/${a.total}` : 'belum ada'}`}
                  >
                    <div className="text-[10px] leading-none">
                      {pct === null ? '–' : `${pct}%`}
                    </div>
                    <div className="opacity-70">{g.nomorGolongan}</div>
                  </div>
                );
              })}
            </div>

            <p className="mt-2 text-[9px] font-bold uppercase tracking-wide text-tinta/35">
              Bukti capaian belajar (CP &amp; TP)
            </p>
            <div className="mt-1 grid grid-cols-4 gap-1">
              {CPTP.tujuan.map((t) => {
                const a = m.riwayat_akurasi?.[`tp${t.no}`];
                const pctAsli =
                  a && a.total > 0 ? Math.round((a.benar / a.total) * 100) : null;
                const estimasi = pctAsli === null ? estimasiTp(m.riwayat_akurasi, t.no) : null;
                const pct = pctAsli ?? estimasi;
                return (
                  <div
                    key={t.no}
                    className={`rounded-lg py-1 text-center text-[9px] font-extrabold text-lab ${
                      estimasi !== null ? 'border border-dashed border-lab/40 bg-lab/5' : 'bg-lab/12'
                    }`}
                    title={`TP${t.no} (${t.dimensiLabel}): ${polos(t.teks)} — ${
                      pctAsli !== null
                        ? `${a!.benar}/${a!.total} benar`
                        : estimasi !== null
                          ? 'estimasi kasar dari riwayat golongan lama (sebelum pelacakan per-TP), bukan soal yang benar-benar menguji TP ini'
                          : 'belum ada bukti'
                    }`}
                  >
                    <div className="text-[10px] leading-none">
                      {pct === null ? '–' : estimasi !== null ? `~${pct}%` : `${pct}%`}
                    </div>
                    <div className="opacity-70">TP{t.no}</div>
                  </div>
                );
              })}
            </div>
            <p className="mt-1 text-[9px] italic text-tinta/35">
              ~% = estimasi dari riwayat lama (sebelum pelacakan per-TP aktif), bukan hasil soal yang menguji TP itu langsung.
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}

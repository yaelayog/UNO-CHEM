import { useEffect, useState } from 'react';
import { getSupabase, onlineTersedia } from '../lib/supabase';
import { useAkunStore } from '../akun/akunStore';
import { namaTampil, type PilihanAkun } from '../akun/tipe';
import { useGameStore } from '../store/gameStore';

type Tab = 'murid' | 'guru';

export function AkunScreen() {
  const keLayar = useGameStore((s) => s.keLayar);
  const [tab, setTab] = useState<Tab>('murid');

  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col gap-4 p-5 no-select">
      <button
        type="button"
        onClick={() => keLayar('menu')}
        className="w-fit rounded-full bg-white px-3 py-1 text-xs font-bold text-tinta/70 shadow-empuk cursor-pointer hover:bg-kertas"
      >
        ← Menu
      </button>
      <h1 className="font-display text-2xl font-extrabold text-lab">Akun</h1>

      {!onlineTersedia ? (
        <p className="text-sm text-tinta/70">
          Fitur akun butuh koneksi Supabase. Isi <code>VITE_SUPABASE_URL</code>{' '}
          &amp; <code>VITE_SUPABASE_ANON_KEY</code> di <code>.env</code>. Panduan:{' '}
          <code>docs/ONLINE.md</code>.
        </p>
      ) : (
        <>
          <div className="flex gap-1 rounded-2xl bg-kertas p-1">
            {(['murid', 'guru'] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`flex-1 rounded-xl px-3 py-2 text-sm font-extrabold capitalize transition cursor-pointer ${
                  tab === t ? 'bg-white text-lab shadow-empuk' : 'text-tinta/60'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          {tab === 'murid' ? <PanelMurid /> : <PanelGuru />}
        </>
      )}
    </main>
  );
}

// ── Murid ────────────────────────────────────────────────────────────
function PanelMurid() {
  const murid = useAkunStore((s) => s.murid);
  const progresAkun = useAkunStore((s) => s.progresAkun);
  const sibuk = useAkunStore((s) => s.sibuk);
  const daftarMurid = useAkunStore((s) => s.daftarMurid);
  const masukMurid = useAkunStore((s) => s.masukMurid);
  const keluarMurid = useAkunStore((s) => s.keluarMurid);
  const gabungKelas = useAkunStore((s) => s.gabungKelas);

  const [mode, setMode] = useState<'daftar' | 'masuk'>('daftar');
  const [nama, setNama] = useState('');
  const [pin, setPin] = useState('');
  const [kodeKelas, setKodeKelas] = useState('');
  const [pesan, setPesan] = useState('');
  const [pilihan, setPilihan] = useState<PilihanAkun[] | null>(null);
  const [kodeGabung, setKodeGabung] = useState('');

  const pinValid = /^\d{4}$/.test(pin);

  if (murid) {
    return (
      <div className="flex flex-col gap-3">
        <div className="rounded-2xl bg-white p-4 text-center shadow-empuk">
          <p className="font-display text-2xl font-black text-lab">
            {namaTampil(murid)}
          </p>
          <p className="mt-1 text-xs font-bold text-tinta/55">
            {murid.kelasNama ? `Kelas ${murid.kelasNama}` : 'Akun bebas (tanpa kelas)'}
          </p>
        </div>

        {progresAkun && (
          <div className="grid grid-cols-3 gap-2 text-center">
            <Kotak label="Peringkat Gol." nilai={progresAkun.peringkatGolonganAktif} />
            <Kotak label="Rekor" nilai={progresAkun.peringkatGolonganRekor} />
            <Kotak label="Poin" nilai={progresAkun.totalPoin} />
          </div>
        )}

        {!murid.kelasId && (
          <div className="rounded-2xl bg-white p-3 shadow-empuk">
            <p className="text-xs font-bold text-tinta/60">Gabung ke kelas</p>
            <div className="mt-2 flex gap-2">
              <input
                value={kodeGabung}
                onChange={(e) =>
                  setKodeGabung(e.target.value.toUpperCase().slice(0, 8))
                }
                placeholder="KODE KELAS"
                className="min-w-0 flex-1 rounded-xl border border-black/10 bg-kertas px-3 py-2 text-center font-display font-black tracking-widest text-lab outline-none focus:border-lab"
              />
              <button
                type="button"
                disabled={sibuk || kodeGabung.length < 4}
                onClick={async () => {
                  const err = await gabungKelas(kodeGabung);
                  setPesan(err ?? 'Berhasil gabung kelas');
                  if (!err) setKodeGabung('');
                }}
                className="rounded-xl bg-lab px-4 py-2 text-sm font-extrabold text-white shadow-empuk disabled:opacity-40 cursor-pointer"
              >
                Gabung
              </button>
            </div>
          </div>
        )}

        {pesan && <p className="text-center text-xs font-bold text-tinta/60">{pesan}</p>}

        <button
          type="button"
          onClick={() => void keluarMurid()}
          className="mt-1 w-full rounded-2xl border-2 border-black/10 bg-white px-4 py-2 text-sm font-bold text-tinta hover:bg-kertas cursor-pointer"
        >
          Keluar akun
        </button>
      </div>
    );
  }

  // Beberapa akun cocok Nama+PIN → pilih kode unik.
  if (pilihan) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm font-bold text-tinta/70">
          Ada beberapa akun dengan nama &amp; PIN itu. Pilih akunmu:
        </p>
        {pilihan.map((p) => (
          <button
            key={p.kodeUnik}
            type="button"
            onClick={async () => {
              const r = await masukMurid(nama, pin, p.kodeUnik);
              if (r.error) setPesan(r.error);
              else setPilihan(null);
            }}
            className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-left shadow-empuk hover:bg-kertas cursor-pointer"
          >
            <span className="font-display font-extrabold text-lab">
              {nama}#{p.kodeUnik}
            </span>
            <span className="text-xs font-bold text-tinta/55">
              {p.kelasNama ?? 'akun bebas'}
            </span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => setPilihan(null)}
          className="mt-1 text-xs font-bold text-tinta/50 underline cursor-pointer"
        >
          batal
        </button>
        {pesan && <p className="text-center text-xs font-bold text-alkali">{pesan}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1 rounded-2xl bg-kertas p-1 text-sm font-extrabold">
        <button
          type="button"
          onClick={() => setMode('daftar')}
          className={`flex-1 rounded-xl py-2 cursor-pointer ${mode === 'daftar' ? 'bg-white text-lab shadow-empuk' : 'text-tinta/60'}`}
        >
          Buat akun
        </button>
        <button
          type="button"
          onClick={() => setMode('masuk')}
          className={`flex-1 rounded-xl py-2 cursor-pointer ${mode === 'masuk' ? 'bg-white text-lab shadow-empuk' : 'text-tinta/60'}`}
        >
          Masuk (device lain)
        </button>
      </div>

      <Field label="Nama panggilan">
        <input
          value={nama}
          onChange={(e) => setNama(e.target.value.slice(0, 24))}
          placeholder="mis. Budi"
          className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-bold text-tinta shadow-empuk outline-none focus:border-lab"
        />
      </Field>

      <Field label="PIN (4 angka)">
        <input
          value={pin}
          inputMode="numeric"
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
          placeholder="••••"
          className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-center font-display text-xl font-black tracking-[0.5em] text-lab shadow-empuk outline-none focus:border-lab"
        />
      </Field>

      {mode === 'daftar' && (
        <Field label="Kode kelas (opsional — kosongkan untuk akun bebas)">
          <input
            value={kodeKelas}
            onChange={(e) => setKodeKelas(e.target.value.toUpperCase().slice(0, 8))}
            placeholder="dari guru"
            className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-center font-display font-black tracking-widest text-lab shadow-empuk outline-none focus:border-lab"
          />
        </Field>
      )}

      <button
        type="button"
        disabled={sibuk || !nama.trim() || !pinValid}
        onClick={async () => {
          setPesan('');
          if (mode === 'daftar') {
            const err = await daftarMurid(nama.trim(), pin, kodeKelas.trim());
            if (err) setPesan(err);
          } else {
            const r = await masukMurid(nama.trim(), pin);
            if (r.pilihan) setPilihan(r.pilihan);
            else if (r.error) setPesan(r.error);
          }
        }}
        className="mt-1 w-full rounded-2xl bg-lab px-4 py-3 font-display text-lg font-extrabold text-white shadow-empuk transition hover:brightness-110 disabled:opacity-40 cursor-pointer"
      >
        {mode === 'daftar' ? 'Buat Akun' : 'Masuk'}
      </button>

      <p className="text-[11px] leading-relaxed text-tinta/45">
        Progres (XP, lencana) di device ini otomatis pindah ke akun. Nama + PIN
        dipakai untuk masuk lagi di HP/komputer lain.
      </p>

      {pesan && <p className="text-center text-xs font-bold text-alkali">{pesan}</p>}
    </div>
  );
}

// ── Guru ─────────────────────────────────────────────────────────────
interface KelasRow {
  id: string;
  nama_kelas: string;
  kode_kelas: string;
}

function PanelGuru() {
  const keLayar = useGameStore((s) => s.keLayar);
  const guruEmail = useAkunStore((s) => s.guruEmail);
  const sibuk = useAkunStore((s) => s.sibuk);
  const masukGuru = useAkunStore((s) => s.masukGuru);
  const keluarGuru = useAkunStore((s) => s.keluarGuru);

  const [email, setEmail] = useState('');
  const [sandi, setSandi] = useState('');
  const [daftar, setDaftar] = useState(false);
  const [pesan, setPesan] = useState('');

  const [kelas, setKelas] = useState<KelasRow[]>([]);
  const [namaKelas, setNamaKelas] = useState('');

  async function muatKelas() {
    const sb = await getSupabase();
    if (!sb) return;
    const { data } = await sb
      .from('kelas')
      .select('id, nama_kelas, kode_kelas')
      .order('dibuat_pada', { ascending: true });
    setKelas((data as KelasRow[] | null) ?? []);
  }

  useEffect(() => {
    if (guruEmail) void muatKelas();
    else setKelas([]);
  }, [guruEmail]);

  async function buatKelas() {
    setPesan('');
    const sb = await getSupabase();
    if (!sb) return;
    const { data: u } = await sb.auth.getUser();
    if (!u.user) return setPesan('sesi guru hilang, masuk lagi');
    const { error } = await sb
      .from('kelas')
      .insert({ nama_kelas: namaKelas.trim(), guru_id: u.user.id });
    if (error) return setPesan(error.message);
    setNamaKelas('');
    void muatKelas();
  }

  if (guruEmail) {
    return (
      <div className="flex flex-col gap-3">
        <div className="rounded-2xl bg-white p-3 text-sm font-bold text-tinta shadow-empuk">
          Masuk sebagai <span className="text-lab">{guruEmail}</span>
        </div>

        <button
          type="button"
          onClick={() => keLayar('dashboard-guru')}
          className="w-full rounded-2xl bg-lab px-4 py-2.5 font-display font-extrabold text-white shadow-empuk transition hover:brightness-110 cursor-pointer"
        >
          📊 Lihat Progres Murid
        </button>

        <div className="rounded-2xl bg-white p-3 shadow-empuk">
          <p className="text-xs font-bold text-tinta/60">Buat kelas baru</p>
          <div className="mt-2 flex gap-2">
            <input
              value={namaKelas}
              onChange={(e) => setNamaKelas(e.target.value.slice(0, 60))}
              placeholder="mis. XII IPA 1"
              className="min-w-0 flex-1 rounded-xl border border-black/10 bg-kertas px-3 py-2 text-sm font-bold text-tinta outline-none focus:border-lab"
            />
            <button
              type="button"
              disabled={!namaKelas.trim()}
              onClick={() => void buatKelas()}
              className="rounded-xl bg-lab px-4 py-2 text-sm font-extrabold text-white shadow-empuk disabled:opacity-40 cursor-pointer"
            >
              Buat
            </button>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-3 shadow-empuk">
          <p className="mb-2 text-xs font-extrabold text-tinta/60">
            Kelas saya ({kelas.length})
          </p>
          {kelas.length === 0 ? (
            <p className="text-xs text-tinta/45">Belum ada kelas.</p>
          ) : (
            <ul className="space-y-1.5">
              {kelas.map((k) => (
                <li
                  key={k.id}
                  className="flex items-center justify-between rounded-xl bg-kertas px-3 py-2"
                >
                  <span className="text-sm font-bold text-tinta">{k.nama_kelas}</span>
                  <button
                    type="button"
                    onClick={() => void navigator.clipboard?.writeText(k.kode_kelas)}
                    title="Salin kode"
                    className="font-display text-lg font-black tracking-widest text-lab cursor-pointer"
                  >
                    {k.kode_kelas}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-[11px] text-tinta/45">
            Bagikan kode ke murid — mereka isi saat buat akun.
          </p>
        </div>

        {pesan && <p className="text-center text-xs font-bold text-alkali">{pesan}</p>}

        <button
          type="button"
          onClick={() => void keluarGuru()}
          className="w-full rounded-2xl border-2 border-black/10 bg-white px-4 py-2 text-sm font-bold text-tinta hover:bg-kertas cursor-pointer"
        >
          Keluar
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Field label="Email guru">
        <input
          value={email}
          type="email"
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-bold text-tinta shadow-empuk outline-none focus:border-lab"
        />
      </Field>
      <Field label="Password">
        <input
          value={sandi}
          type="password"
          onChange={(e) => setSandi(e.target.value)}
          className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-bold text-tinta shadow-empuk outline-none focus:border-lab"
        />
      </Field>
      <label className="flex items-center gap-2 text-xs font-bold text-tinta/60">
        <input
          type="checkbox"
          checked={daftar}
          onChange={(e) => setDaftar(e.target.checked)}
          className="h-4 w-4 accent-lab"
        />
        Buat akun guru baru
      </label>
      <button
        type="button"
        disabled={sibuk || !email.trim() || sandi.length < 6}
        onClick={async () => {
          setPesan('');
          const err = await masukGuru(email.trim(), sandi, daftar);
          if (err) setPesan(err);
        }}
        className="mt-1 w-full rounded-2xl bg-lab px-4 py-3 font-display text-lg font-extrabold text-white shadow-empuk transition hover:brightness-110 disabled:opacity-40 cursor-pointer"
      >
        {daftar ? 'Daftar' : 'Masuk'}
      </button>
      {pesan && <p className="text-center text-xs font-bold text-alkali">{pesan}</p>}
    </div>
  );
}

// ── kecil ────────────────────────────────────────────────────────────
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold text-tinta/60">{label}</span>
      {children}
    </label>
  );
}

function Kotak({ label, nilai }: { label: string; nilai: number }) {
  return (
    <div className="rounded-xl bg-white p-2 shadow-empuk">
      <div className="font-display text-xl font-black text-lab">{nilai}</div>
      <div className="text-[10px] font-bold text-tinta/50">{label}</div>
    </div>
  );
}

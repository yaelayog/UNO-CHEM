import { useEffect, useState } from 'react';
import { onlineTersedia, sesiSiap } from '../lib/supabase';
import { kirimAksi } from '../online/klienOnline';
import { useGameStore } from '../store/gameStore';

export function OnlineLobby() {
  const keLayar = useGameStore((s) => s.keLayar);
  const online = useGameStore((s) => s.online);
  const dataOnline = useGameStore((s) => s.dataOnline);
  const masukLobbyOnline = useGameStore((s) => s.masukLobbyOnline);
  const keluarOnline = useGameStore((s) => s.keluarOnline);

  const [uid, setUid] = useState<string | null>(null);
  const [nama, setNama] = useState('');
  const [kode, setKode] = useState('');
  const [target, setTarget] = useState(4);
  const [pakaiPeristiwa, setPakaiPeristiwa] = useState(false);
  const [sibuk, setSibuk] = useState(false);
  const [pesan, setPesan] = useState('');

  useEffect(() => {
    void sesiSiap().then(setUid);
  }, []);

  async function buat() {
    if (!nama.trim() || sibuk) return;
    setSibuk(true);
    setPesan('');
    const r = await kirimAksi('buatRoom', {
      nama: nama.trim(),
      targetPemain: target,
      pakaiPeristiwa,
    });
    setSibuk(false);
    if (r.error || !r.code) return setPesan(r.error ?? 'gagal membuat room');
    const id = (await sesiSiap()) ?? uid;
    if (id) masukLobbyOnline(r.code, id);
  }

  async function gabung() {
    if (!nama.trim() || kode.trim().length < 4 || sibuk) return;
    setSibuk(true);
    setPesan('');
    const kd = kode.trim().toUpperCase();
    const r = await kirimAksi('gabung', { code: kd, nama: nama.trim() });
    setSibuk(false);
    if (r.error) return setPesan(r.error);
    const id = (await sesiSiap()) ?? uid;
    if (id) masukLobbyOnline(kd, id);
  }

  if (!onlineTersedia) {
    return (
      <Bingkai onBack={() => keLayar('menu')}>
        <p className="text-sm text-tinta/70">
          Mode online belum dikonfigurasi. Isi <code>VITE_SUPABASE_URL</code> &{' '}
          <code>VITE_SUPABASE_ANON_KEY</code> di <code>.env</code> lalu jalankan
          ulang. Panduan lengkap ada di <code>docs/ONLINE.md</code>.
        </p>
      </Bingkai>
    );
  }

  // ── Dalam room: lobby ──────────────────────────────────────────────
  if (online && dataOnline) {
    const { roster, room } = dataOnline;
    const sayaHost = room?.host === online.uid;
    const totalTarget = room?.target_pemain ?? target;
    const slotBot = Math.max(0, totalTarget - roster.length);

    return (
      <Bingkai onBack={keluarOnline} labelBack="Keluar room">
        <div className="rounded-2xl bg-white p-4 text-center shadow-empuk">
          <p className="text-xs font-bold text-tinta/50">Kode room</p>
          <button
            type="button"
            onClick={() => void navigator.clipboard?.writeText(online.code)}
            className="mt-1 font-display text-4xl font-black tracking-[0.3em] text-lab cursor-pointer"
            title="Salin"
          >
            {online.code}
          </button>
          <p className="mt-1 text-[11px] text-tinta/45">ketuk untuk menyalin</p>
        </div>

        <div className="rounded-2xl bg-white p-3 shadow-empuk">
          <p className="mb-2 text-xs font-extrabold text-tinta/60">
            Pemain ({roster.length + slotBot}/{totalTarget})
          </p>
          <ul className="space-y-1.5">
            {roster.map((p) => (
              <li
                key={p.pemain}
                className="flex items-center justify-between rounded-xl bg-kertas px-3 py-2 text-sm font-bold text-tinta"
              >
                <span className="flex items-center gap-2">
                  {p.pemain === room?.host ? '👑' : '🧑'} {p.nama}
                  {p.pemain === online.uid && (
                    <span className="text-[10px] text-tinta/50">(kamu)</span>
                  )}
                  {!p.terhubung && (
                    <span className="text-[10px] text-alkali">terputus</span>
                  )}
                </span>
                {sayaHost && p.pemain !== online.uid && (
                  <button
                    type="button"
                    onClick={() =>
                      void kirimAksi('tendang', {
                        code: online.code,
                        pemain: p.pemain,
                      })
                    }
                    className="rounded-lg px-2 py-0.5 text-xs font-bold text-alkali hover:bg-alkali-050 cursor-pointer"
                  >
                    keluarkan
                  </button>
                )}
              </li>
            ))}
            {Array.from({ length: slotBot }, (_, i) => (
              <li
                key={`bot-${i}`}
                className="flex items-center gap-2 rounded-xl bg-kertas/60 px-3 py-2 text-sm font-bold text-tinta/45"
              >
                🤖 Bot (kursi kosong diisi otomatis)
              </li>
            ))}
          </ul>
        </div>

        {sayaHost ? (
          <button
            type="button"
            onClick={() => void kirimAksi('mulai', { code: online.code })}
            className="w-full rounded-2xl bg-lab px-4 py-3 font-display text-lg font-extrabold text-white shadow-empuk transition hover:brightness-110 cursor-pointer"
          >
            Mulai Main
          </button>
        ) : (
          <p className="text-center text-sm font-bold text-tinta/55">
            Menunggu host memulai…
          </p>
        )}
        {dataOnline.error && (
          <p className="text-center text-xs font-bold text-alkali">
            {dataOnline.error}
          </p>
        )}
      </Bingkai>
    );
  }

  // ── Belum di room: buat / gabung ───────────────────────────────────
  return (
    <Bingkai onBack={() => keLayar('menu')}>
      <input
        value={nama}
        onChange={(e) => setNama(e.target.value.slice(0, 16))}
        placeholder="Nama kamu"
        className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-bold text-tinta shadow-empuk outline-none focus:border-lab"
      />

      <div className="rounded-2xl bg-white p-4 shadow-empuk">
        <p className="text-xs font-bold text-tinta/60">Buat room baru</p>
        <p className="mt-2 text-[11px] font-bold text-tinta/50">Jumlah pemain</p>
        <div className="mt-1 flex gap-2">
          {[2, 3, 4].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setTarget(n)}
              className={`h-9 w-9 rounded-xl font-display font-extrabold transition cursor-pointer ${
                target === n ? 'bg-lab text-white' : 'bg-kertas text-tinta'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <label className="mt-3 flex cursor-pointer items-center justify-between rounded-xl bg-kertas px-3 py-2 text-xs font-bold text-tinta">
          Kartu Peristiwa Kimia (opsional)
          <input
            type="checkbox"
            checked={pakaiPeristiwa}
            onChange={(e) => setPakaiPeristiwa(e.target.checked)}
            className="h-5 w-5 accent-lab"
          />
        </label>
        <button
          type="button"
          disabled={!nama.trim() || sibuk}
          onClick={() => void buat()}
          className="mt-3 w-full rounded-2xl bg-lab px-4 py-2.5 font-display font-extrabold text-white shadow-empuk transition hover:brightness-110 disabled:opacity-40 cursor-pointer"
        >
          Buat &amp; Bagikan Kode
        </button>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-empuk">
        <p className="text-xs font-bold text-tinta/60">Gabung room</p>
        <input
          value={kode}
          onChange={(e) => setKode(e.target.value.toUpperCase().slice(0, 5))}
          placeholder="KODE"
          className="mt-2 w-full rounded-xl border border-black/10 bg-kertas px-4 py-2.5 text-center font-display text-2xl font-black tracking-[0.3em] text-lab outline-none focus:border-lab"
        />
        <button
          type="button"
          disabled={!nama.trim() || kode.trim().length < 4 || sibuk}
          onClick={() => void gabung()}
          className="mt-3 w-full rounded-2xl bg-lab-tinta px-4 py-2.5 font-display font-extrabold text-white shadow-empuk transition hover:brightness-110 disabled:opacity-40 cursor-pointer"
        >
          Gabung
        </button>
      </div>

      {pesan && (
        <p className="text-center text-xs font-bold text-alkali">{pesan}</p>
      )}
    </Bingkai>
  );
}

function Bingkai({
  children,
  onBack,
  labelBack = 'Menu',
}: {
  children: React.ReactNode;
  onBack: () => void;
  labelBack?: string;
}) {
  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col gap-4 p-5 no-select">
      <button
        type="button"
        onClick={onBack}
        className="w-fit rounded-full bg-white px-3 py-1 text-xs font-bold text-tinta/70 shadow-empuk cursor-pointer hover:bg-kertas"
      >
        ← {labelBack}
      </button>
      <h1 className="font-display text-2xl font-extrabold text-lab">Main Online</h1>
      {children}
    </main>
  );
}

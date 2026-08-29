import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useGameStore } from '../store/gameStore';
import { suaraChat, type ModeSuara } from '../online/suaraChat';
import { IkonMic } from './IkonMic';

const OPSI: { mode: ModeSuara; label: string; ikon: ReactNode }[] = [
  { mode: 'on', label: 'Mic Nyala', ikon: <IkonMic className="text-xl" /> },
  {
    mode: 'ptt',
    label: 'Push to Talk',
    ikon: <IkonMic push className="text-xl" />,
  },
  {
    mode: 'off',
    label: 'Mic Mati',
    ikon: <IkonMic slash className="text-xl" />,
  },
];

function teksStatus(status: string, peers: number): string {
  switch (status) {
    case 'minta-izin':
      return 'Meminta izin mikrofon…';
    case 'menghubungkan':
      return 'Menghubungkan…';
    case 'tersambung':
      return peers > 0
        ? `${peers} pemain tersambung`
        : 'Menunggu pemain lain…';
    case 'ditolak':
      return 'Izin mikrofon ditolak — aktifkan di setelan browser.';
    case 'gagal':
      return 'Gagal menyambung suara.';
    default:
      return '';
  }
}

/**
 * Tombol mic untuk voice chat online. Ketuk → popup 3 mode (Mic Nyala /
 * Push to Talk / Mic Mati). Saat mode "Push to Talk", muncul bilah
 * "tekan untuk bicara" di bawah layar.
 */
export function KontrolSuara() {
  const suaraMode = useGameStore((s) => s.suaraMode);
  const suaraStatus = useGameStore((s) => s.suaraStatus);
  const suaraPeers = useGameStore((s) => s.suaraPeers);
  const setSuaraMode = useGameStore((s) => s.setSuaraMode);

  const [buka, setBuka] = useState(false);
  const [bicara, setBicara] = useState(false);
  const kotak = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!buka) return;
    const luar = (e: PointerEvent) => {
      if (kotak.current && !kotak.current.contains(e.target as Node)) {
        setBuka(false);
      }
    };
    document.addEventListener('pointerdown', luar);
    return () => document.removeEventListener('pointerdown', luar);
  }, [buka]);

  // Lepas PTT kalau pointer terlepas di luar tombol.
  useEffect(() => {
    if (!bicara) return;
    const lepas = () => {
      setBicara(false);
      suaraChat.setPtt(false);
    };
    window.addEventListener('pointerup', lepas);
    window.addEventListener('pointercancel', lepas);
    return () => {
      window.removeEventListener('pointerup', lepas);
      window.removeEventListener('pointercancel', lepas);
    };
  }, [bicara]);

  const ikonAktif =
    suaraMode === 'on' ? (
      <IkonMic className="text-base" />
    ) : suaraMode === 'ptt' ? (
      <IkonMic push className="text-base" />
    ) : (
      <IkonMic slash className="text-base" />
    );

  const nyala = suaraMode !== 'off';
  const info = teksStatus(suaraStatus, suaraPeers);

  return (
    <>
      <div ref={kotak} className="relative">
        <button
          type="button"
          onClick={() => setBuka((b) => !b)}
          aria-label="Pengaturan suara / mikrofon"
          className={`relative flex h-9 w-9 items-center justify-center rounded-full shadow-empuk cursor-pointer transition
            ${
              nyala
                ? 'bg-lab text-white hover:brightness-110'
                : 'bg-white/70 text-tinta hover:bg-white'
            }`}
        >
          {ikonAktif}
          {suaraMode === 'on' && suaraStatus === 'tersambung' && (
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-alkali" />
          )}
        </button>

        {buka && (
          <div className="animasi-pop absolute right-0 top-11 z-50 w-56 rounded-2xl border border-black/10 bg-white p-2 text-tinta shadow-empuk">
            <p className="px-2 pb-1 pt-1 text-[11px] font-extrabold uppercase tracking-wide text-tinta/50">
              Mikrofon
            </p>
            {OPSI.map((o) => (
              <button
                key={o.mode}
                type="button"
                onClick={() => {
                  setSuaraMode(o.mode);
                  if (o.mode !== 'ptt') setBuka(false);
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-sm font-bold transition
                  ${
                    suaraMode === o.mode
                      ? 'bg-lab-050 text-lab-tinta'
                      : 'hover:bg-black/5'
                  }`}
              >
                <span
                  className={
                    suaraMode === o.mode ? 'text-lab' : 'text-tinta/70'
                  }
                >
                  {o.ikon}
                </span>
                {o.label}
                {suaraMode === o.mode && (
                  <span className="ml-auto text-lab">✓</span>
                )}
              </button>
            ))}
            {info && (
              <p
                className={`px-2 pb-1 pt-2 text-[11px] font-bold ${
                  suaraStatus === 'ditolak' || suaraStatus === 'gagal'
                    ? 'text-halogen-700'
                    : 'text-tinta/50'
                }`}
              >
                {info}
              </p>
            )}
          </div>
        )}
      </div>

      {suaraMode === 'ptt' && (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              setBicara(true);
              suaraChat.setPtt(true);
            }}
            className={`pointer-events-auto flex items-center gap-2 rounded-full px-8 py-3 font-display font-black text-white shadow-empuk ring-4 transition select-none
              ${
                bicara
                  ? 'bg-alkali ring-alkali/40 scale-105'
                  : 'bg-lab-tinta ring-white/60'
              }`}
          >
            <IkonMic className="text-lg" />
            {bicara ? 'Bicara…' : 'Tekan untuk bicara'}
          </button>
        </div>
      )}
    </>
  );
}

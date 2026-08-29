import { useEffect, useRef, useState } from 'react';
import {
  getVolume,
  isMuted,
  isMusikNyala,
  setVolumeMusik,
  setVolumeSfx,
  toggleMuted,
  toggleMusik,
} from '../lib/audio';

export function PengaturanSuara() {
  const [buka, setBuka] = useState(false);
  const [bisu, setBisu] = useState(isMuted());
  const [musik, setMusik] = useState(isMusikNyala());
  const [vol, setVol] = useState(getVolume());
  const kotak = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!buka) return;
    const luar = (e: MouseEvent) => {
      if (kotak.current && !kotak.current.contains(e.target as Node)) {
        setBuka(false);
      }
    };
    document.addEventListener('pointerdown', luar);
    return () => document.removeEventListener('pointerdown', luar);
  }, [buka]);

  return (
    <div ref={kotak} className="relative">
      <button
        type="button"
        onClick={() => setBuka((b) => !b)}
        aria-label="Pengaturan suara"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-sm shadow-empuk cursor-pointer hover:bg-white"
      >
        {bisu ? '🔇' : '🔊'}
      </button>

      {buka && (
        <div className="animasi-pop absolute right-0 top-11 z-50 w-52 rounded-2xl border border-black/10 bg-white p-3 text-tinta shadow-empuk">
          <Baris
            label="Efek suara"
            aktif={!bisu}
            onToggle={() => setBisu(toggleMuted())}
          />
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={vol.sfx}
            disabled={bisu}
            onChange={(e) => {
              const v = Number(e.target.value);
              setVolumeSfx(v);
              setVol((o) => ({ ...o, sfx: v }));
            }}
            className="mt-1 w-full accent-lab disabled:opacity-40"
          />

          <div className="mt-3">
            <Baris
              label="Musik latar"
              aktif={musik && !bisu}
              onToggle={() => setMusik(toggleMusik())}
            />
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={vol.musik}
              disabled={bisu || !musik}
              onChange={(e) => {
                const v = Number(e.target.value);
                setVolumeMusik(v);
                setVol((o) => ({ ...o, musik: v }));
              }}
              className="mt-1 w-full accent-lab disabled:opacity-40"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Baris({
  label,
  aktif,
  onToggle,
}: {
  label: string;
  aktif: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between text-xs font-bold cursor-pointer"
    >
      {label}
      <span
        className={`flex h-5 w-9 items-center rounded-full p-0.5 transition ${aktif ? 'bg-lab' : 'bg-black/15'}`}
      >
        <span
          className={`h-4 w-4 rounded-full bg-white transition ${aktif ? 'translate-x-4' : ''}`}
        />
      </span>
    </button>
  );
}

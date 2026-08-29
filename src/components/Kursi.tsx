import type { CSSProperties } from 'react';
import type { Pemain } from '../game';
import type { GayaKursi } from './kursiGeometri';
import { PlayerAvatar } from './PlayerAvatar';
import { KipasBelakang } from './KipasBelakang';

interface Props {
  pemain: Pemain;
  aktif: boolean;
  menang?: boolean;
  gaya: GayaKursi;
}

/**
 * Satu "kursi" lawan. Kedalaman visual, dari arah MEJA ke luar:
 *   meja → `.kursi-kipas` (kartu, z-index 2) → `.kursi-avatar` (z-index 1)
 *
 * `.kursi-unit` membungkus avatar + fan sebagai SATU kesatuan lalu diputar
 * `gaya.miring` (dihitung dari sudut kursi terhadap pusat oval di
 * `kursiGeometri.ts`). Karena rotasi ada di wrapper, avatar & fan berputar
 * bersama tanpa pernah lepas satu sama lain.
 */
export function Kursi({ pemain, aktif, menang, gaya }: Props) {
  const style: CSSProperties = { top: gaya.top, left: gaya.left };
  const unitStyle: CSSProperties = { transform: `rotate(${gaya.miring.toFixed(2)}deg)` };

  return (
    <div className="kursi z-20" style={style}>
      <div className="kursi-unit" style={unitStyle}>
        <div className="kursi-avatar">
          <PlayerAvatar pemain={pemain} aktif={aktif} menang={menang} />
        </div>
        <div className="kursi-kipas">
          <KipasBelakang jumlah={pemain.tangan.length} />
        </div>
      </div>
    </div>
  );
}

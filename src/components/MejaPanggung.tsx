import type { GameState, KartuKimia } from '../game';
import { DiscardPile } from './DiscardPile';
import { DrawPile } from './DrawPile';
import { Kursi } from './Kursi';
import { hitungKursi } from './kursiGeometri';
import { PenunjukArah } from './PenunjukArah';

interface Props {
  state: GameState;
  humanId: string;
  atas: KartuKimia;
  bisaTarik: boolean;
  onTarik: () => void;
}

export function MejaPanggung({ state, humanId, atas, bisaTarik, onTarik }: Props) {
  const lawan = state.pemain.filter((p) => p.id !== humanId);
  const current = state.pemain[state.giliran];
  // Posisi + rotasi tiap kursi dihitung dari sudutnya di busur oval —
  // otomatis benar untuk jumlah lawan berapa pun.
  const layout = hitungKursi(lawan.length);

  return (
    <div className="meja-panggung">
      <div className="meja-lantai">
        <PenunjukArah arah={state.arah} />

        {/* Kartu buang — di tengah meja */}
        <div className="meja-bayang-tengah" />
        <div className="meja-buang">
          <DiscardPile
            atas={atas}
            warnaAktif={state.warnaAktif}
            angkaAktif={state.angkaAktif}
            ringkas
          />
        </div>
      </div>

      {/* Tumpukan tarik ("buku utama") — pojok kanan-bawah meja, lebih kecil.
          Sengaja di luar `.meja-lantai` (bukan konteks 3D) agar tetap bisa ditekan. */}
      <div className="meja-tarik">
        <DrawPile
          jumlah={state.drawPile.length}
          bisaTarik={bisaTarik}
          onTarik={onTarik}
        />
      </div>

      {lawan.map((p, i) => (
        <Kursi
          key={p.id}
          pemain={p}
          aktif={current.id === p.id && state.status !== 'selesai'}
          menang={state.pemenangId === p.id}
          gaya={layout[i] ?? layout[layout.length - 1]}
        />
      ))}
    </div>
  );
}

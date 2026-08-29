import { KartuFaktaLayar } from './KartuFaktaLayar';
import type { Golongan } from '../data/types';

interface Props {
  reward: { golongan: Golongan; teks: string } | null;
  onLanjut: () => void;
}

/**
 * Kartu "Fakta Kimia" layar-penuh — hadiah karena membuang 3 kartu segolongan
 * berturut-turut (atau Peristiwa "diskusi kelompok"). Menutupi papan sampai
 * pemain menekan "Lanjut".
 */
export function FaktaModal({ reward, onLanjut }: Props) {
  if (!reward) return null;

  return (
    <KartuFaktaLayar
      ikon="🔬"
      kicker="Fakta Kimia"
      golongan={reward.golongan}
      teks={reward.teks}
      catatan="Kamu membukanya lewat 3 kartu segolongan berturut-turut"
      onLanjut={onLanjut}
    />
  );
}

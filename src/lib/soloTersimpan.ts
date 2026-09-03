// Menyimpan progres game SOLO (vs bot) di localStorage, supaya pemain yang
// tak sengaja refresh/tutup tab bisa melanjutkan lagi dari menu utama alih-
// alih kehilangan game yang sedang berjalan. Murni lokal — tak menyentuh
// server (beda dari `online/roomTersimpan.ts` yang menyambung ke room).
import type { GameState, SoalKuis } from '../game';
import type { HasilRekam } from './progres';
import type { PoinSesi, StatistikKuis } from '../store/gameStore';

const KEY = 'chemuno:soloAktif';

export interface SoloTersimpan {
  state: GameState;
  humanId: string;
  soalAktif: SoalKuis | null;
  statistik: StatistikKuis;
  poinSesi: PoinSesi;
  kartuFaktaDitutup: { funFact: string | null; fakta: string | null };
  jeda: boolean;
  rekamTerakhir: HasilRekam | null;
}

export function bacaSoloTersimpan(): SoloTersimpan | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SoloTersimpan;
  } catch {
    return null;
  }
}

export function simpanSoloAktif(d: SoloTersimpan): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(d));
  } catch {
    /* abaikan (mode privat / storage penuh) */
  }
}

export function hapusSoloTersimpan(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* abaikan */
  }
}

// Tombol kembali HP (Android / APK TWA) & tombol back browser.
//
// Aplikasi pindah layar lewat state (`layar`), bukan URL — tanpa entri riwayat
// tombol kembali HP langsung menutup aplikasi. Maka: selama bukan di menu,
// dijaga SATU entri riwayat "penjaga" di atas entri dasar. Menekan kembali
// memakan entri itu (popstate) → kita pindah ke layar induk, lalu penjaga
// dipasang lagi bila masih perlu. Di menu tak ada penjaga → kembali = keluar.
//
// Di tengah permainan / di dalam room online, kembali TIDAK keluar (progres
// solo terhapus & room ditinggal bila keluar tak sengaja) — cukup beri tahu
// pemain untuk memakai tombol "← Menu".
import { create } from 'zustand';
import { useGameStore, type Layar } from '../store/gameStore';

/** Layar tujuan saat kembali ditekan; `null` = tahan (tetap di layar ini). */
export function tujuanKembali(layar: Layar, diRoomOnline: boolean): Layar | null {
  switch (layar) {
    case 'menu':
      return 'menu';
    case 'main':
      return null;
    case 'online':
      return diRoomOnline ? null : 'menu';
    case 'dashboard-guru':
      return 'akun';
    default:
      return 'menu';
  }
}

export const PESAN_TAHAN = 'Tekan “← Menu” di layar untuk keluar dari permainan';

export const useToastKembali = create<{ pesan: string | null; tutup: () => void }>(
  (set) => ({ pesan: null, tutup: () => set({ pesan: null }) }),
);

const PENANDA = 'uno-chem-penjaga';

let adaPenjaga = false;
let abaikanPop = 0;

function sinkronPenjaga() {
  const { layar } = useGameStore.getState();
  if (layar !== 'menu' && !adaPenjaga) {
    history.pushState({ [PENANDA]: true }, '');
    adaPenjaga = true;
  } else if (layar === 'menu' && adaPenjaga) {
    // Kembali ke menu lewat tombol di layar → buang penjaga agar tombol
    // kembali berikutnya langsung keluar aplikasi.
    adaPenjaga = false;
    abaikanPop++;
    history.back();
  }
}

export function mulaiTombolKembali() {
  // Muat ulang saat penjaga masih ada → entri itu milik kita.
  adaPenjaga = Boolean((history.state as Record<string, unknown> | null)?.[PENANDA]);
  if (adaPenjaga && useGameStore.getState().layar === 'menu') {
    adaPenjaga = false;
    abaikanPop++;
    history.back();
  }

  window.addEventListener('popstate', () => {
    adaPenjaga = Boolean((history.state as Record<string, unknown> | null)?.[PENANDA]);
    if (abaikanPop > 0) {
      abaikanPop--;
    } else {
      const g = useGameStore.getState();
      const tujuan = tujuanKembali(g.layar, g.online !== null);
      if (tujuan === null) useToastKembali.setState({ pesan: PESAN_TAHAN });
      else if (tujuan !== g.layar) g.keLayar(tujuan);
    }
    sinkronPenjaga();
  });

  useGameStore.subscribe((s, sebelum) => {
    if (s.layar !== sebelum.layar) sinkronPenjaga();
  });
  sinkronPenjaga();
}

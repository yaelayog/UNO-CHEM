// Menyimpan kode room online aktif di localStorage supaya pemain yang tak
// sengaja refresh/menutup tab bisa otomatis tersambung kembali ke room yang
// sama (App.tsx) alih-alih kembali ke menu dan kehilangan kursinya.
const KEY = 'chemuno:roomAktif';

export interface RoomTersimpan {
  code: string;
  uid: string;
}

export function bacaRoomTersimpan(): RoomTersimpan | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as Partial<RoomTersimpan>;
    if (!d.code || !d.uid) return null;
    return { code: d.code, uid: d.uid };
  } catch {
    return null;
  }
}

export function simpanRoomAktif(code: string, uid: string): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ code, uid }));
  } catch {
    /* abaikan (mode privat / storage penuh) */
  }
}

export function hapusRoomTersimpan(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* abaikan */
  }
}

import { create } from 'zustand';
import { bacaProgres, simpanProgres, type Progres } from '../lib/progres';
import { getSupabase } from '../lib/supabase';
import { useGameStore } from '../store/gameStore';
import { kirimAkun } from './klienAkun';
import { gabungProgres } from './migrasiProgres';
import type { AkunMurid, HasilAkun, PilihanAkun, ProgresAkun } from './tipe';

const TOKEN_KEY = 'chemuno:sesiMurid';

function bacaToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}
function simpanToken(t: string | null) {
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* mode privat / storage penuh */
  }
}

/** Beri tahu store game agar membaca ulang progres dari localStorage. */
function segarkanGame() {
  useGameStore.getState().segarkanProgres();
}

interface AkunStore {
  /** Akun murid aktif di device ini (null = belum masuk). */
  murid: AkunMurid | null;
  progresAkun: ProgresAkun | null;
  /** Email guru bila sesi Supabase Auth non-anon aktif. */
  guruEmail: string | null;
  /** true selama `muat()` pertama berjalan (restore sesi saat app dibuka). */
  memuat: boolean;
  sibuk: boolean;

  muat: () => Promise<void>;
  daftarMurid: (
    nama: string,
    pin: string,
    kodeKelas?: string,
  ) => Promise<string | null>;
  masukMurid: (
    nama: string,
    pin: string,
    kodeUnik?: string,
  ) => Promise<{ error?: string; pilihan?: PilihanAkun[] }>;
  keluarMurid: () => Promise<void>;
  gabungKelas: (kodeKelas: string) => Promise<string | null>;
  /** Dorong progres terbaru ke akun (debounced). Aman dipanggil tanpa akun. */
  sinkronProgres: (p: Progres) => void;
  /** Laporkan poin Peringkat Golongan dari sesi solo. No-op tanpa akun. */
  kirimPoinSesi: (sesi: {
    poin: number;
    akurasi: Record<string, { benar: number; total: number }>;
  }) => void;

  masukGuru: (
    email: string,
    sandi: string,
    daftar: boolean,
  ) => Promise<string | null>;
  keluarGuru: () => Promise<void>;
}

let timerSinkron: ReturnType<typeof setTimeout> | undefined;

export const useAkunStore = create<AkunStore>((set, get) => {
  /** Terapkan balasan sukses dari Edge Function `akun`. */
  function terapkan(r: HasilAkun) {
    if (!r.murid) return;
    if (r.token) simpanToken(r.token);
    const merged = gabungProgres(
      bacaProgres(),
      (r.progres?.progresLokal as Partial<Progres> | undefined) ?? null,
    );
    simpanProgres(merged);
    set({ murid: r.murid, progresAkun: r.progres ?? null });
    segarkanGame();
    // Balikkan hasil merge ke server supaya kedua sisi konsisten.
    const token = bacaToken();
    if (token)
      void kirimAkun('sinkronProgres', { token, progresLokal: merged });
  }

  return {
    murid: null,
    progresAkun: null,
    guruEmail: null,
    memuat: true,
    sibuk: false,

    muat: async () => {
      set({ memuat: true });
      try {
        const sb = await getSupabase();
        if (sb) {
          const { data } = await sb.auth.getSession();
          const u = data.session?.user;
          if (u && !u.is_anonymous && u.email) set({ guruEmail: u.email });
        }
        const token = bacaToken();
        if (token) {
          const r = await kirimAkun('sesi', { token });
          if (r.murid && !r.error) terapkan(r);
          else if (r.error) simpanToken(null);
        }
      } finally {
        set({ memuat: false });
      }
    },

    daftarMurid: async (nama, pin, kodeKelas) => {
      if (get().sibuk) return 'sedang memproses';
      set({ sibuk: true });
      try {
        const r = await kirimAkun('daftar', {
          nama,
          pin,
          kodeKelas: kodeKelas || undefined,
          progresLokal: bacaProgres(),
        });
        if (r.error || !r.murid) return r.error ?? 'gagal membuat akun';
        terapkan(r);
        return null;
      } finally {
        set({ sibuk: false });
      }
    },

    masukMurid: async (nama, pin, kodeUnik) => {
      if (get().sibuk) return { error: 'sedang memproses' };
      set({ sibuk: true });
      try {
        const r = await kirimAkun('masuk', {
          nama,
          pin,
          kodeUnik: kodeUnik || undefined,
        });
        if (r.pilihan) return { pilihan: r.pilihan };
        if (r.error || !r.murid) return { error: r.error ?? 'gagal masuk' };
        terapkan(r);
        return {};
      } finally {
        set({ sibuk: false });
      }
    },

    keluarMurid: async () => {
      const token = bacaToken();
      simpanToken(null);
      set({ murid: null, progresAkun: null });
      if (token) await kirimAkun('keluar', { token });
    },

    gabungKelas: async (kodeKelas) => {
      const token = bacaToken();
      if (!token) return 'belum masuk';
      set({ sibuk: true });
      try {
        const r = await kirimAkun('gabungKelas', { token, kodeKelas });
        if (r.error || !r.murid) return r.error ?? 'gagal gabung kelas';
        set({ murid: r.murid, progresAkun: r.progres ?? get().progresAkun });
        return null;
      } finally {
        set({ sibuk: false });
      }
    },

    sinkronProgres: (p) => {
      const token = bacaToken();
      if (!token) return;
      clearTimeout(timerSinkron);
      timerSinkron = setTimeout(() => {
        void kirimAkun('sinkronProgres', { token, progresLokal: p });
      }, 1500);
    },

    kirimPoinSesi: (sesi) => {
      const token = bacaToken();
      if (!token) return;
      if (sesi.poin <= 0 && Object.keys(sesi.akurasi).length === 0) return;
      void kirimAkun('tambahPoin', {
        token,
        poin: sesi.poin,
        akurasi: sesi.akurasi,
      }).then((r) => {
        const p = r.progres as Partial<ProgresAkun> | null | undefined;
        if (p)
          set((s) => ({
            progresAkun: s.progresAkun ? { ...s.progresAkun, ...p } : s.progresAkun,
          }));
      });
    },

    masukGuru: async (email, sandi, daftar) => {
      const sb = await getSupabase();
      if (!sb) return 'mode online tidak dikonfigurasi';
      set({ sibuk: true });
      try {
        const { data, error } = daftar
          ? await sb.auth.signUp({ email, password: sandi })
          : await sb.auth.signInWithPassword({ email, password: sandi });
        if (error) return error.message;
        if (!data.session)
          return 'Akun dibuat. Cek email untuk konfirmasi, lalu masuk lagi.';
        set({ guruEmail: data.user?.email ?? email });
        return null;
      } finally {
        set({ sibuk: false });
      }
    },

    keluarGuru: async () => {
      const sb = await getSupabase();
      await sb?.auth.signOut();
      set({ guruEmail: null });
    },
  };
});

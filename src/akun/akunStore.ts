import { create } from 'zustand';
import { bacaProgres, simpanProgres, type Progres } from '../lib/progres';
import type { Golongan } from '../data/types';
import type { Misi } from '../game';
import { getSupabase } from '../lib/supabase';
import { useGameStore } from '../store/gameStore';
import { kirimAkun } from './klienAkun';
import { gabungProgres } from './migrasiProgres';
import type {
  AkunMurid,
  HasilAkun,
  MisiProgres,
  MisiSelesai,
  PilihanAkun,
  ProgresAkun,
} from './tipe';

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

function segarkanGame() {
  useGameStore.getState().segarkanProgres();
}

/** Konteks 1 sesi solo untuk evaluasi Misi. */
export interface KonteksSesiSolo {
  poin: number;
  akurasi: Record<string, { benar: number; total: number }>;
  menang: boolean;
  kuisBenar: number;
  kuisSalah: number;
  benarPerGolongan: Partial<Record<Golongan, number>>;
}

interface AkunStore {
  murid: AkunMurid | null;
  progresAkun: ProgresAkun | null;
  misi: Misi[];
  misiProgres: MisiProgres[];
  /** Misi yang baru selesai — UI menampilkan toast lalu clear. */
  misiSelesaiBaru: MisiSelesai[];
  guruEmail: string | null;
  memuat: boolean;
  sibuk: boolean;

  muat: () => Promise<void>;
  /** Ambil ulang progres + misi murid dari server (tanpa flash "logout"). */
  segarkanAkun: () => Promise<void>;
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
  sinkronProgres: (p: Progres) => void;
  /** Laporkan hasil sesi solo (poin + konteks Misi). No-op tanpa akun. */
  kirimPoinSesi: (sesi: KonteksSesiSolo) => void;
  bersihkanMisiSelesai: () => void;

  masukGuru: (
    email: string,
    sandi: string,
    daftar: boolean,
  ) => Promise<string | null>;
  keluarGuru: () => Promise<void>;
}

let timerSinkron: ReturnType<typeof setTimeout> | undefined;

async function muatMisiDefs(): Promise<Misi[]> {
  const sb = await getSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from('misi')
    .select('id, judul, deskripsi, tipe, target, poin_reward, badge_reward, urutan')
    .order('urutan', { ascending: true });
  return ((data as Record<string, unknown>[] | null) ?? []).map((r) => ({
    id: String(r.id),
    judul: String(r.judul),
    deskripsi: String(r.deskripsi),
    tipe: r.tipe as Misi['tipe'],
    target: (r.target ?? {}) as Record<string, unknown>,
    poinReward: Number(r.poin_reward) || 0,
    badgeReward: (r.badge_reward as string | null) ?? null,
  }));
}

export const useAkunStore = create<AkunStore>((set, get) => {
  function terapkan(r: HasilAkun) {
    if (!r.murid) return;
    if (r.token) simpanToken(r.token);
    const merged = gabungProgres(
      bacaProgres(),
      (r.progres?.progresLokal as Partial<Progres> | undefined) ?? null,
    );
    simpanProgres(merged);
    set({
      murid: r.murid,
      progresAkun: r.progres ?? null,
      misiProgres: r.misiProgres ?? [],
    });
    if (get().misi.length === 0) {
      void muatMisiDefs().then((misi) => set({ misi }));
    }
    segarkanGame();
    const token = bacaToken();
    if (token) void kirimAkun('sinkronProgres', { token, progresLokal: merged });
  }

  return {
    murid: null,
    progresAkun: null,
    misi: [],
    misiProgres: [],
    misiSelesaiBaru: [],
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
        void muatMisiDefs().then((misi) => set({ misi }));
        const token = bacaToken();
        if (token) {
          const r = await kirimAkun('sesi', { token });
          if (r.murid && !r.error) terapkan(r);
          else if (r.error && /tidak valid|not.*valid|401/i.test(r.error))
            simpanToken(null);
        }
      } finally {
        set({ memuat: false });
      }
    },

    segarkanAkun: async () => {
      const token = bacaToken();
      if (!token) return;
      const r = await kirimAkun('sesi', { token });
      if (r.murid && !r.error) {
        set({
          murid: r.murid,
          progresAkun: r.progres ?? get().progresAkun,
          misiProgres: r.misiProgres ?? get().misiProgres,
        });
        if (get().misi.length === 0) void muatMisiDefs().then((misi) => set({ misi }));
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
      set({ murid: null, progresAkun: null, misiProgres: [] });
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
      void kirimAkun('tambahPoin', {
        token,
        poin: sesi.poin,
        akurasi: sesi.akurasi,
        sesi: {
          menang: sesi.menang,
          kuisBenar: sesi.kuisBenar,
          kuisSalah: sesi.kuisSalah,
          benarPerGolongan: sesi.benarPerGolongan,
        },
      }).then((r) => {
        const p = r.progres as Partial<ProgresAkun> | null | undefined;
        set((s) => ({
          progresAkun: p && s.progresAkun ? { ...s.progresAkun, ...p } : s.progresAkun,
          misiSelesaiBaru: r.misiSelesai?.length
            ? [...s.misiSelesaiBaru, ...r.misiSelesai]
            : s.misiSelesaiBaru,
        }));
        void get().segarkanAkun();
      });
    },

    bersihkanMisiSelesai: () => set({ misiSelesaiBaru: [] }),

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

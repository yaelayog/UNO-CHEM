import { create } from 'zustand';
import { bacaProgres, simpanProgres, type Progres } from '../lib/progres';
import type { Golongan } from '../data/types';
import type { Misi } from '../game';
import { getSupabase } from '../lib/supabase';
import { useGameStore } from '../store/gameStore';
import { kirimAkun } from './klienAkun';
import { gabungProgres } from './migrasiProgres';
import { selisihMisi } from './selisihMisi';
import {
  bacaAntrian,
  buatSesiId,
  galatSementara,
  rapikanAntrian,
  simpanAntrian,
} from './antrianLaporan';
import type {
  AkunMurid,
  HarianAkun,
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
  /** Benar per nomor TP ("1".."4") — untuk Misi Harian bertema TP. */
  benarPerTP: Record<string, number>;
  /** Kartu yang dimainkan per golongan — untuk Misi Harian bertema golongan. */
  kartuPerGolongan: Partial<Record<Golongan, number>>;
}

interface AkunStore {
  murid: AkunMurid | null;
  progresAkun: ProgresAkun | null;
  misi: Misi[];
  misiProgres: MisiProgres[];
  /** Misi Harian hari ini; null = belum masuk / fitur belum aktif di server. */
  harian: HarianAkun | null;
  /** Misi yang baru selesai — UI menampilkan toast lalu clear. */
  misiSelesaiBaru: MisiSelesai[];
  guruEmail: string | null;
  memuat: boolean;
  sibuk: boolean;

  muat: () => Promise<void>;
  /**
   * Ambil ulang progres + misi murid dari server (tanpa flash "logout").
   * `umumkan` = tampilkan toast untuk misi yang baru selesai (dipakai sesudah
   * permainan online, yang misinya dievaluasi server).
   */
  segarkanAkun: (opsi?: { umumkan?: boolean }) => Promise<void>;
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
  /** Kirim (ulang) laporan sesi yang tertunda di antrean localStorage. */
  kirimLaporanTertunda: () => Promise<void>;
  bersihkanMisiSelesai: () => void;

  masukGuru: (
    email: string,
    sandi: string,
    daftar: boolean,
  ) => Promise<string | null>;
  keluarGuru: () => Promise<void>;
}

let timerSinkron: ReturnType<typeof setTimeout> | undefined;
let sedangMengirimLaporan = false;

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
      harian: r.harian ?? null,
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
    harian: null,
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
      // Laporan permainan yang gagal terkirim sebelumnya (sinyal putus, dll).
      void get().kirimLaporanTertunda();
    },

    segarkanAkun: async (opsi) => {
      const token = bacaToken();
      if (!token) return;
      const r = await kirimAkun('sesi', { token });
      if (r.murid && !r.error) {
        const lama = get();
        const baru = {
          progresAkun: r.progres ?? lama.progresAkun,
          misiProgres: r.misiProgres ?? lama.misiProgres,
          harian: r.harian === undefined ? lama.harian : r.harian,
        };
        const diumumkan =
          opsi?.umumkan && lama.murid?.id === r.murid.id
            ? selisihMisi(
                {
                  misiProgres: lama.misiProgres,
                  harian: lama.harian,
                  badgeDiraih: lama.progresAkun?.badgeDiraih ?? [],
                },
                {
                  misiProgres: baru.misiProgres,
                  harian: baru.harian,
                  badgeDiraih: baru.progresAkun?.badgeDiraih ?? [],
                },
                lama.misi,
              )
            : [];
        set({
          murid: r.murid,
          ...baru,
          misiSelesaiBaru: diumumkan.length
            ? [...get().misiSelesaiBaru, ...diumumkan]
            : get().misiSelesaiBaru,
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
      set({ murid: null, progresAkun: null, misiProgres: [], harian: null });
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
      // Simpan ke antrean DULU → tak hilang walau pengiriman gagal.
      simpanAntrian([
        ...bacaAntrian(),
        {
          sesiId: buatSesiId(),
          token,
          dibuat: Date.now(),
          percobaan: 0,
          payload: {
            poin: sesi.poin,
            akurasi: sesi.akurasi,
            sesi: {
              menang: sesi.menang,
              kuisBenar: sesi.kuisBenar,
              kuisSalah: sesi.kuisSalah,
              benarPerGolongan: sesi.benarPerGolongan,
              benarPerTP: sesi.benarPerTP,
              kartuPerGolongan: sesi.kartuPerGolongan,
            },
          },
        },
      ]);
      void get().kirimLaporanTertunda();
    },

    kirimLaporanTertunda: async () => {
      if (sedangMengirimLaporan) return;
      sedangMengirimLaporan = true;
      let adaTerkirim = false;
      try {
        simpanAntrian(rapikanAntrian(bacaAntrian()));
        for (const lap of bacaAntrian()) {
          const r = await kirimAkun('tambahPoin', {
            token: lap.token,
            sesiId: lap.sesiId,
            ...lap.payload,
          });
          if (r.error && galatSementara(r.error)) {
            // Tandai percobaan gagal lalu berhenti — coba lagi di pemicu berikutnya.
            simpanAntrian(
              rapikanAntrian(bacaAntrian()).map((x) =>
                x.sesiId === lap.sesiId ? { ...x, percobaan: x.percobaan + 1 } : x,
              ),
            );
            break;
          }
          simpanAntrian(bacaAntrian().filter((x) => x.sesiId !== lap.sesiId));
          if (r.error) continue; // sesi tak valid → laporan dibuang
          adaTerkirim = true;
          // Toast hanya untuk laporan milik akun yang sedang masuk.
          if (lap.token === bacaToken()) {
            const p = r.progres as Partial<ProgresAkun> | null | undefined;
            set((s) => ({
              progresAkun: p && s.progresAkun ? { ...s.progresAkun, ...p } : s.progresAkun,
              misiSelesaiBaru: r.misiSelesai?.length
                ? [...s.misiSelesaiBaru, ...r.misiSelesai]
                : s.misiSelesaiBaru,
            }));
          }
        }
      } finally {
        sedangMengirimLaporan = false;
      }
      if (adaTerkirim) void get().segarkanAkun();
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

// Perangkat kembali online → kirim laporan permainan yang tertunda.
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    void useAkunStore.getState().kirimLaporanTertunda();
  });
}

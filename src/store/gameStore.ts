import { create } from 'zustand';
import type { Golongan, SoalKuis } from '../data/types';
import {
  buatGame,
  mainkanBerbarengan,
  pilihWarna as pilihWarnaEngine,
  selesaikanKuis,
  tarikKartu,
  langkahBot,
  jawabKuisBot,
  warnaBotTerbaik,
  picuPeristiwaBila,
  picuFunFactBila,
  pilihSoal,
  type GameState,
  type HasilKuis,
  type OpsiPemain,
} from '../game';
import { kirimAksi } from '../online/klienOnline';
import { rekonstruksiState } from '../online/rekonstruksi';
import type { DataRoom } from '../online/useRoomOnline';
import { sfx } from '../lib/audio';
import {
  bacaProgres,
  simpanProgres,
  tambahHasilGame,
  type HasilRekam,
  type Progres,
} from '../lib/progres';

export type Layar =
  | 'menu'
  | 'main'
  | 'aturan'
  | 'tentang'
  | 'belajar'
  | 'profil'
  | 'online';

export type ModeMain = 'solo' | 'online';

const NAMA_BOT = ['Bohr', 'Curie', 'Mendel', 'Lavoisier'];

export interface StatistikKuis {
  benar: number;
  total: number;
  streakBenar: number;
  streakTerbaik: number;
  benarPerGolongan: Partial<Record<Golongan, number>>;
}

interface GameStore {
  layar: Layar;
  keLayar: (l: Layar) => void;

  state: GameState | null;
  humanId: string;
  /** cermin dari `state.soalAktif` — soal yang sedang ditampilkan ke pemain. */
  soalAktif: SoalKuis | null;
  statistik: StatistikKuis;
  jeda: boolean;

  /** 'solo' = lawan bot lokal · 'online' = room Supabase (server otoritatif). */
  mode: ModeMain;
  online: { code: string; uid: string } | null;
  dataOnline: DataRoom | null;
  rekamOnlineDicatat: boolean;
  masukLobbyOnline: (code: string, uid: string) => void;
  pasangDataOnline: (d: DataRoom) => void;
  keluarOnline: () => void;

  progres: Progres;
  /** Ringkasan XP/level/badge dari game yang baru selesai — utk layar GameOver. */
  rekamTerakhir: HasilRekam | null;
  segarkanProgres: () => void;

  /** true selama animasi kocok + bagi kartu di awal permainan. */
  sedangMembuka: boolean;
  selesaiMembuka: () => void;

  mulaiGame: (jumlahBot: number, nama?: string, pakaiPeristiwa?: boolean) => void;
  mainLagi: () => void;
  keluarKeMenu: () => void;
  tutupPeristiwa: () => void;
  tutupFunFact: () => void;

  /** Mainkan 1 kartu, atau tumpuk beberapa kartu angka seperiode sekaligus. */
  mainkan: (kartuIds: string | string[], warnaWild?: Golongan) => void;
  tarik: () => void;
  pilihWarna: (g: Golongan) => void;
  jawabKuis: (hasil: HasilKuis) => void;

  /** Dipanggil oleh bot-runner: majukan satu aksi bot bila memang gilirannya. */
  stepBot: () => boolean;
  bersihkanReward: () => void;
  bersihkanPengumuman: () => void;
}

const STAT_AWAL: StatistikKuis = {
  benar: 0,
  total: 0,
  streakBenar: 0,
  streakTerbaik: 0,
  benarPerGolongan: {},
};

let konfigTerakhir: {
  jumlahBot: number;
  nama: string;
  pakaiPeristiwa: boolean;
} = {
  jumlahBot: 2,
  nama: 'Kamu',
  pakaiPeristiwa: false, // Kartu Peristiwa = opsional, default nonaktif
};

export const useGameStore = create<GameStore>((set, get) => {
  /**
   * Terapkan GameState baru. Kalau butuh kuis untuk PEMAIN MANUSIA, pilih soal
   * (anti-ulang via `soalTerpakai`). Kuis yang menyasar bot tidak perlu soal —
   * bot menjawab lewat peluang di `jawabKuisBot`.
   */
  function terapkan(next: GameState) {
    const { humanId } = get();

    // Kuis untuk manusia → siapkan soal (anti-ulang + bias Fun Fact) bila belum ada.
    if (
      next.status === 'menungguKuis' &&
      next.efekTertunda?.targetPemainId === humanId &&
      !next.soalAktif
    ) {
      const [dipilih, rng2] = pilihSoal(
        next.efekTertunda.tingkatKuis,
        next.warnaAktif,
        next.rng,
        new Set(next.soalTerpakai),
        new Set(next.funFactTerlihat),
      );
      next = {
        ...next,
        rng: rng2,
        soalAktif: dipilih,
        soalTerpakai: next.soalTerpakai.includes(dipilih.id)
          ? [dipilih.id]
          : [...next.soalTerpakai, dipilih.id],
      };
    }

    // Pemicu Kartu Peristiwa & Fun Fact — logika yang sama dipakai server online.
    const prevGK = get().state?.giliranKe ?? 0;
    next = picuPeristiwaBila(next, prevGK);
    next = picuFunFactBila(next);

    // Rekam progres saat permainan baru saja usai.
    if (next.status === 'selesai' && get().state?.status !== 'selesai') {
      const stat = get().statistik;
      const rekam = tambahHasilGame(bacaProgres(), {
        menang: next.pemenangId === get().humanId,
        kuisBenar: stat.benar,
        kuisTotal: stat.total,
        streakTerbaik: stat.streakTerbaik,
        benarPerGolongan: stat.benarPerGolongan,
      });
      simpanProgres(rekam.progres);
      set({ progres: rekam.progres, rekamTerakhir: rekam });
    }

    set({ state: next, soalAktif: next.soalAktif });
  }

  function catatJawabanHuman(hasil: HasilKuis, golongan?: Golongan | 'umum') {
    const benar = hasil !== 'salah';
    set((s) => {
      const streakBenar = benar ? s.statistik.streakBenar + 1 : 0;
      const bpg = { ...s.statistik.benarPerGolongan };
      if (benar && golongan && golongan !== 'umum') {
        bpg[golongan] = (bpg[golongan] ?? 0) + 1;
      }
      return {
        statistik: {
          benar: s.statistik.benar + (benar ? 1 : 0),
          total: s.statistik.total + 1,
          streakBenar,
          streakTerbaik: Math.max(s.statistik.streakTerbaik, streakBenar),
          benarPerGolongan: bpg,
        },
      };
    });
  }

  return {
    layar: 'menu',
    keLayar: (l) => set({ layar: l }),

    state: null,
    humanId: 'human',
    soalAktif: null,
    statistik: STAT_AWAL,
    jeda: false,

    mode: 'solo',
    online: null,
    dataOnline: null,
    rekamOnlineDicatat: false,

    progres: bacaProgres(),
    rekamTerakhir: null,
    segarkanProgres: () => set({ progres: bacaProgres() }),

    sedangMembuka: false,
    selesaiMembuka: () => {
      const st = get();
      set({ sedangMembuka: false });
      if (
        st.mode === 'online' &&
        st.online &&
        st.dataOnline?.room?.host === st.online.uid
      ) {
        void kirimAksi('selesaiPembukaan', { code: st.online.code });
      }
    },

    // ── Mode online ─────────────────────────────────────────────────
    masukLobbyOnline: (code, uid) =>
      set({
        mode: 'online',
        online: { code, uid },
        dataOnline: null,
        humanId: uid,
        state: null,
        soalAktif: null,
        statistik: STAT_AWAL,
        rekamTerakhir: null,
        rekamOnlineDicatat: false,
        sedangMembuka: false,
        layar: 'online',
      }),

    pasangDataOnline: (d) => {
      const st = get();
      set({ dataOnline: d });
      if (!st.online || !d.statePublik) return;

      const next = rekonstruksiState(d.statePublik, d.tanganku, st.online.uid);
      const sebelum = st.state;

      // Lobby → papan saat host menekan "Mulai".
      if (st.layar === 'online') {
        set({
          layar: 'main',
          sedangMembuka: Boolean(next.menungguPembukaan),
        });
      }

      // Rekam progres sekali saat permainan online usai.
      if (
        next.status === 'selesai' &&
        sebelum?.status !== 'selesai' &&
        !st.rekamOnlineDicatat
      ) {
        const stat = st.statistik;
        const rekam = tambahHasilGame(bacaProgres(), {
          menang: next.pemenangId === st.online.uid,
          kuisBenar: stat.benar,
          kuisTotal: stat.total,
          streakTerbaik: stat.streakTerbaik,
          benarPerGolongan: stat.benarPerGolongan,
        });
        simpanProgres(rekam.progres);
        set({
          progres: rekam.progres,
          rekamTerakhir: rekam,
          rekamOnlineDicatat: true,
        });
      }

      set({ state: next, soalAktif: next.soalAktif });
    },

    keluarOnline: () => {
      const st = get();
      if (st.online) void kirimAksi('keluar', { code: st.online.code });
      set({
        mode: 'solo',
        online: null,
        dataOnline: null,
        state: null,
        soalAktif: null,
        humanId: 'human',
        sedangMembuka: false,
        rekamOnlineDicatat: false,
        layar: 'menu',
      });
    },

    mulaiGame: (jumlahBot, nama = 'Kamu', pakaiPeristiwa = false) => {
      konfigTerakhir = { jumlahBot, nama, pakaiPeristiwa };
      set({ mode: 'solo', online: null, dataOnline: null, humanId: 'human' });
      const pemain: OpsiPemain[] = [
        { id: 'human', nama, isBot: false },
        ...Array.from({ length: jumlahBot }, (_, i) => ({
          id: `bot${i + 1}`,
          nama: NAMA_BOT[i] ?? `Bot ${i + 1}`,
          isBot: true,
        })),
      ];
      set({
        state: buatGame(pemain, Date.now(), pakaiPeristiwa),
        soalAktif: null,
        statistik: STAT_AWAL,
        rekamTerakhir: null,
        sedangMembuka: true,
        layar: 'main',
        jeda: false,
      });
    },

    mainLagi: () => {
      if (get().mode === 'online') return get().keluarOnline();
      get().mulaiGame(
        konfigTerakhir.jumlahBot,
        konfigTerakhir.nama,
        konfigTerakhir.pakaiPeristiwa,
      );
    },
    keluarKeMenu: () => {
      if (get().mode === 'online') return get().keluarOnline();
      set({
        layar: 'menu',
        state: null,
        soalAktif: null,
        sedangMembuka: false,
      });
    },

    tutupPeristiwa: () => {
      const { state, mode, online } = get();
      if (mode === 'online') {
        if (online) void kirimAksi('lanjut', { code: online.code });
        if (state?.peristiwaAktif) set({ state: { ...state, peristiwaAktif: null } });
        return;
      }
      if (state?.peristiwaAktif)
        set({ state: { ...state, peristiwaAktif: null } });
    },

    tutupFunFact: () => {
      const { state, mode, online } = get();
      if (mode === 'online') {
        if (online) void kirimAksi('lanjut', { code: online.code });
        if (state?.funFactAktif) set({ state: { ...state, funFactAktif: null } });
        return;
      }
      if (state?.funFactAktif) set({ state: { ...state, funFactAktif: null } });
    },

    mainkan: (kartuIds, warnaWild) => {
      const { state, humanId, mode, online } = get();
      if (!state || state.status !== 'bermain') return;
      if (state.pemain[state.giliran]?.id !== humanId) return;
      const ids = Array.isArray(kartuIds) ? kartuIds : [kartuIds];
      if (ids.length === 0) return;
      sfx.kartu();
      if (mode === 'online' && online) {
        void kirimAksi('main', { code: online.code, kartuIds: ids, warnaWild });
        return;
      }
      terapkan(mainkanBerbarengan(state, humanId, ids, { warnaWild }));
    },

    tarik: () => {
      const { state, humanId, mode, online } = get();
      if (!state || state.status !== 'bermain') return;
      if (state.pemain[state.giliran]?.id !== humanId) return;
      sfx.tarik();
      if (mode === 'online' && online) {
        void kirimAksi('tarik', { code: online.code });
        return;
      }
      terapkan(tarikKartu(state, humanId));
    },

    pilihWarna: (g) => {
      const { state, humanId, mode, online } = get();
      if (!state || state.status !== 'menungguPilihWarna') return;
      if (state.pemain[state.giliran]?.id !== humanId) return;
      if (mode === 'online' && online) {
        void kirimAksi('pilihWarna', { code: online.code, golongan: g });
        return;
      }
      terapkan(pilihWarnaEngine(state, g));
    },

    jawabKuis: (hasil) => {
      const { state, humanId, soalAktif, mode, online } = get();
      if (!state || state.status !== 'menungguKuis' || !state.efekTertunda) return;
      if (state.efekTertunda.targetPemainId !== humanId) return;
      catatJawabanHuman(hasil, soalAktif?.golonganTerkait);
      set({ soalAktif: null });
      if (mode === 'online' && online) {
        void kirimAksi('jawabKuis', { code: online.code, hasil });
        return;
      }
      terapkan(selesaikanKuis(state, hasil));
    },

    stepBot: () => {
      const { state, mode } = get();
      if (!state || mode === 'online') return false;
      const current = state.pemain[state.giliran];

      if (state.status === 'bermain' && current.isBot) {
        const aksi = langkahBot(state);
        if (aksi.tipe === 'main') sfx.kartu();
        else sfx.tarik();
        terapkan(
          aksi.tipe === 'main'
            ? mainkanBerbarengan(
                state,
                current.id,
                [aksi.kartuId, ...(aksi.ekstraIds ?? [])],
                { warnaWild: aksi.warnaWild },
              )
            : tarikKartu(state, current.id),
        );
        return true;
      }

      if (state.status === 'menungguPilihWarna' && current.isBot) {
        terapkan(pilihWarnaEngine(state, warnaBotTerbaik(state, current.id)));
        return true;
      }

      if (state.status === 'menungguKuis' && state.efekTertunda) {
        const target = state.pemain.find(
          (p) => p.id === state.efekTertunda!.targetPemainId,
        )!;
        if (target.isBot) {
          const { hasil, state: s2 } = jawabKuisBot(state);
          if (hasil === 'salah') sfx.salah();
          else sfx.benar();
          set({ soalAktif: null });
          terapkan(selesaikanKuis(s2, hasil));
          return true;
        }
      }
      return false;
    },

    bersihkanReward: () => {
      const { state } = get();
      if (state?.faktaReward) set({ state: { ...state, faktaReward: null } });
    },

    bersihkanPengumuman: () => {
      const { state } = get();
      if (state?.pengumumanKuis)
        set({ state: { ...state, pengumumanKuis: null } });
    },
  };
});

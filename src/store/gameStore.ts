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
  nyatakanUno as nyatakanUnoEngine,
  tangkapUno as tangkapUnoEngine,
  stampUno,
  segarkanUno,
  cekUnoKadaluarsa,
  stampGiliran,
  diamSejakGiliran,
  AMBANG_AFK_MS,
  poinJawabanBenar,
  type GameState,
  type HasilKuis,
  type KartuKimia,
  type OpsiPemain,
} from '../game';
import { useAkunStore } from '../akun/akunStore';
import { kirimAksi, type HasilAksi } from '../online/klienOnline';
import { rekonstruksiState } from '../online/rekonstruksi';
import {
  suaraChat,
  type DiagSuara,
  type ModeSuara,
  type StatusSuara,
} from '../online/suaraChat';
import type { StatePublik } from '../online/tipe';
import type { DataRoom } from '../online/useRoomOnline';
import { simpanRoomAktif, hapusRoomTersimpan } from '../online/roomTersimpan';
import {
  bacaSoloTersimpan,
  hapusSoloTersimpan,
  simpanSoloAktif,
} from '../lib/soloTersimpan';
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
  | 'cptp'
  | 'belajar'
  | 'profil'
  | 'akun'
  | 'leaderboard'
  | 'dashboard-guru'
  | 'online';

/** Dorong progres terbaru ke akun murid (no-op bila belum masuk). */
function sinkronProgresKeAkun(p: Progres) {
  useAkunStore.getState().sinkronProgres(p);
}

export type ModeMain = 'solo' | 'online';

const NAMA_BOT = [
  'Bohr',
  'Curie',
  'Mendel',
  'Lavoisier',
  'Dalton',
  'Pauling',
];

export interface StatistikKuis {
  benar: number;
  total: number;
  streakBenar: number;
  streakTerbaik: number;
  benarPerGolongan: Partial<Record<Golongan, number>>;
}

/** Poin Peringkat Golongan + akurasi terkumpul selama satu sesi solo. */
export interface PoinSesi {
  poin: number;
  akurasi: Record<string, { benar: number; total: number }>;
}
const POIN_SESI_AWAL: PoinSesi = { poin: 0, akurasi: {} };

interface GameStore {
  layar: Layar;
  keLayar: (l: Layar) => void;

  state: GameState | null;
  humanId: string;
  /** cermin dari `state.soalAktif` — soal yang sedang ditampilkan ke pemain. */
  soalAktif: SoalKuis | null;
  statistik: StatistikKuis;
  /** Poin Peringkat Golongan sesi solo — dikirim ke akun saat game usai. */
  poinSesi: PoinSesi;
  jeda: boolean;

  /** 'solo' = lawan bot lokal · 'online' = room Supabase (server otoritatif). */
  mode: ModeMain;
  online: { code: string; uid: string } | null;
  dataOnline: DataRoom | null;
  rekamOnlineDicatat: boolean;
  /** Versi state online tertinggi yang sudah diterapkan (server/Realtime). */
  versiOnline: number;
  /** true selama aksi online sendiri menunggu balasan server (state optimistik terpasang). */
  aksiPending: boolean;
  masukLobbyOnline: (code: string, uid: string) => void;
  pasangDataOnline: (d: DataRoom) => void;
  keluarOnline: () => void;
  /** Ambil ulang state otoritatif dari server (dipakai saat aksi optimistik gagal / stale). */
  resyncOnline: () => void;

  /** Voice chat (online): mode mic + status koneksi + jumlah peer tersambung. */
  suaraMode: ModeSuara;
  suaraStatus: StatusSuara;
  suaraPeers: number;
  /** true bila audio peer tertahan kebijakan autoplay — perlu ketuk layar. */
  suaraBisu: boolean;
  suaraDiag: DiagSuara | null;
  setSuaraMode: (m: ModeSuara) => void;
  /** dipakai internal oleh useSuaraChat. */
  _setSuaraStatus: (s: StatusSuara) => void;
  _setSuaraPeers: (n: number) => void;
  _setSuaraBisu: (b: boolean) => void;
  _setSuaraDiag: (d: DiagSuara | null) => void;

  progres: Progres;
  /** Ringkasan XP/level/badge dari game yang baru selesai — utk layar GameOver. */
  rekamTerakhir: HasilRekam | null;
  segarkanProgres: () => void;

  /** true selama animasi kocok + bagi kartu di awal permainan. */
  sedangMembuka: boolean;
  selesaiMembuka: () => void;

  mulaiGame: (jumlahBot: number, nama?: string, pakaiPeristiwa?: boolean) => void;
  /** Lanjutkan game solo yang tersimpan (`soloTersimpan.ts`) — tak ada efek bila kosong. */
  lanjutkanSolo: () => void;
  mainLagi: () => void;
  keluarKeMenu: () => void;
  tutupPeristiwa: () => void;
  tutupFunFact: () => void;

  /**
   * Kartu Fun Fact / Fakta yang sudah "Lanjut" ditekan di KLIEN INI. Dipakai
   * mode online supaya tiap orang menutup kartunya sendiri (bukan bersama).
   * `funFact` = id fun fact · `fakta` = teks fakta streak.
   */
  kartuFaktaDitutup: { funFact: string | null; fakta: string | null };

  /** Mainkan 1 kartu, atau tumpuk beberapa kartu angka seperiode sekaligus. */
  mainkan: (kartuIds: string | string[], warnaWild?: Golongan) => void;
  tarik: () => void;
  pilihWarna: (g: Golongan) => void;
  jawabKuis: (hasil: HasilKuis) => void;

  /** Dipanggil oleh bot-runner: majukan satu aksi bot bila memang gilirannya. */
  stepBot: () => boolean;
  bersihkanReward: () => void;
  bersihkanPengumuman: () => void;

  /** UNO: nyatakan (diri sendiri) / tangkap (pemain lain) / cek batas waktu. */
  nyatakanUno: () => void;
  tangkapUno: (targetId: string) => void;
  cekUno: () => void;
  bersihkanPengumumanUno: () => void;
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

    // Status UNO: cap waktu + tangkap otomatis kalau kelamaan.
    next = stampUno(next);
    next = cekUnoKadaluarsa(next);

    // Jejak giliran (dipakai timer AFK di bawah).
    next = stampGiliran(next);

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
      sinkronProgresKeAkun(rekam.progres);
      // Poin Peringkat Golongan + evaluasi Misi sesi solo (menang vs bot TIDAK
      // dapat bonus besar).
      useAkunStore.getState().kirimPoinSesi({
        poin: get().poinSesi.poin,
        akurasi: get().poinSesi.akurasi,
        menang: next.pemenangId === get().humanId,
        kuisBenar: stat.benar,
        kuisSalah: stat.total - stat.benar,
        benarPerGolongan: stat.benarPerGolongan,
      });
      set({ progres: rekam.progres, rekamTerakhir: rekam });
    }

    set({ state: next, soalAktif: next.soalAktif });
  }

  function catatJawabanHuman(
    hasil: HasilKuis,
    golongan?: Golongan | 'umum',
    kesulitan?: 'mudah' | 'sedang' | 'sulit',
    tpTerkait?: number[],
  ) {
    const benar = hasil !== 'salah';
    set((s) => {
      const streakBenar = benar ? s.statistik.streakBenar + 1 : 0;
      const bpg = { ...s.statistik.benarPerGolongan };
      if (benar && golongan && golongan !== 'umum') {
        bpg[golongan] = (bpg[golongan] ?? 0) + 1;
      }

      // Poin Peringkat Golongan + akurasi sesi (dipakai mode solo).
      const g = golongan ?? 'umum';
      const akurasi = { ...s.poinSesi.akurasi };
      if (g !== 'umum') {
        const cur = akurasi[g] ?? { benar: 0, total: 0 };
        akurasi[g] = {
          benar: cur.benar + (benar ? 1 : 0),
          total: cur.total + 1,
        };
      }
      // Bukti capaian belajar per Tujuan Pembelajaran (dashboard guru).
      for (const tp of tpTerkait ?? []) {
        const key = `tp${tp}`;
        const cur = akurasi[key] ?? { benar: 0, total: 0 };
        akurasi[key] = {
          benar: cur.benar + (benar ? 1 : 0),
          total: cur.total + 1,
        };
      }
      const poin =
        s.poinSesi.poin +
        (benar && kesulitan ? poinJawabanBenar(kesulitan) : 0);

      return {
        statistik: {
          benar: s.statistik.benar + (benar ? 1 : 0),
          total: s.statistik.total + 1,
          streakBenar,
          streakTerbaik: Math.max(s.statistik.streakTerbaik, streakBenar),
          benarPerGolongan: bpg,
        },
        poinSesi: { poin, akurasi },
      };
    });
  }

  /** true bila isi tangan `uid` di `state` beda dari `tanganku` (channel `tangan`). */
  function tanganTakSama(
    state: GameState,
    tanganku: KartuKimia[],
    uid: string,
  ): boolean {
    const p = state.pemain.find((x) => x.id === uid);
    if (!p) return false;
    if (p.tangan.length !== tanganku.length) return true;
    return p.tangan.some((k, i) => k.id !== tanganku[i]?.id);
  }

  /**
   * Terapkan state publik online (dari Realtime ATAU balasan Edge Function).
   * Hanya menang bila versinya lebih baru dari yang sudah diterapkan (kecuali
   * `paksa`). Menangani transisi lobby→papan & pencatatan hasil saat game usai.
   */
  function terapkanStatePublik(
    pub: StatePublik,
    tanganku: KartuKimia[],
    soalPrivat: SoalKuis | null,
    versi: number,
    paksa = false,
  ) {
    const st = get();
    if (!st.online) return;
    // Terapkan bila: dipaksa, belum ada state sama sekali (state awal server
    // ber-versi 0), atau versinya lebih baru dari yang sudah diterapkan.
    if (!paksa && st.state && versi <= st.versiOnline) {
      // Versi `game_publik` tak lebih baru, tapi channel `tangan` (soal privat
      // & isi tangan sendiri) bisa berubah terpisah → tambal bagian itu saja.
      const soalBeda = st.state.soalAktif?.id !== soalPrivat?.id;
      const tanganBeda = tanganTakSama(st.state, tanganku, st.online.uid);
      if (soalBeda || tanganBeda) {
        const next = rekonstruksiState(
          pub,
          tanganku,
          st.online.uid,
          soalPrivat,
        );
        set({ state: next, soalAktif: next.soalAktif });
      }
      return;
    }

    const next = rekonstruksiState(pub, tanganku, st.online.uid, soalPrivat);
    const sebelum = st.state;

    if (st.layar === 'online') {
      set({ layar: 'main', sedangMembuka: Boolean(next.menungguPembukaan) });
    }

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
      sinkronProgresKeAkun(rekam.progres);
      // Poin & Misi online sudah dievaluasi server-side (Edge Function `aksi`).
      // Tarik hasil terbaru (peringkat, progres misi, badge) ke store akun.
      void useAkunStore.getState().segarkanAkun();
      set({
        progres: rekam.progres,
        rekamTerakhir: rekam,
        rekamOnlineDicatat: true,
      });
    }

    set({
      state: next,
      soalAktif: next.soalAktif,
      versiOnline: paksa ? versi : Math.max(versi, get().versiOnline),
      aksiPending: false,
    });
  }

  /** Tangani balasan Edge Function untuk aksi online sendiri. */
  function selesaikanAksiOnline(r: HasilAksi) {
    if (r.error || r.stale) {
      set({ aksiPending: false });
      get().resyncOnline(); // optimistik mungkin salah → tarik kebenaran server
      return;
    }
    if (r.statePublik && typeof r.versi === 'number') {
      terapkanStatePublik(
        r.statePublik,
        r.tanganku ?? [],
        r.soalPrivat ?? null,
        r.versi,
      );
      return;
    }
    set({ aksiPending: false });
  }

  /**
   * Timer AFK mode solo: kalau manusia diam >= `AMBANG_AFK_MS` pada
   * gilirannya sendiri (main/pilihWarna/kuis), bot pintar bantu selesaikan
   * SATU giliran — state TAK ditandai bot permanen, giliran berikutnya
   * tetap miliknya. Giliran bot lain sudah otomatis lewat `lanjutkanOtomatis`.
   */
  function otomatisBilaAfkSolo() {
    const { mode, state, humanId } = get();
    if (mode !== 'solo' || !state || state.status === 'selesai') return;
    if (diamSejakGiliran(state) < AMBANG_AFK_MS) return;

    let target: string | null = null;
    if (state.status === 'bermain' || state.status === 'menungguPilihWarna') {
      target = state.pemain[state.giliran]?.id ?? null;
    } else if (state.status === 'menungguKuis' && state.efekTertunda) {
      target = state.efekTertunda.targetPemainId;
    }
    if (target !== humanId) return;

    let next = state;
    if (state.status === 'menungguKuis') {
      const { hasil, state: s2 } = jawabKuisBot(state);
      next = selesaikanKuis(s2, hasil);
    } else if (state.status === 'menungguPilihWarna') {
      next = pilihWarnaEngine(state, warnaBotTerbaik(state, target));
    } else {
      const aksi = langkahBot(state);
      next =
        aksi.tipe === 'tarik'
          ? tarikKartu(state, target)
          : mainkanBerbarengan(
              state,
              target,
              [aksi.kartuId, ...(aksi.ekstraIds ?? [])],
              { warnaWild: aksi.warnaWild },
            );
    }
    terapkan(next);
  }
  setInterval(otomatisBilaAfkSolo, 5000);

  return {
    layar: 'menu',
    keLayar: (l) => set({ layar: l }),

    state: null,
    humanId: 'human',
    soalAktif: null,
    statistik: STAT_AWAL,
    poinSesi: POIN_SESI_AWAL,
    jeda: false,
    kartuFaktaDitutup: { funFact: null, fakta: null },

    mode: 'solo',
    online: null,
    dataOnline: null,
    rekamOnlineDicatat: false,
    versiOnline: 0,
    aksiPending: false,

    suaraMode: 'off',
    suaraStatus: 'mati',
    suaraPeers: 0,
    suaraBisu: false,
    suaraDiag: null,
    setSuaraMode: (m) => {
      set({
        suaraMode: m,
        suaraStatus: m === 'off' ? 'mati' : 'menghubungkan',
        ...(m === 'off'
          ? { suaraPeers: 0, suaraBisu: false, suaraDiag: null }
          : {}),
      });
      suaraChat.setMode(m);
    },
    _setSuaraStatus: (s) => {
      const cur = get().suaraStatus;
      // Pertahankan pesan error saat koneksi ditutup setelahnya.
      if (s === 'mati' && (cur === 'ditolak' || cur === 'gagal')) return;
      if (s === 'ditolak' || s === 'gagal') {
        set({ suaraStatus: s, suaraMode: 'off', suaraPeers: 0 });
        return;
      }
      set({ suaraStatus: s });
    },
    _setSuaraPeers: (n) => set({ suaraPeers: n }),
    _setSuaraBisu: (b) => set({ suaraBisu: b }),
    _setSuaraDiag: (d) => set({ suaraDiag: d }),

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
        void kirimAksi('selesaiPembukaan', { code: st.online.code }).then(
          selesaikanAksiOnline,
        );
      }
    },

    // ── Mode online ─────────────────────────────────────────────────
    masukLobbyOnline: (code, uid) => {
      simpanRoomAktif(code, uid);
      set({
        mode: 'online',
        online: { code, uid },
        dataOnline: null,
        humanId: uid,
        state: null,
        soalAktif: null,
        statistik: STAT_AWAL,
        poinSesi: POIN_SESI_AWAL,
        rekamTerakhir: null,
        rekamOnlineDicatat: false,
        versiOnline: 0,
        aksiPending: false,
        sedangMembuka: false,
        kartuFaktaDitutup: { funFact: null, fakta: null },
        layar: 'online',
      });
    },

    pasangDataOnline: (d) => {
      set({ dataOnline: d });
      const st = get();
      if (!st.online || !d.statePublik) return;
      // Gate versi: push Realtime yang tak lebih baru diabaikan (mis. hasil
      // fetch roster) supaya state optimistik tak ke-timpa mundur.
      terapkanStatePublik(d.statePublik, d.tanganku, d.soalku, d.versi);
    },

    resyncOnline: () => {
      const { online } = get();
      if (!online) return;
      void kirimAksi('sync', { code: online.code }).then((r) => {
        if (r.statePublik && typeof r.versi === 'number') {
          terapkanStatePublik(
            r.statePublik,
            (r.tanganku as KartuKimia[]) ?? [],
            r.soalPrivat ?? null,
            r.versi,
            true,
          );
        } else {
          set({ aksiPending: false });
        }
      });
    },

    keluarOnline: () => {
      const st = get();
      if (st.online) void kirimAksi('keluar', { code: st.online.code });
      suaraChat.putus();
      hapusRoomTersimpan();
      set({
        mode: 'solo',
        online: null,
        dataOnline: null,
        state: null,
        soalAktif: null,
        humanId: 'human',
        sedangMembuka: false,
        rekamOnlineDicatat: false,
        versiOnline: 0,
        aksiPending: false,
        suaraMode: 'off',
        suaraStatus: 'mati',
        suaraPeers: 0,
        suaraBisu: false,
        suaraDiag: null,
        layar: 'menu',
      });
    },

    mulaiGame: (jumlahBot, nama = 'Kamu', pakaiPeristiwa = false) => {
      konfigTerakhir = { jumlahBot, nama, pakaiPeristiwa };
      set({
        mode: 'solo',
        online: null,
        dataOnline: null,
        humanId: 'human',
        versiOnline: 0,
        aksiPending: false,
      });
      const pemain: OpsiPemain[] = [
        { id: 'human', nama, isBot: false },
        ...Array.from({ length: jumlahBot }, (_, i) => ({
          id: `bot${i + 1}`,
          nama: NAMA_BOT[i] ?? `Bot ${i + 1}`,
          isBot: true,
        })),
      ];
      set({
        state: buatGame(pemain, Date.now(), pakaiPeristiwa, true),
        soalAktif: null,
        statistik: STAT_AWAL,
        poinSesi: POIN_SESI_AWAL,
        rekamTerakhir: null,
        sedangMembuka: true,
        kartuFaktaDitutup: { funFact: null, fakta: null },
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
    lanjutkanSolo: () => {
      const d = bacaSoloTersimpan();
      if (!d) return;
      set({
        mode: 'solo',
        online: null,
        dataOnline: null,
        versiOnline: 0,
        aksiPending: false,
        state: d.state,
        humanId: d.humanId,
        soalAktif: d.soalAktif,
        statistik: d.statistik,
        poinSesi: d.poinSesi,
        kartuFaktaDitutup: d.kartuFaktaDitutup,
        jeda: d.jeda,
        rekamTerakhir: d.rekamTerakhir,
        sedangMembuka: false,
        layar: 'main',
      });
    },
    keluarKeMenu: () => {
      if (get().mode === 'online') return get().keluarOnline();
      hapusSoloTersimpan();
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
        if (online)
          void kirimAksi('lanjut', { code: online.code }).then(
            selesaikanAksiOnline,
          );
        if (state?.peristiwaAktif) set({ state: { ...state, peristiwaAktif: null } });
        return;
      }
      if (state?.peristiwaAktif)
        set({
          state: stampUno(segarkanUno({ ...state, peristiwaAktif: null })),
        });
    },

    tutupFunFact: () => {
      const { state, mode } = get();
      if (!state?.funFactAktif) return;
      if (mode === 'online') {
        // Per orang: cukup tandai ditutup di klien ini — server tidak diberi
        // tahu, pemain lain tetap bisa membaca sampai menekan "Lanjut" sendiri.
        set((s) => ({
          kartuFaktaDitutup: {
            ...s.kartuFaktaDitutup,
            funFact: state.funFactAktif!.id,
          },
        }));
        return;
      }
      set({ state: stampUno(segarkanUno({ ...state, funFactAktif: null })) });
    },

    mainkan: (kartuIds, warnaWild) => {
      const { state, humanId, mode, online } = get();
      if (!state || state.status !== 'bermain') return;
      if (state.pemain[state.giliran]?.id !== humanId) return;
      const ids = Array.isArray(kartuIds) ? kartuIds : [kartuIds];
      if (ids.length === 0) return;
      sfx.kartu();
      if (mode === 'online' && online) {
        // Optimistik: terapkan langsung dengan engine (tangan sendiri sudah
        // pasti); server mengoreksi lewat balasannya ~1 dtk kemudian.
        try {
          const opt = stampUno(
            mainkanBerbarengan(state, humanId, ids, { warnaWild }),
          );
          set({ state: opt, soalAktif: opt.soalAktif, aksiPending: true });
        } catch {
          /* biar server yang menilai */
        }
        void kirimAksi('main', {
          code: online.code,
          kartuIds: ids,
          warnaWild,
        }).then(selesaikanAksiOnline);
        return;
      }
      terapkan(mainkanBerbarengan(state, humanId, ids, { warnaWild }));
    },

    tarik: () => {
      const { state, humanId, mode, online } = get();
      if (!state || state.status !== 'bermain') return;
      if (state.pemain[state.giliran]?.id !== humanId) return;
      if (get().aksiPending) return;
      sfx.tarik();
      if (mode === 'online' && online) {
        // Kartu yang ditarik hanya diketahui server → tak dioptimis, tapi
        // kunci input sampai balasan datang.
        set({ aksiPending: true });
        void kirimAksi('tarik', { code: online.code }).then(selesaikanAksiOnline);
        return;
      }
      terapkan(tarikKartu(state, humanId));
    },

    pilihWarna: (g) => {
      const { state, humanId, mode, online } = get();
      if (!state || state.status !== 'menungguPilihWarna') return;
      if (state.pemain[state.giliran]?.id !== humanId) return;
      if (mode === 'online' && online) {
        set({ state: stampUno(pilihWarnaEngine(state, g)), aksiPending: true });
        void kirimAksi('pilihWarna', {
          code: online.code,
          golongan: g,
        }).then(selesaikanAksiOnline);
        return;
      }
      terapkan(pilihWarnaEngine(state, g));
    },

    jawabKuis: (hasil) => {
      const { state, humanId, soalAktif, mode, online } = get();
      if (!state || state.status !== 'menungguKuis' || !state.efekTertunda) return;
      if (state.efekTertunda.targetPemainId !== humanId) return;
      catatJawabanHuman(
        hasil,
        soalAktif?.golonganTerkait,
        soalAktif?.tingkatKesulitan,
        soalAktif?.tpTerkait,
      );
      set({ soalAktif: null });
      if (mode === 'online' && online) {
        set({ aksiPending: true });
        void kirimAksi('jawabKuis', {
          code: online.code,
          hasil,
        }).then(selesaikanAksiOnline);
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
      const { state, mode } = get();
      if (!state?.faktaReward) return;
      if (mode === 'online') {
        set((s) => ({
          kartuFaktaDitutup: {
            ...s.kartuFaktaDitutup,
            fakta: state.faktaReward!.teks,
          },
        }));
        return;
      }
      set({ state: stampUno(segarkanUno({ ...state, faktaReward: null })) });
    },

    bersihkanPengumuman: () => {
      const { state } = get();
      if (state?.pengumumanKuis)
        set({ state: { ...state, pengumumanKuis: null } });
    },

    nyatakanUno: () => {
      const { state, humanId, mode, online } = get();
      if (!state?.uno || state.uno.pemainId !== humanId || state.uno.dinyatakan)
        return;
      sfx.benar();
      if (mode === 'online' && online) {
        set({ state: nyatakanUnoEngine(state, humanId) });
        void kirimAksi('nyatakanUno', { code: online.code }).then(
          selesaikanAksiOnline,
        );
        return;
      }
      terapkan(nyatakanUnoEngine(state, humanId));
    },

    tangkapUno: (targetId) => {
      const { state, humanId, mode, online } = get();
      if (!state?.uno || state.uno.pemainId !== targetId || state.uno.dinyatakan)
        return;
      sfx.ledakan();
      if (mode === 'online' && online) {
        set({ state: tangkapUnoEngine(state, humanId, targetId) });
        void kirimAksi('tangkapUno', {
          code: online.code,
          target: targetId,
        }).then(selesaikanAksiOnline);
        return;
      }
      terapkan(tangkapUnoEngine(state, humanId, targetId));
    },

    cekUno: () => {
      const { state, mode, online } = get();
      if (!state?.uno || state.uno.dinyatakan || state.uno.padaMs === 0) return;
      if (mode === 'online') {
        if (online)
          void kirimAksi('cekUno', { code: online.code }).then(
            selesaikanAksiOnline,
          );
        return;
      }
      const next = cekUnoKadaluarsa(state);
      if (next !== state) terapkan(next);
    },

    bersihkanPengumumanUno: () => {
      const { state } = get();
      if (state?.pengumumanUno)
        set({ state: { ...state, pengumumanUno: null } });
    },
  };
});

// Simpan progres game SOLO otomatis tiap ada perubahan (refresh tak sengaja
// tak lagi menghilangkan game yang sedang berjalan — lihat `lanjutkanSolo`).
// TAK menghapus di sini biarpun `state` kosong — itu kondisi normal setiap
// boot aplikasi (sebelum sempat "Lanjutkan" diklik) atau saat mode online,
// dan akan menghapus save valid dari sesi sebelumnya kalau dianggap sinyal
// "keluar". Satu-satunya penghapus eksplisit: `keluarKeMenu` (solo).
useGameStore.subscribe((s) => {
  if (s.mode !== 'solo' || !s.state) return;
  simpanSoloAktif({
    state: s.state,
    humanId: s.humanId,
    soalAktif: s.soalAktif,
    statistik: s.statistik,
    poinSesi: s.poinSesi,
    kartuFaktaDitutup: s.kartuFaktaDitutup,
    jeda: s.jeda,
    rekamTerakhir: s.rekamTerakhir,
  });
});

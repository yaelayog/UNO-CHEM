import { useMemo } from 'react';
import { langkahLegal, kartuAtas } from '../game';
import { useGameStore } from '../store/gameStore';
import { useBotRunner } from '../hooks/useBotRunner';
import { useSoundEffects } from '../hooks/useSoundEffects';
import { useGuncang } from '../hooks/useGuncang';
import { useUnoTick } from '../hooks/useUnoTick';
import { Hand } from './Hand';
import { MejaPanggung } from './MejaPanggung';
import { TargetCocok } from './DiscardPile';
import { QuizModal } from './QuizModal';
import { ColorPicker } from './ColorPicker';
import { FaktaModal } from './FaktaModal';
import { KuisToast } from './KuisToast';
import { TombolUno } from './TombolUno';
import { UnoToast } from './UnoToast';
import { PeristiwaModal } from './PeristiwaModal';
import { FunFactModal } from './FunFactModal';
import { PengaturanSuara } from './PengaturanSuara';
import { KontrolSuara } from './KontrolSuara';
import { PembukaanMeja } from './PembukaanMeja';
import { GameOver } from './GameOver';
import { Confetti } from './Confetti';

export function GameBoard() {
  useBotRunner();
  useSoundEffects();
  useUnoTick();
  const guncang = useGuncang();

  const state = useGameStore((s) => s.state);
  const humanId = useGameStore((s) => s.humanId);
  const modeMain = useGameStore((s) => s.mode);
  const aksiPending = useGameStore((s) => s.aksiPending);
  const soalAktif = useGameStore((s) => s.soalAktif);
  const statistik = useGameStore((s) => s.statistik);
  const rekamTerakhir = useGameStore((s) => s.rekamTerakhir);
  const mainkan = useGameStore((s) => s.mainkan);
  const tarik = useGameStore((s) => s.tarik);
  const pilihWarna = useGameStore((s) => s.pilihWarna);
  const jawabKuis = useGameStore((s) => s.jawabKuis);
  const bersihkanReward = useGameStore((s) => s.bersihkanReward);
  const kartuFaktaDitutup = useGameStore((s) => s.kartuFaktaDitutup);
  const bersihkanPengumuman = useGameStore((s) => s.bersihkanPengumuman);
  const nyatakanUno = useGameStore((s) => s.nyatakanUno);
  const tangkapUno = useGameStore((s) => s.tangkapUno);
  const bersihkanPengumumanUno = useGameStore((s) => s.bersihkanPengumumanUno);
  const tutupPeristiwa = useGameStore((s) => s.tutupPeristiwa);
  const tutupFunFact = useGameStore((s) => s.tutupFunFact);
  const mainLagi = useGameStore((s) => s.mainLagi);
  const keluarKeMenu = useGameStore((s) => s.keluarKeMenu);
  const sedangMembuka = useGameStore((s) => s.sedangMembuka);
  const selesaiMembuka = useGameStore((s) => s.selesaiMembuka);

  const legalIds = useMemo(() => {
    if (!state) return new Set<string>();
    const current = state.pemain[state.giliran];
    if (state.status !== 'bermain' || current.id !== humanId) return new Set<string>();
    return new Set(langkahLegal(state, humanId));
  }, [state, humanId]);

  if (!state) return null;

  const human = state.pemain.find((p) => p.id === humanId)!;
  const current = state.pemain[state.giliran];
  const membuka = sedangMembuka || Boolean(state.menungguPembukaan);
  const giliranHuman =
    !membuka &&
    state.status === 'bermain' &&
    current.id === humanId &&
    !aksiPending; // aksi online sedang menunggu konfirmasi server
  const atas = kartuAtas(state);

  const kuisHuman =
    state.status === 'menungguKuis' &&
    state.efekTertunda?.targetPemainId === humanId &&
    soalAktif;
  const pilihWarnaHuman =
    state.status === 'menungguPilihWarna' && current.id === humanId;

  // Giliran pemain tetapi tak ada kartu yang cocok → tumpukan tarik berkedip
  // (efek petir) supaya jelas harus menarik kartu.
  const wajibTarik = giliranHuman && legalIds.size === 0;

  // Balapan UNO sedang aktif → kartu Fun Fact / Fakta ditahan dulu supaya papan
  // & tombol UNO kelihatan (siapa cepat dia dapat).
  const balapanUno = Boolean(
    state.uno &&
      !state.uno.dinyatakan &&
      state.pemain.find((p) => p.id === state.uno!.pemainId)?.tangan.length ===
        1,
  );

  // Kartu Fun Fact / Fakta: di mode online tiap orang menutup sendiri
  // (lihat `kartuFaktaDitutup`), di solo cukup cek state.
  const funFactTampil =
    Boolean(state.funFactAktif) &&
    !state.peristiwaAktif &&
    !balapanUno &&
    kartuFaktaDitutup.funFact !== state.funFactAktif?.id;
  const faktaTampil =
    Boolean(state.faktaReward) &&
    !state.peristiwaAktif &&
    !balapanUno &&
    !funFactTampil &&
    kartuFaktaDitutup.fakta !== state.faktaReward?.teks;

  const petunjuk = giliranHuman
    ? legalIds.size > 0
      ? 'Giliranmu — pilih kartu yang menyala atau tarik kartu'
      : 'Tidak ada kartu cocok — tarik kartu'
    : state.status === 'menungguKuis'
      ? `${current.nama} menunggu hasil kuis…`
      : `Giliran ${current.nama}…`;

  return (
    <div
      className={`mx-auto flex h-full max-h-[100dvh] max-w-2xl flex-col overflow-hidden pt-[env(safe-area-inset-top)] no-select ${guncang ? 'animasi-guncang' : ''}`}
    >
      {/* Bilah atas */}
      <header className="relative flex shrink-0 items-center justify-between px-3 py-2 text-xs font-bold text-tinta/70">
        <button
          type="button"
          onClick={keluarKeMenu}
          className="flex min-h-9 items-center rounded-full bg-white/70 px-3 shadow-empuk cursor-pointer hover:bg-white"
        >
          ← Menu
        </button>
        <span className="flex items-center gap-2">
          <span className="hidden xs:inline">
            {state.arah === 1 ? '↻ searah' : '↺ berlawanan'}
          </span>
          <span className="flex min-h-9 items-center rounded-full bg-white/70 px-2.5">
            Kuis {statistik.benar}/{statistik.total}
          </span>
          {modeMain === 'online' && <KontrolSuara />}
          <PengaturanSuara />
        </span>
      </header>

      {/* Meja 2.5D — lawan duduk mengelilingi */}
      <MejaPanggung
        state={state}
        humanId={humanId}
        atas={atas}
        bisaTarik={giliranHuman}
        wajibTarik={wajibTarik}
        onTarik={tarik}
      />

      {/* Tangan pemain */}
      <div className="relative z-10 shrink-0 border-t border-black/5 bg-white/60 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm">
        <div className="flex flex-col items-center gap-1 pt-1.5">
          <TargetCocok
            warnaAktif={state.warnaAktif}
            angkaAktif={state.angkaAktif}
          />
          <p className="min-h-[1rem] text-center text-[11px] font-bold text-tinta/55">
            {petunjuk}
          </p>
        </div>
        <div className="flex items-center justify-between px-4 text-xs font-bold text-tinta/70">
          <span>{human.nama}</span>
          <span>
            {human.tangan.length} kartu
            {human.tangan.length === 1 && (
              <span className="ml-1 rounded-full bg-alkali px-1.5 text-[10px] text-white">
                UNO!
              </span>
            )}
          </span>
        </div>
        {membuka ? (
          <div className="h-[132px]" />
        ) : (
          <Hand
            kartu={human.tangan}
            legalIds={legalIds}
            giliranPemain={giliranHuman}
            onMainkan={(ids) => mainkan(ids)}
          />
        )}
      </div>

      {/* Overlay */}
      <KuisToast
        pengumuman={state.pengumumanKuis}
        onTutup={bersihkanPengumuman}
      />
      <UnoToast
        pengumuman={state.pengumumanUno}
        onTutup={bersihkanPengumumanUno}
      />
      {!membuka && state.status !== 'selesai' && (
        <TombolUno
          state={state}
          humanId={humanId}
          onNyatakan={nyatakanUno}
          onTangkap={tangkapUno}
        />
      )}

      {kuisHuman && state.efekTertunda && (
        <QuizModal
          soal={soalAktif}
          penaltiDasar={state.efekTertunda.penaltiDasar}
          jenisEfek={state.efekTertunda.jenis}
          judulKartu={atas.judulEfek ?? 'Kuis'}
          namaTarget={human.nama}
          onSelesai={jawabKuis}
        />
      )}

      {pilihWarnaHuman && (
        <ColorPicker judul={atas.judulEfek ?? 'Katalis'} onPilih={pilihWarna} />
      )}

      {state.peristiwaAktif && (
        <PeristiwaModal
          peristiwa={state.peristiwaAktif}
          onTutup={tutupPeristiwa}
        />
      )}

      {funFactTampil && state.funFactAktif && (
        <FunFactModal fakta={state.funFactAktif} onTutup={tutupFunFact} />
      )}

      {faktaTampil && state.faktaReward && (
        <FaktaModal reward={state.faktaReward} onLanjut={bersihkanReward} />
      )}

      {state.status === 'selesai' && (
        <>
          {state.pemenangId === humanId && <Confetti />}
          <GameOver
            state={state}
            humanId={humanId}
            statistik={statistik}
            rekam={rekamTerakhir}
            onMainLagi={mainLagi}
            onMenu={keluarKeMenu}
          />
        </>
      )}

      {membuka && (
        <PembukaanMeja
          jumlahPemain={state.pemain.length}
          onSelesai={selesaiMembuka}
        />
      )}
    </div>
  );
}

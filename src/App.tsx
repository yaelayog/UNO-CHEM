import { lazy, Suspense, useEffect } from 'react';
import { MotionConfig } from 'framer-motion';
import { useGameStore } from './store/gameStore';
import { useAkunStore } from './akun/akunStore';
import { MainMenu } from './screens/MainMenu';
import { Memuat } from './components/Memuat';
import { LatarLab } from './components/LatarLab';
import { MisiToast } from './components/MisiToast';
import { OnlineSync } from './online/OnlineSync';

const OnlineLobby = lazy(() =>
  import('./screens/OnlineLobby').then((m) => ({ default: m.OnlineLobby })),
);

const GameBoard = lazy(() =>
  import('./components/GameBoard').then((m) => ({ default: m.GameBoard })),
);
const ProfilScreen = lazy(() =>
  import('./screens/ProfilScreen').then((m) => ({ default: m.ProfilScreen })),
);
const BelajarScreen = lazy(() =>
  import('./screens/BelajarScreen').then((m) => ({ default: m.BelajarScreen })),
);
const AkunScreen = lazy(() =>
  import('./screens/AkunScreen').then((m) => ({ default: m.AkunScreen })),
);
const LeaderboardScreen = lazy(() =>
  import('./screens/LeaderboardScreen').then((m) => ({
    default: m.LeaderboardScreen,
  })),
);
const DashboardGuruScreen = lazy(() =>
  import('./screens/DashboardGuruScreen').then((m) => ({
    default: m.DashboardGuruScreen,
  })),
);
const RulesScreen = lazy(() =>
  import('./screens/InfoScreen').then((m) => ({ default: m.RulesScreen })),
);
const AboutScreen = lazy(() =>
  import('./screens/InfoScreen').then((m) => ({ default: m.AboutScreen })),
);
const CPTPScreen = lazy(() =>
  import('./screens/CPTPScreen').then((m) => ({ default: m.CPTPScreen })),
);

export default function App() {
  const layar = useGameStore((s) => s.layar);
  const muatAkun = useAkunStore((s) => s.muat);

  useEffect(() => {
    void muatAkun();
  }, [muatAkun]);

  let isi;
  switch (layar) {
    case 'main':
      isi = <GameBoard />;
      break;
    case 'aturan':
      isi = <RulesScreen />;
      break;
    case 'tentang':
      isi = <AboutScreen />;
      break;
    case 'cptp':
      isi = <CPTPScreen />;
      break;
    case 'profil':
      isi = <ProfilScreen />;
      break;
    case 'belajar':
      isi = <BelajarScreen />;
      break;
    case 'akun':
      isi = <AkunScreen />;
      break;
    case 'leaderboard':
      isi = <LeaderboardScreen />;
      break;
    case 'dashboard-guru':
      isi = <DashboardGuruScreen />;
      break;
    case 'online':
      isi = <OnlineLobby />;
      break;
    default:
      isi = <MainMenu />;
  }

  return (
    <MotionConfig reducedMotion="user">
      <LatarLab />
      <OnlineSync />
      <MisiToast />
      <div key={layar} className="animasi-layar relative z-10 h-full">
        <Suspense fallback={<Memuat />}>{isi}</Suspense>
      </div>
      <div className="putar-hp">
        <div className="rounded-2xl bg-white px-6 py-4 text-center font-bold text-tinta shadow-empuk">
          <div className="text-3xl">📱↻</div>
          Putar HP ke posisi tegak untuk bermain
        </div>
      </div>
    </MotionConfig>
  );
}

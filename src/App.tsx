import { lazy, Suspense } from 'react';
import { MotionConfig } from 'framer-motion';
import { useGameStore } from './store/gameStore';
import { MainMenu } from './screens/MainMenu';
import { Memuat } from './components/Memuat';
import { LatarLab } from './components/LatarLab';
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
const RulesScreen = lazy(() =>
  import('./screens/InfoScreen').then((m) => ({ default: m.RulesScreen })),
);
const AboutScreen = lazy(() =>
  import('./screens/InfoScreen').then((m) => ({ default: m.AboutScreen })),
);

export default function App() {
  const layar = useGameStore((s) => s.layar);

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
    case 'profil':
      isi = <ProfilScreen />;
      break;
    case 'belajar':
      isi = <BelajarScreen />;
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

import { useEffect, useRef, useState } from 'react';
import { KartuFaktaLayar } from './KartuFaktaLayar';
import type { FunFactAktif } from '../game';

interface Props {
  fakta: FunFactAktif;
  onTutup: () => void;
}

/**
 * Kartu "Fun Fact" layar-penuh — muncul tiap 1 putaran. Tampil selama
 * `fakta.bacaDetik` detik (15–30, dari panjang teks) dengan bilah hitung mundur,
 * lalu auto-lanjut. Pemain bisa menekan "Lanjut" untuk melewati lebih cepat.
 */
export function FunFactModal({ fakta, onTutup }: Props) {
  const total = fakta.bacaDetik;
  const mulai = useRef(performance.now());
  const [sisa, setSisa] = useState(total);

  useEffect(() => {
    mulai.current = performance.now();
    setSisa(total);
    const id = setInterval(() => {
      const lewat = (performance.now() - mulai.current) / 1000;
      const s = Math.max(0, total - lewat);
      setSisa(s);
      if (s <= 0) onTutup();
    }, 200);
    return () => clearInterval(id);
  }, [fakta.id, total, onTutup]);

  return (
    <KartuFaktaLayar
      ikon={fakta.ikon}
      kicker="Fun Fact"
      golongan={fakta.golongan}
      teks={fakta.teks}
      catatan="💡 Simak baik-baik — bisa membantu kuis nanti"
      sisaDetik={sisa}
      totalDetik={total}
      onLanjut={onTutup}
    />
  );
}

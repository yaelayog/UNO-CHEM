import { jawabKuisBot, langkahBot, warnaBotTerbaik } from './bot';
import {
  mainkanBerbarengan,
  nyatakanUno,
  pilihWarna,
  selesaikanKuis,
  tarikKartu,
} from './engine';
import { picuFunFactBila } from './funfact';
import { pilihSoal } from './kuis';
import { picuPeristiwaBila } from './peristiwa';
import { rngNext } from './rng';
import type { GameState } from './types';

const BATAS_ITERASI = 600;

/** Jalankan pemicu Peristiwa & Fun Fact seperti `gameStore.terapkan`. */
function pemicu(state: GameState, giliranKeSebelum: number): GameState {
  if (state.status !== 'bermain') return state;
  let s = picuPeristiwaBila(state, giliranKeSebelum);
  s = picuFunFactBila(s);
  return s;
}

function pemainSaatIni(state: GameState) {
  return state.pemain[state.giliran];
}

/**
 * Memajukan seluruh langkah OTOMATIS (bot main, bot jawab kuis, bot pilih warna,
 * pemicu Peristiwa & Fun Fact) sampai permainan butuh input MANUSIA, selesai,
 * atau menampilkan modal (Peristiwa / Fun Fact / animasi pembukaan).
 *
 * Fungsi murni & deterministik (RNG di dalam state). Dipakai server (Edge
 * Function) sebagai otoritas permainan online. Aman dipanggil berulang / saat
 * sudah giliran manusia (langsung kembali tanpa perubahan).
 */
export function lanjutkanOtomatis(state: GameState): GameState {
  let s = state;

  for (let i = 0; i < BATAS_ITERASI; i++) {
    if (
      s.status === 'selesai' ||
      s.menungguPembukaan ||
      s.peristiwaAktif ||
      s.funFactAktif
    ) {
      return s;
    }

    if (s.status === 'menungguKuis' && s.efekTertunda) {
      const target = s.pemain.find(
        (p) => p.id === s.efekTertunda!.targetPemainId,
      );
      if (target?.isBot) {
        const gk = s.giliranKe;
        const { hasil, state: s2 } = jawabKuisBot(s);
        s = pemicu(selesaikanKuis(s2, hasil), gk);
        continue;
      }
      // Kuis untuk manusia → siapkan soal lalu berhenti.
      if (!s.soalAktif) {
        const [dipilih, rng2] = pilihSoal(
          s.efekTertunda.tingkatKuis,
          s.warnaAktif,
          s.rng,
          new Set(s.soalTerpakai),
          new Set(s.funFactTerlihat),
        );
        s = {
          ...s,
          rng: rng2,
          soalAktif: dipilih,
          soalTerpakai: s.soalTerpakai.includes(dipilih.id)
            ? [dipilih.id]
            : [...s.soalTerpakai, dipilih.id],
        };
      }
      return s;
    }

    if (s.status === 'menungguPilihWarna') {
      const kini = pemainSaatIni(s);
      if (!kini.isBot) return s;
      const gk = s.giliranKe;
      s = pemicu(pilihWarna(s, warnaBotTerbaik(s, kini.id)), gk);
      continue;
    }

    if (s.status === 'bermain') {
      const kini = pemainSaatIni(s);
      if (!kini.isBot) return s;
      const gk = s.giliranKe;
      const aksi = langkahBot(s);
      let next =
        aksi.tipe === 'main'
          ? mainkanBerbarengan(
              s,
              kini.id,
              [aksi.kartuId, ...(aksi.ekstraIds ?? [])],
              { warnaWild: aksi.warnaWild },
            )
          : tarikKartu(s, kini.id);

      // Bot bilang "UNO!" ~80% saat sisa 1 kartu (20% lupa → bisa ditangkap).
      if (next.uno && next.uno.pemainId === kini.id && !next.uno.dinyatakan) {
        const [roll, rng2] = rngNext(next.rng);
        next = { ...next, rng: rng2 };
        if (roll < 0.8) next = nyatakanUno(next, kini.id);
      }

      s = pemicu(next, gk);
      continue;
    }

    return s;
  }

  return s;
}

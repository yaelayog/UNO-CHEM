// PRNG deterministik (mulberry32). "State" RNG adalah satu integer yang
// ikut disimpan di GameState, sehingga seluruh jalannya permainan bisa
// direproduksi ulang dari (seed + urutan aksi) — penting untuk validasi
// langkah di server pada Fase 3.

/** Menghasilkan [nilai 0..1, stateBerikutnya] dari state RNG saat ini. */
export function rngNext(state: number): [number, number] {
  let a = state | 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  const nilai = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return [nilai, a];
}

/** Bilangan bulat 0..(batas-1). */
export function rngInt(state: number, batas: number): [number, number] {
  const [nilai, next] = rngNext(state);
  return [Math.floor(nilai * batas), next];
}

/** Fisher–Yates murni: mengembalikan array baru + state RNG baru. */
export function kocok<T>(arr: readonly T[], state: number): [T[], number] {
  const hasil = arr.slice();
  let s = state;
  for (let i = hasil.length - 1; i > 0; i--) {
    let j: number;
    [j, s] = rngInt(s, i + 1);
    [hasil[i], hasil[j]] = [hasil[j], hasil[i]];
  }
  return [hasil, s];
}

/** Ubah string/seed apa pun menjadi integer state RNG awal. */
export function seedDari(input: string | number): number {
  if (typeof input === 'number') return input | 0;
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h | 0;
}

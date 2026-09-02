// Efek suara + musik latar sintetis via Web Audio API — nol file, ramah offline.
// AudioContext dibuat malas & di-resume pada gesture pertama (kebijakan autoplay).

const KEY_MUTE = 'chemuno:mute';
const KEY_MUSIK = 'chemuno:musik';
const KEY_VOL_SFX = 'chemuno:vol-sfx';
const KEY_VOL_MUSIK = 'chemuno:vol-musik';

let ctx: AudioContext | null = null;
let masterSfx: GainNode | null = null;
let masterMusik: GainNode | null = null;
let bufferDerau: AudioBuffer | null = null;

let muted = bacaBool(KEY_MUTE, false);
let musikNyala = bacaBool(KEY_MUSIK, true);
let volSfx = bacaNum(KEY_VOL_SFX, 0.8);
let volMusik = bacaNum(KEY_VOL_MUSIK, 0.5);

function bacaBool(k: string, d: boolean): boolean {
  try {
    const v = localStorage.getItem(k);
    return v === null ? d : v === '1';
  } catch {
    return d;
  }
}
function bacaNum(k: string, d: number): number {
  try {
    const v = parseFloat(localStorage.getItem(k) ?? '');
    return Number.isFinite(v) ? v : d;
  } catch {
    return d;
  }
}
function simpan(k: string, v: string) {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* abaikan */
  }
}

function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
    } catch {
      return null;
    }
    masterSfx = ctx.createGain();
    masterMusik = ctx.createGain();
    masterSfx.gain.value = muted ? 0 : volSfx;
    masterMusik.gain.value = muted || !musikNyala ? 0 : volMusik * 0.5;
    masterSfx.connect(ctx.destination);
    masterMusik.connect(ctx.destination);

    // buffer derau putih (1 dtk) untuk whoosh & dentum
    bufferDerau = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = bufferDerau.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

// Buka audio + mulai musik pada interaksi pertama pengguna.
if (typeof window !== 'undefined') {
  const buka = () => {
    ac();
    if (musikNyala) mulaiMusik();
    window.removeEventListener('pointerdown', buka);
    window.removeEventListener('keydown', buka);
  };
  window.addEventListener('pointerdown', buka);
  window.addEventListener('keydown', buka);
}

// ── util nada ───────────────────────────────────────────────────────
interface NadaOpts {
  freq: number;
  dur?: number;
  type?: OscillatorType;
  gain?: number;
  delay?: number;
  sweepTo?: number;
  ke?: AudioNode;
}

function nada({
  freq,
  dur = 0.12,
  type = 'sine',
  gain = 0.14,
  delay = 0,
  sweepTo,
  ke,
}: NadaOpts): void {
  const c = ac();
  if (!c || !masterSfx) return;
  const tujuan = ke ?? masterSfx;
  const t0 = c.currentTime + delay;

  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (sweepTo) osc.frequency.exponentialRampToValueAtTime(sweepTo, t0 + dur);

  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  osc.connect(g).connect(tujuan);
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
}

function derau(dur: number, gain: number, filter: 'lowpass' | 'bandpass' | 'highpass', freq: number, sweepTo?: number, delay = 0): void {
  const c = ac();
  if (!c || !masterSfx || !bufferDerau) return;
  const t0 = c.currentTime + delay;
  const src = c.createBufferSource();
  src.buffer = bufferDerau;
  const flt = c.createBiquadFilter();
  flt.type = filter;
  flt.frequency.setValueAtTime(freq, t0);
  if (sweepTo) flt.frequency.exponentialRampToValueAtTime(sweepTo, t0 + dur);
  flt.Q.value = filter === 'bandpass' ? 6 : 1;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(flt).connect(g).connect(masterSfx);
  src.start(t0);
  src.stop(t0 + dur + 0.03);
}

function deret(freqs: number[], opts: Omit<NadaOpts, 'freq'>, jeda = 0.09): void {
  freqs.forEach((f, i) =>
    nada({ ...opts, freq: f, delay: (opts.delay ?? 0) + i * jeda }),
  );
}

// ── SFX ─────────────────────────────────────────────────────────────
export const sfx = {
  kartu: () => {
    derau(0.14, 0.08, 'bandpass', 1400, 500);
    nada({ freq: 380, dur: 0.07, type: 'triangle', gain: 0.08, sweepTo: 260 });
  },
  pop: () => {
    nada({ freq: 520, dur: 0.09, type: 'sine', gain: 0.16, sweepTo: 180 });
    derau(0.05, 0.05, 'lowpass', 900);
  },
  tarik: () => {
    derau(0.16, 0.07, 'bandpass', 700, 300);
    nada({ freq: 200, dur: 0.13, type: 'sine', gain: 0.09, sweepTo: 130 });
  },
  giliran: () => deret([523, 784], { dur: 0.13, type: 'sine', gain: 0.08 }, 0.08),
  benar: () => {
    deret([523, 659, 784, 1047], { dur: 0.13, type: 'triangle', gain: 0.12 }, 0.07);
    nada({ freq: 2093, dur: 0.5, type: 'sine', gain: 0.05, delay: 0.28 });
  },
  salah: () => {
    nada({ freq: 240, dur: 0.28, type: 'sawtooth', gain: 0.1, sweepTo: 110 });
    nada({ freq: 180, dur: 0.3, type: 'square', gain: 0.05, sweepTo: 90, delay: 0.04 });
  },
  reward: () =>
    deret([1047, 1319, 1568, 2093], { dur: 0.16, type: 'sine', gain: 0.1 }, 0.06),
  menang: () => {
    deret([523, 659, 784, 1047, 1319], { dur: 0.22, type: 'triangle', gain: 0.13 }, 0.11);
    deret([784, 1047, 1568], { dur: 0.6, type: 'sine', gain: 0.05 }, 0.14);
  },
  ledakan: () => {
    nada({ freq: 90, dur: 0.5, type: 'sine', gain: 0.28, sweepTo: 40 });
    derau(0.4, 0.2, 'lowpass', 400, 80);
    derau(0.18, 0.12, 'highpass', 2000);
  },
  kocok: () => {
    for (let i = 0; i < 7; i++) {
      derau(0.04, 0.04, 'bandpass', 800 + Math.random() * 1200);
      nada({
        freq: 200 + Math.random() * 300,
        dur: 0.04,
        type: 'square',
        gain: 0.03,
        delay: i * 0.04,
      });
    }
  },
};

// ── Musik latar (loop chiptune-pop prosedural) ─────────────────────
// Progresi I–V–vi–IV di C mayor, 134 BPM. Tiap bar: pad tipis + bass
// pulse 8-nada + lead square (melodi hook) + drum penuh (kick tiap ketuk,
// clap di 2 & 4, hi-hat 8th). Dijadwalkan lookahead.
const LAGU: { root: number; akor: number[] }[] = [
  { root: 130.81, akor: [261.63, 329.63, 392.0] }, // C  (C E G)
  { root: 196.0, akor: [246.94, 293.66, 392.0] }, // G  (B D G)
  { root: 220.0, akor: [261.63, 329.63, 440.0] }, // Am (C E A)
  { root: 174.61, akor: [261.63, 349.23, 440.0] }, // F  (C F A)
];

// Not (Hz) C mayor sekitar oktaf 4–5 · 0 = diam.
const D4 = 293.66, E4 = 329.63, F4 = 349.23, G4 = 392.0, A4 = 440.0,
  B4 = 493.88, C5 = 523.25, D5 = 587.33, E5 = 659.25;

// Melodi hook: 8 nada per bar (¼-ketuk masing-masing), diulang tiap 4 bar.
const MELODI: number[][] = [
  [G4, 0, E4, G4, A4, 0, G4, E4], // C
  [D4, 0, D4, E4, G4, 0, F4, D4], // G
  [E4, 0, C5, B4, A4, 0, G4, A4], // Am
  [A4, 0, G4, F4, E4, 0, D4, 0], // F
];
// Bar 5–8: variasi lebih tinggi biar terasa "naik".
const MELODI_B: number[][] = [
  [C5, E5, D5, C5, G4, 0, E4, G4],
  [B4, 0, D5, B4, G4, 0, A4, B4],
  [C5, 0, E5, D5, C5, 0, A4, C5],
  [D5, C5, B4, A4, G4, 0, E4, 0],
];

const BPM = 134;
const KETUK = 60 / BPM; // durasi 1 ketuk
const SEPEREMPAT = KETUK / 2; // 1/8 not
const BAR = 4 * KETUK; // 1 bar = 1 akor
let timerMusik: ReturnType<typeof setInterval> | null = null;
let waktuJadwal = 0;
let indeksBar = 0;

/** Satu nada musik pendek (envelope pluck) langsung ke masterMusik. */
function nadaMusik(
  freq: number,
  t: number,
  dur: number,
  gain: number,
  type: OscillatorType = 'triangle',
  cutoff = 3500,
) {
  const c = ac();
  if (!c || !masterMusik) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  const flt = c.createBiquadFilter();
  flt.type = 'lowpass';
  flt.frequency.value = cutoff;
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(flt).connect(g).connect(masterMusik);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function derauMusik(
  t: number,
  gain: number,
  jenis: BiquadFilterType,
  freq: number,
  dur: number,
) {
  const c = ac();
  if (!c || !masterMusik || !bufferDerau) return;
  const src = c.createBufferSource();
  src.buffer = bufferDerau;
  const g = c.createGain();
  const flt = c.createBiquadFilter();
  flt.type = jenis;
  flt.frequency.value = freq;
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(flt).connect(g).connect(masterMusik);
  src.start(t);
  src.stop(t + dur + 0.02);
}

function kickMusik(t: number, keras: number) {
  const c = ac();
  if (!c || !masterMusik) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(140, t);
  osc.frequency.exponentialRampToValueAtTime(45, t + 0.09);
  g.gain.setValueAtTime(keras, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
  osc.connect(g).connect(masterMusik);
  osc.start(t);
  osc.stop(t + 0.14);
}

function jadwalkanBar(mulai: number, bar: number) {
  const c = ac();
  if (!c || !masterMusik) return;
  const { root, akor } = LAGU[bar % LAGU.length];
  const frasaTinggi = bar % 8 >= 4;
  const melodi = (frasaTinggi ? MELODI_B : MELODI)[bar % 4];

  // Pad: akor ditahan tipis sepanjang bar (triangle, sekadar isi ruang).
  for (const f of akor) {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'triangle';
    osc.frequency.value = f;
    g.gain.setValueAtTime(0.0001, mulai);
    g.gain.linearRampToValueAtTime(0.012, mulai + 0.1);
    g.gain.setValueAtTime(0.012, mulai + BAR - 0.12);
    g.gain.linearRampToValueAtTime(0.0001, mulai + BAR + 0.04);
    osc.connect(g).connect(masterMusik);
    osc.start(mulai);
    osc.stop(mulai + BAR + 0.1);
  }

  // Bass pulse 8-nada: root, sesekali lompat ke oktaf/kwint (groove).
  const kwint = akor[akor.length - 1] / 2;
  const polaBass = [root, root, root * 2, root, kwint, root, root * 2, root * 2];
  for (let i = 0; i < 8; i++) {
    nadaMusik(polaBass[i], mulai + i * SEPEREMPAT, SEPEREMPAT * 0.9, 0.085, 'square', 900);
  }

  // Lead square: melodi hook (8 nada per bar).
  for (let i = 0; i < 8; i++) {
    if (!melodi[i]) continue;
    nadaMusik(melodi[i], mulai + i * SEPEREMPAT, SEPEREMPAT * 1.6, 0.05, 'square', 2600);
  }

  // Drum: kick tiap ketuk (aksen di 1), clap/snare di ketuk 2 & 4, hi-hat 8th.
  for (let k = 0; k < 4; k++) {
    kickMusik(mulai + k * KETUK, k === 0 ? 0.15 : 0.1);
  }
  for (const k of [1, 3]) {
    derauMusik(mulai + k * KETUK, 0.06, 'bandpass', 1700, 0.13);
    derauMusik(mulai + k * KETUK, 0.03, 'highpass', 3500, 0.09);
  }
  for (let i = 0; i < 8; i++) {
    derauMusik(mulai + i * SEPEREMPAT, i % 2 ? 0.024 : 0.013, 'highpass', 8500, 0.03);
  }
  // Open hat di "and" ketuk 4 (isian menuju bar berikutnya).
  derauMusik(mulai + 3.5 * KETUK, 0.022, 'highpass', 7000, 0.12);

  // Crash + fill kecil tiap 8 bar (awal frasa).
  if (bar % 8 === 0 && bar > 0) {
    derauMusik(mulai, 0.05, 'highpass', 5000, 0.5);
  }
}

export function mulaiMusik(): void {
  const c = ac();
  if (!c || !masterMusik || timerMusik) return;
  waktuJadwal = c.currentTime + 0.1;
  indeksBar = 0;
  masterMusik.gain.setTargetAtTime(
    muted || !musikNyala ? 0 : volMusik * 0.5,
    c.currentTime,
    0.5,
  );
  timerMusik = setInterval(() => {
    const now = ac()?.currentTime ?? 0;
    while (waktuJadwal < now + 1.5) {
      jadwalkanBar(waktuJadwal, indeksBar);
      waktuJadwal += BAR;
      indeksBar++;
    }
  }, 250);
}

export function stopMusik(): void {
  if (timerMusik) {
    clearInterval(timerMusik);
    timerMusik = null;
  }
  const c = ac();
  if (c && masterMusik) masterMusik.gain.setTargetAtTime(0, c.currentTime, 0.4);
}

// ── kontrol ─────────────────────────────────────────────────────────
export function isMuted(): boolean {
  return muted;
}
export function setMuted(v: boolean): void {
  muted = v;
  simpan(KEY_MUTE, v ? '1' : '0');
  const c = ac();
  if (c && masterSfx && masterMusik) {
    masterSfx.gain.setTargetAtTime(v ? 0 : volSfx, c.currentTime, 0.1);
    masterMusik.gain.setTargetAtTime(
      v || !musikNyala ? 0 : volMusik * 0.5,
      c.currentTime,
      0.3,
    );
  }
}
export function toggleMuted(): boolean {
  setMuted(!muted);
  return muted;
}

export function isMusikNyala(): boolean {
  return musikNyala;
}
export function setMusikNyala(v: boolean): void {
  musikNyala = v;
  simpan(KEY_MUSIK, v ? '1' : '0');
  if (v) mulaiMusik();
  else stopMusik();
}
export function toggleMusik(): boolean {
  setMusikNyala(!musikNyala);
  return musikNyala;
}

export function getVolume(): { sfx: number; musik: number } {
  return { sfx: volSfx, musik: volMusik };
}
export function setVolumeSfx(v: number): void {
  volSfx = Math.max(0, Math.min(1, v));
  simpan(KEY_VOL_SFX, String(volSfx));
  const c = ac();
  if (c && masterSfx && !muted)
    masterSfx.gain.setTargetAtTime(volSfx, c.currentTime, 0.1);
}
export function setVolumeMusik(v: number): void {
  volMusik = Math.max(0, Math.min(1, v));
  simpan(KEY_VOL_MUSIK, String(volMusik));
  const c = ac();
  if (c && masterMusik && !muted && musikNyala)
    masterMusik.gain.setTargetAtTime(volMusik * 0.5, c.currentTime, 0.1);
}

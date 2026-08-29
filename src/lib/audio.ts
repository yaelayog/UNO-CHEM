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
    masterMusik.gain.value = muted || !musikNyala ? 0 : volMusik * 0.6;
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

// ── Musik latar (loop ambient prosedural) ──────────────────────────
// Progresi 4 akor, tiap 4 dtk, dijadwalkan dengan lookahead.
const AKOR: number[][] = [
  [130.81, 164.81, 196.0, 246.94], // Cmaj7
  [110.0, 164.81, 196.0, 220.0], // Am7
  [87.31, 130.81, 174.61, 220.0], // Fmaj7
  [98.0, 146.83, 196.0, 246.94], // G6
];
const PENTA = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25];

const DUR_AKOR = 4;
let timerMusik: ReturnType<typeof setInterval> | null = null;
let waktuJadwal = 0;
let indeksAkor = 0;

function jadwalkanAkor(mulai: number, chord: number[]) {
  const c = ac();
  if (!c || !masterMusik) return;
  // Pad: tiap nada akor, 2 osilator sedikit detune, filter lowpass lembut.
  for (const f of chord) {
    for (const det of [-2, 3]) {
      const osc = c.createOscillator();
      const g = c.createGain();
      const flt = c.createBiquadFilter();
      flt.type = 'lowpass';
      flt.frequency.value = 900;
      osc.type = 'sawtooth';
      osc.frequency.value = f + det;
      g.gain.setValueAtTime(0.0001, mulai);
      g.gain.linearRampToValueAtTime(0.03, mulai + 1.2);
      g.gain.linearRampToValueAtTime(0.0001, mulai + DUR_AKOR + 0.5);
      osc.connect(flt).connect(g).connect(masterMusik);
      osc.start(mulai);
      osc.stop(mulai + DUR_AKOR + 0.6);
    }
  }
  // Sub bass di root.
  const bass = c.createOscillator();
  const bg = c.createGain();
  bass.type = 'sine';
  bass.frequency.value = chord[0] / 2;
  bg.gain.setValueAtTime(0.0001, mulai);
  bg.gain.linearRampToValueAtTime(0.06, mulai + 0.4);
  bg.gain.linearRampToValueAtTime(0.0001, mulai + DUR_AKOR);
  bass.connect(bg).connect(masterMusik);
  bass.start(mulai);
  bass.stop(mulai + DUR_AKOR + 0.2);

  // 1-2 bel acak dari skala pentatonik.
  const jml = Math.random() < 0.5 ? 1 : 2;
  for (let i = 0; i < jml; i++) {
    const f = PENTA[Math.floor(Math.random() * PENTA.length)];
    const t = mulai + 0.5 + Math.random() * (DUR_AKOR - 1);
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.05, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    osc.connect(g).connect(masterMusik);
    osc.start(t);
    osc.stop(t + 1.7);
  }
}

export function mulaiMusik(): void {
  const c = ac();
  if (!c || !masterMusik || timerMusik) return;
  waktuJadwal = c.currentTime + 0.1;
  indeksAkor = 0;
  masterMusik.gain.setTargetAtTime(
    muted || !musikNyala ? 0 : volMusik * 0.6,
    c.currentTime,
    0.5,
  );
  timerMusik = setInterval(() => {
    const now = ac()?.currentTime ?? 0;
    while (waktuJadwal < now + 2) {
      jadwalkanAkor(waktuJadwal, AKOR[indeksAkor % AKOR.length]);
      waktuJadwal += DUR_AKOR;
      indeksAkor++;
    }
  }, 400);
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
      v || !musikNyala ? 0 : volMusik * 0.6,
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
    masterMusik.gain.setTargetAtTime(volMusik * 0.6, c.currentTime, 0.1);
}

import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabase } from '../lib/supabase';
import { kirimAksi } from './klienOnline';

export type ModeSuara = 'off' | 'on' | 'ptt';
export type StatusSuara =
  | 'mati'
  | 'minta-izin'
  | 'menghubungkan'
  | 'tersambung'
  | 'ditolak'
  | 'gagal';

export interface DiagSuara {
  channel: string;
  presence: number;
  turn: boolean;
  mic: string;
  perluTurn: boolean;
  peers: {
    id: string;
    sig: string;
    ice: string;
    gather: string;
    kandidat: string[];
  }[];
}

const TURN_URL = import.meta.env.VITE_TURN_URL as string | undefined;
const TURN_USER = import.meta.env.VITE_TURN_USERNAME as string | undefined;
const TURN_CRED = import.meta.env.VITE_TURN_CREDENTIAL as string | undefined;

const DEBUG =
  typeof localStorage !== 'undefined' &&
  localStorage.getItem('chemuno:suara-debug') === '1';
function log(...a: unknown[]): void {
  if (DEBUG) console.log('[suara]', ...a);
}

const STUN: RTCIceServer = {
  urls: [
    'stun:stun.l.google.com:19302',
    'stun:stun1.l.google.com:19302',
    'stun:stun2.l.google.com:19302',
  ],
};

/** TURN dari env (Metered dll.) — fallback bila Cloudflare tak tersedia. */
function turnEnv(): RTCIceServer | null {
  if (!TURN_URL || !TURN_USER || !TURN_CRED) return null;
  return {
    urls: TURN_URL.split(',').map((u) => u.trim()),
    username: TURN_USER,
    credential: TURN_CRED,
  };
}

/** true bila daftar iceServers memuat setidaknya satu URL turn(s):. */
function adaTurn(list: RTCIceServer[]): boolean {
  return list.some((s) =>
    (Array.isArray(s.urls) ? s.urls : [s.urls]).some((u) =>
      u.startsWith('turn'),
    ),
  );
}

type Sinyal =
  | { t: 'offer'; dari: string; ke: string; sdp: string }
  | { t: 'answer'; dari: string; ke: string; sdp: string }
  | { t: 'ice'; dari: string; ke: string; cand: RTCIceCandidateInit };

/** Bitrate suara maksimum (bps). ~24 kbps = kualitas suara jernih, hemat. */
const BITRATE_MAKS = 24000;

/**
 * Munge SDP Opus: batasi bitrate + aktifkan DTX (tak kirim data saat diam) +
 * mono. Menghemat trafik TURN drastis (orang tak ngobrol terus-menerus).
 */
function sdpHemat(sdp?: string | null): string {
  if (!sdp) return '';
  return sdp.replace(/^a=fmtp:(\d+) (.*(?:minptime|useinbandfec).*)$/gim, (m, pt, params) => {
    let p = params as string;
    if (!/maxaveragebitrate=/.test(p)) p += `;maxaveragebitrate=${BITRATE_MAKS}`;
    if (!/usedtx=/.test(p)) p += ';usedtx=1';
    if (!/stereo=/.test(p)) p += ';stereo=0';
    if (!/cbr=/.test(p)) p += ';cbr=0';
    return `a=fmtp:${pt} ${p}`;
  });
}

/** Batasi bitrate encoder pengirim (pelengkap SDP munging). */
async function batasiKirim(pc: RTCPeerConnection): Promise<void> {
  for (const sender of pc.getSenders()) {
    if (sender.track?.kind !== 'audio') continue;
    const p = sender.getParameters();
    if (!p.encodings || p.encodings.length === 0) p.encodings = [{}];
    p.encodings[0].maxBitrate = BITRATE_MAKS;
    try {
      await sender.setParameters(p);
    } catch {
      /* sebagian browser rewel — SDP munging sudah menutupi */
    }
  }
}

interface Peer {
  pc: RTCPeerConnection;
  /** Kandidat ICE yang datang sebelum remoteDescription siap. */
  iceMenunggu: RTCIceCandidateInit[];
  siapRemote: boolean;
  /** Tipe kandidat lokal yang sudah dikumpulkan (host/srflx/relay). */
  tipeKandidat: Set<string>;
  mulaiMs: number;
}

/**
 * Voice chat mesh (P2P WebRTC) untuk room online. Signaling lewat Supabase
 * Realtime channel `suara:<kode>` (presence + broadcast SDP/ICE). Bot diabaikan.
 *
 * Mode: `off` = putus total · `on` = mic selalu kirim · `ptt` = kirim saat
 * `setPtt(true)`.
 *
 * Debug: `localStorage.setItem('chemuno:suara-debug','1')` lalu reload.
 */
class SuaraChat {
  private code: string | null = null;
  private uid: string | null = null;
  private mode: ModeSuara = 'off';
  private ptt = false;
  /** dinaikkan tiap sambung/putus → membatalkan proses async yang basi. */
  private epoch = 0;

  private local: MediaStream | null = null;
  private channel: RealtimeChannel | null = null;
  private peers = new Map<string, Peer>();
  private lepasGestur: (() => void) | null = null;
  private diagTimer: ReturnType<typeof setInterval> | null = null;
  /** iceServers aktif (STUN + TURN Cloudflare / env). Di-cache per TTL. */
  private iceAktif: RTCIceServer[] = [STUN];
  private iceSampaiMs = 0;

  onStatus?: (s: StatusSuara) => void;
  onPeers?: (n: number) => void;
  /** true bila audio peer tertahan kebijakan autoplay (perlu ketukan). */
  onBisu?: (bisu: boolean) => void;
  onDiag?: (d: DiagSuara) => void;

  /** Coba putar semua audio peer (kebijakan autoplay butuh gesture / retry). */
  private desakPutar = (): void => {
    document
      .querySelectorAll<HTMLAudioElement>('audio[data-suara-peer]')
      .forEach((el) => {
        if (el.paused && el.srcObject) void el.play().catch(() => {});
      });
    setTimeout(() => {
      let bisu = false;
      document
        .querySelectorAll<HTMLAudioElement>('audio[data-suara-peer]')
        .forEach((el) => {
          if (el.paused && el.srcObject) bisu = true;
        });
      this.onBisu?.(bisu);
    }, 350);
  };

  /**
   * Muat iceServers: STUN + TURN Cloudflare (di-mint Edge Function, short-lived,
   * cache 12 jam) → fallback TURN dari env (Metered) → fallback STUN saja.
   */
  private async muatIce(): Promise<void> {
    if (adaTurn(this.iceAktif) && Date.now() < this.iceSampaiMs) return;

    const list: RTCIceServer[] = [STUN];
    try {
      const r = await kirimAksi('turnKredensial', {});
      const cf = r.iceServers as
        | { urls?: string[]; username?: string; credential?: string }
        | RTCIceServer[]
        | null;
      if (Array.isArray(cf)) {
        list.push(...cf);
      } else if (cf?.urls?.length) {
        list.push({
          urls: cf.urls,
          username: cf.username,
          credential: cf.credential,
        });
      }
    } catch (e) {
      log('ambil TURN Cloudflare gagal', e);
    }

    if (!adaTurn(list)) {
      const env = turnEnv();
      if (env) list.push(env);
    }

    this.iceAktif = list;
    this.iceSampaiMs = Date.now() + 12 * 3600 * 1000;
    log('iceServers', adaTurn(list) ? 'dgn TURN' : 'STUN saja', list.length);
  }

  async sambung(code: string, uid: string): Promise<void> {
    if (this.code === code && this.uid === uid && this.channel) return;

    const gen = ++this.epoch;
    this.bersihkan();
    this.code = code;
    this.uid = uid;
    this.onStatus?.('minta-izin');
    log('sambung', code, uid);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
    } catch (e) {
      if (gen !== this.epoch) return;
      const nama = e instanceof DOMException ? e.name : '';
      log('getUserMedia gagal', nama, e);
      this.onStatus?.(
        nama === 'NotAllowedError' || nama === 'SecurityError'
          ? 'ditolak'
          : 'gagal',
      );
      this.code = null;
      this.uid = null;
      return;
    }
    if (gen !== this.epoch) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }
    this.local = stream;
    this.terapkanMic();
    log('mic siap', stream.getAudioTracks());

    await this.muatIce();
    if (gen !== this.epoch) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }

    if (!this.lepasGestur) {
      const h = () => this.desakPutar();
      document.addEventListener('pointerdown', h, true);
      document.addEventListener('keydown', h, true);
      this.lepasGestur = () => {
        document.removeEventListener('pointerdown', h, true);
        document.removeEventListener('keydown', h, true);
      };
    }

    const sb = await getSupabase();
    if (gen !== this.epoch) return;
    if (!sb) {
      this.onStatus?.('gagal');
      this.bersihkan();
      this.code = null;
      this.uid = null;
      return;
    }

    this.onStatus?.('menghubungkan');
    const ch = sb.channel(`suara:${code}`, {
      config: { presence: { key: uid }, broadcast: { self: false } },
    });
    this.channel = ch;

    ch.on('broadcast', { event: 'sinyal' }, ({ payload }) => {
      const s = payload as Sinyal;
      if (s.ke === uid && s.dari !== uid) {
        log('terima', s.t, 'dari', s.dari);
        void this.terimaSinyal(s);
      }
    });
    ch.on('presence', { event: 'sync' }, () => {
      log('presence sync', Object.keys(ch.presenceState()));
      this.selarasPresence();
      this.lapor();
    });
    ch.on('presence', { event: 'leave' }, ({ leftPresences }) => {
      for (const p of leftPresences as { key?: string }[]) {
        if (p.key) this.tutupPeer(p.key);
      }
    });

    ch.subscribe((st) => {
      if (gen !== this.epoch) return;
      log('channel status', st);
      if (st === 'SUBSCRIBED') {
        void ch.track({ uid, pada: Date.now() });
        this.onStatus?.('tersambung');
      } else if (st === 'CHANNEL_ERROR' || st === 'TIMED_OUT') {
        this.onStatus?.('gagal');
      }
      this.lapor();
    });

    this.diagTimer = setInterval(() => this.lapor(), 2000);
  }

  setMode(mode: ModeSuara): void {
    this.mode = mode;
    if (mode === 'off') {
      this.putus();
      return;
    }
    this.terapkanMic();
    this.desakPutar();
  }

  setPtt(aktif: boolean): void {
    this.ptt = aktif;
    this.terapkanMic();
    this.desakPutar();
  }

  putus(): void {
    this.epoch++;
    this.bersihkan();
    this.code = null;
    this.uid = null;
    this.onStatus?.('mati');
    this.onPeers?.(0);
    this.onBisu?.(false);
  }

  // ── internal ──────────────────────────────────────────────────────

  private bersihkan(): void {
    if (this.diagTimer) {
      clearInterval(this.diagTimer);
      this.diagTimer = null;
    }
    for (const { pc } of this.peers.values()) pc.close();
    this.peers.clear();
    document
      .querySelectorAll('audio[data-suara-peer]')
      .forEach((el) => el.remove());
    this.lepasGestur?.();
    this.lepasGestur = null;
    this.local?.getTracks().forEach((t) => t.stop());
    this.local = null;
    if (this.channel) {
      const ch = this.channel;
      this.channel = null;
      void (async () => {
        const sb = await getSupabase();
        void sb?.removeChannel(ch);
      })();
    }
  }

  private terapkanMic(): void {
    const kirim = this.mode === 'on' || (this.mode === 'ptt' && this.ptt);
    this.local?.getAudioTracks().forEach((t) => (t.enabled = kirim));
  }

  private selarasPresence(): void {
    const ch = this.channel;
    const uid = this.uid;
    if (!ch || !uid) return;
    const hadir = new Set(Object.keys(ch.presenceState()));
    for (const peer of hadir) {
      if (peer === uid) continue;
      if (!this.peers.has(peer)) this.buatPeer(peer, uid < peer);
    }
    for (const peer of [...this.peers.keys()]) {
      if (!hadir.has(peer)) this.tutupPeer(peer);
    }
  }

  private lapor(): void {
    let n = 0;
    let perluTurn = false;
    const now = Date.now();
    const punyaTurn = adaTurn(this.iceAktif);
    const peers: DiagSuara['peers'] = [];
    for (const [id, p] of this.peers) {
      const ice = p.pc.iceConnectionState;
      const gather = p.pc.iceGatheringState;
      if (ice === 'connected' || ice === 'completed') n++;
      // Butuh relay bila: sudah selesai kumpul kandidat TAPI ICE mentok
      // (checking/failed) & tak ada kandidat 'relay' & belum ada TURN.
      const macet =
        ice === 'checking' || ice === 'disconnected' || ice === 'failed';
      if (
        macet &&
        !punyaTurn &&
        !p.tipeKandidat.has('relay') &&
        now - p.mulaiMs > 6000 &&
        (gather === 'complete' || now - p.mulaiMs > 15000)
      ) {
        perluTurn = true;
      }
      peers.push({
        id: id.slice(0, 6),
        sig: p.pc.signalingState,
        ice,
        gather: p.pc.iceGatheringState,
        kandidat: [...p.tipeKandidat],
      });
    }
    this.onPeers?.(n);
    const trk = this.local?.getAudioTracks()[0];
    this.onDiag?.({
      channel: this.channel ? 'ada' : 'tidak',
      presence: this.channel
        ? Object.keys(this.channel.presenceState()).length
        : 0,
      turn: punyaTurn,
      mic: trk
        ? `${trk.readyState}${trk.muted ? ' (muted OS)' : ''}${trk.enabled ? ' kirim' : ' diam'}`
        : 'tidak',
      perluTurn,
      peers,
    });
  }

  private buatPeer(peerId: string, sebagaiPenawar: boolean): void {
    if (this.peers.has(peerId) || !this.local) return;
    log('buatPeer', peerId, sebagaiPenawar ? '(penawar)' : '(penerima)');
    const pc = new RTCPeerConnection({ iceServers: this.iceAktif });
    const peer: Peer = {
      pc,
      iceMenunggu: [],
      siapRemote: false,
      tipeKandidat: new Set(),
      mulaiMs: Date.now(),
    };
    this.peers.set(peerId, peer);

    for (const track of this.local.getTracks()) {
      pc.addTrack(track, this.local);
    }

    pc.onicecandidate = (ev) => {
      if (ev.candidate && this.uid) {
        if (ev.candidate.type) peer.tipeKandidat.add(ev.candidate.type);
        this.kirimSinyal({
          t: 'ice',
          dari: this.uid,
          ke: peerId,
          cand: ev.candidate.toJSON(),
        });
      }
    };

    pc.ontrack = (ev) => {
      const stream = ev.streams[0];
      if (!stream) return;
      log('ontrack dari', peerId);
      let el = document.querySelector<HTMLAudioElement>(
        `audio[data-suara-peer="${peerId}"]`,
      );
      if (!el) {
        el = document.createElement('audio');
        el.autoplay = true;
        el.dataset.suaraPeer = peerId;
        document.body.appendChild(el);
      }
      el.srcObject = stream;
      this.desakPutar();
      [400, 1200, 3000].forEach((ms) => setTimeout(this.desakPutar, ms));
    };

    pc.oniceconnectionstatechange = () => {
      log(peerId, 'ice', pc.iceConnectionState);
      this.lapor();
      if (pc.iceConnectionState === 'failed') pc.restartIce?.();
    };
    pc.onconnectionstatechange = () => {
      log(peerId, 'conn', pc.connectionState);
      if (pc.connectionState === 'closed') this.tutupPeer(peerId);
    };

    if (sebagaiPenawar) {
      void (async () => {
        try {
          const offer = await pc.createOffer();
          offer.sdp = sdpHemat(offer.sdp);
          await pc.setLocalDescription(offer);
          void batasiKirim(pc);
          if (this.uid && this.peers.get(peerId) === peer) {
            this.kirimSinyal({
              t: 'offer',
              dari: this.uid,
              ke: peerId,
              sdp: pc.localDescription?.sdp ?? '',
            });
          }
        } catch (err) {
          log('createOffer gagal', err);
          this.tutupPeer(peerId);
        }
      })();
    }
  }

  private tutupPeer(peerId: string): void {
    const peer = this.peers.get(peerId);
    if (!peer) return;
    log('tutupPeer', peerId);
    peer.pc.close();
    this.peers.delete(peerId);
    document.querySelector(`audio[data-suara-peer="${peerId}"]`)?.remove();
    this.lapor();
  }

  private kirimSinyal(s: Sinyal): void {
    void this.channel?.send({ type: 'broadcast', event: 'sinyal', payload: s });
  }

  private async kurasIce(peer: Peer): Promise<void> {
    peer.siapRemote = true;
    const antre = peer.iceMenunggu.splice(0);
    for (const c of antre) {
      try {
        await peer.pc.addIceCandidate(c);
      } catch (err) {
        log('addIceCandidate (antre) gagal', err);
      }
    }
  }

  private async terimaSinyal(s: Sinyal): Promise<void> {
    const uid = this.uid;
    if (!uid) return;
    const peerId = s.dari;

    if (s.t === 'offer') {
      if (!this.peers.has(peerId)) this.buatPeer(peerId, false);
      const peer = this.peers.get(peerId);
      if (!peer) return;
      try {
        await peer.pc.setRemoteDescription({ type: 'offer', sdp: s.sdp });
        await this.kurasIce(peer);
        const answer = await peer.pc.createAnswer();
        answer.sdp = sdpHemat(answer.sdp);
        await peer.pc.setLocalDescription(answer);
        void batasiKirim(peer.pc);
        this.kirimSinyal({
          t: 'answer',
          dari: uid,
          ke: peerId,
          sdp: peer.pc.localDescription?.sdp ?? '',
        });
      } catch (err) {
        log('proses offer gagal', err);
        this.tutupPeer(peerId);
      }
      return;
    }

    if (s.t === 'answer') {
      const peer = this.peers.get(peerId);
      if (!peer) return;
      try {
        await peer.pc.setRemoteDescription({ type: 'answer', sdp: s.sdp });
        await this.kurasIce(peer);
      } catch (err) {
        log('proses answer gagal', err);
      }
      return;
    }

    // ice
    const peer = this.peers.get(peerId);
    if (!peer) return;
    if (!peer.siapRemote || !peer.pc.remoteDescription) {
      peer.iceMenunggu.push(s.cand);
      return;
    }
    try {
      await peer.pc.addIceCandidate(s.cand);
    } catch (err) {
      log('addIceCandidate gagal', err);
    }
  }
}

export const suaraChat = new SuaraChat();

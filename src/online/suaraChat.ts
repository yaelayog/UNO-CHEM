import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabase } from '../lib/supabase';

export type ModeSuara = 'off' | 'on' | 'ptt';
export type StatusSuara =
  | 'mati'
  | 'minta-izin'
  | 'menghubungkan'
  | 'tersambung'
  | 'ditolak'
  | 'gagal';

const TURN_URL = import.meta.env.VITE_TURN_URL as string | undefined;
const TURN_USER = import.meta.env.VITE_TURN_USERNAME as string | undefined;
const TURN_CRED = import.meta.env.VITE_TURN_CREDENTIAL as string | undefined;

export const turnDikonfigurasi = Boolean(TURN_URL && TURN_USER && TURN_CRED);

function iceServers(): RTCIceServer[] {
  const list: RTCIceServer[] = [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
  ];
  if (TURN_URL && TURN_USER && TURN_CRED) {
    list.push({
      urls: TURN_URL.split(',').map((u) => u.trim()),
      username: TURN_USER,
      credential: TURN_CRED,
    });
  }
  return list;
}

type Sinyal =
  | { t: 'offer'; dari: string; ke: string; sdp: string }
  | { t: 'answer'; dari: string; ke: string; sdp: string }
  | { t: 'ice'; dari: string; ke: string; cand: RTCIceCandidateInit };

/**
 * Voice chat mesh (P2P WebRTC) untuk room online. Signaling lewat Supabase
 * Realtime channel `suara:<kode>` (broadcast + presence). Bot diabaikan.
 *
 * Mode:
 *  - `off` → putus total (tak bicara, tak dengar).
 *  - `on`  → mic selalu kirim.
 *  - `ptt` → mic kirim hanya saat `setPtt(true)`.
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
  private pcs = new Map<string, RTCPeerConnection>();
  private audio = new Map<string, HTMLAudioElement>();

  onStatus?: (s: StatusSuara) => void;
  onPeers?: (n: number) => void;

  /** Sambung ke voice room. Idempoten — aman dipanggil ulang. */
  async sambung(code: string, uid: string): Promise<void> {
    if (this.code === code && this.uid === uid && this.channel) return;

    const gen = ++this.epoch;
    this.bersihkan();
    this.code = code;
    this.uid = uid;
    this.onStatus?.('minta-izin');

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
      if (s.ke === uid && s.dari !== uid) void this.terimaSinyal(s);
    });
    ch.on('presence', { event: 'sync' }, () => this.selarasPresence());
    ch.on('presence', { event: 'leave' }, ({ leftPresences }) => {
      for (const p of leftPresences as { key?: string }[]) {
        if (p.key) this.tutupPeer(p.key);
      }
      this.laporPeers();
    });

    ch.subscribe((st) => {
      if (gen !== this.epoch) return;
      if (st === 'SUBSCRIBED') {
        void ch.track({ uid, pada: Date.now() });
        this.onStatus?.('tersambung');
      } else if (st === 'CHANNEL_ERROR' || st === 'TIMED_OUT') {
        this.onStatus?.('gagal');
      }
    });
  }

  /** Ganti mode tanpa memutus koneksi (kecuali `off`). */
  setMode(mode: ModeSuara): void {
    this.mode = mode;
    if (mode === 'off') {
      this.putus();
      return;
    }
    this.terapkanMic();
  }

  setPtt(aktif: boolean): void {
    this.ptt = aktif;
    this.terapkanMic();
  }

  /** Tutup semua koneksi & lepas mic. */
  putus(): void {
    this.epoch++;
    this.bersihkan();
    this.code = null;
    this.uid = null;
    this.onStatus?.('mati');
    this.onPeers?.(0);
  }

  // ── internal ──────────────────────────────────────────────────────

  private bersihkan(): void {
    for (const pc of this.pcs.values()) pc.close();
    this.pcs.clear();
    for (const el of this.audio.values()) {
      el.srcObject = null;
      el.remove();
    }
    this.audio.clear();
    this.local?.getTracks().forEach((t) => t.stop());
    this.local = null;
    if (this.channel) {
      void this.channel.unsubscribe();
      this.channel = null;
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
    const state = ch.presenceState() as Record<string, unknown[]>;
    const hadir = new Set(Object.keys(state));
    for (const peer of hadir) {
      if (peer === uid) continue;
      // Penawar = uid lebih kecil (deterministik, hindari glare).
      if (!this.pcs.has(peer)) this.buatPeer(peer, uid < peer);
    }
    for (const peer of [...this.pcs.keys()]) {
      if (!hadir.has(peer)) this.tutupPeer(peer);
    }
    this.laporPeers();
  }

  private laporPeers(): void {
    let n = 0;
    for (const pc of this.pcs.values()) {
      const s = pc.iceConnectionState;
      if (s === 'connected' || s === 'completed') n++;
    }
    this.onPeers?.(n);
  }

  private buatPeer(peer: string, sebagaiPenawar: boolean): void {
    if (this.pcs.has(peer) || !this.local) return;
    const pc = new RTCPeerConnection({ iceServers: iceServers() });
    this.pcs.set(peer, pc);

    for (const track of this.local.getTracks()) {
      pc.addTrack(track, this.local);
    }

    pc.onicecandidate = (ev) => {
      if (ev.candidate && this.uid) {
        this.kirimSinyal({
          t: 'ice',
          dari: this.uid,
          ke: peer,
          cand: ev.candidate.toJSON(),
        });
      }
    };

    pc.ontrack = (ev) => {
      const stream = ev.streams[0];
      if (!stream) return;
      let el = this.audio.get(peer);
      if (!el) {
        el = document.createElement('audio');
        el.autoplay = true;
        el.dataset.suaraPeer = peer;
        document.body.appendChild(el);
        this.audio.set(peer, el);
      }
      el.srcObject = stream;
      void el.play().catch(() => {});
    };

    pc.oniceconnectionstatechange = () => {
      this.laporPeers();
      const s = pc.iceConnectionState;
      if (s === 'failed') pc.restartIce?.();
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'closed') this.tutupPeer(peer);
    };

    if (sebagaiPenawar) {
      void (async () => {
        try {
          await pc.setLocalDescription(await pc.createOffer());
          if (this.uid) {
            this.kirimSinyal({
              t: 'offer',
              dari: this.uid,
              ke: peer,
              sdp: pc.localDescription?.sdp ?? '',
            });
          }
        } catch {
          this.tutupPeer(peer);
        }
      })();
    }
  }

  private tutupPeer(peer: string): void {
    this.pcs.get(peer)?.close();
    this.pcs.delete(peer);
    const el = this.audio.get(peer);
    if (el) {
      el.srcObject = null;
      el.remove();
      this.audio.delete(peer);
    }
    this.laporPeers();
  }

  private kirimSinyal(s: Sinyal): void {
    void this.channel?.send({ type: 'broadcast', event: 'sinyal', payload: s });
  }

  private async terimaSinyal(s: Sinyal): Promise<void> {
    const uid = this.uid;
    if (!uid) return;
    const peer = s.dari;

    if (s.t === 'offer') {
      if (!this.pcs.has(peer)) this.buatPeer(peer, false);
      const pc = this.pcs.get(peer);
      if (!pc) return;
      try {
        await pc.setRemoteDescription({ type: 'offer', sdp: s.sdp });
        await pc.setLocalDescription(await pc.createAnswer());
        this.kirimSinyal({
          t: 'answer',
          dari: uid,
          ke: peer,
          sdp: pc.localDescription?.sdp ?? '',
        });
      } catch {
        this.tutupPeer(peer);
      }
      return;
    }

    if (s.t === 'answer') {
      const pc = this.pcs.get(peer);
      if (!pc || pc.signalingState !== 'have-local-offer') return;
      try {
        await pc.setRemoteDescription({ type: 'answer', sdp: s.sdp });
      } catch {
        /* abaikan */
      }
      return;
    }

    // ice
    const pc = this.pcs.get(peer);
    if (!pc) return;
    try {
      await pc.addIceCandidate(s.cand);
    } catch {
      /* kandidat sebelum remote description — abaikan */
    }
  }
}

export const suaraChat = new SuaraChat();

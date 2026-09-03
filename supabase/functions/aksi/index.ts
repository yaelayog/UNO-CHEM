// ChemUno — Edge Function otoritatif untuk mode online.
// Setiap aksi permainan diproses di sini memakai engine murni yang SAMA dengan
// klien (supabase/functions/_shared/game — hasil `npm run sync:supabase`).
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import {
  buatGame,
  cekUnoKadaluarsa,
  jawabKuisBot,
  langkahBot,
  lanjutkanOtomatis,
  mainkanBerbarengan,
  nyatakanUno,
  pilihWarna,
  segarkanUno,
  selesaikanKuis,
  stampUno,
  tangkapUno,
  tarikKartu,
  warnaBotTerbaik,
  type GameState,
  type Golongan,
  type OpsiPemain,
} from '../_shared/game/index.ts';
import { pisahTangan, redaksiState } from '../_shared/redaksi.ts';
import { beriPoinMurid, muridDariAuthUid } from '../_shared/poin.ts';
import { evaluasiMisi } from '../_shared/misi.ts';
import { poinBonusMenangOnline, poinJawabanBenar } from '../_shared/game/index.ts';

const URL = Deno.env.get('SUPABASE_URL')!;
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Cloudflare Realtime TURN — kredensial di-mint per pemanggil (short-lived),
// API token tetap di server. Kosong = klien fallback ke STUN / env TURN.
const CF_TURN_KEY_ID = Deno.env.get('CF_TURN_KEY_ID');
const CF_TURN_API_TOKEN = Deno.env.get('CF_TURN_API_TOKEN');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

const NAMA_BOT = [
  'Dalton',
  'Bohr',
  'Curie',
  'Mendel',
  'Lavoisier',
  'Pauling',
  'Rutherford',
];
const AMBANG_MACET_MS = 30_000;
/** Lewat ambang ini (2 menit tak ada denyut) → giliran diambil alih bot
 * PERMANEN (tak lagi menunggu 30 dtk tiap giliran). Kendali balik otomatis
 * kalau pemainnya kirim denyut/sync lagi (lihat blok reconnect di `denyut`). */
const AMBANG_BOT_MS = 120_000;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const auth = req.headers.get('Authorization') ?? '';
  const userKlien = createClient(URL, ANON, {
    global: { headers: { Authorization: auth } },
  });
  const { data: { user } } = await userKlien.auth.getUser();
  if (!user) return json({ error: 'tak terautentikasi' }, 401);

  const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'body bukan JSON' }, 400);
  }

  try {
    const hasil = await tangani(admin, user.id, body);
    return json(hasil ?? { ok: true });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 400);
  }
});

// ── Router ───────────────────────────────────────────────────────────
async function tangani(
  db: SupabaseClient,
  uid: string,
  b: Record<string, unknown>,
) {
  const tipe = String(b.tipe);
  const code = typeof b.code === 'string' ? b.code.toUpperCase() : '';

  switch (tipe) {
    case 'buatRoom':
      return buatRoom(db, uid, b);
    case 'gabung':
      return gabung(db, uid, code, String(b.nama ?? 'Pemain'));
    case 'keluar':
      return keluar(db, uid, code);
    case 'tendang':
      return tendang(db, uid, code, String(b.pemain));
    case 'mulai':
      return mulai(db, uid, code);
    case 'sync':
      return sync(db, uid, code);
    case 'denyut':
      return denyut(db, uid, code);
    case 'turnKredensial':
      return turnKredensial();
    case 'selesaiPembukaan':
      return aksiState(db, uid, code, (s) => {
        assert(s.menungguPembukaan, 'bukan fase pembukaan');
        return { ...s, menungguPembukaan: false };
      }, { hostSaja: true });
    case 'main':
      return aksiState(db, uid, code, (s) => {
        const ids = (b.kartuIds as string[]) ?? [];
        assert(s.status === 'bermain', 'bukan fase bermain');
        assert(s.pemain[s.giliran].id === uid, 'bukan giliranmu');
        return mainkanBerbarengan(s, uid, ids, {
          warnaWild: b.warnaWild as Golongan | undefined,
        });
      });
    case 'tarik':
      return aksiState(db, uid, code, (s) => {
        assert(s.status === 'bermain', 'bukan fase bermain');
        assert(s.pemain[s.giliran].id === uid, 'bukan giliranmu');
        return tarikKartu(s, uid);
      });
    case 'pilihWarna':
      return aksiState(db, uid, code, (s) => {
        assert(s.status === 'menungguPilihWarna', 'bukan fase pilih warna');
        assert(s.pemain[s.giliran].id === uid, 'bukan giliranmu');
        return pilihWarna(s, b.golongan as Golongan);
      });
    case 'jawabKuis':
      return aksiState(
        db,
        uid,
        code,
        (s) => {
          assert(s.status === 'menungguKuis' && s.efekTertunda, 'bukan fase kuis');
          assert(s.efekTertunda.targetPemainId === uid, 'bukan kuismu');
          return selesaikanKuis(
            s,
            b.hasil as 'benarCepat' | 'benarLambat' | 'salah',
          );
        },
        { kuisHasil: b.hasil as 'benarCepat' | 'benarLambat' | 'salah' },
      );
    case 'lanjut':
      // Hanya Kartu Peristiwa yang tersinkron (efek permainan). Fun Fact &
      // Fakta streak ditutup per orang di klien — server tak menyentuhnya.
      return aksiState(db, uid, code, (s) => {
        if (s.peristiwaAktif)
          return segarkanUno({ ...s, peristiwaAktif: null });
        return s;
      }, { anggotaSaja: true });
    case 'nyatakanUno':
      return aksiState(db, uid, code, (s) => nyatakanUno(s, uid), {
        anggotaSaja: true,
        lewatiBilaSama: true,
      });
    case 'tangkapUno':
      return aksiState(db, uid, code, (s) => tangkapUno(s, uid, String(b.target)), {
        anggotaSaja: true,
        lewatiBilaSama: true,
      });
    case 'cekUno':
      return aksiState(
        db,
        uid,
        code,
        (s) => cekUnoKadaluarsa(s, { abaikanKartuFakta: true }),
        { anggotaSaja: true, lewatiBilaSama: true },
      );
    default:
      throw new Error(`tipe aksi tak dikenal: ${tipe}`);
  }
}

// ── Lobby ────────────────────────────────────────────────────────────
async function buatRoom(
  db: SupabaseClient,
  uid: string,
  b: Record<string, unknown>,
) {
  const target = Math.min(7, Math.max(2, Number(b.targetPemain ?? 4)));
  const { data: room, error } = await db
    .from('rooms')
    .insert({
      host: uid,
      target_pemain: target,
      pakai_peristiwa: Boolean(b.pakaiPeristiwa),
    })
    .select('code')
    .single();
  if (error || !room) throw error ?? new Error('gagal buat room');

  await db.from('room_pemain').insert({
    room_code: room.code,
    pemain: uid,
    nama: String(b.nama ?? 'Host'),
    urutan: 0,
  });
  return { code: room.code };
}

async function gabung(
  db: SupabaseClient,
  uid: string,
  code: string,
  nama: string,
) {
  const room = await ambilRoom(db, code);
  assert(room.status === 'lobby', 'permainan sudah dimulai');

  const { data: roster } = await db
    .from('room_pemain')
    .select('pemain, urutan')
    .eq('room_code', code);
  const list = roster ?? [];
  if (list.some((r) => r.pemain === uid)) return { code, sudahGabung: true };
  assert(list.length < room.target_pemain, 'room penuh');

  const dipakai = new Set(list.map((r) => r.urutan));
  let urutan = 0;
  while (dipakai.has(urutan)) urutan++;

  const { error } = await db.from('room_pemain').insert({
    room_code: code,
    pemain: uid,
    nama,
    urutan,
  });
  if (error) throw error;
  return { code };
}

async function keluar(db: SupabaseClient, uid: string, code: string) {
  const room = await ambilRoom(db, code).catch(() => null);
  if (!room) return { ok: true };

  if (room.status === 'lobby') {
    if (room.host === uid) {
      await db.from('rooms').delete().eq('code', code);
    } else {
      await db.from('room_pemain').delete().eq('room_code', code).eq('pemain', uid);
    }
    return { ok: true };
  }

  // Saat bermain: tandai terputus (boleh gabung lagi). Kalau tak ada manusia
  // tersisa → hapus room.
  await db
    .from('room_pemain')
    .update({ terhubung: false })
    .eq('room_code', code)
    .eq('pemain', uid);
  const { data: sisa } = await db
    .from('room_pemain')
    .select('pemain')
    .eq('room_code', code)
    .eq('is_bot', false)
    .eq('terhubung', true);
  if (!sisa || sisa.length === 0) {
    await db.from('rooms').delete().eq('code', code);
  }
  return { ok: true };
}

async function tendang(
  db: SupabaseClient,
  uid: string,
  code: string,
  target: string,
) {
  const room = await ambilRoom(db, code);
  assert(room.host === uid, 'hanya host');
  assert(room.status === 'lobby', 'hanya di lobby');
  assert(target !== uid, 'tak bisa menendang diri sendiri');
  await db.from('room_pemain').delete().eq('room_code', code).eq('pemain', target);
  return { ok: true };
}

async function mulai(db: SupabaseClient, uid: string, code: string) {
  const room = await ambilRoom(db, code);
  assert(room.host === uid, 'hanya host yang bisa memulai');
  assert(room.status === 'lobby', 'permainan sudah dimulai');

  const { data: roster } = await db
    .from('room_pemain')
    .select('pemain, nama, urutan')
    .eq('room_code', code)
    .order('urutan');
  const manusia = roster ?? [];
  assert(manusia.length >= 1, 'butuh minimal 1 pemain');

  const namaTerpakai = new Set(manusia.map((m) => m.nama.toLowerCase()));
  const botTersedia = NAMA_BOT.filter((n) => !namaTerpakai.has(n.toLowerCase()));

  const opsi: OpsiPemain[] = [];
  const barisBot: Record<string, unknown>[] = [];
  let bi = 0;
  for (let urutan = 0; urutan < room.target_pemain; urutan++) {
    const m = manusia.find((x) => x.urutan === urutan);
    if (m) {
      opsi.push({ id: m.pemain, nama: m.nama, isBot: false });
    } else {
      const id = `bot-${urutan}`;
      const nama = botTersedia[bi++] ?? `Bot ${urutan}`;
      opsi.push({ id, nama, isBot: true });
      barisBot.push({
        room_code: code,
        pemain: id,
        nama,
        is_bot: true,
        urutan,
        terhubung: true,
      });
    }
  }

  const seed = Date.now();
  const state: GameState = {
    // `mulaiAcak` → giliran pertama diacak, tak pernah ke host (kursi 0).
    ...buatGame(opsi, seed, room.pakai_peristiwa, true),
    menungguPembukaan: true,
  };

  const barisTangan = pisahTangan(state)
    .filter((t) => !t.pemain.startsWith('bot-'))
    .map((t) => ({
      room_code: code,
      pemain: t.pemain,
      kartu: t.kartu,
      soal: t.soal ?? null,
    }));

  if (barisBot.length) await db.from('room_pemain').insert(barisBot);
  await Promise.all([
    db.from('game_core').upsert({ room_code: code, versi: 0, state }),
    db
      .from('game_publik')
      .upsert({ room_code: code, versi: 0, state: redaksiState(state) }),
    db.from('tangan').upsert(barisTangan),
    db
      .from('rooms')
      .update({ status: 'bermain', seed, diperbarui: new Date().toISOString() })
      .eq('code', code),
  ]);

  return { ok: true };
}

/**
 * Mint kredensial TURN Cloudflare (short-lived) untuk voice chat. API token
 * tetap di server. Kembalikan `{ iceServers: null }` bila belum dikonfigurasi
 * → klien fallback ke STUN / env TURN.
 */
async function turnKredensial() {
  if (!CF_TURN_KEY_ID || !CF_TURN_API_TOKEN) return { iceServers: null };
  try {
    const r = await fetch(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${CF_TURN_KEY_ID}/credentials/generate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${CF_TURN_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ttl: 86400 }),
      },
    );
    if (!r.ok) {
      console.error('[turn] cloudflare', r.status, await r.text());
      return { iceServers: null };
    }
    const data = await r.json();
    // API bisa balas { iceServers: {...} } atau { iceServers: [...] }.
    return { iceServers: data.iceServers ?? null };
  } catch (e) {
    console.error('[turn] gagal', e);
    return { iceServers: null };
  }
}

// ── Sinkronisasi & aksi state ────────────────────────────────────────
async function sync(db: SupabaseClient, uid: string, code: string) {
  const room = await ambilRoom(db, code);
  const [{ data: roster }, { data: pub }, { data: tangan }] = await Promise.all([
    db.from('room_pemain').select('*').eq('room_code', code).order('urutan'),
    db.from('game_publik').select('versi, state').eq('room_code', code).maybeSingle(),
    db
      .from('tangan')
      .select('kartu, soal')
      .eq('room_code', code)
      .eq('pemain', uid)
      .maybeSingle(),
  ]);
  return {
    room,
    roster: roster ?? [],
    versi: pub?.versi ?? 0,
    statePublik: pub?.state ?? null,
    tanganku: tangan?.kartu ?? [],
    soalPrivat: tangan?.soal ?? null,
  };
}

interface OpsiAksi {
  hostSaja?: boolean;
  anggotaSaja?: boolean;
  /** Kembali tanpa menulis kalau `ubah` tak mengubah state (mis. cekUno). */
  lewatiBilaSama?: boolean;
  /** Diisi oleh `jawabKuis` — hasil kuis pemanggil, untuk poin Peringkat Golongan. */
  kuisHasil?: 'benarCepat' | 'benarLambat' | 'salah';
}

/** Muat core → jalankan `ubah` → lanjutkanOtomatis → simpan (optimistic lock). */
async function aksiState(
  db: SupabaseClient,
  uid: string,
  code: string,
  ubah: (s: GameState) => GameState,
  opsi: OpsiAksi = {},
) {
  const room = await ambilRoom(db, code);
  if (opsi.hostSaja) assert(room.host === uid, 'hanya host');
  if (opsi.anggotaSaja || opsi.hostSaja) {
    const { data: anggota } = await db
      .from('room_pemain')
      .select('pemain')
      .eq('room_code', code)
      .eq('pemain', uid)
      .maybeSingle();
    assert(anggota, 'kamu bukan anggota room ini');
  }

  const { data: core } = await db
    .from('game_core')
    .select('versi, state')
    .eq('room_code', code)
    .single();
  if (!core) throw new Error('permainan belum dimulai');

  const asal = core.state as GameState;
  const diubah = ubah(asal);
  if (opsi.lewatiBilaSama && diubah === asal) return { ok: true, tanpaUbah: true };
  // Online: kartu Fun Fact / Fakta TIDAK memblokir permainan — tiap klien
  // menutupnya sendiri (per orang).
  const next = stampUno(
    lanjutkanOtomatis(diubah, { berhentiKartuFakta: false }),
  );
  const hasil = await simpan(db, code, core.versi as number, next);

  // ── Poin Peringkat Golongan (server-otoritatif, anti-cheat) ──────────
  if ('ok' in hasil && hasil.ok) {
    try {
      await beriPoinPeringkat(db, uid, asal, next, opsi.kuisHasil);
    } catch (_) {
      /* poin tak boleh menggagalkan aksi permainan */
    }
  }

  // Balikan state langsung ke pemanggil (tangan + soal privat miliknya) supaya
  // klien tak perlu menunggu push Realtime — mengurangi delay giliran sendiri.
  if ('ok' in hasil && hasil.ok) {
    const tanganku = next.pemain.find((p) => p.id === uid)?.tangan ?? [];
    const soalPrivat =
      next.status === 'menungguKuis' &&
      next.efekTertunda?.targetPemainId === uid
        ? next.soalAktif
        : null;
    return { ...hasil, tanganku, soalPrivat };
  }
  return hasil;
}

/**
 * Beri poin ke murid pemanggil: (1) kuis benar → poin kecil dibobot kesulitan,
 * (2) baru saja menang permainan → bonus besar `poinBonusMenangOnline`.
 * Akurasi per golongan juga dicatat. No-op untuk tamu/guru (tak ada baris murid).
 */
async function beriPoinPeringkat(
  db: SupabaseClient,
  uid: string,
  asal: GameState,
  next: GameState,
  kuisHasil?: 'benarCepat' | 'benarLambat' | 'salah',
) {
  // (1) Kuis yang baru saja dijawab pemanggil
  if (kuisHasil && asal.status === 'menungguKuis' && asal.efekTertunda) {
    const muridId = await muridDariAuthUid(db, uid);
    if (muridId) {
      const benar = kuisHasil !== 'salah';
      const g = asal.soalAktif?.golonganTerkait ?? 'umum';
      const poin = benar ? poinJawabanBenar(asal.efekTertunda.tingkatKuis) : 0;
      await beriPoinMurid(db, muridId, poin, {
        [g]: { benar: benar ? 1 : 0, total: 1 },
      });
    }
  }

  // (2) Permainan baru saja usai — bonus pemenang + evaluasi Misi tiap pemain manusia
  if (asal.status !== 'selesai' && next.status === 'selesai') {
    // Bonus menang berjenjang: makin banyak MANUSIA di room, makin besar.
    const jumlahManusia = next.pemain.filter((p) => !p.isBot).length;
    const bonusMenang = poinBonusMenangOnline(jumlahManusia);

    for (const p of next.pemain) {
      if (p.isBot) continue;
      const muridId = await muridDariAuthUid(db, p.id);
      if (!muridId) continue;

      const menang = next.pemenangId === p.id;
      if (menang && bonusMenang > 0) await beriPoinMurid(db, muridId, bonusMenang);

      const skor = next.skorKuisSesi?.[p.id] ?? {
        benar: 0,
        salah: 0,
        benarGolongan: {},
      };
      await evaluasiMisi(db, muridId, {
        menang,
        online: true,
        kuisBenar: skor.benar,
        kuisSalah: skor.salah,
        benarPerGolongan: skor.benarGolongan,
      });
    }
  }
}

async function simpan(
  db: SupabaseClient,
  code: string,
  versiLama: number,
  next: GameState,
) {
  const versiBaru = versiLama + 1;
  const publik = redaksiState(next);
  const { data: terkunci } = await db
    .from('game_core')
    .update({ versi: versiBaru, state: next })
    .eq('room_code', code)
    .eq('versi', versiLama)
    .select('room_code');
  if (!terkunci || terkunci.length === 0) {
    const { data: kini } = await db
      .from('game_publik')
      .select('versi, state')
      .eq('room_code', code)
      .single();
    return { stale: true, versi: kini?.versi, statePublik: kini?.state };
  }

  const barisTangan = pisahTangan(next)
    .filter((t) => !t.pemain.startsWith('bot-'))
    .map((t) => ({
      room_code: code,
      pemain: t.pemain,
      kartu: t.kartu,
      soal: t.soal ?? null,
    }));
  await Promise.all([
    db
      .from('game_publik')
      .update({
        versi: versiBaru,
        state: publik,
        diperbarui: new Date().toISOString(),
      })
      .eq('room_code', code),
    barisTangan.length
      ? db.from('tangan').upsert(barisTangan)
      : Promise.resolve(),
  ]);
  if (next.status === 'selesai') {
    await db
      .from('rooms')
      .update({ status: 'selesai', diperbarui: new Date().toISOString() })
      .eq('code', code);
  }
  return { ok: true, versi: versiBaru, statePublik: publik };
}

/**
 * Heartbeat + auto-resolve giliran yang macet (>30 dtk tak ada respons).
 * Lewat 30 dtk → SATU giliran macet diselesaikan pakai keputusan bot pintar
 * (`langkahBot`/`jawabKuisBot`/`warnaBotTerbaik`) tanpa mengubah status
 * `isBot`-nya — begitu ia balik, gilirannya sendiri lagi seperti biasa.
 * Lewat 2 menit tanpa denyut sama sekali → `isBot` ditandai PERMANEN supaya
 * semua giliran berikutnya langsung dijalankan bot (tak perlu nunggu 30 dtk
 * tiap giliran lagi). Begitu pemainnya kirim denyut sendiri lagi (reconnect),
 * kendali dikembalikan otomatis di awal fungsi ini.
 */
async function denyut(db: SupabaseClient, uid: string, code: string) {
  await db
    .from('room_pemain')
    .update({ terhubung: true, last_seen: new Date().toISOString() })
    .eq('room_code', code)
    .eq('pemain', uid);

  const room = await ambilRoom(db, code).catch(() => null);
  if (!room || room.status !== 'bermain') return { ok: true };

  const { data: core } = await db
    .from('game_core')
    .select('versi, state')
    .eq('room_code', code)
    .maybeSingle();
  if (!core) return { ok: true };
  const s = core.state as GameState;
  const versi = core.versi as number;

  // Reconnect: kalau pemanggil sempat diambil alih bot (lewat ambang 2 menit),
  // kembalikan kendali begitu ia terbukti hidup lagi (memanggil denyut sendiri).
  const akuSendiri = s.pemain.find((p) => p.id === uid);
  if (akuSendiri?.isBot) {
    await simpan(db, code, versi, {
      ...s,
      pemain: s.pemain.map((p) => (p.id === uid ? { ...p, isBot: false } : p)),
    });
    return { ok: true, kembaliDariBot: true };
  }

  // Backstop: tegakkan batas waktu UNO kalau ada yang kelamaan.
  const setelahUno = cekUnoKadaluarsa(s, { abaikanKartuFakta: true });
  if (setelahUno !== s) {
    await simpan(
      db,
      code,
      versi,
      stampUno(lanjutkanOtomatis(setelahUno, { berhentiKartuFakta: false })),
    );
    return { ok: true, unoKadaluarsa: true };
  }

  // Siapa yang ditunggu?
  let ditunggu: string | null = null;
  if (s.menungguPembukaan) ditunggu = room.host;
  else if (s.status === 'menungguKuis' && s.efekTertunda)
    ditunggu = s.efekTertunda.targetPemainId;
  else if (s.status === 'selesai') ditunggu = null;
  else ditunggu = s.pemain[s.giliran]?.id ?? null;

  if (!ditunggu || ditunggu.startsWith('bot-')) return { ok: true };

  const { data: rp } = await db
    .from('room_pemain')
    .select('last_seen')
    .eq('room_code', code)
    .eq('pemain', ditunggu)
    .maybeSingle();
  if (!rp) return { ok: true };
  const diam = Date.now() - new Date(rp.last_seen).getTime();
  if (diam < AMBANG_MACET_MS) return { ok: true };

  const permanen = diam >= AMBANG_BOT_MS;

  let next: GameState;
  if (permanen) {
    // Ambil alih penuh & seterusnya — `lanjutkanOtomatis` men-cascade semua
    // giliran berikutnya milik `ditunggu` (dan bot lain) seperti bot biasa.
    next = lanjutkanOtomatis(
      {
        ...s,
        pemain: s.pemain.map((p) =>
          p.id === ditunggu ? { ...p, isBot: true } : p,
        ),
      },
      { berhentiKartuFakta: false },
    );
  } else {
    // Selesaikan HANYA giliran macet ini pakai keputusan bot pintar — `isBot`
    // TAK diubah, supaya begitu ia reconnect gilirannya sendiri lagi (tak
    // "kebablasan" main banyak giliran sekaligus lewat cascade bot).
    let s1 = s;
    if (s.menungguPembukaan) s1 = { ...s, menungguPembukaan: false };
    else if (s.peristiwaAktif) s1 = { ...s, peristiwaAktif: null };
    else if (s.status === 'menungguKuis') {
      const { hasil, state: s2 } = jawabKuisBot(s);
      s1 = selesaikanKuis(s2, hasil);
    } else if (s.status === 'menungguPilihWarna') {
      s1 = pilihWarna(s, warnaBotTerbaik(s, ditunggu));
    } else if (s.status === 'bermain') {
      const aksi = langkahBot(s);
      s1 =
        aksi.tipe === 'tarik'
          ? tarikKartu(s, ditunggu)
          : mainkanBerbarengan(
              s,
              ditunggu,
              [aksi.kartuId, ...(aksi.ekstraIds ?? [])],
              { warnaWild: aksi.warnaWild },
            );
    }
    next = lanjutkanOtomatis(s1, { berhentiKartuFakta: false });
  }
  await simpan(db, code, versi, next);
  return { ok: true, autoResolve: true, permanen };
}

// ── util ─────────────────────────────────────────────────────────────
function assert(kondisi: unknown, pesan: string): asserts kondisi {
  if (!kondisi) throw new Error(pesan);
}

async function ambilRoom(db: SupabaseClient, code: string) {
  const { data, error } = await db
    .from('rooms')
    .select('*')
    .eq('code', code)
    .single();
  if (error || !data) throw new Error('room tidak ditemukan');
  return data as {
    code: string;
    host: string;
    status: string;
    target_pemain: number;
    pakai_peristiwa: boolean;
  };
}

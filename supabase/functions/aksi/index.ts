// ChemUno — Edge Function otoritatif untuk mode online.
// Setiap aksi permainan diproses di sini memakai engine murni yang SAMA dengan
// klien (supabase/functions/_shared/game — hasil `npm run sync:supabase`).
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import {
  buatGame,
  cekUnoKadaluarsa,
  lanjutkanOtomatis,
  mainkanBerbarengan,
  nyatakanUno,
  pilihWarna,
  selesaikanKuis,
  stampUno,
  tangkapUno,
  tarikKartu,
  type GameState,
  type Golongan,
  type OpsiPemain,
} from '../_shared/game/index.ts';
import { pisahTangan, redaksiState } from '../_shared/redaksi.ts';

const URL = Deno.env.get('SUPABASE_URL')!;
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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
      return aksiState(db, uid, code, (s) => {
        assert(s.status === 'menungguKuis' && s.efekTertunda, 'bukan fase kuis');
        assert(s.efekTertunda.targetPemainId === uid, 'bukan kuismu');
        return selesaikanKuis(s, b.hasil as 'benarCepat' | 'benarLambat' | 'salah');
      });
    case 'lanjut':
      return aksiState(db, uid, code, (s) => {
        if (s.peristiwaAktif) return { ...s, peristiwaAktif: null };
        if (s.funFactAktif) return { ...s, funFactAktif: null };
        return s;
      }, { anggotaSaja: true });
    case 'nyatakanUno':
      return aksiState(db, uid, code, (s) => nyatakanUno(s, uid), {
        anggotaSaja: true,
      });
    case 'tangkapUno':
      return aksiState(db, uid, code, (s) => tangkapUno(s, uid, String(b.target)), {
        anggotaSaja: true,
      });
    case 'cekUno':
      return aksiState(db, uid, code, (s) => cekUnoKadaluarsa(s), {
        anggotaSaja: true,
        lewatiBilaSama: true,
      });
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
    ...buatGame(opsi, seed, room.pakai_peristiwa),
    menungguPembukaan: true,
  };

  const barisTangan = pisahTangan(state)
    .filter((t) => !t.pemain.startsWith('bot-'))
    .map((t) => ({ room_code: code, pemain: t.pemain, kartu: t.kartu }));

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

// ── Sinkronisasi & aksi state ────────────────────────────────────────
async function sync(db: SupabaseClient, uid: string, code: string) {
  const room = await ambilRoom(db, code);
  const [{ data: roster }, { data: pub }, { data: tangan }] = await Promise.all([
    db.from('room_pemain').select('*').eq('room_code', code).order('urutan'),
    db.from('game_publik').select('versi, state').eq('room_code', code).maybeSingle(),
    db
      .from('tangan')
      .select('kartu')
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
  };
}

interface OpsiAksi {
  hostSaja?: boolean;
  anggotaSaja?: boolean;
  /** Kembali tanpa menulis kalau `ubah` tak mengubah state (mis. cekUno). */
  lewatiBilaSama?: boolean;
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
  const next = stampUno(lanjutkanOtomatis(diubah));
  return simpan(db, code, core.versi as number, next);
}

async function simpan(
  db: SupabaseClient,
  code: string,
  versiLama: number,
  next: GameState,
) {
  const versiBaru = versiLama + 1;
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
    .map((t) => ({ room_code: code, pemain: t.pemain, kartu: t.kartu }));
  await Promise.all([
    db
      .from('game_publik')
      .update({
        versi: versiBaru,
        state: redaksiState(next),
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
  return { ok: true, versi: versiBaru };
}

/** Heartbeat + auto-resolve giliran yang macet (>30 dtk tak ada respons). */
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

  // Backstop: tegakkan batas waktu UNO kalau ada yang kelamaan.
  const setelahUno = cekUnoKadaluarsa(s);
  if (setelahUno !== s) {
    await simpan(db, code, core.versi as number, stampUno(lanjutkanOtomatis(setelahUno)));
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

  // Auto-resolve.
  let next = s;
  if (s.menungguPembukaan) next = { ...s, menungguPembukaan: false };
  else if (s.peristiwaAktif) next = { ...s, peristiwaAktif: null };
  else if (s.funFactAktif) next = { ...s, funFactAktif: null };
  else if (s.status === 'menungguKuis') next = selesaikanKuis(s, 'salah');
  else if (s.status === 'menungguPilihWarna') next = pilihWarna(s, 'alkali');
  else if (s.status === 'bermain') next = tarikKartu(s, ditunggu);

  next = lanjutkanOtomatis(next);
  await simpan(db, code, core.versi as number, next);
  return { ok: true, autoResolve: true };
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

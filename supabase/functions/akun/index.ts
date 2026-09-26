// UNO-Chem Fase 4 — Edge Function identitas MURID (ringan: Nama + PIN 4 digit).
//
// Guru memakai Supabase Auth langsung dari klien (RLS `guru_id = auth.uid()`).
// Fungsi ini KHUSUS murid: simpan PIN (apa adanya — media belajar, lihat 0006),
// generate kode unik, terbitkan session token (disimpan di localStorage device,
// hanya hash-nya di DB), tautkan ke sesi anon device supaya atribusi kemenangan
// online bisa dilakukan nanti (Minggu 2).
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { beriPoinMurid, type AkurasiDelta } from '../_shared/poin.ts';
import { evaluasiMisi } from '../_shared/misi.ts';
import type { KonteksSesi } from '../_shared/game/misi.ts';
import { streakAktif, tanggalWIB } from '../_shared/game/misiHarian.ts';

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

const PIN_RE = /^\d{4}$/;
const bersih = (v: unknown, maks: number) => String(v ?? '').trim().slice(0, maks);

async function sha256hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function tokenBaru(): string {
  const a = new Uint8Array(24);
  crypto.getRandomValues(a);
  return btoa(String.fromCharCode(...a))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const auth = req.headers.get('Authorization') ?? '';
  const userKlien = createClient(URL, ANON, {
    global: { headers: { Authorization: auth } },
  });
  const { data: { user } } = await userKlien.auth.getUser();
  if (!user) return json({ error: 'tak terautentikasi' }, 401);

  const db = createClient(URL, SERVICE, { auth: { persistSession: false } });
  const anonUid = user.is_anonymous ? user.id : null;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'body bukan JSON' }, 400);
  }

  try {
    return json(await tangani(db, anonUid, body));
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 400);
  }
});

async function tangani(
  db: SupabaseClient,
  anonUid: string | null,
  b: Record<string, unknown>,
) {
  switch (String(b.tipe)) {
    case 'daftar':
      return daftar(db, anonUid, b);
    case 'masuk':
      return masuk(db, anonUid, b);
    case 'sesi':
      return sesi(db, anonUid, b);
    case 'gabungKelas':
      return gabungKelas(db, b);
    case 'tambahPoin':
      return tambahPoin(db, b);
    case 'sinkronProgres':
      return sinkronProgres(db, b);
    case 'keluar':
      return keluar(db, b);
    default:
      throw new Error('tipe aksi tak dikenal');
  }
}

// ── Helper ───────────────────────────────────────────────────────────
interface MuridRow {
  id: string;
  nama: string;
  kode_unik: string;
  kelas_id: string | null;
}

async function lewatToken(db: SupabaseClient, token: string): Promise<MuridRow> {
  if (!token) throw new Error('token kosong');
  const { data } = await db
    .from('murid')
    .select('id, nama, kode_unik, kelas_id')
    .eq('sesi_token_hash', await sha256hex(token))
    .maybeSingle();
  if (!data) throw new Error('sesi tidak valid — masuk ulang dengan Nama + PIN');
  return data as MuridRow;
}

/** Tautkan murid ke sesi anon device ini (lepaskan dari murid lain dulu). */
async function tautkan(db: SupabaseClient, muridId: string, anonUid: string | null) {
  if (!anonUid) return;
  await db.from('murid').update({ auth_uid: null }).eq('auth_uid', anonUid).neq('id', muridId);
  await db.from('murid').update({ auth_uid: anonUid }).eq('id', muridId);
}

async function namaKelas(db: SupabaseClient, kelasId: string | null) {
  if (!kelasId) return null;
  const { data } = await db
    .from('kelas')
    .select('nama_kelas')
    .eq('id', kelasId)
    .maybeSingle();
  return (data?.nama_kelas as string | undefined) ?? null;
}

/**
 * Status Misi Harian hari ini (WIB). null bila tabel/kolom harian belum
 * dimigrasi — klien lalu menyembunyikan fitur ini, akun tetap jalan.
 */
async function ringkasHarian(db: SupabaseClient, muridId: string) {
  const tanggal = tanggalWIB();
  const [prog, pm] = await Promise.all([
    db
      .from('misi_harian_progres')
      .select('misi_id, progres, selesai')
      .eq('murid_id', muridId)
      .eq('tanggal', tanggal),
    db
      .from('progres_murid')
      .select('harian_streak, harian_streak_terbaik, harian_terakhir, harian_total')
      .eq('murid_id', muridId)
      .maybeSingle(),
  ]);
  if (prog.error || pm.error || !pm.data) return null;
  return {
    tanggal,
    progres: (prog.data ?? []).map((r) => ({
      misiId: r.misi_id as string,
      progres: r.progres as number,
      selesai: r.selesai as boolean,
    })),
    streak: streakAktif(pm.data.harian_terakhir, pm.data.harian_streak ?? 0, tanggal),
    streakTerbaik: pm.data.harian_streak_terbaik ?? 0,
    totalLengkap: pm.data.harian_total ?? 0,
    lengkapHariIni: pm.data.harian_terakhir === tanggal,
  };
}

async function ringkas(db: SupabaseClient, murid: MuridRow, token?: string) {
  const [{ data: pr }, { data: misiProg }, harian] = await Promise.all([
    db
      .from('progres_murid')
      .select(
        'total_poin, peringkat_golongan_aktif, peringkat_golongan_rekor, badge_diraih, riwayat_akurasi_per_golongan, progres_lokal',
      )
      .eq('murid_id', murid.id)
      .maybeSingle(),
    db
      .from('misi_progres_murid')
      .select('misi_id, progres, selesai, selesai_pada')
      .eq('murid_id', murid.id),
    ringkasHarian(db, murid.id),
  ]);
  return {
    harian,
    misiProgres: (misiProg ?? []).map((r) => ({
      misiId: r.misi_id,
      progres: r.progres,
      selesai: r.selesai,
      selesaiPada: r.selesai_pada,
    })),
    murid: {
      id: murid.id,
      nama: murid.nama,
      kodeUnik: murid.kode_unik,
      kelasId: murid.kelas_id,
      kelasNama: await namaKelas(db, murid.kelas_id),
    },
    progres: pr
      ? {
          totalPoin: pr.total_poin,
          peringkatGolonganAktif: pr.peringkat_golongan_aktif,
          peringkatGolonganRekor: pr.peringkat_golongan_rekor,
          badgeDiraih: pr.badge_diraih ?? [],
          riwayatAkurasiPerGolongan: pr.riwayat_akurasi_per_golongan ?? {},
          progresLokal: pr.progres_lokal ?? {},
        }
      : null,
    ...(token ? { token } : {}),
  };
}

// ── Endpoint ─────────────────────────────────────────────────────────
async function daftar(
  db: SupabaseClient,
  anonUid: string | null,
  b: Record<string, unknown>,
) {
  const nama = bersih(b.nama, 24);
  const pin = String(b.pin ?? '');
  const kodeKelas = bersih(b.kodeKelas, 8).toUpperCase();
  if (nama.length < 1) throw new Error('Nama wajib diisi');
  if (!PIN_RE.test(pin)) throw new Error('PIN harus tepat 4 angka');

  let kelasId: string | null = null;
  if (kodeKelas) {
    const { data: k } = await db
      .from('kelas')
      .select('id')
      .eq('kode_kelas', kodeKelas)
      .maybeSingle();
    if (!k) throw new Error('Kode kelas tidak ditemukan');
    kelasId = k.id as string;
  }

  const { data: murid, error } = await db
    .from('murid')
    .insert({ nama, pin, kelas_id: kelasId })
    .select('id, nama, kode_unik, kelas_id')
    .single();
  if (error) throw new Error(error.message);

  // Baris progres_murid dibuat trigger — isi blob localStorage lama (poin 4).
  const progresLokal = (b.progresLokal ?? {}) as Record<string, unknown>;
  const badge = Array.isArray(progresLokal.badge)
    ? (progresLokal.badge as string[])
    : [];
  await db
    .from('progres_murid')
    .update({ progres_lokal: progresLokal, badge_diraih: badge })
    .eq('murid_id', murid.id);

  const token = tokenBaru();
  await db
    .from('murid')
    .update({ sesi_token_hash: await sha256hex(token) })
    .eq('id', murid.id);
  await tautkan(db, murid.id as string, anonUid);

  return ringkas(db, murid as MuridRow, token);
}

async function masuk(
  db: SupabaseClient,
  anonUid: string | null,
  b: Record<string, unknown>,
) {
  const nama = bersih(b.nama, 24);
  const pin = String(b.pin ?? '');
  const kodeUnik = bersih(b.kodeUnik, 4);
  if (!PIN_RE.test(pin)) throw new Error('PIN harus tepat 4 angka');

  const { data } = await db.rpc('murid_cocok_pin', { p_nama: nama, p_pin: pin });
  const rows = (data ?? []) as MuridRow[];
  if (rows.length === 0) throw new Error('Nama atau PIN salah');

  let target = rows[0];
  if (rows.length > 1) {
    if (!kodeUnik) {
      // Beberapa akun cocok → murid harus memilih kode uniknya sendiri.
      const pilihan = [];
      for (const r of rows) {
        pilihan.push({
          kodeUnik: r.kode_unik,
          kelasNama: await namaKelas(db, r.kelas_id),
        });
      }
      return { pilihan };
    }
    const p = rows.find((r) => r.kode_unik === kodeUnik);
    if (!p) throw new Error('Kode akun tidak cocok');
    target = p;
  }

  const { data: murid } = await db
    .from('murid')
    .select('id, nama, kode_unik, kelas_id')
    .eq('id', target.id)
    .single();

  const token = tokenBaru();
  await db
    .from('murid')
    .update({ sesi_token_hash: await sha256hex(token) })
    .eq('id', target.id);
  await tautkan(db, target.id, anonUid);

  return ringkas(db, murid as MuridRow, token);
}

async function sesi(
  db: SupabaseClient,
  anonUid: string | null,
  b: Record<string, unknown>,
) {
  const token = bersih(b.token, 64);
  const murid = await lewatToken(db, token);
  await tautkan(db, murid.id, anonUid);
  return ringkas(db, murid, token);
}

async function gabungKelas(db: SupabaseClient, b: Record<string, unknown>) {
  const murid = await lewatToken(db, bersih(b.token, 64));
  const kode = bersih(b.kodeKelas, 8).toUpperCase();
  const { data: k } = await db
    .from('kelas')
    .select('id')
    .eq('kode_kelas', kode)
    .maybeSingle();
  if (!k) throw new Error('Kode kelas tidak ditemukan');
  await db.from('murid').update({ kelas_id: k.id }).eq('id', murid.id);
  return ringkas(db, { ...murid, kelas_id: k.id as string });
}

/** Peta hitungan dari klien → hanya bilangan bulat 0..50 (buang nilai aneh). */
function petaAngka(v: unknown): Record<string, number> {
  const hasil: Record<string, number> = {};
  if (!v || typeof v !== 'object') return hasil;
  for (const [k, n] of Object.entries(v as Record<string, unknown>)) {
    const x = Math.floor(Number(n));
    if (Number.isFinite(x) && x > 0) hasil[k.slice(0, 20)] = Math.min(x, 50);
  }
  return hasil;
}

/**
 * Laporan poin dari SESI SOLO (klien, stakes rendah). `poin` di-clamp; menang
 * lawan bot TIDAK dapat bonus besar (klien tak boleh mengirimnya).
 */
async function tambahPoin(db: SupabaseClient, b: Record<string, unknown>) {
  const murid = await lewatToken(db, bersih(b.token, 64));

  // Idempotensi: klien mengirim ulang laporan yang gagal. Laporan dengan
  // `sesiId` yang sudah pernah diproses → abaikan (jangan hitung dua kali).
  // Bila tabel belum dimigrasi (0012), lanjut tanpa pengecekan.
  const sesiId = bersih(b.sesiId, 64);
  if (sesiId) {
    const { error } = await db
      .from('laporan_sesi')
      .insert({ murid_id: murid.id, sesi_id: sesiId });
    if (error?.code === '23505') return { ok: true, duplikat: true, misiSelesai: [] };
    if (error) console.error('laporan_sesi', error.message);
  }
  const poin = Math.max(0, Math.min(Math.floor(Number(b.poin) || 0), 2000));
  const akurasi = (b.akurasi ?? {}) as AkurasiDelta;
  let progres = await beriPoinMurid(db, murid.id, poin, akurasi);

  // Evaluasi Misi dari konteks sesi solo (opsional).
  let misiSelesai: unknown[] = [];
  const s = b.sesi as Partial<KonteksSesi> | undefined;
  if (s) {
    misiSelesai = await evaluasiMisi(db, murid.id, {
      menang: Boolean(s.menang),
      online: false,
      kuisBenar: Math.max(0, Math.floor(Number(s.kuisBenar) || 0)),
      kuisSalah: Math.max(0, Math.floor(Number(s.kuisSalah) || 0)),
      benarPerGolongan: petaAngka(s.benarPerGolongan) as KonteksSesi['benarPerGolongan'],
      benarPerTP: petaAngka(s.benarPerTP),
      kartuPerGolongan: petaAngka(s.kartuPerGolongan) as KonteksSesi['kartuPerGolongan'],
    });
    if (misiSelesai.length) {
      // reward misi menambah poin → ambil progres terbaru
      const { data: pr } = await db
        .from('progres_murid')
        .select(
          'total_poin, peringkat_golongan_aktif, peringkat_golongan_rekor',
        )
        .eq('murid_id', murid.id)
        .maybeSingle();
      if (pr)
        progres = {
          totalPoin: pr.total_poin,
          peringkatGolonganAktif: pr.peringkat_golongan_aktif,
          peringkatGolonganRekor: pr.peringkat_golongan_rekor,
        };
    }
  }
  return { ok: true, progres, misiSelesai };
}

async function sinkronProgres(db: SupabaseClient, b: Record<string, unknown>) {
  const murid = await lewatToken(db, bersih(b.token, 64));
  const progresLokal = (b.progresLokal ?? {}) as Record<string, unknown>;
  const badgeLokal = Array.isArray(progresLokal.badge)
    ? (progresLokal.badge as string[])
    : [];
  const { data: cur } = await db
    .from('progres_murid')
    .select('badge_diraih')
    .eq('murid_id', murid.id)
    .maybeSingle();
  const badge = [...new Set([...(cur?.badge_diraih ?? []), ...badgeLokal])];
  await db
    .from('progres_murid')
    .update({ progres_lokal: progresLokal, badge_diraih: badge })
    .eq('murid_id', murid.id);
  return { ok: true };
}

async function keluar(db: SupabaseClient, b: Record<string, unknown>) {
  const h = await sha256hex(bersih(b.token, 64));
  await db.from('murid').update({ sesi_token_hash: null }).eq('sesi_token_hash', h);
  return { ok: true };
}

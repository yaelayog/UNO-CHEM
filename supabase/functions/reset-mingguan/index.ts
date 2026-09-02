// ChemUno Fase 4 — Reset mingguan Peringkat Golongan (SPEC bagian 10).
//
// Dijadwalkan sebagai cron (mis. tiap Senin 00:00 WIB). Menurunkan peringkat
// aktif tiap murid ~3 golongan dari puncak minggu ini (lantai 3 bila pernah
// capai 3), dan menol-kan poin minggu berjalan. Rekor tertinggi TIDAK berubah.
//
// Rumus di `_shared/game/peringkat.ts` (satu sumber). Update di-GRUP per
// (peringkat_aktif, peringkat_rekor) supaya efisien walau ratusan murid.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { terapkanResetMingguan } from '../_shared/game/peringkat.ts';

const URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? '';

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

function potong<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

Deno.serve(async (req) => {
  // Hanya cron / admin. Terima CRON_SECRET atau service role key.
  const bearer = (req.headers.get('Authorization') ?? '').replace(
    /^Bearer\s+/i,
    '',
  );
  if (!bearer || (bearer !== CRON_SECRET && bearer !== SERVICE)) {
    return json({ error: 'tak berwenang' }, 401);
  }

  const db = createClient(URL, SERVICE, { auth: { persistSession: false } });
  const hariIni = new Date().toISOString().slice(0, 10);
  // Belum di-reset dalam 6 hari terakhir (aman dari double-fire seminggu).
  const ambang = new Date(Date.now() - 6 * 864e5).toISOString().slice(0, 10);

  const { data: baris, error } = await db
    .from('progres_murid')
    .select(
      'murid_id, peringkat_golongan_aktif, peringkat_golongan_rekor',
    )
    .lt('minggu_reset_terakhir', ambang);
  if (error) return json({ error: error.message }, 500);

  // Grup per (aktif, rekor) → hasil reset sama untuk seluruh grup.
  const grup = new Map<
    string,
    { aktif: number; rekor: number; ids: string[] }
  >();
  for (const r of baris ?? []) {
    const aktif = r.peringkat_golongan_aktif ?? 1;
    const rekor = r.peringkat_golongan_rekor ?? 1;
    const key = `${aktif}|${rekor}`;
    const g = grup.get(key) ?? { aktif, rekor, ids: [] };
    g.ids.push(r.murid_id as string);
    grup.set(key, g);
  }

  let direset = 0;
  for (const g of grup.values()) {
    const aktifBaru = terapkanResetMingguan(g.aktif, g.rekor);
    for (const bagian of potong(g.ids, 400)) {
      const { error: e2 } = await db
        .from('progres_murid')
        .update({
          total_poin: 0,
          peringkat_golongan_aktif: aktifBaru,
          minggu_reset_terakhir: hariIni,
        })
        .in('murid_id', bagian);
      if (!e2) direset += bagian.length;
    }
  }

  return json({ ok: true, direset, grup: grup.size });
});

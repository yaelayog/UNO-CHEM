/**
 * Menyalin engine murni (`src/game`, `src/data`) ke `supabase/functions/_shared/`
 * supaya Edge Function (Deno) memakai LOGIKA PERMAINAN YANG SAMA PERSIS dengan
 * klien — tanpa menulis ulang aturan main (brief §6c).
 *
 * Import relatif tanpa ekstensi (`from './types'`) ditambahi `.ts` agar sah di
 * Deno. File `*.test.ts` dilewati.
 *
 *   node scripts/sync-engine.mjs      (atau `npm run sync:supabase`)
 */
import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tujuan = join(root, 'supabase/functions/_shared');

const SUMBER = ['src/game', 'src/data'];

// Tambah `.ts` pada import/export relatif yang belum berekstensi.
function perbaikiImport(kode) {
  return kode.replace(
    /(\bfrom\s+['"])(\.\.?\/[^'"]+?)(['"])/g,
    (cocok, a, jalur, c) =>
      /\.(ts|js|json|mjs)$/.test(jalur) ? cocok : `${a}${jalur}.ts${c}`,
  );
}

function salinDir(rel) {
  const src = join(root, rel);
  const dst = join(tujuan, rel.replace(/^src\//, ''));
  mkdirSync(dst, { recursive: true });
  for (const nama of readdirSync(src)) {
    if (!nama.endsWith('.ts') || nama.endsWith('.test.ts') || nama.endsWith('.spec.ts')) {
      continue;
    }
    const isi = perbaikiImport(readFileSync(join(src, nama), 'utf8'));
    writeFileSync(join(dst, nama), isi);
  }
}

// Bersihkan folder hasil generate, sisakan file yang ditulis tangan.
for (const sub of ['game', 'data']) {
  rmSync(join(tujuan, sub), { recursive: true, force: true });
}
mkdirSync(tujuan, { recursive: true });
for (const rel of SUMBER) salinDir(rel);

// Salin package.json versi minimal (opsional, untuk referensi Deno tak butuh).
void cpSync;

console.log(`✓ engine disalin ke ${tujuan.replace(root + '/', '')}`);

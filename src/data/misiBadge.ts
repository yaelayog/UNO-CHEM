// Metadata tampilan lencana reward Misi (Fase 4). Lencana ini masuk ke
// `progres_murid.badge_diraih` saat misi selesai — beda dari 12 lencana
// "Pencapaian" di `badge.ts` (yang dihitung dari statistik lokal).

export interface MisiBadge {
  id: string;
  nama: string;
  ikon: string;
}

export const MISI_BADGE: MisiBadge[] = [
  { id: 'misi-ahli-halogen', nama: 'Ahli Halogen', ikon: '🧪' },
  { id: 'misi-ahli-alkali', nama: 'Ahli Alkali', ikon: '🔥' },
  { id: 'misi-kolektor', nama: 'Kolektor Master', ikon: '🎖️' },
  { id: 'misi-tanpa-cela', nama: 'Tanpa Cela', ikon: '✨' },
  { id: 'misi-juara-ruang', nama: 'Juara Ruang', ikon: '🏟️' },
  { id: 'misi-golongan-5', nama: 'Peringkat Golongan 5', ikon: '🥉' },
  { id: 'misi-golongan-10', nama: 'Peringkat Golongan 10', ikon: '🥈' },
  { id: 'misi-golongan-18', nama: 'Puncak Periodik', ikon: '👑' },
];

const PETA = new Map(MISI_BADGE.map((b) => [b.id, b]));

/** Lencana misi berdasarkan id; null bila bukan lencana misi. */
export function misiBadge(id: string): MisiBadge | null {
  return PETA.get(id) ?? null;
}

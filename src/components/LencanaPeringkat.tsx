// Lencana visual "Peringkat Golongan [1–18]" — dipakai di leaderboard & profil.
// PENTING: ini peringkat musiman, BUKAN golongan warna kartu.

const PITA: { maks: number; bg: string; teks: string; nama: string }[] = [
  { maks: 3, bg: '#e2e8f0', teks: '#475569', nama: 'Dasar' },
  { maks: 6, bg: '#bbf7d0', teks: '#166534', nama: 'Perunggu' },
  { maks: 9, bg: '#bae6fd', teks: '#075985', nama: 'Perak' },
  { maks: 12, bg: '#ddd6fe', teks: '#5b21b6', nama: 'Emas' },
  { maks: 15, bg: '#fed7aa', teks: '#9a3412', nama: 'Platina' },
  { maks: 18, bg: '#fecaca', teks: '#991b1b', nama: 'Master' },
];

export function pitaPeringkat(g: number) {
  return PITA.find((p) => g <= p.maks) ?? PITA[PITA.length - 1];
}

export function LencanaPeringkat({
  golongan,
  ukuran = 'md',
}: {
  golongan: number;
  ukuran?: 'sm' | 'md' | 'lg';
}) {
  const pita = pitaPeringkat(golongan);
  const dim =
    ukuran === 'lg'
      ? 'h-14 w-14 text-xl'
      : ukuran === 'sm'
        ? 'h-8 w-8 text-xs'
        : 'h-11 w-11 text-base';
  return (
    <span
      className={`inline-flex flex-none items-center justify-center rounded-xl font-display font-black ${dim}`}
      style={{ background: pita.bg, color: pita.teks }}
      title={`Peringkat Golongan ${golongan} · ${pita.nama}`}
    >
      {golongan}
    </span>
  );
}

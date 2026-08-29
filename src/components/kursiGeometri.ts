/**
 * Geometri kursi lawan di sekeliling meja oval.
 *
 * Semua kursi lawan diletakkan pada satu BUSUR ELIPS di sisi jauh meja
 * (pemain manusia duduk di bawah layar). Dari SATU sudut `theta` per kursi
 * kita turunkan dua hal sekaligus:
 *   1. posisi (left%, top%) di dalam `.meja-panggung`
 *   2. `miring` — rotasi SATU unit (avatar + fan) supaya sisi depan grup
 *      (fan kartu, default menunjuk ke bawah) selalu menghadap pusat oval.
 *
 * Karena keduanya berasal dari `theta` yang sama, orientasi selalu benar
 * di sudut mana pun — tak ada nilai per-posisi yang di-hardcode. Tambah
 * jumlah lawan → kursi tersebar otomatis & tiap unit ikut berotasi pas.
 */

/** Pusat oval meja, dalam persen kotak `.meja-panggung`. */
const PUSAT = { x: 50, y: 53 };
/** Jari-jari busur tempat kursi lawan (persen). RX > RY → mengikuti oval. */
const RX = 40;
const RY = 45;
/** Setengah rentang busur (derajat) tempat lawan boleh duduk, diukur dari
 *  titik atas (utara) oval. 0° = tepat di seberang pemain. */
const SEBAR_MAKS = 56;
/** Peredam rotasi: 1 = benar-benar menghadap pusat (bisa sangat miring di
 *  sisi), <1 = condong ke pusat tapi label tetap terbaca. */
const INTENSITAS = 1;

const DEG = 180 / Math.PI;

export interface GayaKursi {
  top: string;
  left: string;
  /** derajat, searah jarum jam; dipakai pada wrapper avatar+fan. */
  miring: number;
}

/**
 * Sudut tiap kursi, dibagi rata pada busur [-SEBAR_MAKS, +SEBAR_MAKS].
 * 1 lawan → tepat di atas (0°). n lawan → n titik merata termasuk kedua ujung.
 */
function sudutKursi(jumlah: number): number[] {
  if (jumlah <= 1) return [0];
  const langkah = (2 * SEBAR_MAKS) / (jumlah - 1);
  return Array.from({ length: jumlah }, (_, i) => -SEBAR_MAKS + i * langkah);
}

export function hitungKursi(jumlah: number): GayaKursi[] {
  return sudutKursi(jumlah).map((theta) => {
    const r = theta / DEG;
    const sin = Math.sin(r);
    const cos = Math.cos(r);

    // Posisi pada elips (searah jarum jam dari utara).
    const left = PUSAT.x + RX * sin;
    const top = PUSAT.y - RY * cos;

    // Vektor kursi → pusat = (-RX·sinθ, RY·cosθ) pada koordinat layar (y ke
    // bawah). Samakan dengan hasil rotate(α) atas vektor "bawah" (0,1),
    // yaitu (-sinα, cosα) → α = atan2(RX·sinθ, RY·cosθ).
    const miring = INTENSITAS * Math.atan2(RX * sin, RY * cos) * DEG;

    return { top: `${top.toFixed(2)}%`, left: `${left.toFixed(2)}%`, miring };
  });
}

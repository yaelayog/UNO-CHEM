/**
 * Kipas kartu tertutup milik lawan (maks 5 kartu).
 *
 * Lengkung kipas dibuat CEKUNG MENGHADAP MEJA: sisi cembung (punggung kartu)
 * di atas, sisi cekung di bawah — seperti kartu yang di-drape ke arah tengah
 * papan. Dicapai dengan transform-origin di bawah + kartu tepi diangkat
 * (translateY negatif) sehingga bagian tengah lebih rendah dari tepi → kubah ∩.
 */
export function KipasBelakang({ jumlah }: { jumlah: number }) {
  const n = Math.min(Math.max(jumlah, 1), 5);
  const sebar = n <= 1 ? 0 : Math.min(12, 40 / n);

  return (
    <div className="kipas-belakang" aria-label={`${jumlah} kartu`}>
      {Array.from({ length: n }, (_, i) => {
        const jarak = i - (n - 1) / 2; // -(n-1)/2 .. +(n-1)/2
        const sudut = jarak * sebar;
        // Tepi kipas terangkat → lengkung cekung menghadap meja.
        const angkat = -(jarak * jarak) * 1.6;
        return (
          <span
            key={i}
            style={{ transform: `rotate(${sudut}deg) translateY(${angkat}px)` }}
          />
        );
      })}
    </div>
  );
}

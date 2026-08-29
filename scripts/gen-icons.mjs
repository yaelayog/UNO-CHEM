// Generator ikon PWA sederhana tanpa dependency (solid teal + gelas lab putih).
// Jalankan: node scripts/gen-icons.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}

function png(size, { pad = 0 } = {}) {
  const bg = [15, 118, 110]; // teal-700
  const fg = [204, 251, 241]; // teal-100
  const raw = Buffer.alloc(size * (size * 3 + 1));
  // `pad` (0..1) mengecilkan grafik ke tengah — untuk ikon maskable.
  const skala = 1 - pad * 2;
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0; // filter byte
    for (let x = 0; x < size; x++) {
      // segitiga gelas kimia kasar di tengah (dinormalisasi + diberi padding)
      const cx = size / 2;
      const ny = (y / size - 0.5) / skala + 0.5;
      const nx = (x / size - 0.5) / skala + 0.5;
      const px = nx * size;
      const halfW = (0.08 + 0.34 * ny) * size;
      const inFlask = ny > 0.24 && ny < 0.82 && Math.abs(px - cx) < halfW;
      const inNeck = ny >= 0.16 && ny <= 0.24 && Math.abs(px - cx) < 0.09 * size;
      const c = inFlask || inNeck ? fg : bg;
      const off = y * (size * 3 + 1) + 1 + x * 3;
      raw[off] = c[0];
      raw[off + 1] = c[1];
      raw[off + 2] = c[2];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync('public', { recursive: true });
const daftar = [
  ['pwa-192x192.png', 192, 0],
  ['pwa-512x512.png', 512, 0],
  ['apple-touch-icon.png', 180, 0],
  ['maskable-512.png', 512, 0.14], // safe zone 14% untuk ikon maskable
];
for (const [name, size, pad] of daftar) {
  writeFileSync(`public/${name}`, png(size, { pad }));
  console.log('wrote public/' + name);
}

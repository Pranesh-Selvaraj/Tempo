/**
 * Dependency-free PWA icon generator.
 *
 *   pnpm --filter @tempo/frontend icons
 *
 * Draws the Tempo court mark (navy background, sand court, white net and a
 * volleyball) into PNG buffers by hand so the repo does not need a rasterizer.
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, '../public/icons');
mkdirSync(outDir, { recursive: true });

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) c = CRC_TABLE[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function roundedRect(u, v, cx, cy, width, height, radius) {
  const dx = Math.abs(u - cx) - (width / 2 - radius);
  const dy = Math.abs(v - cy) - (height / 2 - radius);
  const ox = Math.max(dx, 0);
  const oy = Math.max(dy, 0);
  return Math.hypot(ox, oy) + Math.min(Math.max(dx, dy), 0) <= radius;
}

function shade(u, v, scale) {
  // Keep content inside the maskable safe zone by shrinking toward the centre.
  const su = 0.5 + (u - 0.5) / scale;
  const sv = 0.5 + (v - 0.5) / scale;

  let color = [11, 17, 32, 255];

  if (roundedRect(su, sv, 0.5, 0.5, 0.8, 0.36, 0.055)) {
    color = [201, 139, 75, 255];
    if (Math.abs(su - 0.5) < 0.012) color = [248, 250, 252, 255];
    if (Math.abs(su - 0.37) < 0.009 || Math.abs(su - 0.63) < 0.009) color = [248, 250, 252, 255];
  }

  const dx = su - 0.7;
  const dy = sv - 0.24;
  if (dx * dx + dy * dy < 0.1 * 0.1) {
    color = [248, 250, 252, 255];
    if (Math.abs(dy + 0.55 * dx) < 0.018) color = [37, 99, 235, 255];
    if (Math.abs(dy - 0.55 * dx) < 0.018) color = [37, 99, 235, 255];
    if (Math.abs(dx) < 0.016) color = [250, 204, 21, 255];
  }

  return color;
}

function render(size, scale = 1) {
  const data = Buffer.alloc(size * size * 4);
  const samples = [
    [0.25, 0.25],
    [0.75, 0.25],
    [0.25, 0.75],
    [0.75, 0.75],
  ];
  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (const [sx, sy] of samples) {
        const [sr, sg, sb] = shade((px + sx) / size, (py + sy) / size, scale);
        r += sr;
        g += sg;
        b += sb;
      }
      const index = (py * size + px) * 4;
      data[index] = Math.round(r / samples.length);
      data[index + 1] = Math.round(g / samples.length);
      data[index + 2] = Math.round(b / samples.length);
      data[index + 3] = 255;
    }
  }
  return data;
}

const targets = [
  { file: 'icon-192.png', size: 192, scale: 1 },
  { file: 'icon-512.png', size: 512, scale: 1 },
  { file: 'icon-maskable-512.png', size: 512, scale: 0.68 },
  { file: 'apple-touch-icon-180.png', size: 180, scale: 0.92 },
];

for (const target of targets) {
  const png = encodePng(target.size, target.size, render(target.size, target.scale));
  writeFileSync(resolve(outDir, target.file), png);
  console.log(`icon written: ${target.file} (${png.length} bytes)`);
}

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function createPng(width, height, r, g, b) {
  // Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth: 8
  ihdr[9] = 2; // Color type: 2 (RGB)
  ihdr[10] = 0; // Compression: 0
  ihdr[11] = 0; // Filter: 0
  ihdr[12] = 0; // Interlace: 0

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crc = calcCrc(Buffer.concat([typeBuf, data]));
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  // Raw image data: for each scanline: filter byte 0, then width * 3 bytes
  const lineSize = 1 + width * 3;
  const raw = Buffer.alloc(height * lineSize);
  for (let y = 0; y < height; y++) {
    const offset = y * lineSize;
    raw[offset] = 0; // No filter
    for (let x = 0; x < width; x++) {
      const px = offset + 1 + x * 3;
      // Draw a subtle gradient with blue/dark slate background and red center
      const dx = x - width / 2;
      const dy = y - height / 2;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < width * 0.18) {
        // Red pin center
        raw[px] = 239;
        raw[px + 1] = 68;
        raw[px + 2] = 68;
      } else if (dist < width * 0.22) {
        raw[px] = 255;
        raw[px + 1] = 255;
        raw[px + 2] = 255;
      } else if (dist < width * 0.42 && Math.abs(dx) < width * 0.35 && Math.abs(dy) < height * 0.26) {
        raw[px] = 30;
        raw[px + 1] = 41;
        raw[px + 2] = 59;
      } else {
        const factor = Math.min(1, Math.max(0, (x + y) / (width + height)));
        raw[px] = Math.round(15 + factor * 25);
        raw[px + 1] = Math.round(23 + factor * 40);
        raw[px + 2] = Math.round(42 + factor * 60);
      }
    }
  }

  const compressed = zlib.deflateSync(raw);
  const ihdrChunk = chunk('IHDR', ihdr);
  const idatChunk = chunk('IDAT', compressed);
  const iendChunk = chunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function calcCrc(buf) {
  let c = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = crcTable[(c ^ buf[n]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

const outDir = path.resolve('public');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

fs.writeFileSync(path.join(outDir, 'pwa-192x192.png'), createPng(192, 192, 30, 41, 59));
fs.writeFileSync(path.join(outDir, 'pwa-512x512.png'), createPng(512, 512, 30, 41, 59));
fs.writeFileSync(path.join(outDir, 'pwa-maskable-512x512.png'), createPng(512, 512, 15, 23, 42));
fs.writeFileSync(path.join(outDir, 'apple-touch-icon.png'), createPng(180, 180, 30, 41, 59));
fs.writeFileSync(path.join(outDir, 'favicon.ico'), createPng(32, 32, 30, 41, 59));
console.log('Icons generated successfully in public/');

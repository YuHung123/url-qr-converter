import qrcode from 'qrcode-generator';

// The encoder's default Byte conversion preserves each low byte. Pass explicit
// bytes as code units, without changing its shared stringToBytes implementation.
export function byteQrPixels(segments) {
  const qr = qrcode(0, 'M');
  for (const bytes of segments) qr.addData(String.fromCharCode(...bytes), 'Byte');
  qr.make();
  const scale = 8;
  const width = (qr.getModuleCount() + 8) * scale;
  const data = new Uint8ClampedArray(width * width * 4).fill(255);
  for (let y = 0; y < width; y++) {
    for (let x = 0; x < width; x++) {
      const row = Math.floor(y / scale) - 4;
      const column = Math.floor(x / scale) - 4;
      if (row < 0 || column < 0 || row >= qr.getModuleCount() || column >= qr.getModuleCount()) continue;
      if (qr.isDark(row, column)) {
        const offset = (y * width + x) * 4;
        data[offset] = data[offset + 1] = data[offset + 2] = 0;
      }
    }
  }
  return { data, width, height: width };
}

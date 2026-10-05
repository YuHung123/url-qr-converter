import { expectedRasterSize } from './raster-expectations.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import qrcode from 'qrcode-generator';
import { createQrMatrix, createQrPixels, parseOutputSize, rasterGeometry } from '../src/qr.ts';
import { decodePixels } from '../src/decode.ts';

for (const [values, message] of [
  [['', ' ', '\t'], '請輸入目標尺寸。'],
  [['abc', '--', '1e2', '1E2', '256px', 'NaN', 'Infinity', '128+128', '+256', '0x100', ' 256 ', '256.'], '請輸入有效的目標尺寸。'],
  [['128.5', '256.1', '256.0', '.5', '-1.5'], '請輸入整數尺寸。'],
  [['63', '32', '0', '-1'], '目標尺寸不得小於 64 px。'],
  [['2049', '4096', '9'.repeat(400)], '目標尺寸不得大於 2048 px。'],
]) {
  test(`output size exact validation copy: ${message}`, () => {
    for (const value of values) assert.throws(() => parseOutputSize(value), { message }, value);
  });
}

test('output size accepts arbitrary integers and both global endpoints', () => {
  for (const value of ['64', '128', '256', '300', '387', '512', '1024', '2048']) assert.equal(parseOutputSize(value), Number(value));
});

const samples = [
  ['short', 'https://example.com/independent?source=segno&v=1'],
  ['medium', `https://example.com/${'a'.repeat(500)}`],
  ['dense', new URL(`https://例子.測試/採訪?q=😀&long=${'a'.repeat(1000)}`).href],
  ['near capacity', `https://example.com/${'a'.repeat(2311)}`],
];

for (const [sample, url] of samples) {
  test(`custom raster ${sample}: dynamic minimum, snapped canvas, uniform integer cells, quiet zone and decode`, () => {
    const matrix = createQrMatrix(url);
    const reference = qrcode(0, 'M'); reference.addData(url, 'Byte'); reference.make();
    assert.equal(matrix.length, reference.getModuleCount());
    const totalModules = matrix.length + 8, minimum = totalModules * 2;
    assert.throws(() => createQrPixels(url, matrix, minimum - 1), { message: `此 QR Code 至少需要 ${minimum} px。` });
    // Global bounds take precedence even on dense QR codes.
    assert.throws(() => rasterGeometry(matrix.length, 32), { message: '目標尺寸不得小於 64 px。' });
    assert.throws(() => rasterGeometry(matrix.length, 2049), { message: '目標尺寸不得大於 2048 px。' });
    const failures = [];
    for (const size of new Set([minimum, minimum + 17, 256, 300, 512].filter(size => size >= minimum))) {
      const pixels = createQrPixels(url, matrix, size);
      const { scale, actualSize } = rasterGeometry(matrix.length, size);
      assert.equal(actualSize, expectedRasterSize(size, totalModules));
      const boundaries = Array.from({ length: totalModules + 1 }, (_, i) => i * scale);
      const widths = boundaries.slice(1).map((edge, i) => edge - boundaries[i]);
      assert.equal(boundaries[0], 0); assert.equal(boundaries.at(-1), actualSize);
      assert.ok(boundaries.every(Number.isInteger));
      assert.ok(Math.min(...widths) >= 2); assert.ok(widths.every(width => width === scale));
      assert.equal(pixels.width, expectedRasterSize(size, totalModules)); assert.equal(pixels.height, pixels.width);
      const decoded = decodePixels(pixels);
      if (decoded.kind !== 'success' || decoded.url !== url) failures.push({ size, kind: decoded.kind });
      let mismatches = 0;
      for (let y = 0; y < actualSize; y++) for (let x = 0; x < actualSize; x++) {
        // Independently locate each pixel within a uniform grid cell.
        const row = Math.floor(y / scale) - 4, col = Math.floor(x / scale) - 4;
        const dark = row >= 0 && col >= 0 && row < matrix.length && col < matrix.length && reference.isDark(row, col);
        const expected = dark ? 0 : 255, i = (y * actualSize + x) * 4;
        if (pixels.data[i] !== expected || pixels.data[i + 1] !== expected || pixels.data[i + 2] !== expected || pixels.data[i + 3] !== 255) mismatches++;
      }
      assert.equal(mismatches, 0, `${sample} at ${size}: all final pixels match EC M / Byte reference`);
    }
    assert.deepEqual(failures, [], `${sample} round-trip failures (all geometry comparisons passed)`);
  });
}

test('64px is allowed only when this QR fits; snapped dimension extremes and non-preset sizes', () => {
  const url = 'https://a.co/', matrix = createQrMatrix(url);
  assert.equal(matrix.length, 21);
  for (const size of [64, 128, 256, 300, 387, 512, 1024, 2048]) {
    const pixels = createQrPixels(url, matrix, size);
    assert.equal(pixels.width, expectedRasterSize(size, matrix.length + 8)); assert.equal(pixels.height, pixels.width);
    assert.deepEqual(decodePixels(pixels), { kind: 'success', url });
  }
  assert.throws(() => createQrPixels(samples[0][1], createQrMatrix(samples[0][1]), 64), { message: '此 QR Code 至少需要 82 px。' });
});

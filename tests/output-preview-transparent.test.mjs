import { expectedRasterSize } from './raster-expectations.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import qrcode from 'qrcode-generator';
import { createQrMatrix, createQrPixels, createQrSvg, exportQr, rasterGeometry } from '../src/qr.ts';
import { decodePixels } from '../src/decode.ts';
import { parseSafeSvg } from '../src/svg.ts';

test('all QR versions snap to a uniform grid with integer cells of at least two pixels', () => {
  for (let modules = 21; modules <= 177; modules += 4) {
    const total = modules + 8, minimum = total * 2;
    for (const size of new Set([64, 128, 256, 300, 512, 2048, minimum, minimum + 17].filter(n => n >= Math.max(64, minimum)))) {
      const { scale, actualSize, totalModules, minimumSize } = rasterGeometry(modules, size);
      assert.equal(totalModules, total); assert.equal(minimumSize, minimum);
      const boundaries = Array.from({ length: total + 1 }, (_, i) => i * scale);
      assert.equal(actualSize, expectedRasterSize(size, total));
      assert.equal(boundaries[0], 0); assert.equal(boundaries.at(-1), actualSize);
      const widths = [];
      for (let i = 0; i <= total; i++) {
        assert.equal(boundaries[i], i * scale);
        assert.ok(Number.isInteger(boundaries[i]));
        if (i) widths.push(boundaries[i] - boundaries[i - 1]);
      }
      assert.ok(Math.min(...widths) >= 2);
      assert.ok(widths.every(width => width === scale));
      assert.equal(widths.reduce((sum, width) => sum + width, 0), actualSize);
      assert.ok(boundaries[4] === actualSize - boundaries[total - 4]);
    }
  }
});

test('185 cells at target512 snap to actual555 with uniform 3px cells and no padding', () => {
  const url = `https://example.com/${'a'.repeat(2311)}`, matrix = createQrMatrix(url);
  assert.equal(matrix.length + 8, 185);
  const pixels = createQrPixels(url, matrix, 512);
  const topLeft = [];
  for (let y = 0; y < 555; y++) for (let x = 0; x < 555; x++) {
    if (pixels.data[(y * 555 + x) * 4] === 0 && !topLeft.length) topLeft.push(x, y);
  }
  assert.deepEqual(topLeft, [12, 12], 'four quiet-zone cells of exactly 3px, without padding');
  assert.deepEqual(decodePixels(pixels), { kind: 'success', url });
  assert.equal(pixels.width, 555); assert.equal(pixels.height, 555);
});

for (const [name, url] of [
  ['short', 'https://example.com/independent?source=segno&v=1'],
  ['medium', `https://example.com/${'a'.repeat(500)}`],
  ['dense', new URL(`https://例子.測試/採訪?q=😀&long=${'a'.repeat(1000)}`).href],
  ['near capacity', `https://example.com/${'a'.repeat(2311)}`],
]) {
  test(`${name} white/transparent pixels match independent matrix and geometry, including exact alpha`, () => {
    const matrix = createQrMatrix(url), total = matrix.length + 8;
    const reference = qrcode(0, 'M'); reference.addData(url, 'Byte'); reference.make();
    assert.equal(matrix.length, reference.getModuleCount());
    const failures = [];
    for (const size of new Set([total * 2, total * 2 + 17, 256, 300, 512].filter(n => n >= total * 2))) {
      for (const transparent of [false, true]) {
        const pixels = createQrPixels(url, matrix, size, transparent);
        const actualSize = expectedRasterSize(size, total), scale = actualSize / total;
        assert.equal(pixels.width, actualSize); assert.equal(pixels.height, actualSize);
        let mismatches = 0, darkPixels = 0, backgroundPixels = 0;
        const composite = pixels.data.slice();
        for (let y = 0; y < actualSize; y++) for (let x = 0; x < actualSize; x++) {
          const row = Math.floor(y / scale) - 4, col = Math.floor(x / scale) - 4;
          const dark = row >= 0 && col >= 0 && row < matrix.length && col < matrix.length && reference.isDark(row, col);
          const rgb = dark || transparent ? 0 : 255, alpha = dark || !transparent ? 255 : 0;
          const i = (y * actualSize + x) * 4;
          if (pixels.data[i] !== rgb || pixels.data[i + 1] !== rgb || pixels.data[i + 2] !== rgb || pixels.data[i + 3] !== alpha) mismatches++;
          if (dark) darkPixels++; else backgroundPixels++;
          // Like the unchanged production image decoder, composite alpha onto
          // white for scanning. The original export buffer stays untouched.
          if (pixels.data[i + 3] === 0) composite.fill(255, i, i + 4);
        }
        assert.equal(mismatches, 0, `${name}/${size}/${transparent}`);
        assert.ok(darkPixels > 0 && backgroundPixels > 0);
        const decoded = decodePixels({ ...pixels, data: composite });
        if (decoded.kind !== 'success' || decoded.url !== url) failures.push({ size, transparent, kind: decoded.kind });
      }
    }
    assert.deepEqual(failures, [], `${name} round-trip failures (all pixel/alpha comparisons passed)`);
  });
}

test('transparent SVG only omits the white rect; unchanged safe parser accepts both variants', async () => {
  for (const url of ['https://a.co/', `https://example.com/${'a'.repeat(1000)}`]) {
    const matrix = createQrMatrix(url), total = matrix.length + 8;
    const white = createQrSvg(matrix), transparent = createQrSvg(matrix, true);
    assert.equal(transparent, white.replace(`<rect width="${total}" height="${total}" fill="#fff"/>`, ''));
    assert.ok(!transparent.includes('<rect'));
    for (const svg of [white, transparent]) {
      const parsed = parseSafeSvg(svg);
      assert.equal(parsed.width, total); assert.equal(parsed.height, total);
    }
    const blob = await exportQr(null, matrix, 'svg', true);
    assert.equal(blob.type, 'image/svg+xml'); assert.equal(await blob.text(), transparent);
  }
});

test('transparent JPG is rejected before invoking an encoder', async () => {
  let calls = 0;
  await assert.rejects(exportQr({ toBlob() { calls++; } }, [], 'jpg', true), /transparency/);
  assert.equal(calls, 0);
});

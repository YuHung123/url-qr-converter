import assert from 'node:assert/strict';
import test from 'node:test';
import jsQR from 'jsqr';
import { createQrMatrix, createQrPixels, resolveRasterSize } from '../src/qr.ts';
import { decodePixels } from '../src/decode.ts';

for (const [total, target, scale, actual] of [[41,256,6,246], [97,256,3,291], [133,300,2,266], [185,387,2,370], [185,512,3,555]]) {
  test(`target snapping ${total}/${target} chooses ${scale}px cells and ${actual}px actual`, () => {
    assert.deepEqual(resolveRasterSize(target, total), { scale, actualSize: actual, minimumSize: total * 2 });
  });
}
test('nearest tie chooses higher scale and ceiling excludes an otherwise closer upper candidate', () => {
  assert.deepEqual(resolveRasterSize(100, 40), { scale: 3, actualSize: 120, minimumSize: 80 });
  // 2050 is closer to 2048 than 2009, but violates the resource ceiling.
  assert.deepEqual(resolveRasterSize(2048, 41), { scale: 49, actualSize: 2009, minimumSize: 82 });
  assert.deepEqual(resolveRasterSize(2048, 185), { scale: 11, actualSize: 2035, minimumSize: 370 });
  assert.throws(() => resolveRasterSize(300, 185), { message: '此 QR Code 至少需要 370 px。' });
});
for (const [name, url, total, target, scale, actual] of [
  ['medium', `https://example.com/${'a'.repeat(500)}`, 97,256,3,291],
  ['dense', new URL(`https://例子.測試/採訪?q=😀&long=${'a'.repeat(1000)}`).href, 133,300,2,266],
  ['near-capacity387', `https://example.com/${'a'.repeat(2311)}`, 185,387,2,370],
  ['dedicated185/512', `https://example.com/${'a'.repeat(2311)}`, 185,512,3,555],
]) {
  test(`previous failure recovery ${name}: uniform cells, direct jsQR and production exact payload`, () => {
    const matrix = createQrMatrix(url);
    assert.equal(matrix.length + 8, total);
    assert.equal(resolveRasterSize(target, total).scale, scale);
    for (const transparent of [false, true]) {
      const pixels = createQrPixels(url, matrix, target, transparent);
      assert.equal(pixels.width, actual); assert.equal(pixels.height, actual);
      const composite = pixels.data.slice();
      // Check every pixel of every cell, including all four quiet-zone sides.
      for (let y = 0; y < actual; y++) for (let x = 0; x < actual; x++) {
        const dark = matrix[Math.floor(y / scale) - 4]?.[Math.floor(x / scale) - 4] ?? false;
        const i = (y * actual + x) * 4, rgb = dark || transparent ? 0 : 255;
        assert.deepEqual(Array.from(pixels.data.slice(i, i + 4)), [rgb,rgb,rgb,dark || !transparent ? 255 : 0]);
        if (pixels.data[i + 3] === 0) composite.fill(255, i, i + 4);
      }
      const firstDark = pixels.data.findIndex((_, i) => i % 4 === 3 && pixels.data[i] === 255 && pixels.data[i - 3] === 0) - 3;
      assert.equal(firstDark / 4, (4 * scale) * actual + 4 * scale);
      const code = jsQR(composite, actual, actual);
      assert.equal(code?.data, url); assert.equal(code.version * 4 + 17, matrix.length);
      assert.deepEqual(decodePixels({ ...pixels, data: composite }), { kind: 'success', url });
    }
  });
}

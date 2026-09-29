import assert from 'node:assert/strict';
import test from 'node:test';
import jsQR from 'jsqr';
import { createQrPixels, normalizeUrl } from '../src/qr.ts';
import { decodeDimensions, decodeImage, decodePixels } from '../src/decode.ts';

for (const input of [
  'https://example.com',
  'http://example.com/article?id=123&next=%2Ftest#part',
  'https://例子.測試/採訪?標題=文章#段落',
  `https://example.com/articles/${'interview-'.repeat(35)}?source=portfolio&year=2026`,
]) {
  test(`encoder + production pixel renderer + decoder round trip: ${input.slice(0, 80)}`, () => {
    const url = normalizeUrl(input);
    const pixels = createQrPixels(url);
    assert.equal(jsQR(pixels.data, pixels.width, pixels.height)?.data, url);
    assert.deepEqual(decodePixels(pixels), { kind: 'success', url });
    assert.ok(pixels.width >= 1024);
    assert.equal(pixels.width, pixels.height);
    for (let i = 0; i < pixels.data.length; i += 4) {
      assert.ok(pixels.data[i] === 0 || pixels.data[i] === 255);
      assert.equal(pixels.data[i + 1], pixels.data[i]);
      assert.equal(pixels.data[i + 2], pixels.data[i]);
      assert.equal(pixels.data[i + 3], 255);
    }
  });
}

test('blank pixels return no QR without throwing', () => {
  assert.deepEqual(decodePixels({ data: new Uint8ClampedArray(128 * 128 * 4).fill(255), width: 128, height: 128 }), { kind: 'no-qr' });
});

for (const payload of ['Hello World', 'javascript:alert(1)', 'data:text/plain,test', 'file:///tmp/test', 'example.com', 'https://']) {
  test(`readable QR rejected by product URL validation: ${payload}`, () => {
    const pixels = createQrPixels(payload);
    assert.equal(jsQR(pixels.data, pixels.width, pixels.height)?.data, payload);
    assert.deepEqual(decodePixels(pixels), { kind: 'unsupported-url' });
  });
}

test('unexpected decoder exception is mapped to a safe error result', () => {
  assert.deepEqual(decodePixels({ data: new Uint8ClampedArray(0), width: 100, height: 100 }), { kind: 'decode-failure' });
});

test('image dimensions preserve aspect ratio, cap at 2048, and do not upscale', () => {
  assert.deepEqual(decodeDimensions(4000, 3000), { width: 2048, height: 1536 });
  assert.deepEqual(decodeDimensions(3000, 6000), { width: 1024, height: 2048 });
  assert.deepEqual(decodeDimensions(1024, 1024), { width: 1024, height: 1024 });
  assert.deepEqual(decodeDimensions(100000, 1), { width: 2048, height: 1 });
});

test('invalid image, file limit, stale bitmap cleanup, and canvas failure cleanup', async t => {
  let closed = 0;
  const original = globalThis.createImageBitmap;
  t.after(() => { if (original) globalThis.createImageBitmap = original; else delete globalThis.createImageBitmap; });
  globalThis.createImageBitmap = async () => { throw new Error('internal error'); };
  assert.deepEqual(await decodeImage(new File(['bad'], 'bad.png'), () => true), { kind: 'invalid-image' });
  assert.deepEqual(await decodeImage({ size: 21 * 1024 * 1024 }, () => true), { kind: 'too-large' });
  globalThis.createImageBitmap = async () => ({ width: 100, height: 100, close() { closed++; } });
  assert.deepEqual(await decodeImage(new File(['x'], 'x.png'), () => false), { kind: 'stale' });
  assert.equal(closed, 1);
  // No DOM in Node: canvas creation fails, but the bitmap is still closed.
  assert.deepEqual(await decodeImage(new File(['x'], 'x.png'), () => true), { kind: 'decode-failure' });
  assert.equal(closed, 2);
});

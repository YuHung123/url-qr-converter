import assert from 'node:assert/strict';
import test from 'node:test';
import jsQR from 'jsqr';
import { createQrPixels, normalizeUrl } from '../src/qr.ts';
import { decodeDimensions, decodeImage, decodePixels } from '../src/decode.ts';
import { byteQrPixels } from './byte-fixture.mjs';

test('rejects a URL assembled after jsQR silently drops an invalid UTF-8 Byte segment', () => {
  for (const invalid of [[0xe9], [0xc0, 0xaf], [0xed, 0xa0, 0x80], [0xf4, 0x90, 0x80, 0x80]]) {
    const segments = [new TextEncoder().encode('https://example.com/'), invalid, new TextEncoder().encode('evil')];
    const pixels = byteQrPixels(segments);
    const code = jsQR(pixels.data, pixels.width, pixels.height);
    assert.equal(code.data, 'https://example.com/evil');
    assert.equal(code.chunks.length, 3);
    assert.equal(code.chunks[1].type, 'byte');
    assert.deepEqual(code.chunks[1].bytes, invalid);
    assert.equal(code.chunks[1].text, '');
    assert.equal(normalizeUrl(code.data), 'https://example.com/evil');
    assert.deepEqual(decodePixels(pixels), { kind: 'unsupported-url' });
  }
});

test('accepts complete UTF-8 Byte segments, including Unicode and multiple segments', () => {
  for (const segments of [
    ['https://example.com/ascii'],
    ['https://例子.測試/採訪?q=😀'],
    ['https://example.com/', '採訪', '?q=é😀'],
    ['https://example.com/', 'one', '/two'],
  ]) {
    const pixels = byteQrPixels(segments.map(text => new TextEncoder().encode(text)));
    const code = jsQR(pixels.data, pixels.width, pixels.height);
    assert.equal(code.data, segments.join(''));
    assert.equal(code.chunks.length, segments.length);
    assert.deepEqual(decodePixels(pixels), { kind: 'success', url: normalizeUrl(segments.join('')) });
  }
});

for (const payload of ['https://exa\tmple.com/', 'https://example.com/a\nb', 'https://example.com/a\rb']) {
  test(`rejects raw control characters in a readable QR: ${JSON.stringify(payload)}`, () => {
    const pixels = createQrPixels(payload);
    assert.equal(jsQR(pixels.data, pixels.width, pixels.height).data, payload);
    assert.deepEqual(decodePixels(pixels), { kind: 'unsupported-url' });
  });
}

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

for (const payload of ['Hello World', 'javascript:alert(1)', 'data:text/plain,test', 'file:///tmp/test', 'blob:https://example.com/id', 'https://']) {
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

test('invalid image, exact file size boundaries, and stale bitmap cleanup', async t => {
  let closed = 0;
  let reads = 0;
  const original = Object.getOwnPropertyDescriptor(globalThis, 'createImageBitmap');
  t.after(() => { if (original) Object.defineProperty(globalThis, 'createImageBitmap', original); else delete globalThis.createImageBitmap; });
  globalThis.createImageBitmap = async () => { reads++; throw new Error('internal error'); };
  assert.deepEqual(await decodeImage(new File(['bad'], 'bad.png'), () => true), { kind: 'invalid-image' });
  assert.equal(reads, 1);
  assert.deepEqual(await decodeImage({ size: 20 * 1024 * 1024 }, () => true), { kind: 'invalid-image' });
  assert.equal(reads, 2, 'exactly 20 MiB reaches image processing');
  assert.deepEqual(await decodeImage({ size: 20 * 1024 * 1024 + 1 }, () => true), { kind: 'too-large' });
  assert.equal(reads, 2, '20 MiB + 1 is rejected before reading');
  globalThis.createImageBitmap = async () => ({ width: 100, height: 100, close() { closed++; } });
  assert.deepEqual(await decodeImage(new File(['x'], 'x.png'), () => false), { kind: 'stale' });
  assert.equal(closed, 1);
});

for (const failure of ['getContext', 'drawImage']) {
  test(`${failure} failure closes bitmap and clears the allocated canvas`, async t => {
    const originals = ['document', 'createImageBitmap'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]);
    t.after(() => {
      for (const [key, descriptor] of originals) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else delete globalThis[key];
      }
    });
    let closed = 0;
    let reachedFailure = false;
    const canvas = {
      width: 0, height: 0,
      getContext() {
        assert.equal(canvas.width, 100);
        assert.equal(canvas.height, 100);
        if (failure === 'getContext') { reachedFailure = true; return null; }
        return { fillRect() {}, drawImage() { reachedFailure = true; throw new Error('draw failed'); } };
      },
    };
    globalThis.document = { createElement(tag) { assert.equal(tag, 'canvas'); return canvas; } };
    globalThis.createImageBitmap = async () => ({ width: 100, height: 100, close() { closed++; } });
    assert.deepEqual(await decodeImage({ size: 1 }, () => true), { kind: 'decode-failure' });
    assert.equal(reachedFailure, true);
    assert.equal(closed, 1);
    assert.equal(canvas.width, 0);
    assert.equal(canvas.height, 0);
  });
}

test('scheme-less QR URLs share the same HTTPS normalization and dangerous scheme rejection', () => {
  for (const input of ['example.com', 'www.example.com', 'example.com/path', 'example.com/path?q=1', 'localhost:3000', 'localhost:8080/path', '127.0.0.1:8080']) {
    const pixels = byteQrPixels([new TextEncoder().encode(input)]);
    assert.deepEqual(decodePixels(pixels), { kind: 'success', url: `https://${input}${input.includes('/') ? '' : '/'}` });
  }
  for (const input of ['javascript:', 'data:', 'file:', 'blob:', 'mailto:', 'ws://example.com']) {
    assert.deepEqual(decodePixels(byteQrPixels([new TextEncoder().encode(input)])), { kind: 'unsupported-url' });
  }
});

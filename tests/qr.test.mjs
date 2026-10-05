import { expectedRasterSize } from './raster-expectations.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { assertHostnameCharacters, createQrCanvas, exportPng, normalizeUrl } from '../src/qr.ts';

test('拒絕 trim 後剩餘的 raw control characters 與 whitespace，避免 parser 改寫內容', () => {
  const characters = [...Array.from({ length: 33 }, (_, i) => String.fromCharCode(i)), '\x7f', '\u00a0', '\u2003', '\u2028', '\u2029', '\ufeff'];
  for (const character of characters) {
    for (const input of [`https://exa${character}mple.com/`, `https://example.com/a${character}b`, `https://example.com/?q=a${character}b`]) {
      assert.throws(() => normalizeUrl(input), Error, JSON.stringify(input));
    }
  }
  assert.throws(() => normalizeUrl('https://example.com/\nhttps://other.example/'), Error);
});

test('保留 trim、percent-encoded whitespace、Unicode 與有效 hostname', () => {
  for (const [input, expected] of [
    [' \t\r\nhttps://example.com/\n\t ', 'https://example.com/'],
    ['https://example.com/a%20b?q=%09', 'https://example.com/a%20b?q=%09'],
    ['https://example.com/採訪?q=😀', 'https://example.com/%E6%8E%A1%E8%A8%AA?q=%F0%9F%98%80'],
    ...['example.com', 'xn--fsqu00a.xn--g6w251d', 'localhost', '127.0.0.1', '[::1]'].map(host => [`http://${host}`, `http://${host}/`]),
  ]) assert.equal(normalizeUrl(input), expected);
});

test('接受完整 HTTP(S) URL，trim 後回傳標準化網址', () => {
  for (const [input, expected] of [
    ['  https://example.com  ', 'https://example.com/'],
    ['http://example.com', 'http://example.com/'],
    ['https://example.com/article/123', 'https://example.com/article/123'],
    ['https://example.com/page?id=123&next=%2Ftest#part', 'https://example.com/page?id=123&next=%2Ftest#part'],
    ['HTTPS://EXAMPLE.COM:443', 'https://example.com/'],
    ['https://example.com/採訪?q=文章', 'https://example.com/%E6%8E%A1%E8%A8%AA?q=%E6%96%87%E7%AB%A0'],
  ]) assert.equal(normalizeUrl(input), expected);
});

test('拒絕空白、相對網址、非 HTTP(S)、缺少主機與無效網址', () => {
  for (const input of [
    '', '   ', '一般文字', '/article', '//example.com',
    'javascript:alert(1)', 'data:text/plain,test', 'file:///tmp/test', 'ftp://example.com', 'blob:https://example.com/id', 'mailto:user@example.com', 'ws://example.com', 'javascript:', 'data:', 'file:', 'blob:', 'mailto:',
    'https://', 'https://?id=123', 'https://exa mple.com', 'https://exa%20mple.com', 'https://[invalid]',
    'https://example.com:99999', 'https:example.com', 'http:/example.com',
  ]) assert.throws(() => normalizeUrl(input), Error, input);
});

test('PNG 匯出拒絕空值、空檔與錯誤 MIME，並傳遞同步例外', async () => {
  for (const blob of [null, new Blob([], { type: 'image/png' }), new Blob(['test'], { type: 'image/jpeg' })]) {
    await assert.rejects(exportPng({ toBlob: callback => callback(blob) }), /無法匯出 PNG/);
  }
  await assert.rejects(exportPng({ toBlob: () => { throw new Error('模擬畫布錯誤'); } }), /模擬畫布錯誤/);
});

test('Unicode 網域、路徑與 query 正規化後保留 URL 意義且只含 ASCII', () => {
  for (const input of [
    'https://例子.測試/',
    'https://example.com/採訪/文章',
    'https://example.com/?標題=文章&emoji=😀',
    'https://例子.測試/採訪?標題=文章#段落',
  ]) {
    const payload = normalizeUrl(input);
    assert.ok([...payload].every(character => character.codePointAt(0) <= 0x7f));
    assert.equal(new URL(payload).href, new URL(input).href);
    assert.equal(normalizeUrl(payload), payload);
  }
  const normalized = new URL(normalizeUrl('https://例子.測試/採訪?標題=文章'));
  assert.equal(normalized.hostname, 'xn--fsqu00a.xn--g6w251d');
  assert.equal(decodeURIComponent(normalized.pathname), '/採訪');
  assert.equal(normalized.searchParams.get('標題'), '文章');
});

test('直接送入非 ASCII payload 時，encoder 在編碼前明確拒絕', () => {
  for (const payload of ['https://例子.測試/', 'https://example.com/採訪', 'https://example.com/?q=😀', 'https://example.com/é']) {
    assert.throws(() => createQrCanvas(payload), /ASCII/);
  }
});

test('直接檢查 hostname 額外字元規則，不依賴 URL parser 提前拒絕', () => {
  for (const hostname of ['exa mple.com', 'exa\tmple.com', 'exa\nmple.com', 'exa\u00a0mple.com', 'exa%20mple.com', 'exa%09mple.com']) {
    assert.throws(() => assertHostnameCharacters(hostname), /主機名稱無效/);
  }
  for (const hostname of ['example.com', 'xn--fsqu00a.xn--g6w251d', 'localhost', '127.0.0.1', '[::1]']) {
    assert.doesNotThrow(() => assertHostnameCharacters(hostname));
  }
});

test('default raster pixels keep four white modules and integer boundaries at short and dense versions', async () => {
  const { createQrPixels } = await import('../src/qr.ts');
  const { default: qrcode } = await import('qrcode-generator');
  const { decodePixels } = await import('../src/decode.ts');
  for (const length of [20, 30, 200, 500, 1000, 1800, 2331]) {
    const url = 'https://example.com/' + 'a'.repeat(length - 20);
    const matrix = qrcode(0, 'M'); matrix.addData(url, 'Byte'); matrix.make();
    const modules = matrix.getModuleCount();
    const pixels = createQrPixels(url);
    const total = modules + 8;
    const scale = pixels.width / total;
    const boundary = i => i * scale;
    assert.deepEqual(decodePixels(pixels), { kind: 'success', url });
    const widths = Array.from({ length: total }, (_, i) => boundary(i + 1) - boundary(i));
    assert.ok(widths.every(Number.isInteger));
    assert.ok(Math.min(...widths) >= 2);
    assert.ok(widths.every(width => width === scale));
    assert.equal(pixels.width, expectedRasterSize(Math.max(256, total * 2), total));
    assert.equal(pixels.width, pixels.height);
    assert.ok(pixels.width >= 64 && pixels.width <= 370);
    if (length === 20) {
      assert.equal(modules, 25);
      assert.equal(pixels.width, 264, 'default target snaps to nearest legal multiple');
    }
    if (length === 2331) {
      assert.equal(modules, 177, 'near-capacity version 40');
      assert.equal(Math.min(...widths), 2);
      assert.equal(pixels.width, 370);
      const { createQrMatrix } = await import('../src/qr.ts');
      assert.throws(() => createQrMatrix(url + 'a'), undefined, 'one extra Byte exceeds EC M capacity');
    }
    // Compare every final pixel to the independent EC M / Byte reference.
    // This detects shifted boundaries, interpolation and non-opaque pixels.
    for (let y = 0; y < pixels.height; y++) for (let x = 0; x < pixels.width; x++) {
      const row = Math.floor(y / scale) - 4;
      const col = Math.floor(x / scale) - 4;
      const expected = row >= 0 && col >= 0 && row < modules && col < modules && matrix.isDark(row, col) ? 0 : 255;
      const offset = (y * pixels.width + x) * 4;
      assert.equal(pixels.data[offset], expected);
      assert.equal(pixels.data[offset + 1], expected);
      assert.equal(pixels.data[offset + 2], expected);
      assert.equal(pixels.data[offset + 3], 255);
    }
    const dark = (x, y) => pixels.data[(y * pixels.width + x) * 4] === 0;
    for (let i = 0; i < pixels.width; i++) {
      for (const edge of [0, boundary(4) - 1, boundary(total - 4), pixels.width - 1]) {
        assert.equal(dark(i, edge), false); assert.equal(dark(edge, i), false);
      }
    }
    // The top-left finder has exactly seven black modules across its top edge.
    for (let x = boundary(4); x < boundary(11); x++) {
      assert.equal(dark(x, boundary(4)), true);
      assert.equal(dark(x, boundary(5) - 1), true);
    }
    assert.equal(dark(boundary(11), boundary(4)), false);
  }
});

test('scheme-less websites use HTTPS; explicit HTTP(S) retain scheme and normalization', () => {
  for (const input of ['example.com', 'www.example.com', 'example.com/path', 'example.com/path?q=1', 'openai.com', '例子.測試/採訪?q=😀']) {
    const expected = new URL(`https://${input}`).href;
    assert.equal(normalizeUrl(input), expected);
    assert.equal(normalizeUrl(expected), expected);
  }
  for (const input of ['http://example.com', 'https://example.com']) assert.equal(normalizeUrl(input), new URL(input).href);
  for (const input of ['example.com/a\tb', 'example.com/a\nb', 'example.com/a b', 'example.com:99999', 'http:example.com', 'https:/example.com', '/example.com', '//example.com', '\\example.com']) assert.throws(() => normalizeUrl(input));
});

test('scheme-less localhost ports normalize like loopback IPv4; explicit HTTP(S) retain scheme', () => {
  for (const [input, expected] of [
    ['localhost', 'https://localhost/'],
    ['localhost:3000', 'https://localhost:3000/'],
    ['localhost:8080/path', 'https://localhost:8080/path'],
    ['LOCALHOST:3000/path?q=1#part', 'https://localhost:3000/path?q=1#part'],
    ['localhost:3000?q=1#part', 'https://localhost:3000/?q=1#part'],
    ['localhost:3000#part', 'https://localhost:3000/#part'],
    ['localhost/path?q=1#part', 'https://localhost/path?q=1#part'],
    ['localhost:443', 'https://localhost/'],
    ['localhost:65535', 'https://localhost:65535/'],
    ['http://localhost:3000', 'http://localhost:3000/'],
    ['https://localhost:3000', 'https://localhost:3000/'],
    ['127.0.0.1:8080', 'https://127.0.0.1:8080/'],
  ]) assert.equal(normalizeUrl(input), expected, input);
});

test('localhost ports still reject invalid syntax and out-of-range values', () => {
  for (const input of ['localhost:65536', 'localhost:99999/path', 'localhost:abc', 'localhost:3000abc/path', 'localhost:-1', 'localhost:3.5', 'localhost:3000:8080', 'localhost:3000\\path']) {
    assert.throws(() => normalizeUrl(input), Error, input);
  }
});

test('localhost recognition preserves unsafe/custom scheme and plain-text boundaries', () => {
  for (const input of ['javascript:alert(1)', 'data:text/plain,test', 'file:///tmp/test', 'custom:3000', 'abc', 'abc:3000', 'Hello World', '一般文字', 'localhostevil:3000', 'localhost:password@evil.test', 'localhost:3000@evil.test']) {
    assert.throws(() => normalizeUrl(input), Error, input);
  }
});

test('SVG is a square vector matching the EC M matrix, with four white modules and no payload metadata', async () => {
  const { createQrMatrix, createQrSvg } = await import('../src/qr.ts');
  const { default: qrcode } = await import('qrcode-generator');
  for (const input of ['example.com', 'https://例子.測試/採訪?q=😀', `https://example.com/${'a'.repeat(1000)}`]) {
    const url = normalizeUrl(input);
    const matrix = createQrMatrix(url);
    const reference = qrcode(0, 'M'); reference.addData(url, 'Byte'); reference.make();
    const size = matrix.length + 8;
    const svg = createQrSvg(matrix);
    assert.ok(svg.includes(`viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"`));
    assert.ok(svg.includes(`<rect width="${size}" height="${size}" fill="#fff"/>`));
    assert.ok(!/script|image|href|metadata|https:\/\/example/u.test(svg));
    const positions = new Set([...svg.matchAll(/M(\d+) (\d+)h1v1h-1z/g)].map(m => `${Number(m[2]) - 4},${Number(m[1]) - 4}`));
    let darkCount = 0;
    for (let row = 0; row < matrix.length; row++) for (let col = 0; col < matrix.length; col++) {
      const dark = reference.isDark(row, col);
      assert.equal(matrix[row][col], dark);
      assert.equal(positions.has(`${row},${col}`), dark);
      darkCount += Number(dark);
    }
    assert.equal(positions.size, darkCount);
    for (const key of positions) for (const n of key.split(',').map(Number)) assert.ok(n >= 0 && n < matrix.length);
  }
});

test('JPG and WebP reject browser MIME fallback, empty output and synchronous errors', async () => {
  const { exportQr } = await import('../src/qr.ts');
  for (const format of ['jpg', 'webp']) {
    for (const blob of [null, new Blob([]), new Blob(['bad'], { type: 'image/png' })]) {
      await assert.rejects(exportQr({ toBlob: callback => callback(blob) }, [], format));
    }
    await assert.rejects(exportQr({ toBlob() { throw new Error('canvas failed'); } }, [], format));
    const mime = format === 'jpg' ? 'image/jpeg' : 'image/webp';
    const blob = new Blob(['ok'], { type: mime });
    assert.equal(await exportQr({ toBlob(callback, type, quality) { assert.equal(type, mime); assert.equal(quality, 0.98); callback(blob); } }, [], format), blob);
  }
});

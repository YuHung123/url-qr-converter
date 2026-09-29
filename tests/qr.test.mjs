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

test('拒絕空白、相對網址、非 HTTP(S)、缺少主機與無效網址，不補 protocol', () => {
  for (const input of [
    '', '   ', '一般文字', 'example.com', '/article', '//example.com',
    'javascript:alert(1)', 'data:text/plain,test', 'file:///tmp/test', 'ftp://example.com',
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

test('download pixels keep four white modules and whole-pixel modules at short and dense versions', async () => {
  const { createQrPixels } = await import('../src/qr.ts');
  const { default: qrcode } = await import('qrcode-generator');
  const { decodePixels } = await import('../src/decode.ts');
  for (const length of [30, 200, 500, 1000, 1800]) {
    const url = 'https://example.com/' + 'a'.repeat(length - 20);
    const matrix = qrcode(0, 'M'); matrix.addData(url, 'Byte'); matrix.make();
    const modules = matrix.getModuleCount();
    const pixels = createQrPixels(url);
    const scale = pixels.width / (modules + 8);
    assert.deepEqual(decodePixels(pixels), { kind: 'success', url });
    assert.ok(Number.isInteger(scale)); assert.ok(pixels.width >= 1024);
    const dark = (x, y) => pixels.data[(y * pixels.width + x) * 4] === 0;
    for (let i = 0; i < pixels.width; i++) {
      for (const edge of [0, 4 * scale - 1, pixels.width - 4 * scale, pixels.width - 1]) {
        assert.equal(dark(i, edge), false); assert.equal(dark(edge, i), false);
      }
    }
    // The top-left finder has exactly seven black modules across its top edge.
    for (let x = 4 * scale; x < 11 * scale; x++) {
      assert.equal(dark(x, 4 * scale), true);
      assert.equal(dark(x, 5 * scale - 1), true);
    }
    assert.equal(dark(11 * scale, 4 * scale), false);
  }
});

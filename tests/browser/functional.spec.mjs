import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { fixture, externalUrl, unicodeUrl, encode, choose, qrFile, imageVariant } from './helpers.mjs';

test.beforeEach(async ({ page }) => { await page.goto('/'); });

test('M1 HTTP, HTTPS, path/query, Unicode: generate, keyboard download, M2 round trip', async ({ page }, info) => {
  let index = 0;
  for (const input of ['http://example.com', 'https://example.com', 'https://example.com/a/b?q=1&next=%2F#part', 'https://例子.測試/採訪?q=😀']) {
    await page.locator('#encode-tab').click();
    await page.locator('#url-input').fill(input); await page.keyboard.press('Tab');
    await expect(page.locator('#generate-button')).toBeFocused(); await page.keyboard.press('Space');
    await expect(page.locator('canvas')).toBeVisible();
    await expect(page.locator('#url-input')).toHaveValue(new URL(input).href);
    await expect(page.locator('canvas')).toHaveAccessibleName(`網址 ${new URL(input).href} 的 QR Code`);
    await page.locator('#generate-button').focus(); await page.keyboard.press('Tab');
    await expect(page.locator('#download-button')).toBeFocused();
    const [download] = await Promise.all([page.waitForEvent('download'), page.keyboard.press('Enter')]);
    expect(download.suggestedFilename()).toBe('qr-code.png');
    const path = info.outputPath(`roundtrip-${index++}.png`);
    await download.saveAs(path);
    const bytes = await readFile(path);
    expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    expect(bytes.readUInt32BE(16)).toBeGreaterThanOrEqual(1024);
    expect(bytes.readUInt32BE(16)).toBe(bytes.readUInt32BE(20));
    await expect(page.locator('#download-button')).toBeFocused();
    await page.locator('#decode-tab').click(); await choose(page, path, new URL(input).href);
  }
});

test('M1 invalid inputs, capacity failure, recovery and editing retains preview', async ({ page }) => {
  for (const input of ['', '/article', 'javascript:alert(1)', 'https://exa mple.com/', 'https://']) {
    await page.locator('#url-input').fill(input); await page.locator('#generate-button').click();
    await expect(page.locator('#url-error')).not.toBeEmpty();
    await expect(page.locator('#url-input')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#download-button')).toBeDisabled();
  }
  await page.locator('#url-input').fill(`https://example.com/${'x'.repeat(5000)}`);
  await page.locator('#generate-button').click(); await expect(page.locator('#qr-error')).not.toBeEmpty();
  await encode(page, externalUrl);
  await page.locator('#url-input').fill('https://example.com/changed');
  await expect(page.locator('canvas')).toHaveAccessibleName(`網址 ${externalUrl} 的 QR Code`); await expect(page.locator('#download-button')).toBeEnabled();
  await expect(page.locator('#qr-status')).toContainText('網址已修改');
});

test('M2 independent encoder, real clipboard write, keyboard Copy and failure', async ({ page, context, browserName }, info) => {
  if (browserName === 'chromium') await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.locator('#decode-tab').click();
  for (const [name, url] of [['independent-ascii', externalUrl], ['independent-unicode', unicodeUrl]]) {
    await page.locator('#qr-image').focus(); await choose(page, fixture(name), url);
    await expect(page.locator('#qr-image')).toBeFocused();
    await page.keyboard.press('Tab'); await expect(page.locator('#decoded-url')).toBeFocused();
    await page.keyboard.press('Tab'); await expect(page.locator('#copy-button')).toBeFocused();
    await page.keyboard.press('Enter'); await expect(page.locator('#result-hint')).toHaveText('網址已複製。');
    await expect(page.locator('#copy-button')).toBeFocused();
    if (browserName === 'chromium') expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(url);
  }
  info.annotations.push({ type: 'clipboard', description: browserName === 'chromium' ? 'Native write/read verified' : 'Native write resolved; OS clipboard readback not asserted' });
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.reject(new Error('test denial')) } }));
  await page.keyboard.press('Space'); await expect(page.locator('#decode-error')).toContainText('手動選取');
  await expect(page.locator('#decoded-url')).toHaveValue(unicodeUrl); await expect(page.locator('#copy-button')).toBeFocused();
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { value: undefined }));
  await page.keyboard.press('Enter'); await expect(page.locator('#decode-error')).toContainText('手動選取');
});

test('M2 unsupported text/schemes, invalid UTF-8 and raw controls never become URLs', async ({ page }) => {
  await page.locator('#decode-tab').click();
  for (const segments of [
    ['Hello World'], ['javascript:alert(1)'], ['data:text/plain,test'], ['file:///tmp/test'],
    ['https://example.com/', [0xe9], 'evil'], ['https://exa\tmple.com/'], ['https://example.com/a\nb'], ['https://example.com/a\rb'],
  ]) {
    await choose(page, await qrFile(page, segments), null);
    await expect(page.locator('#decode-error')).toContainText('不是網址');
    await expect(page.locator('#decoded-url')).toHaveValue(''); await expect(page.locator('#copy-button')).toBeDisabled();
  }
  await choose(page, fixture('independent-ascii'));
});

test('M2 invalid image, no QR, oversized/corrupt files, SVG/HEIC failure recover', async ({ page }) => {
  await page.locator('#decode-tab').click();
  await choose(page, await imageVariant(page, 'no-qr'), null); await expect(page.locator('#decode-error')).toContainText('找不到');
  for (const file of [
    { name: 'invalid.png', mimeType: 'image/png', buffer: Buffer.from('not an image') },
    { name: 'corrupt-large.jpg', mimeType: 'image/jpeg', buffer: Buffer.alloc(5 * 1024 * 1024, 0xff) },
    { name: 'vector.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="white"/></svg>') },
    { name: 'invalid.heic', mimeType: 'image/heic', buffer: Buffer.from('invalid HEIC data') },
  ]) {
    await choose(page, file, null); await expect(page.locator('#decoded-url')).toHaveValue('');
    await expect(page.locator('#copy-button')).toBeDisabled(); await choose(page, fixture('independent-ascii'));
  }
  await page.evaluate(() => { window.bitmapCalls = 0; const original = window.createImageBitmap; window.createImageBitmap = (...a) => { window.bitmapCalls++; return original(...a); }; });
  await choose(page, { name: 'oversize.png', mimeType: 'image/png', buffer: Buffer.alloc(20 * 1024 * 1024 + 1) }, null);
  await expect(page.locator('#decode-error')).toContainText('20 MiB'); expect(await page.evaluate(() => window.bitmapCalls)).toBe(0);
  await choose(page, fixture('independent-ascii'));
});

test('stale decode and Copy preserve newest result and focus', async ({ page }) => {
  await page.locator('#decode-tab').click();
  await page.evaluate(() => {
    const original = window.createImageBitmap; window.pendingBitmaps = [];
    window.createImageBitmap = (...args) => new Promise((resolve, reject) => window.pendingBitmaps.push(() => original(...args).then(resolve, reject)));
    window.copyResolvers = [];
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => new Promise(resolve => window.copyResolvers.push(resolve)) } });
  });
  await page.locator('#qr-image').setInputFiles(fixture('independent-ascii'));
  await page.waitForFunction(() => window.pendingBitmaps.length === 1);
  await page.locator('#qr-image').setInputFiles(fixture('independent-unicode'));
  await page.waitForFunction(() => window.pendingBitmaps.length === 2);
  await page.evaluate(() => window.pendingBitmaps[1]()); await expect(page.locator('#decoded-url')).toHaveValue(unicodeUrl);
  await page.evaluate(() => window.pendingBitmaps[0]()); await expect(page.locator('#decoded-url')).toHaveValue(unicodeUrl);
  await page.locator('#copy-button').focus(); await page.keyboard.press('Enter'); await page.keyboard.press('Space');
  expect(await page.evaluate(() => window.copyResolvers.length)).toBe(1); await expect(page.locator('#copy-button')).toHaveAttribute('aria-disabled', 'true');
  await page.locator('#qr-image').setInputFiles(fixture('independent-ascii'));
  await page.waitForFunction(() => window.pendingBitmaps.length === 3);
  await expect(page.locator('#qr-image')).toBeFocused(); await expect(page.locator('#decoded-url')).toHaveValue('');
  await expect(page.locator('#copy-button')).toBeDisabled(); await page.keyboard.press('Tab');
  await page.evaluate(() => window.pendingBitmaps[2]()); await expect(page.locator('#decoded-url')).toHaveValue(externalUrl);
  await expect(page.locator('#decoded-url')).toBeFocused(); await page.keyboard.press('Tab'); await page.keyboard.press('Enter');
  await page.evaluate(() => window.copyResolvers[0]()); await expect(page.locator('#copy-button')).toHaveAttribute('aria-disabled', 'true');
  await expect(page.locator('#result-hint')).not.toHaveText('網址已複製。');
  await page.evaluate(() => window.copyResolvers[1]()); await expect(page.locator('#result-hint')).toHaveText('網址已複製。');
});

test('stale PNG export cannot download; export failure recovers and retains focus', async ({ page }) => {
  await encode(page, externalUrl);
  await page.evaluate(() => {
    window.originalToBlob = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function (callback) { window.finishExport = () => new Promise(resolve => window.originalToBlob.call(this, blob => { callback(blob); resolve(); }, 'image/png')); };
    window.createdDownloads = 0; const original = URL.createObjectURL;
    URL.createObjectURL = (...args) => { window.createdDownloads++; return original(...args); };
  });
  await page.locator('#download-button').focus(); await page.keyboard.press('Enter'); await page.keyboard.press('Space');
  await expect(page.locator('#download-button')).toBeFocused(); await expect(page.locator('#download-button')).toHaveAttribute('aria-disabled', 'true');
  await encode(page, 'https://example.com/new'); await page.evaluate(() => window.finishExport());
  expect(await page.evaluate(() => window.createdDownloads)).toBe(0); await encode(page, externalUrl);
  await page.evaluate(() => { HTMLCanvasElement.prototype.toBlob = callback => callback(null); });
  await page.locator('#download-button').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#qr-error')).not.toBeEmpty(); await expect(page.locator('#download-button')).toBeFocused();
  await page.evaluate(() => { HTMLCanvasElement.prototype.toBlob = window.originalToBlob; });
  await Promise.all([page.waitForEvent('download'), page.keyboard.press('Enter')]);
});

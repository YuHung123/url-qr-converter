import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import jsQR from 'jsqr';
import { fixture, externalUrl, unicodeUrl, encode, choose, qrFile, imageVariant } from './helpers.mjs';

const drop = (page, files) => page.locator('#image-drop-zone').drop({ files });
const decodeSettled = page => page.waitForFunction(() => document.querySelector('#decoded-url').value || document.querySelector('#decode-error').textContent);

test.beforeEach(async ({ page }) => { await page.goto('/'); });

test('minimal header/footer and Enter generate scheme-less URL, with identical validation', async ({ page }) => {
  await expect(page.locator('header')).toHaveText('URL ↔ QR Code');
  await expect(page.locator('header > *')).toHaveCount(1);
  await expect(page.locator('footer')).toHaveCount(0);
  for (const input of ['example.com', 'www.example.com', 'example.com/path', 'example.com/path?q=1']) {
    await page.locator('#url-input').fill(input); await page.keyboard.press('Enter');
    const expected = new URL(`https://${input}`).href;
    await expect(page.locator('#url-input')).toHaveValue(expected);
    await expect(page.locator('canvas')).toHaveAccessibleName(`網址 ${expected} 的 QR Code`);
    const png = await page.locator('canvas').evaluate(canvas => canvas.toDataURL().split(',')[1]);
    await page.locator('#decode-tab').click();
    await choose(page, { name: 'enter.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') }, expected);
    await page.locator('#encode-tab').click();
  }
  await page.locator('#url-input').fill('javascript:alert(1)'); await page.keyboard.press('Enter');
  const error = await page.locator('#url-error').textContent();
  await page.locator('#generate-button').click(); await expect(page.locator('#url-error')).toHaveText(error);
  await expect(page.locator('#url-input')).toHaveAttribute('aria-invalid', 'true');
});

test('editing and invalid generate preserve QR A; all downloads follow the displayed result until generate B', async ({ page }, info) => {
  const a = 'https://example.com/a', b = 'https://example.com/b';
  await encode(page, a);
  for (const draft of [b, 'javascript:alert(1)']) {
    await page.locator('#url-input').fill(draft);
    if (draft.startsWith('javascript')) { await page.keyboard.press('Enter'); await expect(page.locator('#url-error')).not.toBeEmpty(); }
    await expect(page.locator('canvas')).toHaveAccessibleName(`網址 ${a} 的 QR Code`);
    await expect(page.locator('#qr-status')).toContainText('網址已修改');
    const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#download-button').click()]);
    const path = info.outputPath(`retained-${draft === b ? 'edit' : 'invalid'}.png`); await download.saveAs(path);
    await page.locator('#decode-tab').click(); await choose(page, path, a); await page.locator('#encode-tab').click();
  }
  await page.locator('#url-input').fill(b); await page.keyboard.press('Enter');
  await expect(page.locator('canvas')).toHaveAccessibleName(`網址 ${b} 的 QR Code`);
  const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#download-button').click()]);
  const path = info.outputPath('updated.png'); await download.saveAs(path);
  await page.locator('#decode-tab').click(); await choose(page, path, b);
});

for (const [sample, url] of [['short', externalUrl], ['dense Unicode', new URL(`https://例子.測試/採訪?q=😀&long=${'a'.repeat(500)}`).href]]) {
test(`PNG SVG JPG WebP ${sample}: extension, MIME, square, opaque quiet zone and exact round trip`, async ({ page }, info) => {
  await page.evaluate(() => {
    window.exportTypes = [];
    const original = URL.createObjectURL;
    URL.createObjectURL = blob => { window.exportTypes.push(blob.type); return original(blob); };
  });
    await encode(page, url);
    const modules = Number(await page.locator('canvas').getAttribute('data-modules'));
    await page.locator('#url-input').fill('https://example.com/uncommitted-draft');
    for (const [format, mime] of [['png', 'image/png'], ['svg', 'image/svg+xml'], ['jpg', 'image/jpeg'], ['webp', 'image/webp']]) {
      if (format !== 'png') await page.locator('#download-toggle').click();
      const [download] = await Promise.all([page.waitForEvent('download'), page.locator(format === 'png' ? '#download-button' : `[data-format="${format}"]`).click()]);
      expect(download.suggestedFilename()).toBe(`qr-code.${format}`);
      expect(await page.evaluate(() => window.exportTypes.at(-1))).toBe(mime);
      const path = info.outputPath(`${url === externalUrl ? 'short' : 'dense'}.${format}`); await download.saveAs(path);
      const bytes = await readFile(path); expect(bytes.length).toBeGreaterThan(0);
      if (format === 'png') expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
      if (format === 'jpg') expect(bytes.subarray(0, 2).toString('hex')).toBe('ffd8');
      if (format === 'webp') { expect(bytes.subarray(0, 4).toString()).toBe('RIFF'); expect(bytes.subarray(8, 12).toString()).toBe('WEBP'); }
      if (format === 'svg') {
        const svg = bytes.toString(); const size = modules + 8;
        expect(svg).toContain(`viewBox="0 0 ${size} ${size}"`);
        expect(svg).not.toMatch(/<script|<image|href=|<metadata/);
        // Serve only this test SVG at same origin to rasterize with the browser,
        // retaining the real production CSP (no data:/blob: image permission).
        await page.route('**/test-export.svg', route => route.fulfill({ contentType: mime, body: bytes }));
      }
      const pixels = await page.evaluate(async ({ base64, mime, format, modules }) => {
        let source;
        if (format === 'svg') {
          source = new Image(); source.src = '/test-export.svg'; await source.decode();
        } else {
          source = await createImageBitmap(new Blob([Uint8Array.from(atob(base64), c => c.charCodeAt(0))], { type: mime }));
        }
        const width = format === 'svg' ? (modules + 8) * Math.ceil(1024 / (modules + 8)) : source.width;
        const height = format === 'svg' ? width : source.height;
        const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d'); ctx.drawImage(source, 0, 0, width, height);
        const data = ctx.getImageData(0, 0, width, height).data;
        const border = 4 * width / (modules + 8);
        let quiet = true, opaque = true, fullQuietZone = true;
        for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          if (data[i + 3] !== 255) opaque = false;
          if (x < border || y < border || x >= width - border || y >= height - border) {
            if (data[i] < 200 || data[i + 1] < 200 || data[i + 2] < 200) fullQuietZone = false;
          }
          // Leave one module away from the lossy boundary for JPG/WebP.
          const edge = ['jpg', 'webp'].includes(format) ? border - width / (modules + 8) : border;
          if (x < edge || y < edge || x >= width - edge || y >= height - edge) {
            if (data[i] < 250 || data[i + 1] < 250 || data[i + 2] < 250) quiet = false;
          }
        }
        let binary = ''; for (const b of data) binary += String.fromCharCode(b);
        if ('close' in source) source.close();
        return { width, height, base64: btoa(binary), quiet, opaque, fullQuietZone };
      }, { base64: bytes.toString('base64'), mime, format, modules });
      expect(pixels.width).toBe(pixels.height); expect(pixels.width).toBeGreaterThanOrEqual(1024);
      expect(pixels.quiet).toBe(true); expect(pixels.fullQuietZone).toBe(true); expect(pixels.opaque).toBe(true);
      expect(jsQR(new Uint8ClampedArray(Buffer.from(pixels.base64, 'base64')), pixels.width, pixels.height)?.data).toBe(url);
      if (format === 'svg') await page.unroute('**/test-export.svg');
    }
});
}

test('download menu keyboard, Escape, Tab/Shift+Tab, mouse outside, state and focus', async ({ page }) => {
  await encode(page, externalUrl);
  const toggle = page.getByRole('button', { name: '其他下載格式' });
  await toggle.focus(); await page.keyboard.press('Space');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('menuitem', { name: 'Download SVG' })).toBeFocused();
  for (const [key, name] of [['ArrowDown', 'Download JPG'], ['ArrowUp', 'Download SVG'], ['ArrowUp', 'Download WebP'], ['Home', 'Download SVG'], ['End', 'Download WebP']]) {
    await page.keyboard.press(key); await expect(page.getByRole('menuitem', { name })).toBeFocused();
  }
  expect(await page.getByRole('menuitem', { name: 'Download WebP' }).evaluate(el => el.matches(':focus-visible') && getComputedStyle(el).outlineWidth === '3px')).toBe(true);
  await page.keyboard.press('Escape'); await expect(toggle).toBeFocused(); await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await page.keyboard.press('ArrowUp'); await expect(page.getByRole('menuitem', { name: 'Download WebP' })).toBeFocused();
  await page.keyboard.press('Shift+Tab'); await expect(page.locator('#download-button')).toBeFocused(); await expect(page.locator('#download-menu')).toBeHidden();
  await toggle.focus(); await page.keyboard.press('Enter'); await page.keyboard.press('Tab');
  await expect(page.locator('#download-menu')).toBeHidden();
  await toggle.focus(); await page.keyboard.press('ArrowDown');
  const [download] = await Promise.all([page.waitForEvent('download'), page.keyboard.press('Enter')]);
  expect(download.suggestedFilename()).toBe('qr-code.svg'); await expect(toggle).toBeFocused();
  await toggle.click(); await page.locator('#url-input').click();
  await expect(page.locator('#download-menu')).toBeHidden(); await expect(page.locator('#url-input')).toBeFocused();
});

test('stale JPG/WebP exports are discarded on new Generate and recover after failure', async ({ page }) => {
  await page.evaluate(() => {
    window.originalToBlob = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function(callback, type, quality) {
      window.finishExport = () => new Promise(resolve => window.originalToBlob.call(this, blob => { callback(blob); resolve(); }, type, quality));
    };
    window.createdDownloads = 0; const original = URL.createObjectURL;
    URL.createObjectURL = (...a) => { window.createdDownloads++; return original(...a); };
  });
  for (const format of ['jpg', 'webp']) {
    await encode(page, externalUrl); await page.locator('#download-toggle').click(); await page.locator(`[data-format="${format}"]`).click();
    await expect(page.locator('#download-toggle')).toHaveAttribute('aria-disabled', 'true');
    await encode(page, 'https://example.com/new'); await page.evaluate(() => window.finishExport());
    expect(await page.evaluate(() => window.createdDownloads)).toBe(0);
    await page.evaluate(() => { HTMLCanvasElement.prototype.toBlob = cb => cb(null); });
    await page.locator('#download-toggle').click(); await page.locator(`[data-format="${format}"]`).click();
    await expect(page.locator('#qr-error')).not.toBeEmpty(); await expect(page.locator('#download-toggle')).toBeFocused();
    await page.evaluate(() => { HTMLCanvasElement.prototype.toBlob = window.originalToBlob; });
    await page.locator('#download-toggle').click();
    await Promise.all([page.waitForEvent('download'), page.locator(`[data-format="${format}"]`).click()]);
    // Restore the delay for the next format.
    await page.evaluate(() => {
      window.createdDownloads = 0;
      HTMLCanvasElement.prototype.toBlob = function(cb, type, quality) { window.finishExport = () => new Promise(resolve => window.originalToBlob.call(this, blob => { cb(blob); resolve(); }, type, quality)); };
    });
  }
});

test('image drop highlights nested enter/leave and shares validation/recovery with file input', async ({ page }) => {
  await page.locator('#decode-tab').click();
  const zone = page.locator('#image-drop-zone');
  await zone.dispatchEvent('dragenter'); await zone.locator('label').dispatchEvent('dragenter');
  await zone.locator('label').dispatchEvent('dragleave'); await expect(zone).toHaveClass(/drag-active/);
  await zone.dispatchEvent('dragleave'); await expect(zone).not.toHaveClass(/drag-active/);
  await drop(page, fixture('independent-ascii')); await decodeSettled(page); await expect(page.locator('#decoded-url')).toHaveValue(externalUrl);
  await expect(zone).not.toHaveClass(/drag-active/);
  for (const files of [
    await imageVariant(page, 'no-qr'),
    { name: 'note.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') },
    [fixture('independent-ascii'), fixture('independent-unicode')],
    { name: 'oversize.png', mimeType: 'image/png', buffer: Buffer.alloc(20 * 1024 * 1024 + 1) },
  ]) {
    await drop(page, files); await decodeSettled(page); await expect(page.locator('#decode-error')).not.toBeEmpty();
    await expect(page.locator('#decoded-url')).toHaveValue(''); await expect(page.locator('#copy-button')).toBeDisabled(); await expect(page.locator('#open-link')).toBeHidden();
    await choose(page, fixture('independent-ascii'));
  }
  await zone.drop({ data: { 'text/uri-list': externalUrl } }); await expect(page.locator('#decode-error')).toHaveText('請選擇一張圖片。');
  await drop(page, fixture('independent-unicode')); await decodeSettled(page); await expect(page.locator('#decoded-url')).toHaveValue(unicodeUrl);
});

test('stale drops, drop to file and file to drop preserve newest result, Copy and Open Link', async ({ page }) => {
  await page.locator('#decode-tab').click();
  await page.evaluate(() => {
    window.pendingBitmaps = []; const original = window.createImageBitmap;
    window.createImageBitmap = (...args) => new Promise((resolve, reject) => window.pendingBitmaps.push(() => original(...args).then(resolve, reject)));
  });
  for (const [first, second] of [['drop', 'drop'], ['drop', 'file'], ['file', 'drop']]) {
    const start = await page.evaluate(() => window.pendingBitmaps.length);
    if (first === 'drop') await drop(page, fixture('independent-ascii')); else await page.locator('#qr-image').setInputFiles(fixture('independent-ascii'));
    if (second === 'drop') await drop(page, fixture('independent-unicode')); else await page.locator('#qr-image').setInputFiles(fixture('independent-unicode'));
    await page.evaluate(i => window.pendingBitmaps[i](), start + 1); await expect(page.locator('#decoded-url')).toHaveValue(unicodeUrl);
    await page.evaluate(i => window.pendingBitmaps[i](), start); await expect(page.locator('#decoded-url')).toHaveValue(unicodeUrl);
    await expect(page.locator('#copy-button')).toBeEnabled(); await expect(page.locator('#open-link')).toHaveAttribute('href', unicodeUrl);
  }
});

test('Copy icon has accessible name; Open Link is explicit, normalized HTTP(S) with opener protection', async ({ page, context }) => {
  await page.locator('#decode-tab').click();
  const popups = []; page.on('popup', popup => popups.push(popup));
  for (const url of [unicodeUrl, 'http://example.com/path?q=1', 'https://example.com:443@other.example/path?q=1', 'example.com/path?q=1']) {
    const expected = new URL(url.includes('://') ? url : `https://${url}`).href;
    await choose(page, await qrFile(page, [url]), expected);
    const link = page.getByRole('link', { name: '開啟連結' });
    await expect(link).toHaveAttribute('href', expected); await expect(link).toHaveAttribute('target', '_blank'); await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(page.locator('#decoded-url')).toHaveValue(expected);
    await expect(page.getByRole('button', { name: '複製網址', exact: true })).toBeEnabled();
    expect(popups).toHaveLength(0);
  }
  // Intercept the explicitly requested external navigation before any Internet request.
  const navigations = [];
  await context.route('https://example.com/**', route => {
    navigations.push({ url: route.request().url(), referer: route.request().headers().referer });
    return route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Local navigation fixture</title>' });
  });
  const [popup] = await Promise.all([page.waitForEvent('popup'), page.getByRole('link', { name: '開啟連結' }).click()]);
  await popup.waitForLoadState();
  expect(navigations).toEqual([{ url: 'https://example.com/path?q=1', referer: undefined }]);
  expect(await popup.evaluate(() => window.opener === null)).toBe(true); await popup.close();
  for (const raw of ['javascript:alert(1)', 'data:text/plain,test', 'file:///tmp/test', 'blob:https://example.com/id', 'mailto:user@example.com']) {
    await choose(page, await qrFile(page, [raw]), null);
    await expect(page.locator('#open-link')).toBeHidden(); await expect(page.locator('#open-link')).not.toHaveAttribute('href');
    await expect(page.locator('#copy-button')).toBeDisabled();
  }
  expect(popups).toHaveLength(1);
});

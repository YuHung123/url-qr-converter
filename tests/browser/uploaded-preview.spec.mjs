import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import jsQR from 'jsqr';
import { fixture, externalUrl, unicodeUrl, encode, choose, imageVariant } from './helpers.mjs';

const zone = page => page.locator('#image-drop-zone');
const preview = page => page.locator('#upload-preview canvas');
const svgBase = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="#fff"/>';

test.beforeEach(async ({ page }) => { await page.goto('/'); });

async function settledPreview(page, source) {
  await expect(zone(page)).toHaveAttribute('data-state', 'preview');
  await expect(preview(page)).toHaveCount(1);
  await expect(preview(page)).toBeVisible();
  await expect(preview(page)).toHaveAttribute('data-source', source);
}

// Decode the preview's own pixels, composited on white like the decoder does.
async function previewPayload(page) {
  const pixels = await preview(page).evaluate(canvas => {
    const flat = document.createElement('canvas');
    flat.width = canvas.width; flat.height = canvas.height;
    const context = flat.getContext('2d');
    context.fillStyle = '#fff'; context.fillRect(0, 0, flat.width, flat.height); context.drawImage(canvas, 0, 0);
    const data = context.getImageData(0, 0, flat.width, flat.height).data;
    let binary = ''; for (const b of data) binary += String.fromCharCode(b);
    return { width: flat.width, height: flat.height, base64: btoa(binary) };
  });
  const payload = jsQR(new Uint8ClampedArray(Buffer.from(pixels.base64, 'base64')), pixels.width, pixels.height)?.data;
  return payload && new URL(payload).href; // the same normalization the result field shows
}

// Compare the preview with the same bytes decoded independently in the page.
async function compareWithSource(page, buffer, mimeType) {
  return preview(page).evaluate(async (canvas, { base64, mimeType }) => {
    const bitmap = await createImageBitmap(new Blob([Uint8Array.from(atob(base64), c => c.charCodeAt(0))], { type: mimeType }));
    const reference = document.createElement('canvas');
    reference.width = canvas.width; reference.height = canvas.height;
    reference.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const a = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    const b = reference.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    let total = 0; for (let i = 0; i < a.length; i++) total += Math.abs(a[i] - b[i]);
    const result = { width: canvas.width, height: canvas.height, sourceWidth: bitmap.width, sourceHeight: bitmap.height, meanDifference: total / a.length };
    bitmap.close();
    return result;
  }, { base64: buffer.toString('base64'), mimeType });
}

async function exported(page, format, info) {
  if (format !== 'png') await page.locator('#download-toggle').click();
  const [download] = await Promise.all([page.waitForEvent('download'), page.locator(format === 'png' ? '#download-button' : `[data-format="${format}"]`).click()]);
  const path = info.outputPath(`upload.${format}`); await download.saveAs(path);
  return path;
}

test('PNG, JPG and WebP uploads show the uploaded image itself, and the decode result beside it', async ({ page }, info) => {
  await expect(zone(page)).toHaveAttribute('data-state', 'empty');
  await encode(page, externalUrl);
  await page.locator('#output-size').fill('300');
  const files = { png: fixture('independent-ascii') };
  for (const format of ['jpg', 'webp']) files[format] = await exported(page, format, info);
  await page.locator('#decode-tab').click();
  await expect(preview(page)).toHaveCount(0);
  for (const [format, path] of Object.entries(files)) {
    const mimeType = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' }[format];
    await choose(page, path);
    await settledPreview(page, 'raster');
    const comparison = await compareWithSource(page, await readFile(path), mimeType);
    expect(comparison.width).toBe(comparison.sourceWidth);
    expect(comparison.height).toBe(comparison.sourceHeight);
    expect(comparison.meanDifference).toBeLessThan(0.5);
    expect(await previewPayload(page)).toBe(externalUrl);
    await expect(page.locator('#decoded-url')).toHaveValue(externalUrl);
    await expect(page.locator('#open-link')).toBeVisible();
    // The frame stays the picker: the visible call to action and the input's name are unchanged.
    await expect(page.locator('label[for="qr-image"]')).toHaveText('選擇圖片或拖曳到這裡');
    await expect(page.locator('#qr-image')).toHaveAccessibleName('選擇圖片或拖曳到這裡');
    expect(await preview(page).evaluate(el => el.closest('[aria-hidden="true"]') !== null)).toBe(true);
  }
  // Drag and drop follows the same path.
  await zone(page).drop({ files: fixture('independent-unicode') });
  await expect(page.locator('#decoded-url')).toHaveValue(unicodeUrl);
  await settledPreview(page, 'raster');
  expect(await previewPayload(page)).toBe(unicodeUrl);
});

test('a supported image without a QR Code stays visible with the existing error', async ({ page }) => {
  await page.locator('#decode-tab').click();
  const file = await imageVariant(page, 'no-qr');
  await choose(page, file, null);
  await expect(page.locator('#decode-error')).toHaveText('圖片中找不到 QR Code。');
  await settledPreview(page, 'raster');
  const comparison = await compareWithSource(page, file.buffer, file.mimeType);
  // 1200 × 900 is fitted into the 1024 preview bound without changing its shape.
  expect([comparison.width, comparison.height]).toEqual([1024, 768]);
  expect(comparison.meanDifference).toBeLessThan(2);
  await expect(page.locator('#decoded-url')).toHaveValue('');
  await expect(page.locator('#copy-button')).toBeDisabled();
  await expect(page.locator('#open-link')).toBeHidden();
});

test('a new upload replaces the preview, and a late preview for an older file is discarded', async ({ page }) => {
  await page.locator('#decode-tab').click();
  await choose(page, fixture('independent-ascii'));
  expect(await previewPayload(page)).toBe(externalUrl);
  await choose(page, fixture('independent-unicode'), unicodeUrl);
  await settledPreview(page, 'raster');
  expect(await previewPayload(page)).toBe(unicodeUrl);

  await page.evaluate(() => {
    window.pendingBitmaps = []; const original = window.originalBitmap = window.createImageBitmap;
    window.createImageBitmap = (...args) => new Promise((resolve, reject) => window.pendingBitmaps.push(() => original(...args).then(resolve, reject)));
  });
  // A: decode [0] settles, its preview [1] stays pending.
  await page.locator('#qr-image').setInputFiles(fixture('independent-ascii'));
  await expect(preview(page)).toHaveCount(0); // B's preview is cleared as soon as A is chosen
  await expect(zone(page)).toHaveAttribute('data-state', 'processing');
  await page.waitForFunction(() => window.pendingBitmaps.length === 1);
  await page.evaluate(() => window.pendingBitmaps[0]());
  await expect(page.locator('#decoded-url')).toHaveValue(externalUrl);
  await page.waitForFunction(() => window.pendingBitmaps.length === 2);
  // B: decode [2] and preview [3] settle first.
  await page.locator('#qr-image').setInputFiles(fixture('independent-unicode'));
  await page.waitForFunction(() => window.pendingBitmaps.length === 3);
  await page.evaluate(() => window.pendingBitmaps[2]());
  await expect(page.locator('#decoded-url')).toHaveValue(unicodeUrl);
  await page.waitForFunction(() => window.pendingBitmaps.length === 4);
  await page.evaluate(() => window.pendingBitmaps[3]());
  await settledPreview(page, 'raster');
  // A's preview arrives last and must not replace B.
  await page.evaluate(() => window.pendingBitmaps[1]());
  await page.waitForTimeout(200);
  await expect(preview(page)).toHaveCount(1);
  expect(await previewPayload(page)).toBe(unicodeUrl);
  await expect(page.locator('#decoded-url')).toHaveValue(unicodeUrl);

  // Files without decodable pixels clear the previous preview and show no image.
  await page.evaluate(() => { window.createImageBitmap = window.originalBitmap; });
  for (const [file, message] of [
    [{ name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('broken') }, '無法讀取這張圖片。'],
    [{ name: 'note.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') }, '不支援此檔案格式。'],
    [{ name: 'huge.png', mimeType: 'image/png', buffer: Buffer.alloc(20 * 1024 * 1024 + 1) }, '圖片檔案過大(上限20MB)'],
    [[fixture('independent-ascii'), fixture('independent-unicode')], '一次只能選擇一張圖片。'],
  ]) {
    await choose(page, fixture('independent-ascii'));
    await settledPreview(page, 'raster');
    if (Array.isArray(file)) await zone(page).drop({ files: file });
    else await page.locator('#qr-image').setInputFiles(file);
    await expect(page.locator('#decode-error')).toHaveText(message);
    await expect(zone(page)).toHaveAttribute('data-state', 'empty');
    await expect(preview(page)).toHaveCount(0);
  }
});

test('safe SVG previews only parser-rasterized pixels: no DOM SVG, loader, object URL or request', async ({ page, context }, info) => {
  await encode(page, externalUrl);
  const path = await exported(page, 'svg', info);
  const svg = await readFile(path);
  await page.locator('#decode-tab').click();
  const requests = [], navigations = [];
  page.on('request', request => requests.push(request.url()));
  page.on('framenavigated', frame => navigations.push(frame.url()));
  await page.evaluate(() => {
    window.loaderCalls = [];
    const record = name => window.loaderCalls.push(name);
    const bitmap = window.createImageBitmap;
    window.createImageBitmap = (...args) => { record(`createImageBitmap:${args[0]?.type ?? typeof args[0]}`); return bitmap(...args); };
    const objectUrl = URL.createObjectURL; URL.createObjectURL = (...args) => { record('createObjectURL'); return objectUrl(...args); };
    const parse = DOMParser.prototype.parseFromString; DOMParser.prototype.parseFromString = function (...args) { record('DOMParser'); return parse.apply(this, args); };
    const fragment = Range.prototype.createContextualFragment; Range.prototype.createContextualFragment = function (...args) { record('createContextualFragment'); return fragment.apply(this, args); };
    const adjacent = Element.prototype.insertAdjacentHTML; Element.prototype.insertAdjacentHTML = function (...args) { record('insertAdjacentHTML'); return adjacent.apply(this, args); };
    for (const property of ['innerHTML', 'outerHTML']) {
      const descriptor = Object.getOwnPropertyDescriptor(Element.prototype, property);
      Object.defineProperty(Element.prototype, property, { ...descriptor, set(value) { record(property); descriptor.set.call(this, value); } });
    }
    const src = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
    Object.defineProperty(HTMLImageElement.prototype, 'src', { ...src, set(value) { record('img.src'); src.set.call(this, value); } });
    const create = Document.prototype.createElement;
    Document.prototype.createElement = function (name, ...rest) { if (!['canvas', 'a'].includes(String(name).toLowerCase())) record(`createElement:${name}`); return create.call(this, name, ...rest); };
    window.svgCount = document.querySelectorAll('svg').length;
  });
  const initialRequests = requests.length;
  for (const file of [path, { name: 'misnamed.png', mimeType: 'image/png', buffer: svg }]) {
    await choose(page, file);
    await settledPreview(page, 'svg');
    expect(await previewPayload(page)).toBe(externalUrl);
  }
  const box = await preview(page).boundingBox();
  expect(Math.abs(box.width - box.height)).toBeLessThan(1);
  expect(await page.evaluate(() => window.loaderCalls)).toEqual([]);
  expect(await page.evaluate(() => document.querySelectorAll('svg').length === window.svgCount)).toBe(true);
  expect(await page.locator('img, object, embed, iframe, svg image, svg use, foreignObject, svg script').count()).toBe(0);
  expect(requests.length).toBe(initialRequests);
  expect(navigations).toEqual([]);
  expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length, cookie: document.cookie })))
    .toEqual({ local: 0, session: 0, cookie: '' });
  expect(await context.cookies()).toEqual([]);
});

test('malicious SVG is rejected without any preview, request, execution or navigation', async ({ page }) => {
  const requests = [], navigations = [], errors = [];
  page.on('request', request => requests.push(request.url()));
  page.on('framenavigated', frame => navigations.push(frame.url()));
  page.on('pageerror', error => errors.push(String(error)));
  await page.locator('#decode-tab').click();
  await page.evaluate(() => { window.svgExecuted = false; window.violations = []; document.addEventListener('securitypolicyviolation', e => window.violations.push(e.violatedDirective)); });
  const initialRequests = requests.length;
  for (const payload of [
    '<script>window.svgExecuted=true</script>',
    '<rect width="1" height="1" fill="#000" onload="window.svgExecuted=true"/>',
    '<image href="https://attacker.invalid/tracker.png"/>',
    '<use href="https://attacker.invalid/payload.svg#x"/>',
    '<foreignObject><div xmlns="http://www.w3.org/1999/xhtml">bad</div></foreignObject>',
    '<style>@import url(https://attacker.invalid/style.css)</style>',
    '<a href="javascript:alert(1)"/>',
  ]) {
    // A valid image first, so rejection must also clear an existing preview.
    await choose(page, fixture('independent-ascii'));
    await settledPreview(page, 'raster');
    await page.locator('#qr-image').setInputFiles({ name: 'payload.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(svgBase + payload + '</svg>') });
    await expect(page.locator('#decode-error')).toHaveText('無法讀取這張圖片。');
    await expect(zone(page)).toHaveAttribute('data-state', 'empty');
    await expect(preview(page)).toHaveCount(0);
  }
  expect(requests.length).toBe(initialRequests);
  expect(navigations).toEqual([]);
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => ({ executed: window.svgExecuted, violations: window.violations, active: document.querySelectorAll('img, object, embed, iframe, svg image, svg use, foreignObject, svg script').length })))
    .toEqual({ executed: false, violations: [], active: 0 });
});

test('preview keeps aspect ratio inside the frame across viewports, without enlarging tiny images absurdly', async ({ page }, info) => {
  await encode(page, 'https://a.co/');
  await page.locator('#output-size').fill('64');
  const tiny = { name: 'tiny.png', mimeType: 'image/png', buffer: Buffer.from(await page.locator('#qr-image-container canvas').evaluate(c => c.toDataURL().split(',')[1]), 'base64') };
  const tinySize = tiny.buffer.readUInt32BE(16);
  await page.locator('#decode-tab').click();
  const files = {
    square: fixture('independent-ascii'),
    landscape: await imageVariant(page, 'screenshot'),
    portrait: await imageVariant(page, 'long-screenshot'),
    transparent: await imageVariant(page, 'transparent'),
    tiny,
  };
  for (const [kind, file] of Object.entries(files)) {
    await choose(page, file, kind === 'tiny' ? 'https://a.co/' : externalUrl);
    await settledPreview(page, 'raster');
    for (const width of [1280, 768, 375, 320]) {
      await page.setViewportSize({ width, height: 900 });
      const frame = await zone(page).boundingBox(), image = await preview(page).boundingBox();
      const intrinsic = await preview(page).evaluate(c => [c.width, c.height]);
      expect(image.x).toBeGreaterThanOrEqual(frame.x); expect(image.y).toBeGreaterThanOrEqual(frame.y);
      expect(image.x + image.width).toBeLessThanOrEqual(frame.x + frame.width);
      expect(image.y + image.height).toBeLessThanOrEqual(frame.y + frame.height);
      expect(image.width / image.height).toBeCloseTo(intrinsic[0] / intrinsic[1], 1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (kind === 'tiny') expect(image.width).toBeLessThanOrEqual(tinySize * 4);
      if (kind === 'portrait') expect(image.height).toBeGreaterThan(image.width * 4);
      if (kind === 'landscape') expect(image.width).toBeGreaterThan(image.height);
    }
    if (kind === 'transparent') {
      expect(await preview(page).evaluate(c => getComputedStyle(c).backgroundImage.includes('conic-gradient'))).toBe(true);
      expect(await preview(page).evaluate(c => c.getContext('2d').getImageData(0, 0, 1, 1).data[3])).toBe(0);
    }
    await page.screenshot({ path: info.outputPath(`preview-${kind}.png`), fullPage: true });
    await page.setViewportSize({ width: 1280, height: 900 });
  }
  // The preview is part of the picker: clicking the image opens the file chooser.
  const chooser = page.waitForEvent('filechooser');
  await preview(page).click();
  await chooser;
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(result.violations).toEqual([]);
});

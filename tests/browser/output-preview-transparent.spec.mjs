import { expectedRasterSize } from '../raster-expectations.mjs';
import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import qrcode from 'qrcode-generator';
import jsQR from 'jsqr';
import AxeBuilder from '@axe-core/playwright';
import { encode, choose, externalUrl, attachJson } from './helpers.mjs';

const samples = [
  ['short', externalUrl, 128],
  ['medium', `https://example.com/${'a'.repeat(500)}`, 300],
  ['dense', new URL(`https://例子.測試/採訪?q=😀&long=${'a'.repeat(1000)}`).href, 512],
  ['near-capacity', `https://example.com/${'a'.repeat(2311)}`, 512],
];
const canvas = page => page.locator('#qr-image-container canvas');
const background = page => page.getByRole('checkbox', { name: '透明背景', exact: true });

async function saveDownload(page, info, format, name) {
  if (format !== 'png') await page.locator('#download-toggle').click();
  const event = page.waitForEvent('download');
  await page.locator(format === 'png' ? '#download-button' : `[data-format="${format}"]`).click();
  const download = await event;
  expect(download.suggestedFilename()).toBe(`qr-code.${format}`);
  const path = info.outputPath(`${name}.${format}`);
  await download.saveAs(path);
  return { path, bytes: await readFile(path) };
}

async function screenshot(page, info, name) {
  const path = info.outputPath(`${name}.png`);
  await page.screenshot({ path, fullPage: true });
  await info.attach(name, { path, contentType: 'image/png' });
}

async function previewMetrics(page, target, transparent) {
  const total = Number(await canvas(page).getAttribute('data-modules')) + 8;
  const size = expectedRasterSize(target, total);
  await expect(canvas(page)).toHaveAttribute('width', String(size));
  await expect(canvas(page)).toHaveAttribute('height', String(size));
  await expect(page.locator('#preview-dimensions')).toHaveText(`實際尺寸：${size} × ${size} px`);
  const metrics = await canvas(page).evaluate(c => {
    const box = c.getBoundingClientRect(), stage = c.parentElement.getBoundingClientRect();
    const data = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    return { width: c.width, cssWidth: box.width, cssHeight: box.height, available: stage.width,
      corner: Array.from(data.slice(0, 4)), checkerboard: getComputedStyle(c).backgroundImage,
      overflow: document.documentElement.scrollWidth > innerWidth };
  });
  expect(metrics.cssWidth).toBeCloseTo(Math.min(size, metrics.available), 1);
  expect(metrics.cssHeight).toBeCloseTo(metrics.cssWidth, 1);
  expect(metrics.corner).toEqual(transparent ? [0, 0, 0, 0] : [255, 255, 255, 255]);
  expect(metrics.checkerboard.includes('conic-gradient')).toBe(transparent);
  expect(metrics.overflow).toBe(false);
  return { target, size, transparent, ...metrics };
}

async function inspectTransparentRaster(page, bytes, format, size, url) {
  const mime = `image/${format}`;
  if (format === 'png') expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  else { expect(bytes.subarray(0, 4).toString()).toBe('RIFF'); expect(bytes.subarray(8, 12).toString()).toBe('WEBP'); }
  const pixels = await page.evaluate(async ({ base64, mime }) => {
    const bitmap = await createImageBitmap(new Blob([Uint8Array.from(atob(base64), c => c.charCodeAt(0))], { type: mime }));
    const c = document.createElement('canvas'); c.width = bitmap.width; c.height = bitmap.height;
    const ctx = c.getContext('2d'); ctx.drawImage(bitmap, 0, 0); bitmap.close();
    const data = ctx.getImageData(0, 0, c.width, c.height).data;
    let binary = ''; for (const b of data) binary += String.fromCharCode(b);
    return { width: c.width, height: c.height, rgba: btoa(binary) };
  }, { base64: bytes.toString('base64'), mime });
  
  const reference = qrcode(0, 'M'); reference.addData(url, 'Byte'); reference.make();
  const modules = reference.getModuleCount(), total = modules + 8;
  const target = size; size = expectedRasterSize(target, total);
  expect(pixels.width).toBe(size); expect(pixels.height).toBe(size);
  const data = new Uint8ClampedArray(Buffer.from(pixels.rgba, 'base64')), composite = data.slice();
  let alphaMismatches = 0, rgbMismatches = 0, darkPixels = 0, backgroundPixels = 0, maxDarkRgb = 0;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const row = Math.floor(y / (size / total)) - 4, col = Math.floor(x / (size / total)) - 4;
    const dark = row >= 0 && col >= 0 && row < modules && col < modules && reference.isDark(row, col);
    const i = (y * size + x) * 4;
    if (data[i + 3] !== (dark ? 255 : 0)) alphaMismatches++;
    if (dark) { darkPixels++; maxDarkRgb = Math.max(maxDarkRgb, data[i], data[i + 1], data[i + 2]); }
    else backgroundPixels++;
    if ((format === 'png' || !dark) && (data[i] !== 0 || data[i + 1] !== 0 || data[i + 2] !== 0)) rgbMismatches++;
    if (data[i + 3] === 0) composite.fill(255, i, i + 4);
  }
  expect(alphaMismatches).toBe(0); expect(rgbMismatches).toBe(0);
  expect(maxDarkRgb).toBeLessThanOrEqual(format === 'png' ? 0 : 5);
  expect(darkPixels).toBeGreaterThan(0); expect(backgroundPixels).toBeGreaterThan(0);
  const decoded = jsQR(composite, size, size)?.data === url;
  return { decoded, decodedPayload: jsQR(composite, size, size)?.data, format, target, size, scale: size / total, modules, total, alphaMismatches, rgbMismatches, maxDarkRgb, darkPixels, backgroundPixels,
    backgroundAlpha: 0, moduleAlpha: 255, corner: Array.from(data.slice(0, 4)) };
}

test.beforeEach(async ({ page }) => { await page.goto('/'); });

test('preview follows valid input immediately: 64 128 256 300 387 512 1024 2048, constrained CSS and screenshots', async ({ page }, info) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(page.locator('#preview-dimensions')).toBeEmpty();
  await expect(page.locator('#preview-dimensions')).toBeHidden();
  await expect(page.locator('#qr-placeholder')).toBeVisible();
  await expect(background(page)).not.toBeChecked();
  await encode(page, 'https://a.co/');
  const rows = [await previewMetrics(page, 256, false)];
  for (const size of [64, 128, 256, 300, 387, 512, 1024, 2048]) {
    await page.locator('#output-size').fill(String(size));
    rows.push(await previewMetrics(page, size, false));
    await expect(page.locator('#output-size')).toBeFocused();
    await screenshot(page, info, `white-${size}`);
  }
  expect(rows.find(r => r.target === 64).cssWidth).toBe(expectedRasterSize(64, 29));
  expect(rows.find(r => r.target === 128).cssWidth).toBe(expectedRasterSize(128, 29));
  expect(rows.find(r => r.target === 256).cssWidth).toBe(expectedRasterSize(256, 29));
  expect(rows.find(r => r.target === 300).cssWidth).toBe(expectedRasterSize(300, 29));
  for (const size of [128, 256]) {
    await page.locator('#output-size').fill(String(size)); await background(page).check();
    rows.push(await previewMetrics(page, size, true));
    await screenshot(page, info, `transparent-${size}`);
  }
  await attachJson(info, 'preview-sizes', rows);
});

test('invalid size retains last valid pixels; transparency applies there and Generate keeps size preference', async ({ page }) => {
  await encode(page, externalUrl);
  for (const size of [128, 300]) { await page.locator('#output-size').fill(String(size)); await previewMetrics(page, size, false); }
  const retained = await canvas(page).evaluate(c => c.toDataURL());
  for (const value of ['', 'abc', '1e2', '128.5', '63', '64', '2049']) {
    await page.locator('#output-size').fill(value);
    await expect(page.locator('#output-size-error')).toBeEmpty();
    await previewMetrics(page, 300, false);
    expect(await canvas(page).evaluate(c => c.toDataURL())).toBe(retained);
  }
  await page.locator('#output-size').fill('64'); await page.locator('#output-size').press('Tab');
  await expect(page.locator('#output-size-error')).toHaveText('此 QR Code 至少需要 82 px。');
  await background(page).check(); await previewMetrics(page, 300, true);
  await background(page).uncheck(); await previewMetrics(page, 300, false);
  expect(await canvas(page).evaluate(c => c.toDataURL())).toBe(retained);
  await page.locator('#output-size').fill('128'); await previewMetrics(page, 128, false);
  await expect(page.locator('#output-size-error')).toBeEmpty();
  await page.locator('#output-size').fill('abc'); await background(page).check();
  await encode(page, samples[2][1]); // The prior 128 preview cannot fit the new dense matrix.
  await expect(page.locator('#output-size')).toHaveValue('abc');
  await previewMetrics(page, 266, true);
  await expect(page.locator('#qr-error')).toBeEmpty();
  await page.reload(); await encode(page, samples[2][1]);
  await expect(page.locator('#output-size')).toHaveValue('256');
  await previewMetrics(page, 266, false);
  await page.locator('#download-button').click();
  await expect(page.locator('#output-size-error')).toHaveText('此 QR Code 至少需要 266 px。');
});

test('target64 actual58 survives background toggles and invalid-target Generate fallback', async ({ page }) => {
  await encode(page, 'https://a.co/');
  await page.locator('#output-size').fill('64');
  await previewMetrics(page, 64, false);
  await page.locator('#output-size').fill('abc');
  await background(page).check(); await previewMetrics(page, 64, true);
  await background(page).uncheck(); await previewMetrics(page, 64, false);
  await encode(page, 'https://a.co/');
  await previewMetrics(page, 64, false);
  await expect(page.locator('#qr-error')).toBeEmpty();
  await expect(page.locator('#output-size')).toHaveValue('abc');
});

test('draft A/B, background and size persistence; only successful Generate changes the preview payload', async ({ page }, info) => {
  const a = 'https://example.com/a', b = 'https://example.com/b';
  await encode(page, a);
  await page.locator('#url-input').fill(b);
  await page.locator('#output-size').fill('300'); await background(page).check();
  await previewMetrics(page, 300, true); await expect(canvas(page)).toHaveAccessibleName(`網址 ${a} 的 QR Code`);
  const first = await saveDownload(page, info, 'png', 'generated-a');
  expect((await inspectTransparentRaster(page, first.bytes, 'png', 300, a)).decoded).toBe(true);
  await page.locator('#decode-tab').click(); await choose(page, first.path, a); await page.locator('#encode-tab').click();
  await expect(background(page)).toBeChecked(); await expect(page.locator('#output-size')).toHaveValue('300');
  await expect(page.locator('#url-input')).toHaveValue(b);
  const retained = await canvas(page).evaluate(c => c.toDataURL());
  await encode(page, 'javascript:alert(1)');
  await expect(page.locator('#url-error')).not.toBeEmpty();
  expect(await canvas(page).evaluate(c => c.toDataURL())).toBe(retained);
  await encode(page, b); await previewMetrics(page, 300, true);
  await expect(canvas(page)).toHaveAccessibleName(`網址 ${b} 的 QR Code`);
  const second = await saveDownload(page, info, 'png', 'generated-b');
  expect((await inspectTransparentRaster(page, second.bytes, 'png', 300, b)).decoded).toBe(true);
  await page.locator('#decode-tab').click(); await choose(page, second.path, b);
  await page.reload(); await expect(background(page)).not.toBeChecked();
  await expect(page.locator('#output-size')).toHaveValue('256'); await expect(canvas(page)).toHaveCount(0);
  await expect(page.locator('#preview-dimensions')).toBeEmpty();
});

test('native transparency checkbox and disabled JPG retain menu order, keyboard and focus semantics', async ({ page }, info) => {
  await encode(page, externalUrl);
  const control = background(page), jpg = page.locator('[data-format="jpg"]');
  await expect(page.locator('label[for="transparent-background"]')).toHaveText('透明背景');
  await expect(control).toHaveAttribute('type', 'checkbox');
  await expect(page.locator('.transparent-control')).toHaveText('透明背景');
  await expect(control).not.toHaveAttribute('aria-describedby');
  await page.locator('#generate-button').focus(); await page.keyboard.press('Tab');
  await expect(control).toBeFocused();
  expect(await control.evaluate(el => el.matches(':focus-visible') && getComputedStyle(el).outlineWidth === '3px')).toBe(true);
  await page.keyboard.press('Space'); await expect(control).toBeChecked(); await previewMetrics(page, 256, true);
  await page.keyboard.press('Tab'); await expect(page.locator('#output-size')).toBeFocused();
  await page.keyboard.press('Tab'); await expect(page.locator('#download-button')).toBeFocused();
  await page.keyboard.press('Tab'); await page.keyboard.press('ArrowDown');
  await expect(page.locator('#download-menu [role="menuitem"]')).toHaveText(['Download SVG', 'Download JPG', 'Download WebP']);
  await expect(jpg).toBeVisible(); await expect(jpg).toBeDisabled(); await expect(jpg).toHaveAttribute('disabled', '');
  const snapshot = await page.locator('#download-menu').ariaSnapshot();
  expect(snapshot).toContain('menuitem "Download JPG" [disabled]');
  const downloads = []; page.on('download', d => downloads.push(d));
  for (const [key, format] of [['ArrowDown', 'webp'], ['ArrowUp', 'svg'], ['ArrowUp', 'webp'], ['Home', 'svg'], ['End', 'webp']]) {
    await page.keyboard.press(key); await expect(page.locator(`[data-format="${format}"]`)).toBeFocused();
  }
  const box = await jpg.boundingBox(); await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await jpg.evaluate(el => { el.click(); el.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
  expect(downloads).toHaveLength(0);
  await expect(control).toBeChecked();
  // A disabled native button can blur the menu and close it through the
  // existing focusout handler. Reopen explicitly for the Escape check.
  await page.locator('#download-toggle').focus(); await page.keyboard.press('ArrowDown');
  await page.locator('[data-format="svg"]').focus(); await page.keyboard.press('Escape');
  await expect(page.locator('#download-toggle')).toBeFocused();
  await control.focus(); await page.keyboard.press('Space'); await expect(control).not.toBeChecked();
  await page.locator('#download-toggle').focus(); await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown');
  await expect(jpg).toBeFocused(); await expect(jpg).toBeEnabled();
  const event = page.waitForEvent('download'); await page.keyboard.press('Space');
  expect((await event).suggestedFilename()).toBe('qr-code.jpg');
  await expect(page.locator('#download-toggle')).toBeFocused();
  await attachJson(info, 'transparent-menu-accessibility', { snapshot, downloads: downloads.map(d => d.suggestedFilename()) });
});

for (const [sample, url, size] of samples) for (const format of ['png', 'webp', 'svg']) {
  test(`${sample === 'near-capacity' ? 'dedicated 185/512 ' : ''}transparent ${sample} ${format}: actual alpha, preview agreement and production round trip`, async ({ page }, info) => {
    await encode(page, url); await page.locator('#output-size').fill(String(size)); await background(page).check();
    await previewMetrics(page, size, true);
    if (sample === 'dense') await screenshot(page, info, 'transparent-dense');
    const previewPng = Buffer.from(await canvas(page).evaluate(c => c.toDataURL().split(',')[1]), 'base64');
    const rows = [];
    {
      const { path, bytes } = await saveDownload(page, info, format, `transparent-${sample}`);
      if (format === 'svg') {
        const total = Number(await canvas(page).getAttribute('data-modules')) + 8;
        const svg = bytes.toString();
        expect(svg).toContain(`viewBox="0 0 ${total} ${total}" width="${total}" height="${total}"`);
        expect(svg).not.toMatch(/<rect|#fff|<image|<style|<script|href=/);
        expect(svg).toContain('fill="#000"');
        rows.push({ format, total, whiteRect: false });
      } else {
        if (format === 'png') expect(bytes).toEqual(previewPng);
        rows.push(await inspectTransparentRaster(page, bytes, format, size, url));
      }
      await page.locator('#decode-tab').click(); await choose(page, path, url);
      rows[0].applicationPayload = await page.locator('#decoded-url').inputValue();
      await attachJson(info, 'transparent-pixels', rows);
      if (format !== 'svg') expect(rows[0].decoded).toBe(true);
      if (format === 'svg') {
        await page.locator('#image-drop-zone').drop({ files: path });
        await expect(page.locator('#decoded-url')).toHaveValue(url);
      }
      await page.locator('#encode-tab').click(); await expect(background(page)).toBeChecked();
    }
  });
}

test('SVG white and transparent variants stay independent of empty malformed decimal and small raster sizes', async ({ page }, info) => {
  await encode(page, externalUrl);
  const originals = [];
  for (const transparent of [false, true]) {
    await background(page).setChecked(transparent);
    let original;
    for (const [index, value] of ['32', '', 'abc', '128.5', '512'].entries()) {
      await page.locator('#output-size').fill(value);
      if (index < 4) { await page.locator('#download-button').click(); await expect(page.locator('#output-size-error')).not.toBeEmpty(); }
      const { path, bytes } = await saveDownload(page, info, 'svg', `svg-${transparent}-${index}`);
      const svg = bytes.toString(); original ??= svg; expect(svg).toBe(original);
      expect(svg.includes('<rect')).toBe(!transparent);
      await expect(page.locator('#output-size-error')).toBeEmpty();
      await expect(page.locator('#output-size')).not.toHaveAttribute('aria-invalid');
      await page.locator('#decode-tab').click(); await choose(page, path, externalUrl);
      await page.locator('#image-drop-zone').drop({ files: path }); await expect(page.locator('#decoded-url')).toHaveValue(externalUrl);
      await page.locator('#encode-tab').click(); await expect(page.locator('#output-size')).toHaveValue(value);
    }
    originals.push(original);
  }
  expect(originals[1]).toBe(originals[0].replace(/<rect[^>]+\/>/, ''));
});

test('background edits and edit-restore discard pending raster downloads and allow recovery', async ({ page }, info) => {
  await encode(page, externalUrl);
  await page.evaluate(() => {
    window.originalToBlob = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function (callback, type, quality) {
      window.finishExport = () => new Promise(resolve => window.originalToBlob.call(this, blob => { callback(blob); resolve(); }, type, quality));
    };
    window.createdDownloads = 0; const original = URL.createObjectURL;
    URL.createObjectURL = (...args) => { window.createdDownloads++; return original(...args); };
  });
  for (const format of ['png', 'jpg', 'webp']) for (const restore of [false, true]) {
    await background(page).uncheck();
    if (format !== 'png') await page.locator('#download-toggle').click();
    await page.locator(format === 'png' ? '#download-button' : `[data-format="${format}"]`).click();
    await expect(page.locator('#download-button')).toHaveAttribute('aria-disabled', 'true');
    await background(page).check(); if (restore) await background(page).uncheck();
    await page.evaluate(() => window.finishExport());
    await expect(page.locator('#download-button')).not.toHaveAttribute('aria-disabled');
    expect(await page.evaluate(() => window.createdDownloads)).toBe(0);
  }
  await page.evaluate(() => { HTMLCanvasElement.prototype.toBlob = window.originalToBlob; });
  await background(page).check();
  const { bytes } = await saveDownload(page, info, 'png', 'background-recovery');
  expect((await inspectTransparentRaster(page, bytes, 'png', 256, externalUrl)).decoded).toBe(true);
});

test('transparent states axe, dimensions without duplicate announcements and responsive reflow', async ({ page }, info) => {
  await encode(page, externalUrl); await background(page).check();
  const scans = [], rows = [];
  const scan = async state => {
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(result.violations).toEqual([]); scans.push({ state, violations: result.violations });
  };
  await scan('transparent'); await page.locator('#download-toggle').click(); await scan('disabled JPG');
  await page.keyboard.press('Escape');
  await page.locator('#output-size').fill('64'); await page.locator('#download-button').click();
  await scan('size error and transparent');
  await page.evaluate(() => {
    window.statusMutations = 0;
    new MutationObserver(records => { window.statusMutations += records.length; })
      .observe(document.querySelector('#qr-status'), { childList: true, subtree: true, characterData: true });
  });
  for (const width of [1280, 768, 375, 320, 640]) {
    await page.setViewportSize({ width, height: width === 640 ? 450 : 900 });
    if (width === 640) await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    for (const size of [128, 256, 2048]) {
      await page.locator('#output-size').fill(String(size));
      rows.push({ viewport: width, ...await previewMetrics(page, size, true) });
    }
    const dimension = await page.locator('#preview-dimensions').boundingBox();
    const image = await canvas(page).boundingBox();
    const control = await page.locator('.transparent-control').boundingBox();
    const downloads = await page.locator('#download-control').boundingBox();
    expect(image.y + image.height).toBeLessThanOrEqual(dimension.y);
    expect(control.y + control.height).toBeLessThanOrEqual(downloads.y);
    for (const selector of ['#preview-dimensions', '.output-size-control', '.transparent-control', '#download-control']) {
      const box = await page.locator(selector).boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(width);
    }
    await screenshot(page, info, `transparent-reflow-${width}`);
    if (width === 320 || width === 640) await scan(`reflow ${width}`);
  }
  expect(await page.evaluate(() => window.statusMutations)).toBe(0);
  const snapshot = await page.locator('body').ariaSnapshot();
  expect(snapshot.split(`實際尺寸：${expectedRasterSize(2048, 41)} × ${expectedRasterSize(2048, 41)} px`).length - 1).toBe(1);
  expect(snapshot).not.toMatch(/checkerboard|縮放預覽|透明背景請搭配/);
  await attachJson(info, 'transparent-axe', scans);
  await attachJson(info, 'transparent-reflow', { rows, snapshot });
});

test('transparent output and controls do not add network, storage, navigation or CSP violations', async ({ page, context }, info) => {
  await page.waitForLoadState('networkidle');
  const requests = [], errors = [], navigations = [];
  page.on('request', r => requests.push(r.url())); page.on('requestfailed', r => errors.push(r.url()));
  page.on('pageerror', e => errors.push(String(e))); page.on('console', m => { if (['warning', 'error'].includes(m.type())) errors.push(m.text()); });
  page.on('framenavigated', f => navigations.push(f.url()));
  page.on('popup', p => navigations.push(p.url()));
  await page.evaluate(() => { window.violations = []; document.addEventListener('securitypolicyviolation', e => window.violations.push(e.violatedDirective)); });
  const url = 'https://example.com/?q=%3Cimg%20src=x%20onerror=alert(1)%3E';
  await encode(page, url); await background(page).check(); await page.locator('#output-size').fill('300');
  for (const format of ['png', 'webp', 'svg']) {
    const { path } = await saveDownload(page, info, format, `private-${format}`);
    await page.locator('#decode-tab').click(); await choose(page, path, url); await page.locator('#encode-tab').click();
  }
  expect(requests).toEqual([]); expect(errors).toEqual([]); expect(navigations).toEqual([]);
  expect(await page.locator('img, svg script, foreignObject, svg image, svg use').count()).toBe(0);
  expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length, cookie: document.cookie, violations: window.violations })))
    .toEqual({ local: 0, session: 0, cookie: '', violations: [] });
  expect(await context.cookies()).toEqual([]);
  expect(await page.evaluate(() => indexedDB.databases())).toEqual([]);
  expect(await page.evaluate(() => caches.keys())).toEqual([]);
  expect(await page.evaluate(() => navigator.serviceWorker.getRegistrations().then(r => r.length))).toBe(0);
});

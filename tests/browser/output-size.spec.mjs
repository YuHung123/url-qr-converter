import { expectedRasterSize } from '../raster-expectations.mjs';
import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import qrcode from 'qrcode-generator';
import jsQR from 'jsqr';
import AxeBuilder from '@axe-core/playwright';
import { encode, choose, externalUrl, attachJson } from './helpers.mjs';

const formats = [['png', 'image/png'], ['jpg', 'image/jpeg'], ['webp', 'image/webp']];
const samples = [
  ['short', externalUrl],
  ['medium', `https://example.com/${'a'.repeat(500)}`],
  ['dense', new URL(`https://例子.測試/採訪?q=😀&long=${'a'.repeat(1000)}`).href],
  ['near capacity', `https://example.com/${'a'.repeat(2311)}`],
];
const referenceMatrix = url => {
  const qr = qrcode(0, 'M'); qr.addData(url, 'Byte'); qr.make();
  return Array.from({ length: qr.getModuleCount() }, (_, y) => Array.from({ length: qr.getModuleCount() }, (_, x) => qr.isDark(y, x)));
};

async function activateDownload(page, format) {
  if (format !== 'png') await page.locator('#download-toggle').click();
  await page.locator(format === 'png' ? '#download-button' : `[data-format="${format}"]`).click();
}

async function inspectDownload(page, info, url, requested, format, mime, name) {
  const event = page.waitForEvent('download');
  await activateDownload(page, format);
  const download = await event;
  expect(download.suggestedFilename()).toBe(`qr-code.${format}`);
  const path = info.outputPath(`${name}.${format}`); await download.saveAs(path);
  const bytes = await readFile(path);
  if (format === 'png') expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  if (format === 'jpg') expect(bytes.subarray(0, 2).toString('hex')).toBe('ffd8');
  if (format === 'webp') { expect(bytes.subarray(0, 4).toString()).toBe('RIFF'); expect(bytes.subarray(8, 12).toString()).toBe('WEBP'); }
  const matrix = referenceMatrix(url);
  const actualSize = expectedRasterSize(requested, matrix.length + 8);
  await expect(page.locator('#qr-image-container canvas')).toHaveAttribute('width', String(actualSize));
  await expect(page.locator('#preview-dimensions')).toHaveText(`實際尺寸：${actualSize} × ${actualSize} px`);
  const inspected = await page.evaluate(async ({ base64, mime, format, matrix }) => {
    const bitmap = await createImageBitmap(new Blob([Uint8Array.from(atob(base64), c => c.charCodeAt(0))], { type: mime }));
    const { width, height } = bitmap;
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d'); ctx.drawImage(bitmap, 0, 0); bitmap.close();
    const data = ctx.getImageData(0, 0, width, height).data;
    const modules = matrix.length, total = modules + 8;
    const boundary = i => i * (width / total);
    const start = boundary(4), end = boundary(total - 4);
    let opaque = true, quiet = true, quietInterior = true, mismatches = 0;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (data[i + 3] !== 255) opaque = false;
      if (x < start || y < start || x >= end || y >= end) {
        if (data[i] < 200 || data[i + 1] < 200 || data[i + 2] < 200) quiet = false;
      }
      if (x < boundary(3) || y < boundary(3) || x >= boundary(total - 3) || y >= boundary(total - 3)) {
        if (data[i] < 250 || data[i + 1] < 250 || data[i + 2] < 250) quietInterior = false;
      }
      if (format === 'png') {
        const row = Math.floor(y / (width / total)) - 4, col = Math.floor(x / (width / total)) - 4;
        const expected = matrix[row]?.[col] ? 0 : 255;
        if (data[i] !== expected || data[i + 1] !== expected || data[i + 2] !== expected) mismatches++;
      }
    }
    let rgba = null;
    if (width <= 768) {
      let binary = ''; for (const b of data) binary += String.fromCharCode(b);
      rgba = btoa(binary);
    }
    return { width, height, opaque, quiet, quietInterior, mismatches, rgba };
  }, { base64: bytes.toString('base64'), mime, format, matrix });
  expect(inspected.width).toBe(actualSize); expect(inspected.height).toBe(actualSize);
  expect(inspected.opaque).toBe(true); expect(inspected.quiet).toBe(true); expect(inspected.quietInterior).toBe(true);
  expect(inspected.mismatches).toBe(0);
  const decodedPayload = inspected.rgba ? jsQR(new Uint8ClampedArray(Buffer.from(inspected.rgba, 'base64')), actualSize, actualSize)?.data : null;
  if (inspected.rgba) expect(decodedPayload).toBe(url);
  const { rgba, ...metrics } = inspected;
  return { path, format, requested, modules: matrix.length, totalModules: matrix.length + 8,
    minimum: (matrix.length + 8) * 2, scale: actualSize / (matrix.length + 8), actualSize, decodedPayload, ...metrics };
}

test.beforeEach(async ({ page }) => { await page.goto('/'); });

test('size label, exact validation order, keyboard, no typing errors and recovery', async ({ page }, info) => {
  const input = page.getByRole('textbox', { name: '目標尺寸', exact: true });
  const error = page.locator('#output-size-error');
  await expect(page.locator('label[for="output-size"]')).toBeVisible();
  await expect(page.locator('label[for="output-size"]')).toHaveText('目標尺寸');
  await expect(input).toHaveValue('256'); await expect(input).not.toHaveAttribute('placeholder');
  await expect(input).toHaveAttribute('type', 'text'); await expect(input).toHaveAttribute('inputmode', 'numeric');
  await expect(page.locator('.output-size-value span')).toHaveText('px');
  await expect(page.locator('.output-size-control')).toHaveText('目標尺寸 px');
  await expect(input).toHaveAttribute('aria-describedby', 'output-size-error');
  await encode(page, samples[2][1]);
  const minimum = (Number(await page.locator('#qr-image-container canvas').getAttribute('data-modules')) + 8) * 2;
  await expect(input).toHaveValue('256'); await expect(error).toBeEmpty();
  const downloads = []; page.on('download', d => downloads.push(d));
  for (const [value, copy] of [
    ['', '請輸入目標尺寸。'], ['abc', '請輸入有效的目標尺寸。'], ['--', '請輸入有效的目標尺寸。'],
    ['1e2', '請輸入有效的目標尺寸。'], ['256px', '請輸入有效的目標尺寸。'], ['NaN', '請輸入有效的目標尺寸。'],
    ['Infinity', '請輸入有效的目標尺寸。'], ['128+128', '請輸入有效的目標尺寸。'],
    ['128.5', '請輸入整數尺寸。'], ['-1', '目標尺寸不得小於 64 px。'], ['0', '目標尺寸不得小於 64 px。'],
    ['63', '目標尺寸不得小於 64 px。'], ['64', `此 QR Code 至少需要 ${minimum} px。`],
    ['2049', '目標尺寸不得大於 2048 px。'], ['256', `此 QR Code 至少需要 ${minimum} px。`],
  ]) {
    await input.fill(value); await expect(error).toBeEmpty(); await expect(input).not.toHaveAttribute('aria-invalid');
    for (const [format] of formats) {
      await activateDownload(page, format);
      await expect(error).toHaveText(copy); await expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(downloads).toHaveLength(0);
      await expect(page.locator('#url-error')).toBeEmpty(); await expect(page.locator('#qr-error')).toBeEmpty();
      await expect(page.locator('#decode-error')).toBeEmpty();
    }
  }
  await input.fill('32'); await input.press('Tab'); await expect(error).toHaveText('目標尺寸不得小於 64 px。');
  await input.fill('128.5'); await input.press('Enter'); await expect(error).toHaveText('請輸入整數尺寸。');
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(axe.violations).toEqual([]); await attachJson(info, 'size-error-axe', { violations: axe.violations });
  await input.fill('300'); await expect(error).toBeEmpty(); await expect(input).not.toHaveAttribute('aria-invalid');
  await input.press('Shift+Tab'); await page.keyboard.press('Tab'); await expect(input).toBeFocused();
  expect(await input.evaluate(el => el.matches(':focus-visible') && getComputedStyle(el).outlineWidth === '3px')).toBe(true);
  const event = page.waitForEvent('download'); await input.press('Enter');
  const path = info.outputPath('keyboard-300.png'); await (await event).saveAs(path);
  const bytes = await readFile(path); expect(bytes.readUInt32BE(16)).toBe(expectedRasterSize(300, minimum / 2)); expect(bytes.readUInt32BE(20)).toBe(expectedRasterSize(300, minimum / 2));
  await expect(input).toHaveValue('300'); await expect(input).toBeFocused();
});

for (const [sample, url] of samples) {
  test(`size ${sample}: minimum edges, snapped three-format downloads and updated preview`, async ({ page }, info) => {
    await encode(page, url);
    const input = page.locator('#output-size'), error = page.locator('#output-size-error');
    const modules = Number(await page.locator('#qr-image-container canvas').getAttribute('data-modules'));
    const minimum = (modules + 8) * 2;
    const preview = await page.locator('#qr-image-container canvas').evaluate(c => { window.retainedPreview = c; return c.toDataURL(); });
    await expect(input).toHaveValue('256');
    if (minimum > 256) {
      await page.locator('#download-button').click(); await expect(error).toHaveText(`此 QR Code 至少需要 ${minimum} px。`);
      await expect(input).toHaveValue('256');
    }
    await input.fill(String(minimum - 1)); await page.locator('#download-button').click();
    await expect(error).toHaveText(`此 QR Code 至少需要 ${minimum} px。`);
    expect(await page.locator('#qr-image-container canvas').evaluate(c => c === window.retainedPreview)).toBe(true);
    expect(await page.locator('#qr-image-container canvas').evaluate(c => c.toDataURL())).toBe(preview);
    const rows = [];
    let minimumPreview;
    for (const size of [minimum, minimum + 17]) {
      await input.fill(String(size));
      minimumPreview ??= await page.locator('#qr-image-container canvas').evaluate(c => c.toDataURL());
      for (const [format, mime] of formats) {
        const row = await inspectDownload(page, info, url, size, format, mime, `${sample}-${size}`);
        rows.push(row);
        await expect(error).toBeEmpty();
        await page.locator('#decode-tab').click(); await choose(page, row.path, url); await page.locator('#encode-tab').click();
      }
    }
    expect(await page.locator('#qr-image-container canvas').evaluate(c => c.toDataURL())).toBe(minimumPreview);
    const actual = expectedRasterSize(minimum + 17, modules + 8);
    await expect(page.locator('#qr-image-container canvas')).toHaveAttribute('width', String(actual));
    await expect(page.locator('#qr-image-container canvas')).toHaveAccessibleName(`網址 ${url} 的 QR Code`);
    await expect(page.locator('#preview-dimensions')).toHaveText(`實際尺寸：${actual} × ${actual} px`);
    await expect(page.locator('#url-input')).toHaveValue(url);
    await attachJson(info, 'custom-size-samples', rows);
  });
}

test('target snapping 64 128 256 300 387 512 1024 2048 and shared 300 geometry', async ({ page }, info) => {
  const url = 'https://a.co/'; await encode(page, url);
  const rows = [];
  for (const size of [64, 128, 256, 300, 387, 512, 1024, 2048]) {
    await page.locator('#output-size').fill(String(size));
    rows.push(await inspectDownload(page, info, url, size, 'png', 'image/png', `exact-${size}`));
  }
  await page.locator('#output-size').fill('300');
  for (const [format, mime] of formats.slice(1)) rows.push(await inspectDownload(page, info, url, 300, format, mime, 'shared-300'));
  await attachJson(info, 'custom-size-samples', rows);
});

test('SVG bypasses invalid raster values, clears raster errors and keeps vector round trips', async ({ page }, info) => {
  await encode(page, externalUrl);
  const modules = Number(await page.locator('#qr-image-container canvas').getAttribute('data-modules')), intrinsic = modules + 8;
  let original;
  for (const [index, value] of ['32', '', 'abc', '256', '512', '2048'].entries()) {
    await page.locator('#output-size').fill(value);
    if (index < 3) { await page.locator('#download-button').click(); await expect(page.locator('#output-size-error')).not.toBeEmpty(); }
    const event = page.waitForEvent('download'); await activateDownload(page, 'svg');
    const path = info.outputPath(`independent-${index}.svg`); await (await event).saveAs(path);
    const svg = await readFile(path, 'utf8');
    expect(svg).toContain(`viewBox="0 0 ${intrinsic} ${intrinsic}" width="${intrinsic}" height="${intrinsic}"`);
    original ??= svg; expect(svg).toBe(original);
    await expect(page.locator('#output-size-error')).toBeEmpty(); await expect(page.locator('#output-size')).not.toHaveAttribute('aria-invalid');
    await page.locator('#decode-tab').click(); await choose(page, path, externalUrl);
    await page.locator('#image-drop-zone').drop({ files: path }); await expect(page.locator('#decoded-url')).toHaveValue(externalUrl);
    await page.locator('#encode-tab').click(); await expect(page.locator('#output-size')).toHaveValue(value);
  }
});

test('pending raster export is discarded when size changes, including edit and restore', async ({ page }, info) => {
  await encode(page, externalUrl);
  await page.evaluate(() => {
    window.originalToBlob = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function (callback, type, quality) {
      window.finishExport = () => new Promise(resolve => window.originalToBlob.call(this, blob => { callback(blob); resolve(); }, type, quality));
    };
    window.createdDownloads = 0; const original = URL.createObjectURL;
    URL.createObjectURL = (...args) => { window.createdDownloads++; return original(...args); };
  });
  for (const [format] of formats) {
    for (const next of ['300', 'abc', 'restore']) {
      await page.locator('#output-size').fill('256'); await activateDownload(page, format);
      await expect(page.locator('#download-button')).toHaveAttribute('aria-disabled', 'true');
      await page.locator('#output-size').fill(next === 'restore' ? '300' : next);
      if (next === 'restore') await page.locator('#output-size').fill('256');
      await page.evaluate(() => window.finishExport());
      await expect(page.locator('#download-button')).not.toHaveAttribute('aria-disabled');
      expect(await page.evaluate(() => window.createdDownloads)).toBe(0);
    }
  }
  await page.evaluate(() => { HTMLCanvasElement.prototype.toBlob = window.originalToBlob; });
  await page.locator('#output-size').fill('300');
  await inspectDownload(page, info, externalUrl, 300, 'png', 'image/png', 'recovered-300');
});

test('size field and dense error reflow at desktop 768 375 320 and equivalent 200 percent', async ({ page }, info) => {
  await encode(page, samples[2][1]);
  const snapshots = [];
  for (const width of [1280, 768, 375, 320, 640]) {
    await page.setViewportSize({ width, height: width === 640 ? 450 : 900 });
    if (width === 640) await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    await page.locator('#output-size').fill('128'); await page.locator('#download-button').click();
    await expect(page.locator('#output-size-error')).toHaveText('此 QR Code 至少需要 266 px。');
    const label = await page.locator('label[for="output-size"]').boundingBox();
    const input = await page.locator('#output-size').boundingBox();
    const unit = await page.locator('.output-size-value span').boundingBox();
    expect(label.y + label.height).toBeLessThanOrEqual(input.y);
    expect(input.x + input.width).toBeLessThanOrEqual(unit.x);
    for (const selector of ['.output-size-control', '#output-size-error', '#download-control']) {
      const box = await page.locator(selector).boundingBox(); expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(width);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`size-error-${width}.png`), fullPage: true });
    await page.locator('#output-size').fill('300'); await expect(page.locator('#output-size-error')).toBeEmpty();
    await page.screenshot({ path: info.outputPath(`size-valid-${width}.png`), fullPage: true });
    snapshots.push({ width, label, input, unit });
  }
  await attachJson(info, 'size-reflow', snapshots);
});

// The compact renderer failed all four cases. Keep real file round trips and
// direct jsQR assertions for each of the three white raster formats.
for (const [name, url, total, target, scale, actual] of [
  ['medium97/256', samples[1][1],97,256,3,291],
  ['dense133/300', samples[2][1],133,300,2,266],
  ['near-capacity185/387', samples[3][1],185,387,2,370],
  ['dedicated185/512', samples[3][1],185,512,3,555],
]) {
  test(`previous compact failure recovery ${name}: PNG JPG WebP exact payload`, async ({ page }, info) => {
    await encode(page, url); await page.locator('#output-size').fill(String(target));
    const rows = [];
    for (const [format, mime] of formats) {
      const row = await inspectDownload(page, info, url, target, format, mime, `recovered-${target}-${format}`);
      expect(row.totalModules).toBe(total); expect(row.scale).toBe(scale); expect(row.actualSize).toBe(actual);
      expect(row.decodedPayload).toBe(url);
      await page.locator('#decode-tab').click(); await choose(page, row.path, url);
      rows.push({ ...row, applicationPayload: await page.locator('#decoded-url').inputValue() });
      await page.locator('#encode-tab').click();
    }
    await attachJson(info, 'previous-failure-recovery', rows);
  });
}

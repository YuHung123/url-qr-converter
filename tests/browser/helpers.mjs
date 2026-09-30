import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { expect } from '@playwright/test';
import { byteQrPixels } from '../byte-fixture.mjs';

export const fixture = name => fileURLToPath(new URL(`../fixtures/${name}.png`, import.meta.url));
export const externalUrl = 'https://example.com/independent?source=segno&v=1';
export const unicodeUrl = new URL('https://例子.測試/採訪?q=😀').href;
export async function choose(page, file, expected = externalUrl) {
  await page.locator('#qr-image').setInputFiles(file);
  // Native image loading can exceed Playwright's 5s assertion default on large
  // files. Wait for the application's terminal state, then assert its content.
  await page.waitForFunction(() => document.querySelector('#decoded-url').value || document.querySelector('#decode-error').textContent, null, { timeout: 30_000 });
  if (expected) await expect(page.locator('#decoded-url')).toHaveValue(expected);
  else await expect(page.locator('#decode-error')).not.toBeEmpty();
}
export async function encode(page, input) {
  await page.locator('#url-input').fill(input);
  await page.locator('#generate-button').click();
  await expect(page.locator('#qr-image-container canvas')).toBeVisible();
}
export async function qrFile(page, segments) {
  const pixels = byteQrPixels(segments.map(s => typeof s === 'string' ? new TextEncoder().encode(s) : s));
  const base64 = await page.evaluate(({ data, width }) => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = width;
    const bytes = Uint8ClampedArray.from(atob(data), c => c.charCodeAt(0));
    canvas.getContext('2d').putImageData(new ImageData(bytes, width, width), 0, 0);
    return canvas.toDataURL('image/png').split(',')[1];
  }, { data: Buffer.from(pixels.data).toString('base64'), width: pixels.width });
  return { name: 'payload.png', mimeType: 'image/png', buffer: Buffer.from(base64, 'base64') };
}

// Image variants derive from a committed independent QR and stay in memory.
export async function imageVariant(page, kind) {
  const source = (await readFile(fixture('independent-ascii'))).toString('base64');
  const result = await page.evaluate(async ({ source, kind }) => {
    const bytes = Uint8Array.from(atob(source), c => c.charCodeAt(0));
    const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
    const canvas = document.createElement('canvas');
    let width = 480, height = 480, size = 400, x = 40, y = 40;
    if (kind === 'resized') { width = height = size = 185; x = y = 0; }
    if (['screenshot', 'no-qr', 'photo-jpeg'].includes(kind)) { width = 1200; height = 900; x = 400; y = 250; }
    if (kind === 'large-jpeg') { width = 4000; height = 3000; size = 1600; x = 1200; y = 700; }
    if (kind === 'compressed-large') { width = 6000; height = 4000; size = 1600; x = 2200; y = 1200; }
    if (kind.startsWith('long-screenshot')) { width = 1200; height = 6000; size = kind.endsWith('small') ? 256 : 800; x = (width - size) / 2; y = 4400; }
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (kind !== 'transparent') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, width, height); }
    if (['screenshot', 'no-qr'].includes(kind) || kind.startsWith('long-screenshot')) {
      ctx.fillStyle = '#e6ebe6'; ctx.fillRect(0, 0, width, 90);
      ctx.fillStyle = '#285c49'; ctx.font = '32px sans-serif'; ctx.fillText('Example portfolio', 40, 60);
      for (let row = 130; row < height; row += 65) {
        ctx.fillStyle = '#596760'; ctx.fillRect(40, row, 240 + (row % 250), 8);
        ctx.fillStyle = '#dce2dc'; ctx.fillRect(40, row + 22, width - 100, 6);
      }
      ctx.fillStyle = '#fff'; ctx.fillRect(x - 20, y - 20, size + 40, size + 40);
    }
    if (kind === 'photo-jpeg') {
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, '#c6aa89'); gradient.addColorStop(1, '#725440');
      ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height);
      for (let row = 0; row < height; row += 13) { ctx.fillStyle = '#8e70551a'; ctx.fillRect(0, row, width, 2); }
      ctx.save(); ctx.translate(x + size / 2, y + size / 2); ctx.rotate(0.06); ctx.transform(1, 0.03, 0.07, 1, 0, 0);
      ctx.shadowColor = '#0008'; ctx.shadowBlur = 18; ctx.fillStyle = 'white'; ctx.fillRect(-240, -240, 480, 480);
      ctx.shadowBlur = 0; ctx.drawImage(bitmap, -size / 2, -size / 2, size, size); ctx.restore();
    } else if (kind !== 'no-qr') {
      ctx.save();
      if (kind === 'rotated') { ctx.translate(width / 2, height / 2); ctx.rotate(Math.PI / 12); size = 340; x = y = -170; }
      if (kind === 'skew') ctx.transform(1, 0.04, 0.08, 1, -20, -10);
      if (kind === 'blur') ctx.filter = 'blur(0.6px)';
      ctx.drawImage(bitmap, x, y, size, size); ctx.restore();
    }
    if (['transparent', 'inverted', 'low-contrast'].includes(kind)) {
      const pixels = ctx.getImageData(0, 0, width, height);
      for (let i = 0; i < pixels.data.length; i += 4) {
        const light = pixels.data[i] > 127;
        if (kind === 'transparent' && light) pixels.data[i + 3] = 0;
        if (kind === 'inverted') pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = 255 - pixels.data[i];
        if (kind === 'low-contrast') pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = light ? 220 : 140;
      }
      ctx.putImageData(pixels, 0, 0);
    }
    const mimeType = kind.includes('jpeg') ? 'image/jpeg' : 'image/png';
    const base64 = canvas.toDataURL(mimeType, 0.65).split(',')[1];
    bitmap.close(); canvas.width = canvas.height = 0;
    return { base64, mimeType };
  }, { source, kind });
  return { name: `${kind}.${result.mimeType === 'image/png' ? 'png' : 'jpg'}`, mimeType: result.mimeType, buffer: Buffer.from(result.base64, 'base64') };
}

export async function observeDecode(page) {
  await page.evaluate(() => {
    window.decodeSamples = [];
    let pending;
    document.addEventListener('change', event => {
      if (event.target.id === 'qr-image') pending = { start: performance.now(), name: event.target.files[0]?.name, rasters: [] };
    }, true);
    const get = CanvasRenderingContext2D.prototype.getImageData;
    CanvasRenderingContext2D.prototype.getImageData = function (...args) {
      if (pending) { pending.syncStart ??= performance.now(); pending.rasters.push([this.canvas.width, this.canvas.height]); }
      return get.apply(this, args);
    };
    new MutationObserver(() => {
      const status = document.querySelector('#result-hint').textContent;
      const error = document.querySelector('#decode-error').textContent;
      if (!pending || (!error && (!status || status.includes('正在讀取')))) return;
      window.decodeSamples.push({ name: pending.name, elapsedMs: performance.now() - pending.start,
        syncMs: pending.syncStart ? performance.now() - pending.syncStart : 0,
        rasters: pending.rasters, success: !!document.querySelector('#decoded-url').value, error });
      pending = null;
    }).observe(document.querySelector('#decode-panel'), { subtree: true, childList: true });
  });
}

export async function attachJson(info, name, data) {
  const path = info.outputPath(name + '.json');
  await writeFile(path, JSON.stringify(data, null, 2) + '\n');
  await info.attach(name, { path, contentType: 'application/json' });
}

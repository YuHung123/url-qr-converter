import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import jsQR from 'jsqr';
import qrcode from 'qrcode-generator';
import { fixture, externalUrl, encode, choose, qrFile, imageVariant, observeDecode, attachJson } from './helpers.mjs';

for (const mode of ['encode', 'decode']) {
  test(`accessibility axe: ${mode} initial, error and success`, async ({ page }) => {
    await page.goto('/');
    await page.locator(`#${mode}-tab`).click();
    const scan = async () => {
      const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      expect(result.violations).toEqual([]);
    };
    await scan();
    if (mode === 'encode') {
      await page.locator('#generate-button').click(); await expect(page.locator('#url-error')).not.toBeEmpty();
      await scan(); await encode(page, externalUrl);
    } else {
      await choose(page, { name: 'bad.png', mimeType: 'image/png', buffer: Buffer.from('bad') }, null);
      await scan(); await choose(page, fixture('independent-ascii'));
    }
    await scan();
    if (mode === 'encode') { await page.locator('#download-toggle').click(); await scan(); }
  });
}

test('keyboard tab semantics, focus-visible, hidden panel errors and async live regions', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab'); await expect(page.locator('.skip-link')).toBeFocused();
  await page.keyboard.press('Enter'); await expect(page.locator('#converter')).toBeFocused();
  await page.keyboard.press('Tab'); await expect(page.locator('#encode-tab')).toBeFocused();
  for (const [key, id] of [['ArrowRight', 'decode'], ['ArrowRight', 'encode'], ['End', 'decode'], ['Home', 'encode'], ['ArrowLeft', 'decode']]) {
    await page.keyboard.press(key);
    await expect(page.locator(`#${id}-tab`)).toBeFocused(); await expect(page.locator(`#${id}-tab`)).toHaveAttribute('aria-selected', 'true');
    expect(await page.locator(`#${id}-tab`).evaluate(el => el.matches(':focus-visible') && getComputedStyle(el).outlineWidth === '3px')).toBe(true);
    await expect(page.getByRole('tabpanel')).toHaveCount(1);
  }
  await page.keyboard.press('Tab'); await expect(page.locator('#decode-panel')).toBeFocused();
  await page.keyboard.press('Tab'); await expect(page.locator('#qr-image')).toBeFocused();
  await page.keyboard.press('Shift+Tab'); await expect(page.locator('#decode-panel')).toBeFocused();
  await page.keyboard.press('Tab'); await expect(page.locator('#qr-image')).toBeFocused();
  await choose(page, { name: 'bad.png', mimeType: 'image/png', buffer: Buffer.from('bad') }, null);
  const hiddenError = await page.locator('#decode-error').textContent();
  expect(hiddenError).not.toBe('');
  await page.locator('#encode-tab').click();
  expect(await page.locator('body').ariaSnapshot()).not.toContain(hiddenError);
  await page.locator('#generate-button').click();
  await page.locator('#decode-tab').click();
  expect(await page.locator('body').ariaSnapshot()).not.toContain('請輸入網址。');
  // Finish a genuinely pending decode while its panel is hidden.
  await page.evaluate(() => { const original = window.createImageBitmap; window.createImageBitmap = (...a) => new Promise(resolve => { window.finishHidden = () => original(...a).then(resolve); }); });
  await page.locator('#qr-image').setInputFiles(fixture('independent-ascii'));
  await page.locator('#encode-tab').click(); await page.evaluate(() => window.finishHidden());
  await expect(page.locator('#decoded-url')).toHaveValue(externalUrl);
  expect(await page.locator('body').ariaSnapshot()).not.toContain('已找到網址');
  await expect(page.locator('#encode-tab')).toBeFocused();
});

test('responsive widths, long content, square QR and 200 percent reflow', async ({ page }, info) => {
  await page.goto('/');
  for (const width of [1440, 1280, 768, 375, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.locator('#encode-tab').click(); await encode(page, `https://example.com/${'portfolio-'.repeat(80)}`);
    const box = await page.locator('canvas').boundingBox(); expect(Math.abs(box.width - box.height)).toBeLessThan(1);
    expect(box.width).toBeLessThanOrEqual(width <= 640 ? 200 : 240);
    await page.locator('#download-toggle').click();
    const menu = await page.locator('#download-menu').boundingBox();
    expect(menu.x).toBeGreaterThanOrEqual(0); expect(menu.x + menu.width).toBeLessThanOrEqual(width);
    if ([1440, 320].includes(width)) await page.screenshot({ path: info.outputPath(`menu-${width}.png`), fullPage: true });
    await page.keyboard.press('Escape');
    if ([1440, 320].includes(width)) await page.screenshot({ path: info.outputPath(`encode-${width}.png`), fullPage: true });
    for (const mode of ['encode', 'decode']) {
      await page.locator(`#${mode}-tab`).click();
      if (mode === 'decode') await choose(page, await qrFile(page, [`https://example.com/${'long-path-'.repeat(70)}?q=1`]), `https://example.com/${'long-path-'.repeat(70)}?q=1`);
      if (mode === 'decode' && [1440, 320].includes(width)) await page.screenshot({ path: info.outputPath(`decode-success-${width}.png`), fullPage: true });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      for (const el of await page.locator(`#${mode}-panel input, #${mode}-panel textarea, #${mode}-panel button, #${mode}-panel a`).all()) {
        if (!await el.isVisible()) continue;
        const b = await el.boundingBox(); expect(b.x).toBeGreaterThanOrEqual(0); expect(b.x + b.width).toBeLessThanOrEqual(width);
        if (await el.evaluate(el => el.matches('button, a'))) expect(b.height).toBeGreaterThanOrEqual(44);
      }
    }
    await choose(page, { name: 'bad.png', mimeType: 'image/png', buffer: Buffer.from('bad') }, null);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if ([1440, 320].includes(width)) await page.screenshot({ path: info.outputPath(`decode-error-${width}.png`), fullPage: true });
  }
  // 1280px desktop at 200% browser zoom has a 640 CSS px layout viewport.
  // Also double text size to exercise text enlargement separately.
  await page.setViewportSize({ width: 640, height: 450 });
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  for (const mode of ['encode', 'decode']) {
    await page.locator(`#${mode}-tab`).click();
    if (mode === 'decode') await choose(page, fixture('independent-ascii'));
    else { await page.locator('#download-toggle').click(); await page.keyboard.press('Escape'); }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`${mode}-text-200.png`), fullPage: true });
  }
});

// Separate large-image work so 51 observations plus fixture generation do not
// share one timeout/context. Every case still has three exact-result assertions.
for (const [group, cases] of [
  ['ordinary', ['generated', 'normal', 'resized', 'screenshot', 'jpeg', 'photo-jpeg', 'rotated', 'inverted', 'blur', 'skew', 'transparent', 'low-contrast']],
  ['large', ['large-jpeg', 'compressed-large', 'long-screenshot', 'long-screenshot-small', 'no-qr']],
]) {
test(`independent image corpus ${group}: measured performance/Canvas bounds`, async ({ page, browser }, info) => {
  test.setTimeout(120_000);
  await page.goto('/'); await encode(page, externalUrl);
  const generated = { name: 'm1-generated.png', mimeType: 'image/png', buffer: Buffer.from(await page.locator('canvas').evaluate(c => c.toDataURL().split(',')[1]), 'base64') };
  await page.locator('#decode-tab').click(); await observeDecode(page);
  const sizes = {};
  // Three sequential observations per case; timing is reported, not a flaky speed gate.
  for (const kind of cases) {
    const file = kind === 'generated' ? generated : kind === 'normal' ? fixture('independent-ascii') : await imageVariant(page, kind);
    sizes[kind] = typeof file === 'string' ? null : file.buffer.length;
    for (let repeat = 0; repeat < 3; repeat++) {
      await choose(page, file, ['no-qr', 'low-contrast'].includes(kind) ? null : externalUrl);
      if (['no-qr', 'low-contrast'].includes(kind)) await expect(page.locator('#decode-error')).toContainText('找不到');
    }
  }
  const samples = await page.evaluate(() => window.decodeSamples);
  await attachJson(info, 'performance', { browser: browser.version(), sizes, samples });
  expect(samples).toHaveLength(cases.length * 3);
  if (group === 'large') {
    expect(samples.filter(s => s.name === 'long-screenshot-small.png').every(s => s.success && s.rasters.length === 2 && s.rasters[1][1] === 2048)).toBe(true);
    expect(samples.filter(s => s.name === 'no-qr.png').every(s => s.rasters.length === 2)).toBe(true);
    expect(samples.filter(s => s.name === 'large-jpeg.jpg').every(s => s.rasters.length === 1 && s.rasters[0][0] === 768)).toBe(true);
  }
  for (const sample of samples) for (const [width, height] of sample.rasters) {
    expect(width).toBeLessThanOrEqual(2048); expect(height).toBeLessThanOrEqual(2048);
  }
});
}

test('screen preview density assessment at 240 and 200 CSS pixels', async ({ page }, info) => {
  await page.goto('/'); const rows = [];
  for (const length of [30, 200, 500, 1000, 1800]) {
    const url = 'https://example.com/' + 'a'.repeat(length - 20);
    await encode(page, url);
    const qr = qrcode(0, 'M'); qr.addData(url, 'Byte'); qr.make();
    const modules = qr.getModuleCount();
    if (modules >= 85) await expect(page.locator('#qr-status')).toContainText('QR Code 較密集');
    else await expect(page.locator('#qr-status')).not.toContainText('QR Code 較密集');
    for (const size of [240, 200]) {
      const pixels = await page.locator('canvas').evaluate((canvas, size) => {
        const scaled = document.createElement('canvas'); scaled.width = scaled.height = size;
        const ctx = scaled.getContext('2d'); ctx.imageSmoothingEnabled = false; ctx.drawImage(canvas, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;
        let binary = ''; for (const b of data) binary += String.fromCharCode(b);
        return btoa(binary);
      }, size);
      const code = jsQR(new Uint8ClampedArray(Buffer.from(pixels, 'base64')), size, size);
      rows.push({ length: url.length, modules, version: (modules - 17) / 4, size, pxPerModule: size / (modules + 8), softwareRead: code?.data === url });
      if (length <= 200) expect(code?.data).toBe(url);
    }
  }
  await attachJson(info, 'density', rows);
});

test('text, focus, input boundaries and selected tabs have sufficient contrast', async ({ page }, info) => {
  await page.goto('/');
  const ratios = await page.evaluate(() => {
    const luminance = color => {
      const channels = color.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => v / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
      return channels.reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
    };
    const ratio = (a, b) => (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05);
    const input = getComputedStyle(document.querySelector('#url-input'));
    const hint = getComputedStyle(document.querySelector('#url-hint'));
    const error = getComputedStyle(document.querySelector('#url-error'));
    return { border: ratio(input.borderColor, input.backgroundColor), text: ratio(input.color, input.backgroundColor), hint: ratio(hint.color, 'rgb(255,255,255)'), error: ratio(error.color, 'rgb(255,255,255)') };
  });
  expect(ratios.border).toBeGreaterThanOrEqual(3);
  for (const key of ['text', 'hint', 'error']) expect(ratios[key]).toBeGreaterThanOrEqual(4.5);
  await page.locator('#url-input').focus(); await page.keyboard.press('Tab');
  expect(await page.locator('#generate-button').evaluate(el => el.matches(':focus-visible') && getComputedStyle(el).outlineStyle !== 'none')).toBe(true);
  const indicators = [];
  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const bounds = async () => Promise.all(['encode', 'decode'].map(id => page.locator(`#${id}-tab`).boundingBox()));
    const before = await bounds();
    await page.locator('#encode-tab').focus();
    for (const [key, id] of [['End', 'decode'], ['Home', 'encode']]) {
      await page.keyboard.press(key);
      const selected = page.locator(`#${id}-tab`);
      await expect(selected).toHaveAttribute('aria-selected', 'true');
      await expect(selected).toBeFocused();
      for (const hover of [false, true]) {
        if (hover) await selected.hover();
        else await page.mouse.move(0, 0);
        const indicator = await selected.evaluate(el => {
          const style = getComputedStyle(el);
          const color = style.boxShadow.match(/rgba?\([^)]+\)/)?.[0];
          const luminance = color => color.match(/[\d.]+/g).slice(0, 3).map(Number)
            .map(v => v / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
            .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
          const ratio = background => (Math.max(luminance(color), luminance(background)) + 0.05) / (Math.min(luminance(color), luminance(background)) + 0.05);
          const backgrounds = [style.backgroundColor, getComputedStyle(el.parentElement).backgroundColor, style.borderBottomColor];
          const other = getComputedStyle(el.parentElement.querySelector('[aria-selected="false"]'));
          return { color, backgrounds, ratios: color ? backgrounds.map(ratio) : [], shadow: style.boxShadow,
            otherShadow: other.boxShadow, focus: el.matches(':focus-visible'), outline: style.outlineWidth, offset: style.outlineOffset };
        });
        expect(indicator.shadow).toContain('inset');
        expect(indicator.shadow).toContain('0px -3px 0px');
        expect(indicator.ratios).toHaveLength(3);
        for (const ratio of indicator.ratios) expect(ratio).toBeGreaterThanOrEqual(3);
        expect(indicator.otherShadow).toBe('none');
        expect(indicator.focus).toBe(true);
        expect(indicator.outline).toBe('3px');
        expect(indicator.offset).toBe('4px');
        expect(await bounds()).toEqual(before);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        indicators.push({ width, id, hover, ...indicator });
      }
    }
  }
  await attachJson(info, 'selected-tab-contrast', indicators);
});

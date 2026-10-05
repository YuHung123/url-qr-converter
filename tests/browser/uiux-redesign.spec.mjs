import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { externalUrl, encode, choose } from './helpers.mjs';

test.beforeEach(async ({ page }) => { await page.goto('/'); });

const box = (page, selector) => page.locator(selector).boundingBox();

test('page chrome stays minimal and generate layout adapts between desktop and mobile', async ({ page }) => {
  await expect(page.locator('h1')).toHaveText('URL ↔ QR Code');
  await expect(page.locator('header')).toHaveText('URL ↔ QR Code');
  await expect(page.locator('footer')).toHaveCount(0);
  await expect(page.locator('#url-input')).not.toHaveAttribute('placeholder');
  await expect(page.locator('#qr-placeholder')).toHaveText('尚未產生 QR Code');
  await encode(page, externalUrl);

  await page.setViewportSize({ width: 1280, height: 900 });
  let url = await box(page, '#url-input'), stage = await box(page, '#qr-preview'), options = await box(page, '.output-options');
  let download = await box(page, '.download-split');
  // B5: the URL command row spans the workspace; the matte sits below it with the
  // inspector beside it: settings, then the download pair directly below them
  // (one control group, not pinned to the matte's baseline).
  expect(stage.y).toBeGreaterThan(url.y + url.height);
  expect(options.y).toBeGreaterThan(url.y + url.height);
  expect(options.x).toBeGreaterThan(stage.x + stage.width);
  expect(download.x).toBeGreaterThan(stage.x + stage.width);
  expect(download.y).toBeGreaterThan(options.y + options.height);
  expect(download.y - (options.y + options.height)).toBeLessThanOrEqual(20);
  expect(download.y + download.height).toBeLessThan(stage.y + stage.height - 100);

  for (const width of [375, 320]) {
    await page.setViewportSize({ width, height: 900 });
    url = await box(page, '#url-input'); stage = await box(page, '#qr-preview');
    options = await box(page, '.output-options'); download = await box(page, '.download-split');
    const generate = await box(page, '#generate-button');
    // Mobile shows the QR right after Generate, then its output options and download.
    expect(stage.y).toBeGreaterThan(generate.y + generate.height);
    expect(options.y).toBeGreaterThan(stage.y + stage.height);
    expect(download.y).toBeGreaterThan(options.y + options.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test('errors sit under their controls and the checkbox label has no dead zone', async ({ page }) => {
  await page.locator('#generate-button').click();
  const input = await box(page, '#url-input'), urlError = await box(page, '#url-error');
  expect(urlError.y).toBeGreaterThanOrEqual(input.y + input.height);
  await expect(page.locator('#url-error')).toHaveText('請輸入網址。');
  await expect(page.locator('#url-input')).toHaveAttribute('aria-invalid', 'true');

  await encode(page, externalUrl);
  await page.locator('#output-size').fill('2049'); await page.locator('#download-button').click();
  const size = await box(page, '#output-size'), sizeError = await box(page, '#output-size-error');
  expect(sizeError.y).toBeGreaterThanOrEqual(size.y + size.height);
  await expect(page.locator('#output-size-error')).toHaveText('目標尺寸不得大於 2048 px。');

  const checkbox = page.locator('#transparent-background');
  const control = await box(page, '#transparent-background'), label = await box(page, 'label[for="transparent-background"]');
  expect(label.x).toBeLessThanOrEqual(control.x + control.width + 0.5); // label hit area begins at the checkbox
  await page.mouse.click(control.x + control.width + 2, control.y + control.height / 2);
  await expect(checkbox).toBeChecked();
  await expect(page.locator('#qr-image-container canvas')).toHaveAttribute('data-transparent', 'true');
});

test('decode keeps input left and output right on desktop, stacked on mobile, with errors in the upload field', async ({ page }) => {
  await page.locator('#decode-tab').click();
  // B5 (ED-G): before a result exists only the upload field is drawn; there is no
  // empty URL field or disabled Copy standing in for a result. The field keeps
  // production's tab order (see functional.spec stale decode focus).
  const emptyResult = await box(page, '.decode-result');
  expect(emptyResult.width).toBeLessThanOrEqual(1); expect(emptyResult.height).toBeLessThanOrEqual(1);
  await expect(page.locator('#decoded-url')).toHaveValue('');
  await expect(page.locator('#copy-button')).toBeDisabled();
  await expect(page.locator('#open-link')).toBeHidden();
  let zone = await box(page, '#image-drop-zone'), field;

  await choose(page, { name: 'bad.png', mimeType: 'image/png', buffer: Buffer.from('bad') }, null);
  // The operation error sits in the field's action side, right of the drop sentence.
  const error = await box(page, '#decode-error'), sentence = await box(page, '.upload-cta');
  expect(error.x).toBeGreaterThan(sentence.x + sentence.width);
  expect(error.x).toBeGreaterThanOrEqual(zone.x); expect(error.y).toBeGreaterThanOrEqual(zone.y);
  expect(error.x + error.width).toBeLessThanOrEqual(zone.x + zone.width);
  expect(error.y + error.height).toBeLessThanOrEqual(zone.y + zone.height);

  const longUrl = `https://example.com/${'long-path-'.repeat(40)}?q=1`;
  await page.locator('#encode-tab').click(); await encode(page, longUrl);
  const png = Buffer.from(await page.locator('#qr-image-container canvas').evaluate(c => c.toDataURL().split(',')[1]), 'base64');
  await page.locator('#decode-tab').click();
  await choose(page, { name: 'long.png', mimeType: 'image/png', buffer: png }, longUrl);
  await expect(page.locator('#decoded-url')).toHaveAccessibleName('網址');
  await expect(page.locator('#open-link')).toBeVisible();
  await expect(page.locator('#open-link')).toHaveAccessibleName('開啟連結');
  await expect(page.locator('#result-hint')).toHaveText('已找到網址');
  for (const width of [1280, 768, 375, 320]) {
    await page.setViewportSize({ width, height: 900 });
    zone = await box(page, '#image-drop-zone'); field = await box(page, '#decoded-url');
    const copy = await box(page, '#copy-button');
    if (width >= 768) {
      expect(field.x).toBeGreaterThan(zone.x + zone.width);
      expect(field.x + field.width).toBeLessThanOrEqual(copy.x);
    } else {
      // Mobile: the URL wraps at full width and Copy sits below it.
      expect(field.y).toBeGreaterThan(zone.y + zone.height);
      expect(copy.y).toBeGreaterThanOrEqual(field.y + field.height);
    }
    expect(copy.x + copy.width).toBeLessThanOrEqual(width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(result.violations).toEqual([]);
});

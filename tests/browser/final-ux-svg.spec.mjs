import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { fixture, externalUrl, unicodeUrl, encode, imageVariant, qrFile, attachJson } from './helpers.mjs';

const svgFile = (source, name = 'sample.svg') => ({ name, mimeType: 'image/svg+xml', buffer: Buffer.from(source) });
const base = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="#fff"/>';
const end = '</svg>';

test.beforeEach(async ({ page }) => { await page.goto('/'); });

test('minimal visible copy and accessible upload/result controls', async ({ page }, info) => {
  await expect(page.locator('#url-input')).not.toHaveAttribute('placeholder');
  await expect(page.getByText('可省略 https://')).toHaveCount(0);
  await expect(page.locator('label[for="url-input"]')).toHaveText('網址');
  await encode(page, externalUrl);
  await expect(page.locator('#qr-status')).toHaveText('已產生 QR Code。');
  await expect(page.locator('#qr-status')).toHaveCSS('width', '1px');
  await expect(page.locator('#qr-notice')).toBeEmpty();
  await page.locator('#url-input').fill('example.com/changed');
  await expect(page.locator('#qr-notice')).toHaveText('網址已修改，請重新產生。');
  await page.locator('#decode-tab').click();
  const uploadLabel = page.locator('label[for="qr-image"]');
  await expect(uploadLabel).toBeVisible();
  await expect(uploadLabel).toHaveText('選擇圖片或拖曳到這裡');
  await expect(page.locator('#qr-image')).toHaveAccessibleName('選擇圖片或拖曳到這裡');
  await expect(page.locator('#qr-image')).not.toHaveAttribute('aria-label');
  expect(await page.locator('#qr-image').evaluate(el => Array.from(el.labels, label => label.textContent)))
    .toEqual(['選擇圖片或拖曳到這裡']);
  await expect(page.getByRole('group', { name: 'QR Code 圖片上傳區', exact: true })).toHaveCount(1);
  await expect(page.locator('#image-drop-zone')).toHaveAccessibleName('QR Code 圖片上傳區');
  await expect(page.locator('#qr-image')).toHaveCSS('width', '1px');
  await page.locator('#decode-panel').focus();
  await page.keyboard.press('Tab');
  await expect(page.locator('#qr-image')).toBeFocused();
  await expect(page.locator('#image-drop-zone')).toHaveCSS('outline-width', '3px');
  await expect(page.locator('#image-drop-zone')).toHaveCSS('outline-style', 'solid');
  await attachJson(info, 'upload-accessibility', { snapshot: await page.locator('#image-drop-zone').ariaSnapshot() });
  const chooser = page.waitForEvent('filechooser');
  await page.keyboard.press('Space');
  await (await chooser).setFiles(fixture('independent-ascii'));
  await expect(page.locator('#image-drop-zone')).toContainText('選擇圖片或拖曳到這裡');
  await expect(page.locator('#image-drop-zone')).not.toContainText('未選擇任何檔案');
  await expect(page.locator('#image-drop-zone')).not.toContainText('20 MiB');
  await expect(page.locator('#decoded-url')).not.toHaveAttribute('placeholder');
  await expect(page.locator('#decoded-url')).toHaveAccessibleName('網址');
  await expect(page.locator('#copy-button')).toHaveAccessibleName('複製網址');
  await expect(page.locator('#decoded-url')).toHaveValue(externalUrl);
  await expect(page.locator('#result-hint')).toHaveText('已找到網址');
  // B5 shows the production status line in the result specimen. It is the same
  // live region, so it is exposed exactly once.
  await expect(page.locator('#result-hint')).toBeVisible();
  expect((await page.locator('body').ariaSnapshot()).split('已找到網址').length - 1).toBe(1);
});

test('QR live status shares normal, dense and modified notices without accessible duplicates', async ({ page }, info) => {
  const status = page.locator('#qr-status');
  const notice = page.locator('#qr-notice');
  const modified = '網址已修改，請重新產生。';
  const dense = 'QR Code 較密，建議下載後掃描。';
  const snapshots = [];
  const inspect = async (state, announcement, visibleNotice) => {
    await expect(status).toHaveAttribute('role', 'status');
    await expect(status).toHaveAttribute('aria-atomic', 'true');
    await expect(status).toHaveText(announcement);
    await expect(status).toHaveCSS('position', 'absolute');
    await expect(status).toHaveCSS('width', '1px');
    await expect(status).toHaveCSS('height', '1px');
    await expect(status).not.toHaveAttribute('aria-hidden', 'true');
    await expect(notice).toHaveAttribute('aria-hidden', 'true');
    await expect(notice).toHaveText(visibleNotice);
    if (visibleNotice) await expect(notice).toBeVisible();
    else await expect(notice).toBeHidden();
    expect(await notice.ariaSnapshot()).toBe('');
    await expect(status).toMatchAriaSnapshot(`- status: ${announcement}`);
    const snapshot = await page.locator('body').ariaSnapshot();
    // Count text in the accessible tree, rather than both DOM paragraphs.
    for (const message of [modified, dense]) {
      expect(snapshot.split(message).length - 1).toBe(announcement.includes(message) ? 1 : 0);
    }
    snapshots.push({ state, snapshot });
  };
  await encode(page, externalUrl);
  await inspect('normal', '已產生 QR Code。', '');
  await page.locator('#url-input').fill('example.com/changed');
  await inspect('modified normal', modified, modified);
  await page.locator('#url-input').fill(externalUrl);
  await inspect('restored normal', '已產生 QR Code。', '');
  const denseUrl = `https://example.com/${'a'.repeat(1000)}`;
  await encode(page, denseUrl);
  expect(Number(await page.locator('#qr-image-container canvas').getAttribute('data-modules'))).toBeGreaterThanOrEqual(85);
  await inspect('dense', `已產生 QR Code。 ${dense}`, dense);
  await page.locator('#url-input').fill('example.com/changed-dense');
  await inspect('modified dense', `${modified} ${dense}`, `${modified} ${dense}`);
  await page.locator('#url-input').fill(denseUrl);
  await inspect('restored dense', `已產生 QR Code。 ${dense}`, dense);
  await attachJson(info, 'qr-status-accessibility', snapshots);
});

test('exact image errors have stable copy', async ({ page }) => {
  await page.locator('#decode-tab').click();
  const input = page.locator('#qr-image');
  const error = page.locator('#decode-error');
  await input.setInputFiles(await imageVariant(page, 'no-qr'));
  await expect(error).toHaveText('圖片中找不到 QR Code。');
  await input.setInputFiles({ name: 'unknown.heic', mimeType: 'image/heic', buffer: Buffer.from('unknown') });
  await expect(error).toHaveText('不支援此檔案格式。');
  await input.setInputFiles({ name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('broken') });
  await expect(error).toHaveText('無法讀取這張圖片。');
  await input.setInputFiles({ name: 'huge.png', mimeType: 'image/png', buffer: Buffer.alloc(20 * 1024 * 1024 + 1) });
  await expect(error).toHaveText('圖片檔案過大(上限20MB)');
  await input.setInputFiles({ name: 'huge.svg', mimeType: 'image/svg+xml', buffer: Buffer.alloc(20 * 1024 * 1024 + 1) });
  await expect(error).toHaveText('圖片檔案過大(上限20MB)');
  await page.locator('#image-drop-zone').drop({ files: { name: 'huge.png', mimeType: 'image/png', buffer: Buffer.alloc(20 * 1024 * 1024 + 1) } });
  await expect(error).toHaveText('圖片檔案過大(上限20MB)');
  await page.locator('#image-drop-zone').drop({ files: [fixture('independent-ascii'), fixture('independent-unicode')] });
  await expect(error).toHaveText('一次只能選擇一張圖片。');
  // A valid QR with a non-URL payload is produced by the existing test helper.
  await input.setInputFiles(await qrFile(page, ['Hello World']));
  await expect(error).toHaveText('這個 QR Code 不是網址。');
});

test('generated SVG picker and drag/drop round trip, Copy and Open Link', async ({ page, context, browserName }, info) => {
  const samples = [externalUrl, unicodeUrl, `https://example.com/${'a'.repeat(500)}`];
  if (browserName === 'chromium') await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  for (const [index, url] of samples.entries()) {
    await page.locator('#encode-tab').click();
    await encode(page, url);
    await page.locator('#download-toggle').click();
    const [download] = await Promise.all([page.waitForEvent('download'), page.locator('[data-format="svg"]').click()]);
    const path = info.outputPath(`round-trip-${index}.svg`);
    await download.saveAs(path);
    expect((await readFile(path, 'utf8')).startsWith('<svg')).toBe(true);
    await page.locator('#decode-tab').click();
    await page.locator('#qr-image').setInputFiles(path);
    await expect(page.locator('#decoded-url')).toHaveValue(url);
    await expect(page.locator('#open-link')).toHaveAttribute('href', url);
    if (index === 0) {
      const requests = [];
      await context.route('https://example.com/**', route => { requests.push(route.request().url()); return route.fulfill({ body: 'ok' }); });
      const [popup] = await Promise.all([page.waitForEvent('popup'), page.locator('#open-link').click()]);
      await popup.waitForLoadState();
      expect(requests).toEqual([url]);
      expect(await popup.evaluate(() => window.opener)).toBeNull();
      await popup.close();
      await context.unroute('https://example.com/**');
    }
    await page.locator('#image-drop-zone').drop({ files: path });
    await expect(page.locator('#decoded-url')).toHaveValue(url);
    if (index === 0) {
      await page.locator('#qr-image').setInputFiles({ name: 'misnamed.png', mimeType: 'image/png', buffer: await readFile(path) });
      await expect(page.locator('#decoded-url')).toHaveValue(url);
    }
  }
  await page.locator('#copy-button').click();
  await expect(page.locator('#result-hint')).toHaveText('網址已複製。');
  await expect(page.locator('#open-link')).toHaveAttribute('target', '_blank');
  await expect(page.locator('#open-link')).toHaveAttribute('rel', 'noopener noreferrer');
});

test('malicious and corrupt SVG never reaches DOM, loader or network', async ({ page }) => {
  const requests = [], failures = [], errors = [], consoles = [], navigations = [];
  page.on('request', request => requests.push(request.url()));
  page.on('requestfailed', request => failures.push(request.url()));
  page.on('pageerror', error => errors.push(String(error)));
  page.on('console', message => { if (message.type() === 'error') consoles.push(message.text()); });
  page.on('framenavigated', frame => navigations.push(frame.url()));
  await page.evaluate(() => { window.svgExecuted = false; window.violations = []; document.addEventListener('securitypolicyviolation', e => window.violations.push(e.violatedDirective)); });
  const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
  await page.locator('#decode-tab').click();
  const initialRequests = requests.length;
  for (const malicious of [
    '<script>window.svgExecuted=true</script>',
    '<rect width="1" height="1" fill="#000" onload="window.svgExecuted=true"/>',
    '<image href="https://attacker.invalid/tracker.png"/>',
    '<style>@import url(https://attacker.invalid/style.css)</style>',
    '<?xml-stylesheet href="https://attacker.invalid/style.css"?>',
    '<use href="https://attacker.invalid/payload.svg#x"/>',
    '<foreignObject><div xmlns="http://www.w3.org/1999/xhtml">bad</div></foreignObject>',
    '<image href="data:image/svg+xml;base64,AA=="/>',
    '<a href="javascript:alert(1)"/>',
    '<rect width="100" height="100" fill="url(https://attacker.invalid/a)"/>',
  ]) {
    await page.locator('#qr-image').setInputFiles(svgFile(base + malicious + end));
    await expect(page.locator('#decode-error')).toHaveText('無法讀取這張圖片。');
  }
  for (const source of ['<svg', base + '<path d="M0 0" fill="#000">', base.replace('100 100', '999999 999999') + end,
    base.replace('width="100" height="100"', 'width="999999" height="999999"') + end]) {
    await page.locator('#qr-image').setInputFiles(svgFile(source));
    await expect(page.locator('#decode-error')).toHaveText('無法讀取這張圖片。');
  }
  expect(requests.length).toBe(initialRequests);
  expect(failures).toEqual([]); expect(errors).toEqual([]); expect(consoles).toEqual([]);
  expect(navigations).toEqual([]);
  expect(await page.evaluate(() => ({ executed: window.svgExecuted, violations: window.violations, scripts: document.querySelectorAll('svg script, foreignObject, svg image, svg use').length })))
    .toEqual({ executed: false, violations: [], scripts: 0 });
  expect(await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content')).toBe(csp);
});

test('stale SVG parse cannot overwrite newer raster result', async ({ page }) => {
  await encode(page, externalUrl);
  await page.locator('#download-toggle').click();
  const [download] = await Promise.all([page.waitForEvent('download'), page.locator('[data-format="svg"]').click()]);
  const path = await download.path();
  await page.locator('#decode-tab').click();
  await page.evaluate(() => {
    const original = File.prototype.text;
    File.prototype.text = function () { return new Promise(resolve => { window.finishSvg = () => original.call(this).then(resolve); }); };
  });
  await page.locator('#qr-image').setInputFiles(path);
  await page.locator('#qr-image').setInputFiles(fixture('independent-unicode'));
  await expect(page.locator('#decoded-url')).toHaveValue(unicodeUrl);
  await page.evaluate(() => window.finishSvg());
  await expect(page.locator('#decoded-url')).toHaveValue(unicodeUrl);
});

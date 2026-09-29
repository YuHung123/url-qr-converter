import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';

const read = path => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
const policy = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'none'; object-src 'none'";

test('production artifact has matching CSP, deployment headers and complete notices', async () => {
  const html = await read('dist/index.html');
  // Vite HTML-escapes apostrophes when serializing the injected meta attribute.
  // The browser suite separately checks the parsed attribute against HTTP CSP.
  assert.ok(html.includes(`content="${policy.replaceAll("'", '&#39;')}"`));
  assert.ok(html.includes('http-equiv="Content-Security-Policy"'));
  const headers = await read('dist/_headers');
  assert.equal(headers, await read('public/_headers'));
  assert.ok(headers.includes(`Content-Security-Policy: ${policy}; frame-ancestors 'none'\n`));
  for (const header of ['X-Content-Type-Options: nosniff', 'Referrer-Policy: no-referrer', 'Permissions-Policy: camera=(), microphone=(), geolocation=()']) assert.ok(headers.includes(header));
  const notices = await read('dist/THIRD_PARTY_NOTICES.txt');
  assert.equal(notices, await read('public/THIRD_PARTY_NOTICES.txt'));
  for (const dependency of ['qrcode-generator 2.0.4', 'jsQR 1.4.0', 'MIT License', 'Apache License']) assert.ok(notices.includes(dependency));
});

test('distribution contains only static product assets; runtime dependency and version agreement', async () => {
  const root = await readdir(new URL('../../dist/', import.meta.url));
  assert.deepEqual(root.sort(), ['THIRD_PARTY_NOTICES.txt', '_headers', 'assets', 'favicon.svg', 'index.html']);
  const assets = await readdir(new URL('../../dist/assets/', import.meta.url));
  assert.equal(assets.filter(path => path.endsWith('.js')).length, 1);
  assert.equal(assets.filter(path => path.endsWith('.css')).length, 1);
  assert.equal(assets.length, 2, 'no source maps, fixtures, tests or scratch files');
  const pkg = JSON.parse(await read('package.json'));
  const lock = JSON.parse(await read('package-lock.json'));
  assert.deepEqual(pkg.dependencies, { jsqr: '1.4.0', 'qrcode-generator': '2.0.4' });
  assert.equal(lock.version, pkg.version); assert.equal(lock.packages[''].version, pkg.version);
  assert.deepEqual(Object.entries(lock.packages).filter(([key, value]) => key && !value.dev).map(([key]) => key).sort(), ['node_modules/jsqr', 'node_modules/qrcode-generator']);
});

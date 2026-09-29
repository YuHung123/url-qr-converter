# QR fixtures

Two small PNGs are generated with **Segno 1.6.6**, an encoder independent of the
application's qrcode-generator. Both use ordinary QR (not Micro QR), Byte mode,
UTF-8, error correction M, scale 8 and a four-module border. Error correction
boosting is disabled. They contain only reserved example URLs:

- `independent-ascii.png`: `https://example.com/independent?source=segno&v=1`
- `independent-unicode.png`: `https://例子.測試/採訪?q=😀` (raw UTF-8; the app normalizes it)

Regenerate optionally with Python and `python -m pip install segno==1.6.6`, then
`python tests/fixtures/generate.py`. Browser tests use the committed PNGs and do
not require Python or Segno. Source: <https://github.com/heuer/segno> (BSD-3-Clause).
No Segno source is redistributed in this repository or the production bundle.
These project-generated test images may be used, copied, modified and distributed
without restriction; they contain no third-party artwork or private information.

`tests/browser/helpers.mjs` derives resized, JPEG, screenshot, simulated desktop
photo, 15-degree rotation, inversion, 0.6px blur, affine skew, transparency, low
contrast (140/220 gray), large and long screenshot samples at runtime. These are
controlled simulations, not real camera photographs. Negative byte-segment QR
cases use the existing `tests/byte-fixture.mjs` helper. No generated corpus goes
into `dist/`; browser output stays in ignored `test-results/`.

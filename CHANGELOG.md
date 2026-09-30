# Changelog

## 1.1.0

- Streamline the interface, remove header/footer copy and reduce the QR preview size.
- Accept scheme-less URLs with HTTPS by default and generate with Enter.
- Preserve the displayed QR and its downloads while editing the URL.
- Add a keyboard-accessible split download menu for PNG, SVG, JPG and WebP.
- Accept dragged QR images through the existing image validation and decode pipeline.
- Redesign decoded-link actions with a copy icon and explicit Open Link in a protected new tab.

## 1.0.1

- Fix Windows fresh-clone release test reproducibility and enforce LF deployment headers.
- Improve the selected-tab visual indicator.
- Remove a redundant ARIA naming attribute.

## 1.0.0

- Convert HTTP/HTTPS URLs to QR codes and download lossless PNGs.
- Read URLs from QR images and copy them to the clipboard.
- Process URLs and images locally, without uploads, tracking or application storage.
- Establish strict CSP and static deployment headers, keyboard accessibility, cross-browser regression tests and accessibility checks.

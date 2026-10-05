# Changelog

## 1.1.0 (unreleased)

- Refresh the interface with a light visual system, a soft restrained colour wash, a serif `URL ↔ QR Code` title with a thin arrow and QR crop marks, and framed URL → QR / QR → URL tabs. The QR preview sits on an artboard over a matte surface, with Download directly below the settings and a downward-opening format menu; fonts remain local.
- Add PNG/JPG/WebP target sizes from 64–2048 px (default 256 px), snapped to the nearest legal actual size with uniform integer pixels per module, four quiet-zone modules and a QR-specific minimum; SVG remains independent. Valid size edits update the responsive preview and its actual pixel dimensions.
- Add transparent PNG/WebP/SVG backgrounds and a preview-only checkerboard; disable JPG while transparency is enabled. Export PNG, SVG, JPG and WebP through a keyboard-accessible split download menu.
- Simplify decoding with a split upload field and one decoded URL in a clear result surface, with Copy and explicit Open Link actions. Accept dragged QR images through the same validation and decode pipeline as file selection.
- Show uploaded images after the decoder has turned them into pixels, including no-QR and non-URL results. Raster previews use the browser bitmap decoder; SVG previews use only the restricted parser's rasterized output. Raw SVG never reaches the DOM or an image loader, and stale uploads cannot replace newer previews.
- Accept scheme-less URLs with HTTPS by default and generate with Enter. Preserve the displayed QR and its downloads while editing the URL or after a failed Generate.
- Decode safe static SVG QR images, including this tool's SVG exports, through the existing pixel and URL validation pipeline.
- Keep responsive layouts, 44 px control targets, visible keyboard focus, shared checkbox/label hit targets, text reflow at 200 %, and live announcements. Preserve functional and security behaviour, including HTTP(S)-only URL validation, protected new-tab navigation and local processing without uploads or application storage.

## 1.0.1

- Fix Windows fresh-clone release test reproducibility and enforce LF deployment headers.
- Improve the selected-tab visual indicator.
- Remove a redundant ARIA naming attribute.

## 1.0.0

- Convert HTTP/HTTPS URLs to QR codes and download lossless PNGs.
- Read URLs from QR images and copy them to the clipboard.
- Process URLs and images locally, without uploads, tracking or application storage.
- Establish strict CSP and static deployment headers, keyboard accessibility, cross-browser regression tests and accessibility checks.

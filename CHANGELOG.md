# Changelog

## 1.1.0 (unreleased)

- Redesign the full interface around an ink-and-paper visual language: an ultramarine title band with faint QR geometry, a paper workspace with raised mode tabs, a URL command bar, a dotted light-table QR stage with a redrawn empty-state motif, an output rail with an ink split download, and a scan-frame → result layout for decoding; one centralized token system, local fonts only.
- Show the uploaded image inside the scan frame once the existing decoder has turned it into pixels (including no-QR and non-URL results). Raster previews use the same browser bitmap call; SVG previews use only the restricted parser's rasterized output. Raw SVG never reaches the DOM or an image loader, and stale uploads cannot replace a newer preview.
- Keep responsive and accessible presentation: mobile flows URL → Generate → QR → settings → download and image → result, controls keep 44 px targets and visible focus, the checkbox and its label share one hit target, and text reflows at 200 %.
- Make the preview follow valid raster size edits, with responsive sizing and pixel dimensions.
- Snap target sizes to the nearest legal actual size with uniform integer pixels per module and four quiet-zone modules, correcting dense QR decoder compatibility.
- Add transparent PNG/WebP/SVG backgrounds and a preview-only checkerboard; disable JPG while transparency is enabled.

- Add PNG/JPG/WebP target sizes from 64–2048 px (default 256 px), with module-aligned actual dimensions and a QR-specific minimum; SVG remains independent.

- Streamline the interface, remove header/footer copy.
- Accept scheme-less URLs with HTTPS by default and generate with Enter.
- Preserve the displayed QR and its downloads while editing the URL.
- Add a keyboard-accessible split download menu for PNG, SVG, JPG and WebP.
- Accept dragged QR images through the existing image validation and decode pipeline.
- Redesign decoded-link actions with a copy icon and explicit Open Link in a protected new tab.
- Simplify visible field labels, upload controls, status text and image error messages while preserving live announcements.
- Decode safe static SVG QR images, including SVG files downloaded from this tool, through the existing pixel and URL validation pipeline.

## 1.0.1

- Fix Windows fresh-clone release test reproducibility and enforce LF deployment headers.
- Improve the selected-tab visual indicator.
- Remove a redundant ARIA naming attribute.

## 1.0.0

- Convert HTTP/HTTPS URLs to QR codes and download lossless PNGs.
- Read URLs from QR images and copy them to the clipboard.
- Process URLs and images locally, without uploads, tracking or application storage.
- Establish strict CSP and static deployment headers, keyboard accessibility, cross-browser regression tests and accessibility checks.

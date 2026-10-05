# URL QR Converter v1.1.0 Final Release Security Audit

**Date:** 2026-10-05
**Audit subject:** branch `audit/v1.1.0-rc`, candidate commit `cec3c82e17c9f1fef4b3de2eb7ccc9f2a4b4b7f5`
**Environment:** Claude Code on the web (Linux container, Node v22.22.0, npm 10.9.4, Playwright 1.63.0)
**Type:** Independent final security and release audit. Audit only: no fixes, no release actions.

---

## 1. Executive Summary

The v1.1.0 candidate keeps the security model it claims. It is static and client-side only. It makes no runtime network requests beyond its own four same-origin assets. It stores nothing, and user data cannot be exfiltrated.

I re-derived each security boundary from source and probed it independently:

- **URL schemes:** Generate, Decode and Open Link all go through `normalizeUrl()`, which returns only `http:` or `https:` hrefs. 77 hand-picked hostile and edge inputs were tested; every accepted output is HTTP(S).
- **Open Link:** opens only on explicit click, with `opener === null`, an empty `document.referrer` and no `Referer` header. It is cleared on every new file, and stale decodes cannot retarget it.
- **SVG input:** never reaches `DOMParser`, the DOM or an image loader. The parser is a fail-closed allow-list grammar that draws to canvas only. 60+ attack inputs were rejected, with one known, harmless exception (M-1).
- **Decoded payloads:** fatal UTF-8 validation runs per Byte segment. Invalid bytes, NUL and dangerous schemes inside QR payloads never become an active link.
- **Target size:** geometry is exact. All 73,394 version × target combinations produce uniform integer modules, a 4-module quiet zone, the nearest legal size and the 2048 ceiling.
- **Exports:** all four formats round-trip. Transparency is correct in PNG, WebP and SVG, and JPG is disabled while transparency is on. Exported SVG is strict static geometry.
- **B5 UI port:** presentation-only. There is no inline script or style, no CSP change, no remote font or asset, and no `innerHTML`-type sink.

**No Blocker and no Important findings.** There are 6 Minor findings, all non-blocking: two carried over from the previous SVG audit, and four documentation, hygiene or cosmetic items.

**Main limitation:** the network policy blocked downloading Playwright's Firefox and WebKit, so only the **Chromium** project ran here (77/77). Before tagging, the full three-browser suite must be run outside this container (ME-1).

## 2. Final Decision

# PASS_WITH_NOTE

This is conditional on ME-1: the Firefox and WebKit Playwright projects (expected 77 + 77) must pass on this same candidate before `v1.1.0` is tagged. Minor items M-1 to M-6 are not release-blocking.

## 3. Scope

**Covered:**
- Production source: `index.html`, `src/*.ts`, `src/styles.css`.
- Configuration: `public/_headers`, `vite.config.ts`, `tsconfig.json`, `playwright.config.mjs`, `package.json`, `package-lock.json`.
- All Node, browser and release tests.
- Release docs: README, CHANGELOG, RELEASE_CHECKLIST, the B5 and V1_1 reports.
- The built `dist/`.
- Runtime behaviour in Chromium.

**Not covered:** real devices, real Safari, real screen readers, and the live deployment host (see §26).

## 4. Audit Baseline

| Item | Value |
| --- | --- |
| Branch | `audit/v1.1.0-rc` (tracks `origin/audit/v1.1.0-rc`), clean working tree at start |
| HEAD | `cec3c82` "chore: snapshot v1.1.0 audit candidate" (author YuHung123, 2026-10-05) |
| `origin/main` | `babe1c2` (docs: v1.0.1 pre-push audit) |
| `v1.0.0` | annotated tag object `0c41a74` → commit `47600c5` |
| `v1.0.1` | annotated tag object `1e5f113` → commit `214cea3` |
| `v1.1.0` | **does not exist** (local or remote `git ls-remote --tags`) |
| Relationship | `v1.0.1 (214cea3) → babe1c2 → 523dc4f → 0d2f7ad → 0fde32f → bdda712 → da4f4ab → cec3c82`, a linear descendant of v1.0.1 |
| Delta vs v1.0.1 | 45 files, +14,813 / −333 (`git diff --stat v1.0.1..HEAD`) |

`cec3c82` is a squash snapshot. It contains the custom-output-size, target-size geometry, transparent-background, functional-freeze and B5 rounds together (31 files). B5 changes therefore cannot be isolated from history alone. Because of this, I reviewed the **entire current** `main.ts`, `index.html` and `styles.css`, not just a claimed B5 slice.

Unchanged since v1.0.1, confirmed by an empty `git diff v1.0.1..HEAD`: `vite.config.ts` (meta CSP), `public/_headers`, `playwright.config.mjs`, `tsconfig.json`.

## 5. Audit Method

1. Recorded the Git baseline: status, log, tags, `ls-remote`, diff and stat against v1.0.1, and per-commit stats.
2. Read every production file line by line, all modified tests (as diffs against v1.0.1 and `bdda712`), and the release docs.
3. Ran `npm ci` from the lockfile, then typecheck, Node tests, build, artifact tests, `npm audit`, `npm ls` and `git diff --check`.
4. Ran the browser suite with the repo config (retries 0, workers 1, real `dist`, deployment headers). Only Chromium ran (§24).
5. Ran independent temporary probes from the session scratchpad. None were committed:
   - Node probes: `normalizeUrl` (77 inputs), `parseSafeSvg` (66 inputs plus timing), and exhaustive target-size geometry.
   - Chromium probes on a separate port (4174) serving `dist` with the parsed `_headers`. These covered decode payloads, Open Link, malicious and mislabeled uploads, size boundaries, image bombs, stale races, the decode-empty keyboard state, exports and transparency, draft separation, menu keys, clipboard, storage, CSP and network.
   - All non-local requests were intercepted at the browser-context level, so no probe traffic reached the internet.
6. Cleaned up: the probe server was stopped, and the temporary wrapper config and `test-results/` were deleted.

## 6. Repository Integrity

- **Tracked files (69):** source, tests, configuration, docs, `public/` (favicon, `_headers`, THIRD_PARTY_NOTICES) and two fixture PNGs (450 B and 387 B). No other binaries.
- **Not tracked:** `node_modules`, `dist`, `test-results`, ZIP files, screenshots, `design-exploration/`, `production-b5-review/`, `.env` and editor metadata. `.gitignore` covers these.
- **Secrets scan** (`git grep` for api key, secret, token, password, private-key headers, `ghp_`, `sk-`, `AKIA`, `xox`): no credentials. The only hits are prose and a test string (`localhost:password@evil.test`).
- **Local paths:** a machine-specific Windows checkout path (redacted as `<repo>`) appears in several tracked verification reports. Some date from v1.0.x (already public on `main`); five new v1.1 reports add more. None are in `dist`, and they are not secret (M-6).
- **Commit identity:** the only author/committer email is `yuhung0516@gmail.com`.
- **`git diff --check`:** clean for the working tree. `git diff --check v1.0.1..HEAD` reports one trailing-whitespace line in `tests/browser/output-preview-transparent.spec.mjs:68` (M-4).

## 7. v1.1.0 Delta Review

### `src/main.ts` (whole file reviewed)

- **DOM writes:**
  - Text goes only through `textContent` or `.value`.
  - Attributes are set with `setAttribute` using fixed strings, plus `aria-label` built from the normalized URL. Attribute context makes this safe.
  - Elements are added with `replaceChildren(canvas)`.
  - There is no `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `eval` or `Function` anywhere in `src/`. The same grep against `dist/assets/*.js` finds none.
- **`notice.dataset.tone`** (line 206) is the only B5-specific logic. It sets a data attribute to `warning` or `info` and is used purely by CSS.
- **Upload preview** (`renderUploadPreview`, lines 337–378) draws only through `createImageBitmap(file)` (raster signatures) or `parseSafeSvg(...).draw` onto a new `<canvas>`. It runs only after `decodeImage` proved rasterization (`success`, `no-qr` or `unsupported-url`). Stale generations are discarded and their canvas is zeroed (lines 385–388).
- **Download:**
  - The filename is the constant `qr-code.${format}`, where `format` comes from fixed `data-format` attributes or the literal `'png'`. No user-controlled path or name exists.
  - The blob URL is revoked after 60 s.

### `index.html`

- There is no inline `<script>`, no `style=` attribute and no event-handler attribute (0 occurrences in `dist/index.html`). The only script is the hashed same-origin module.
- **Title (TW-11/TW-13):** `<span>URL</span><span class="visually-hidden"> ↔ </span><svg aria-hidden="true">…</svg><span>QR Code</span>`. The H1 accessible name stays "URL ↔ QR Code" (verified by `uiux-redesign.spec`). The arrow is a static inline SVG with no script surface. Crop marks are CSS pseudo-elements on `.t-qr`.
- **Structure:** tabs gain decorative `aria-hidden` SVG icons. Panels and controls are regrouped, but every id, role, label and ARIA relationship from v1.1-pre-B5 is kept. Copy now carries a visible `<span class="copy-text">複製網址</span>` that matches its `aria-label`, so label-in-name holds.
- **`#decode-error`** moved before the result in the DOM. This changes reading order, but its role and `aria-describedby` are unchanged.

### `src/styles.css` (942 lines)

- No `url(`, `@import`, `@font-face` or `http` reference. Font stacks name only local fonts (Sitka, Iowan, Charter, Georgia, Segoe UI, system-ui, Noto Sans TC, …).
- The hatch texture uses `repeating-linear-gradient`, not a `data:` image (comments at lines 49–51 acknowledge `img-src 'self'`).
- **Generated `選擇圖片`** (`.decode-layout::after`, lines 612–631):
  - It is `pointer-events: none`, so clicks reach the native `<label for="qr-image">` beneath. It is not a trap.
  - `content: "選擇圖片" / ""` gives it empty alt text, so assistive technology does not read it twice.
  - The single-value fallback line applies only in engines without CSS alt-text support (F-5).
- **Download menu:** opens downward. This is a pure geometry change. My probe confirmed the menu's y-position is at or below the toggle's bottom edge, with identical keyboard behaviour (§18).
- **Visible status (`#result-hint`)** and **framed tabs** are styling only. The live region and DOM node are the same.
- `prefers-reduced-motion` turns off all transitions and animations. `forced-colors` restores borders, the checkbox and the selected-tab indicator.

**Conclusion:** the B5 port did not introduce any unsafe sink, network or asset dependency, CSP need, inline workaround, or behavioural or security state change.

## 8. Modified-Test Review

I inspected the actual diffs, not the report's description.

| # | Test | Change | Verdict |
| --- | --- | --- | --- |
| 1 | `uiux-redesign` · generate layout (Download position) | The file is new in this candidate; there is no tracked R2 version to diff. Current assertions: settings to the right of the stage, Download below settings with a gap ≤ 20 px and well above the stage bottom; mobile order URL → Generate → stage → options → download; no horizontal scroll. | **Genuine B5 geometry.** Still asserts placement, order and reflow. |
| 2 | `uiux-redesign` · decode empty | The empty `.decode-result` box is ≤ 1 px, `#decoded-url` is `''`, Copy is disabled and Open Link is hidden. Error is inside the zone. Copy is right of the URL at ≥ 768 px and below it on mobile. axe wcag2a/2aa/21aa has zero violations. | **Genuine B5 geometry.** The functional state assertions are kept. The keyboard reveal is covered by `functional.spec` ("stale decode…": Tab reaches `#decoded-url`). I also verified it independently (§19). |
| 3 | `quality` · selected tab | The indicator changed from an inset box-shadow to a 2px `border-bottom`. It is still checked for 3 contrast ratios ≥ 3:1: against the tab background, the page wash and the unselected tab background. The old third comparison (indicator vs its own border colour) is replaced by unselected-surface contrast plus `otherColor !== color`. Focus outline 3px with 4px offset and the no-layout-shift check are unchanged. | **Not weakened.** The threshold (3) and count (3) are identical. The comparison set is arguably more meaningful. |
| 4 | `final-ux-svg` · status | The `width: 1px` (visually hidden) assertion was replaced by "visible" plus "the aria snapshot contains `已找到網址` exactly once". | **Not weakened.** The new assertion adds a duplicate-announcement guard. |

Other test diffs in the snapshot come from the v1.1 size and transparency rounds:
- `canvas` became `#qr-image-container canvas`.
- `≥ 1024 px` became `expectedRasterSize(...)`.
- The export test was extended with exact per-pixel matrix comparison, PNG = canvas, intrinsic SVG size and a 4-sample matrix.
- The 20 MB copy changed (an accepted product decision).
- The pending-bitmap index shifted because the preview requests one more bitmap.

These replace a loose lower bound with exact equality, or add coverage.

**Unchanged against v1.0.1:**
- `playwright.config.mjs` (`retries: 0`, `workers: 1`, `timeout: 60_000`, three projects).
- The `test.setTimeout(120_000)` corpus test and the 30 s helper wait, both already present in v1.0.1.
- axe tags `wcag2a/wcag2aa/wcag21aa`, with no `disableRules`.
- Contrast thresholds of 4.5 (text) and 3 (non-text).
- No `test.skip`, `.only` or `.fixme` anywhere.

The 44 px button and link height check was **added** in v1.1 (`quality.spec` line 83). Its `isVisible()` skip only excludes collapsed elements, and the same loop runs in the decode success state.

**Conclusion:** the four changed assertions represent R2 → B5 geometry. I found no relaxed accessibility, correctness, retry, coverage or timeout assertions.

## 9. CSP and Deployment Headers

| Directive | Meta (`dist/index.html`) | `_headers` | Runtime need |
| --- | --- | --- | --- |
| default-src | 'none' | 'none' | — |
| script-src | 'self' | 'self' | One hashed module only |
| style-src | 'self' | 'self' | One hashed CSS file; no `style=` attributes; the JS sets no inline styles (`grep .style.` finds 0) |
| img-src | 'self' | 'self' | favicon only; previews are `<canvas>`; no data: or blob: images |
| connect-src | 'none' | 'none' | none |
| object-src | 'none' | 'none' | — |
| base-uri | 'none' | 'none' | — |
| form-action | 'none' | 'none' | No forms |
| frame-ancestors | (not valid in meta) | 'none' | Header only |

Other headers: `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, and `<meta name="referrer" content="no-referrer">`.

**Runtime evidence (Chromium, `dist` served with the parsed `_headers`):**
- The served response carries the full header CSP, and the meta CSP is identical apart from `frame-ancestors`.
- A full flow produced **zero** `securitypolicyviolation` events: generate, resize, transparency toggle, 4 downloads plus an extra SVG, decode, Copy, SVG round-trip, and a malicious `xml-stylesheet` SVG.
- Only the four expected requests occurred: `/`, the JS, the CSS and `favicon.svg`. There were no console errors or warnings.
- The only `fetch(` in the bundle is Vite's modulepreload polyfill. It acts only on `link[rel=modulepreload]`, of which there are none, and was never called at runtime (instrumented).
- No `unsafe-inline`, `unsafe-eval`, remote font, CDN, analytics endpoint or external stylesheet is needed.

## 10. URL Normalization and Scheme Safety

Source: `src/qr.ts:3-39` (`normalizeUrl`), used by Generate (`main.ts:223`), Decode (`decode.ts:31`) and therefore Open Link (`main.ts:426`, which assigns only `result.url` from a `success`).

How the function enforces the boundary:
1. It trims, then rejects any remaining C0, space, DEL or Unicode `\s` (line 7).
2. It detects an explicit scheme and rejects anything other than `http` or `https` (lines 13–17). The only exception is `localhost[:port]`, which is never treated as a scheme.
3. Scheme-less input must look like `host.tld…` or `[`.
4. It parses with WHATWG `URL`, requires a `http:` or `https:` protocol and an explicit `//`, and checks hostname characters.
5. It returns `url.href`, which is ASCII (punycode or percent-encoded).

Probe results (77 inputs):
- **Accepted, as expected:** `https://`, `http://`, bare domain, `www.`, path, query, fragment, Unicode host and path (to punycode/percent), `localhost`, `localhost:3000`, IPv4, IPv4:port, `[::1]`, `[::1]:8080`, explicit-scheme ports, mixed-case `HTTPS://`.
- **Rejected:**
  - Dangerous and unsupported schemes: `javascript:`, `JaVaScRiPt:`, ` javascript:`, `data:`, `file:`, `blob:`, `mailto:`, `ws:`, `wss:`, `vbscript:`, `ftp:`.
  - Embedded control and whitespace tricks: `java\tscript:`, `java\nscript:`, `\0javascript:`, interior NUL.
  - Malformed slash forms: `https:/x`, `https:x`, `http:\\x`.
  - Relative or word input: `//x`, `/path`, `?q`, `#x`, `word`.
  - Encoded or entity scheme tricks: `javascript%3A…`, `https%3A//…`, `javascript&colon;…`.
  - Prefix and port abuse: `localhost:3000@evil.com`, `localhost:javascript:1`, `localhost:99999`, `:65536`, `exa%20mple.com`.
- **Every accepted output starts with `http://` or `https://`.**
- **Documented behaviours, not defects:** userinfo (`https://google.com@evil.com`) is accepted and shown in full (F-1). `example.com:8080` without a scheme is rejected; README says to type the scheme for non-local hosts with a port (F-4).

## 11. Open Link

Source: `index.html:95` has `<a target="_blank" rel="noopener noreferrer" hidden>` with no `href`. `main.ts:398-404` hides it and removes `href` at the start of every `readImage`. `main.ts:423-427` sets `href = result.url` only on `success`. There is no `window.open` and no programmatic `click()` on it.

Runtime probe (Chromium):
- **No automatic navigation:** decoding a valid URL caused zero external requests, and the page URL was unchanged.
- **Attributes:** `target="_blank"`, `relList ["noopener","noreferrer"]`.
- **Replacing the file updates the target:** decoding A then B left `href` and value equal to B. The popup opened B.
- **Popup:** `window.opener === null` is **true** and `document.referrer` is `""`. The intercepted navigation request had **no `Referer` header**.
- **Stale result cannot open the wrong URL:** A's bitmap was delayed 1.5 s while B decoded immediately. The final value and `href` were B.
- **Invalid content cannot activate the link:** a `javascript:` QR after a valid result hid the link and set `href` to null. All 17 dangerous or invalid payloads in §14 left the link hidden.

## 12. Uploaded Image / Decode Pipeline

Source: `src/decode.ts:42-115` and `main.ts:393-441`.

**Limit:**
- `file.size > 20 * 1024 * 1024` is checked first, before any read.
- Probe: exactly 20 MiB is processed and decodes; 20 MiB + 1 gives `圖片檔案過大(上限20MB)`. Both file chooser and drag-and-drop take this path (tests).
- The user-facing "20MB" wording against the internal 20 MiB limit is an accepted product decision recorded in `V1_1_FUNCTIONAL_FREEZE_FINALIZATION.md` §4. No change is recommended.

**Type handling:**
- The first 512 bytes are sniffed: an SVG start tag, and PNG, JPEG, WebP, GIF and BMP signatures. Otherwise the declared MIME type or extension must be known, or the result is `unsupported-format`.
- SVG (sniffed, or declared and not a raster signature) goes **only** to `parseSafeSvg`. Everything else goes to `createImageBitmap(file)`.

**Probe matrix (Chromium):**

| Input | Result |
| --- | --- |
| PNG, JPEG, WebP QR | decoded |
| PNG, JPEG, WebP mislabeled as `.gif` / `image/gif` | decoded (signature sniff) |
| Corrupt PNG, JPEG, WebP | `無法讀取這張圖片。` |
| `.txt`, extensionless text | `不支援此檔案格式。` |
| SVG with `<script>` | rejected by the parser |
| SVG with `onload`, external `<image>` and `<script>`, labeled `.png` | `無法讀取這張圖片。`, 0 requests, no dialog |
| Comment-first SVG labeled `.png` | rejected, 0 requests |
| SVG with `@import` labeled `.jpg` | rejected, 0 requests |
| HTML with `onerror`/`<script>` labeled `.png` | rejected, no dialog |
| DOCTYPE with external entity | rejected |
| Decompression bomb, 16384² PNG (55 KB file) | decoded in 2.1 s, `no-qr`, tab alive |
| Decompression bomb, 30000² PNG (151 KB file) | `無法讀取這張圖片。` in 49 ms, tab alive |

- Mislabeled SVG reaches `createImageBitmap` only as a Blob image. Even where an engine supports that, SVG-as-image disables scripts and external loads. Chromium rejects it.
- After every malicious upload the DOM had **no** `svg script`, `svg image`, `foreignObject`, `img`, `iframe`, `object` or `embed` element, and the upload preview had no children.

**Resource bounds:**
- Canvas is ≤ 2048 on the longest side, using the staged 768 → 2048 retry.
- SVG is ≤ 1,000,000 characters, ≤ 10,000 shapes and ≤ 2048 units per dimension.
- There is no pixel-dimension cap before raster decode. README line 91 documents this (F-3).

**Race and stale protection:**
- A monotonically increasing `decodeGeneration`, plus `isCurrent()` checks after header read and before canvas work, and a `stale` result kind.
- The preview path re-checks the generation and zeroes discarded canvases.
- Probe (§11) and tests (`functional` stale decode, `final-ux-svg` stale SVG, `uploaded-preview` late preview) confirm the newest file wins.

**Cleanup:**
- `bitmap.close()` and `canvas.width = canvas.height = 0` in `finally`.
- `imageInput.value = ''` so the same file can be chosen again.
- Preview canvases are zeroed on replacement.

**Locality:** decoding performs no network, storage or worker activity. The probe showed only the four static GETs.

## 13. SVG Parser

`src/svg.ts` (75 lines), read line by line.

**Boundary:** the input string is matched by regular expressions against a tiny grammar and turned into `{rect | path}` records. Drawing uses `CanvasRenderingContext2D.fillRect` or `fill(new Path2D(d))` on an off-DOM canvas. The source is never given to `DOMParser`, `innerHTML`, `<img>`, `Image`, `createImageBitmap`, `object` or a blob or data URL. The comments on lines 1–2 and 34–35 match the code.

**Grammar:**
- Optional single leading `<?xml…?>` (line 37).
- Root (line 38): exactly
  ```
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 W H" width="W" height="H"[ shape-rendering="crispEdges"]>BODY</svg>
  ```
  followed by end-of-string. Double quotes only, fixed attribute order and lowercase. `width` and `height` must equal the viewBox values.
- Body loop (lines 46–60): each item must be exactly
  - `<rect [x=""][y=""] width="" height="" fill=""/>`, or
  - `<path d="" fill=""/>`.
  Nothing else is accepted: no text, comments, children, other attributes or open/close pairs.
- Numbers match `^(?:\d+(?:\.\d+)?|\.\d+)$`. There are no signs, exponents, hex, `Infinity` or `NaN`.
  - Dimensions must be in (0, 2048].
  - Coordinates must be ≥ 0 and ≤ 2048.
- Path `d` must match `^[MmLlHhVvZz0-9.,+\-\s]+$`, so only straight-line commands are allowed: no arcs, curves or letters such as `e`. Length ≤ 1,000,000.
- Fill must be `#000`, `#000000`, `black`, `#fff`, `#ffffff` or `white`. Anything else, including `url(...)` or `currentColor`, throws.
- Limits: 1,000,000 source characters, 10,000 shapes, and the document must contain at least one shape.

**Fail-closed:** any non-match throws. `decodeImage` maps throws to `invalid-image`, and the preview maps them to "no preview".

**Probe (66 inputs, plus a real-UI subset):**
- **Rejected:**
  - Executable or styling content: `<script>`, `onload` on the root or a path, `onclick`, `<image>`, `<use>`, `xlink:href`, `<foreignObject>`, `<style>`, the `style` attribute, `fill="url(...)"`.
  - Markup tricks: DOCTYPE and entity, `&x;`, a PI inside the body, comments, CDATA, a second root, trailing `<script>` or text, leading junk, an injected `</svg><svg>`.
  - Namespace tricks: XHTML xmlns, `svg:` prefix, extra `xmlns:xlink`.
  - Malformed structure: a bad close tag, unclosed `<path>`, `<path></path>`.
  - Bad path data: `javascript:` in `d`, arcs and curves, `1e308`.
  - Bad geometry: negative `x`, 99999 or 0 dimensions, mismatched width, viewBox offset, exponent or hex dimensions.
  - Bad attributes: red or `currentColor` fill, single quotes, a quote-break attribute, an extra rect attribute, uppercase `SVG`, UTF-16 bytes.
  - Limits: 10,001 shapes and more than 1M characters.
- **Accepted:**
  - Both exports from `createQrSvg` (opaque and transparent).
  - Valid inputs with a BOM, newline-separated root attributes, or an XML declaration.
  - A 400-digit number in a path (Path2D treats it as Infinity; harmless).
  - An out-of-viewBox rect (2048, 2048, 2048, 2048).
- **Exception:** a leading `<?xml-stylesheet href="https://…"?>` is **accepted**. `\b` in `/^\s*<\?xml\b/` matches `xml-stylesheet` (M-1). The PI is discarded, never interpreted, and caused **0 requests** in the real-UI probe. This is a grammar-strictness gap with no security impact.
- **Timing:** typical inputs parse in < 15 ms at around 1 MB. The worst case is many shapes followed by a large trailing-whitespace block: `while (body.trim())` re-trims the tail each iteration, taking **7.2 s** (Node) for 10,000 shapes + 600 k spaces (M-2). It is bounded by the 1M/10k caps, synchronous, local and self-inflicted.

**Historical areas re-evaluated:**
- The PI handling issue still exists as M-1 (unchanged since `V1_1_FINAL_SVG_AUDIT.md` §8).
- MIME/sniff/parser mismatch: content signature takes priority over declared type, and an SVG labeled as raster only reaches the browser's secure-static image decoder. Neither is exploitable.

## 14. UTF-8 / QR Payload Integrity

Source: `decode.ts:8-35`.
- jsQR's `data` drops invalid bytes, so each `byte` chunk's raw `bytes` are re-decoded with `new TextDecoder('utf-8', { fatal: true })`.
- Any error, or a byte chunk without `bytes`, gives `unsupported-url`. The partial `data` is never accepted.
- The payload then goes through `normalizeUrl`.

Probe (QR images built with arbitrary Byte segments via `tests/byte-fixture.mjs`):

| Payload | Result |
| --- | --- |
| `javascript:`, mixed-case JS, `data:`, `file:`, `blob:`, `mailto:`, `ws:`, `vbscript:`, leading space + JS, tab inside, newline inside host, `hello world` | `這個 QR Code 不是網址。`, link hidden, Copy disabled |
| `https://example.com/` + `0xFF` (lone) | rejected |
| + `C0 AF` (overlong `/`) | rejected |
| + `ED A0 80` (surrogate) | rejected |
| `0xFF` + `javascript:alert(1)` (would become JS if bytes were dropped) | rejected |
| Split segments `https://exa` + `E4` + `mple.com/` (would become a different URL if dropped) | rejected |
| Latin-1 `0xE9` | rejected |
| + `0x00` | rejected |
| Valid UTF-8 Unicode URL | decoded (punycode/percent form) |
| `example.com/path` (bare) | decoded as `https://example.com/path` (documented scheme-less contract) |
| `https://example.com/\n` | decoded (trailing whitespace trimmed per contract) |

Encoder side: `createQrMatrix` and `createQrPixels` refuse non-ASCII input (`qr.ts:52, 99`). Normalized hrefs are always ASCII, so the generator's non-UTF-8 Byte handling can never corrupt a payload.

## 15. QR Generation / Target Size

Source: `qr.ts:62-120`.
- `totalModules = modules + 8` (4-module quiet zone each side).
- `scale` is an integer chosen between `floor` and `ceil` of target/total. The upper one is taken only if it is ≤ 2048 and at least as near (ties go up).
- The minimum is `total × 2`. Below that the result is an error, never an upscale.
- Pixels are written per module, with no interpolation.

Exhaustive Node check over **every** version (21–177 modules) × **every** target 64–2048 (73,394 legal combinations):
- Integer scale ≥ 2, `actual = total × scale`, `actual ≤ 2048`.
- Scale equals the nearest legal size from an independent brute-force search (ties to larger).
- **0 violations.**

Spot values:

| Modules | Target | Actual |
| --- | --- | --- |
| 177 (185 total) | 512 | **555** (scale 3) |
| 177 | 370 | 370 |
| 177 | 369 | error "至少需要 370 px" |
| 177 | 2048 | 2035 |
| 21 | 64 | 58 (scale 2) |
| 21 | 256 | 261 |
| 25 | 256 | 264 |
| 21 | 2047 / 2048 | 2030 |

- A dense 2311-character payload gives 177 modules, and targets 370 → 777 → 2048 give 370, 740, 2035.
- The historical case is **185 total modules at target 512 → 555**. A literal "target 185" is below this QR's 370 px minimum and is correctly rejected.
- Ties cannot occur in the product (total is always odd), but the synthetic even-total tie resolves upward.
- `parseOutputSize` rejects `1e3`, `0x100`, leading or trailing spaces, `+256`, `256.0`, Arabic-Indic digits, `25 6`, `63` and `2049`, and accepts `0256` as 256.
- **Preview vs real output:** the preview canvas is the real-size raster scaled by CSS. The caption "實際尺寸：W × H px" matches the downloaded file (probe: 198 × 198 for target 185 on a 33-module QR; files were 198 × 198).

## 16. Export Formats

Source: `qr.ts:134-172`, `main.ts:259-301`. Probe at target 185 for `example.com/x?y=1`:

| Format | Opaque | Transparent |
| --- | --- | --- |
| PNG | 198², corner RGBA 255,255,255,255 | 198², corner alpha **0** |
| SVG | strict regex match; tags `svg`, `rect`, `path` only | strict match; **no** `<rect>` (background omitted) |
| JPG | 198², opaque white corner | **disabled** (menu item `disabled`, skipped by arrow keys; `exportQr` also rejects) |
| WebP | 198², opaque white corner | 198², corner alpha **0** |

- Filenames were `qr-code.png`, `.svg`, `.jpg` and `.webp`.
- **Generated SVG safety:** `createQrSvg` builds the string only from integers and fixed literals. The output matched
  ```
  /^<svg xmlns=… viewBox="0 0 N N" width="N" height="N" shape-rendering="crispEdges">(<rect …fill="#fff"/>)?<path d="[Mhvz0-9 -]+" fill="#000"/></svg>$/
  ```
  There is no script, href, style, metadata or external content.
- **Round-trip:** the downloaded SVG re-uploads and decodes to the same URL (probe).
- **Tests:** the suite checks that payload, quiet zone, opacity and exact pixel matrix are unchanged across all four formats and four payload sizes (`refinement.spec` "PNG SVG JPG WebP …", `output-preview-transparent.spec`).
- **Stale exports are dropped:** `download()` drops the result if `generated`, the background revision or flag, or (for raster) the size revision or value changed while encoding.

## 17. Draft / Generated State Separation

Source: `main.ts:72, 198-257, 259-280`. `generated` is replaced only after a fully successful Generate. Input edits only update the notice and status (`resultStatus`).

Probe:
- After editing the draft to `https://changed.example/`, the canvas label stayed `網址 https://example.com/x?y=1 的 QR Code` and the status read `網址已修改，請重新產生。`.
- Generate with `javascript:alert(1)` showed the error. The old QR and an enabled Download remained.
- Downloads always use `result = generated` captured at click time, never `urlInput.value`.

Tests: `refinement.spec` "editing and invalid generate preserve QR A; all downloads follow the displayed QR" checks the decoded download bytes.

Target-size and transparency changes re-render the **generated** QR (`updatePreview`) and never the draft, which matches the README contract. An invalid size keeps the last valid preview.

## 18. Download Menu

Source: `main.ts:141-191, 303-310`. Probe:
- **Arrow keys:** ArrowDown on the toggle focuses SVG. ArrowDown cycles SVG → JPG → WebP → SVG, Home goes to SVG, End to WebP, and ArrowUp from WebP to JPG.
- **Escape** closes the menu, focus returns to the toggle, and `aria-expanded` becomes `false`.
- **Transparent on:** the sequence is SVG → WebP → SVG (disabled JPG is skipped).
- **Tab** closes the menu and focus leaves it, so there is no trap.
- **Outside pointerdown** closes it. `focusout` to outside closes it.
- **Busy state:** `openDownloadMenu` and `download` bail out when `downloadBusy`.
- **Geometry:** the menu opens below the toggle. Behaviour is identical to the pre-B5 code paths (the B5 delta has no menu logic).

Semantics: `aria-haspopup="menu"`, `aria-controls`, `role="menu"` with `aria-label`, `role="menuitem"` buttons with `tabindex=-1`, and native `disabled`.

## 19. Accessibility

Source review plus runtime checks:
- **Landmarks:** `main#converter` (skip-link target, `tabindex=-1`), `header` containing the H1 "URL ↔ QR Code" and an H2 zone label.
- **Tabs:** `role=tablist` with a label. Tabs use roving `tabindex`, Arrow/Home/End keys and `aria-selected`/`aria-controls`. Panels use `role=tabpanel`, `aria-labelledby`, `tabindex=0` and `hidden` when inactive.
- **Form controls:**
  - Native `<label for>` on the URL input, target size, checkbox, file input and decoded textarea.
  - `aria-describedby` points to the error and alert regions.
  - `aria-invalid` is set on error and removed on edit.
  - Status uses `role=status` with `aria-atomic`. Errors use `role=alert`.
- **QR canvas:** `role=img` with a URL-specific `aria-label`. The visual notice is `aria-hidden`, and the duplicate text lives in the status region (tested once-only).
- **Focus visibility:** a 3px accent outline everywhere. The drop zone uses `:focus-within`. Reduced motion and forced colors are handled (§7).
- **Automated checks:**
  - axe wcag2a/2aa/21aa reported zero violations in all suites that ran (Chromium).
  - 44 px target, contrast (4.5 / 3) and 200 % text-reflow tests passed.
  - No horizontal overflow at widths 1440, 1280, 768, 375 and 320.

**Decode empty keyboard behaviour (independent judgement):**
- In the empty state, `.decode-result` is clipped to 1 × 1 px (`styles.css:705-715`). It stays in the DOM and tab order.
- Copy is natively `disabled`, so it is not focusable, and Open Link is `hidden`.
- Tab from the file input therefore lands on exactly one element, the read-only `#decoded-url`. `:focus-within` then shows a paper strip (desktop box 1120 × 146; mobile 343 × 176) with a visible 3px ring. I checked the screenshots at 1280 and 375 widths.
- Shift+Tab returns to the file input and the strip collapses again. Tab from the textarea leaves the document. There is no window where focus sits on an invisible element, and no trap.
- Screen readers get one label "網址", one empty read-only textbox and one disabled Copy button. This is the same exposure as the pre-B5 design, which drew the field visibly. It is not duplicated and contains no fake result.
- **Judgement:** predictable, keyboard-accessible, screen-reader-safe and free of invisible-focus windows.
- **Only observation:** revealing the strip reflows the upload zone above it (desktop zone height about 420 → 260 px). This is a layout change on focus, not a change of context. It is cosmetic and recorded as Minor M-5. Real screen-reader confirmation remains manual (ME-3).

## 20. Privacy

**Static search:**
- `src/` contains no `fetch`, XHR, WebSocket, `sendBeacon`, analytics, telemetry, `localStorage`, `sessionStorage`, IndexedDB, cookies, service worker, background sync or clipboard read.
- The only clipboard call is `navigator.clipboard.writeText(url)` inside the Copy click handler (`main.ts:486`).
- In `dist`, the only `fetch(` is the unused Vite preload polyfill (§9).

**Runtime (instrumented Chromium, full flow):**
- Zero storage `get`/`set` calls, zero IndexedDB `open`, zero cookie access by the app.
- `localStorage` and `sessionStorage` length 0, empty cookie, `indexedDB.databases()` returned `[]`, zero service-worker registrations.
- Zero fetch, XHR, WebSocket or beacon calls.
- **No** clipboard call before Copy. Exactly one `writeText` after Copy, and the clipboard then held the decoded URL.
- Requests were only the four static assets. Zero external requests, even through Open Link, until the user clicked.

The model holds: images and URLs stay local, with no storage, tracking or backend.

## 21. Dependencies / Supply Chain

- **`npm ls --omit=dev --all`:** `jsqr@1.4.0`, `qrcode-generator@2.0.4`, with **no transitive runtime dependencies**. The artifact test asserts that the lockfile's non-dev packages are exactly these two.
- **Pinning:** the runtime versions are exact in `package.json`. Dev dependencies are `@axe-core/playwright` 4.13.0, `@playwright/test` 1.63.0, `typescript ~5.9.3` and `vite ~8.3.1`. The lockfile pins all of them with 48 integrity hashes, all from `registry.npmjs.org`.
- **Lifecycle scripts:** the project defines none (`preinstall`, `install`, `postinstall`, `prepare`). The only `hasInstallScript` entry is `fsevents` 2.3.3, which is dev, optional and darwin-only, so it is not installed on Linux.
- **Runtime package scripts:** they are build/test scripts only, not run on install.
- **Licenses:** jsqr is Apache-2.0 and qrcode-generator is MIT. `public/THIRD_PARTY_NOTICES.txt` is shipped and includes both (artifact test). Dev tree licenses are MIT, Apache-2.0, MPL-2.0 (axe-core) and ISC, with nothing shipped.
- **`npm audit`:** 0 vulnerabilities, and 0 with `--omit=dev`. This is supporting evidence only.
- **`package.json` and lockfile version:** 1.1.0, consistent.

## 22. Build and Release Artifact

`npm ci` used the committed lockfile, with no version changes. `npm run build` runs typecheck plus `vite build`.

`dist/` contains exactly:

| File | Size | SHA-256 |
| --- | --- | --- |
| `index.html` | 8,653 | `f7707736…b2599` |
| `assets/index-uJ4KttXo.js` | 168,263 | `2fced4e9…0b02` |
| `assets/index-D55oJScF.css` | 25,237 | `554518b3…115d` |
| `favicon.svg` | 269 | |
| `_headers` | 330 | byte-identical to `public/_headers`, LF only |
| `THIRD_PARTY_NOTICES.txt` | 12,641 | |

It contains no source maps, fixtures, tests, design-exploration or production-b5-review files, reports, probes, local paths (`/home/`, `/Users/`, `C:\`), `sourceMappingURL`, `debugger` or `console.log`. The only URLs in the bundle are the SVG namespace and the `https://${…}` normalization template. The artifact test enforces the file list and the CSP and header equality.

## 23. Independent Audit Probes

All probes were temporary files in the session scratchpad. None are in the repository.

| # | Probe | Result |
| --- | --- | --- |
| 1 | Malicious SVG rejection (Node, 66 inputs; UI, 7 hostile files including mislabeled ones) | All hostile inputs rejected. One known lax prolog PI (M-1) with no load. 0 requests, 0 dialogs, 0 DOM nodes |
| 2 | Dangerous URL schemes (Node, 77 inputs; Decode, 17 payloads) | Only HTTP(S) hrefs are ever produced or activated |
| 3 | Open Link opener/referrer | `opener` null, `referrer` "", no `Referer` header, explicit click only, correct target after replace or race |
| 4 | Runtime network | Only `/`, the JS, the CSS and the favicon; 0 external requests |
| 5 | Storage and cookies | No access of any kind; all stores empty; no service worker |
| 6 | CSP runtime violations | 0 across the full flow; meta and header CSP agree |
| 7 | Release artifact contents | 6 expected files; no leaks (§22) |
| 8 | Decode empty keyboard focus | Visible 3px-ringed strip at 1280 and 375 widths; collapses on Shift+Tab; no invisible focus |
| 9 | Generated SVG safety | Strict regex match, opaque and transparent; re-decodes |
| 10 | Transparency and export consistency | PNG and WebP alpha 0, SVG without background, JPG disabled; opaque formats white; caption equals file size |
| extra | Target-size exhaustive geometry | 73,394 combinations, 0 violations |
| extra | Image bombs 16384² and 30000² | Graceful in Chromium |
| extra | 20 MiB / +1 boundary | Accepted / rejected |
| extra | Clipboard | Write only after Copy |

## 24. Automated Verification

| Gate | Command | Result |
| --- | --- | --- |
| Clean install | `npm ci` | OK (lockfile unchanged) |
| Typecheck | `npm run typecheck` | exit 0 |
| Node unit | `npm test` | **66 / 66** pass, 0 fail, 0 skipped, 0 todo |
| Build | `npm run build` | OK (10 modules; JS 168.26 kB, CSS 25.23 kB) |
| Artifact | `npm run test:artifact` | **4 / 4** pass |
| Browser, Chromium | `npx playwright test -c <temporary wrapper>` | **77 / 77** pass; expected 77, skipped 0, unexpected 0, flaky 0; retries 0; workers 1; duration 3.1 min |
| Browser, Firefox | — | **NOT RUN**: Playwright Firefox r1543 download blocked by the environment network policy (`cdn.playwright.dev` returned 403) |
| Browser, WebKit | — | **NOT RUN**: same reason (WebKit r2359) |
| Audit | `npm audit` / `npm audit --omit=dev` | 0 vulnerabilities |
| Runtime deps | `npm ls --omit=dev --all` | `jsqr@1.4.0`, `qrcode-generator@2.0.4` |
| Whitespace | `git diff --check` | clean (working tree) |
| Whitespace, candidate range | `git diff --check v1.0.1..HEAD` | 1 trailing-whitespace line (M-4) |

**About the Chromium run:**
- Only `chromium-1194` is preinstalled (`/opt/pw-browsers`); Playwright 1.63 pins r1243.
- To run the unmodified suite, I used a temporary, untracked wrapper config. It imported `playwright.config.mjs` unchanged, kept only the `chromium` project and set `launchOptions.executablePath: '/opt/pw-browsers/chromium'`. It then ran the same `dist`, `webServer`, `retries: 0`, `workers: 1` and `timeout: 60_000`.
- No tests, fixtures, thresholds or timeouts were changed. The wrapper was deleted afterwards.
- The count matches the B5 report's per-project 77 (231 = 77 × 3).

## 25. Findings

### Blocker
None.

### Important
None.

### Minor

| ID | Area | Finding | Evidence | Release impact | Recommendation |
| --- | --- | --- | --- | --- | --- |
| M-1 | SVG parser | The prolog regex `/^\s*<\?xml\b[^>]*\?>/i` also strips a leading `<?xml-stylesheet …?>` or `<?xml-model …?>`. Such files are accepted, against the "no processing instructions" intent. Carried over unchanged from `V1_1_FINAL_SVG_AUDIT.md` §8. | `src/svg.ts:37`; sniff at `src/decode.ts:52`. Node probe "pi" ACCEPT. Real-UI upload of `<?xml-stylesheet href="https://attacker.invalid/a.css"?>…`: 0 requests, 0 CSP events | None for security: the PI text is discarded and never interpreted | Use `<\?xml\s` (or `<\?xml(?=\s)`) in both places, in a later patch |
| M-2 | SVG parser resources | `while (body.trim())` re-scans trailing whitespace on each of up to 10,000 iterations, which is quadratic. It is bounded by the 1M/10k caps. Carried over. | `src/svg.ts:46-47`. Node: 10,000 shapes + 600 k trailing spaces (960 KB) took **7.2 s**; 2,000 + 900 k took 2.2 s | Local, self-inflicted main-thread stall of seconds for a crafted file. No data or security impact | Trim once before the loop, or test `/\S/` against a moving index |
| M-3 | Release docs | The CHANGELOG 1.1.0 first bullet describes the superseded R2 design ("ultramarine title band", "raised mode tabs", "dotted light-table QR stage", "scan-frame"), not the accepted B5 UI. The list has stray blank lines. RELEASE_CHECKLIST's header still points to `V1_1_TARGET_SIZE_GEOMETRY_FIX_VERIFICATION.md` as "本輪". | `CHANGELOG.md:5,12,14`; `RELEASE_CHECKLIST.md:7` | Documentation accuracy only; not in `dist` | Rewrite the bullet for B5 (wash ground, framed tabs, inspector rail, downward menu, …) during release prep, when "(unreleased)" is replaced anyway |
| M-4 | Repo hygiene | One trailing-whitespace line in a test introduced in the candidate | `tests/browser/output-preview-transparent.spec.mjs:68`; `git diff --check v1.0.1..HEAD` | None | Strip it in the next normal commit |
| M-5 | Decode-empty UX | Revealing the empty result strip on keyboard focus reflows the upload zone above it (desktop zone height about 420 → 260 px). Focus remains visible and context does not change. | Probe screenshots at 1280 and 375 widths; `styles.css:705-725` | Cosmetic. Accessible and predictable (§19) | Optional: reserve the row, or overlay the strip below the zone without changing its height |
| M-6 | Repo hygiene | The new v1.1 verification reports include a local Windows checkout path (redacted as `<repo>`) (some v1.0.x docs already did) | e.g. `V1_1_CUSTOM_OUTPUT_SIZE_VERIFICATION.md:175`, `V1_1_PRE_TAG_CLEANUP_VERIFICATION.md:75` | Not secret and not in `dist`; reveals a local username only | Optional: replace with `<repo>` in future reports |

### Manual / Environment
See §26. ME-1 is a **pre-tag precondition**. The others are not release-blocking.

### Future

| ID | Item |
| --- | --- |
| F-1 | Userinfo URLs (`https://google.com@evil.com`) are accepted and shown in full. Carried over from v1.0 and v1.1 RC. Display, href and navigation agree, but consider rejecting credentials or highlighting the real host |
| F-2 | jsQR runs synchronously on the main thread. Consider a Worker (carried over) |
| F-3 | No pixel-dimension cap before `createImageBitmap`. A small compressed PNG can expand to a very large bitmap. Chromium handled 16384² and 30000² gracefully. README documents that the 20 MiB limit is not a full image-bomb guarantee |
| F-4 | `example.com:8080` without a scheme is rejected with the "只接受 http/https" message. This is documented, but the message could explain the port rule |
| F-5 | `content: "選擇圖片" / ""` falls back to the first declaration in engines without CSS alt-text support, which may then announce the decorative face text. All current evergreen engines support the alt syntax |

## 26. Manual / Environment Items

| ID | Item | Release-blocking? |
| --- | --- | --- |
| **ME-1** | **Firefox and WebKit Playwright projects were not executed.** Playwright's browser CDN (`cdn.playwright.dev`) is denied by this environment's network policy. Run `npm run test:browser` on this candidate on a machine that has Playwright Firefox r1543 and WebKit r2359; expect 231 passed (77 × 3), 0 skipped, 0 flaky, retries 0. Alternatively, allow `cdn.playwright.dev` in the cloud environment's network settings and re-run here. | **Yes, as a precondition to tagging** (not a product defect) |
| ME-2 | Chromium coverage used preinstalled r1194, not the pinned r1243 (Chrome 153). ME-1's local run on pinned browsers supersedes it | No (covered by ME-1) |
| ME-3 | Real screen readers (NVDA, JAWS, VoiceOver) for the decode-empty strip, live regions and menu | No |
| ME-4 | Real Safari on macOS and iOS; Windows Sitka font rendering and the Iowan/Charter/Georgia fallbacks; Windows forced-colors (High Contrast) | No |
| ME-5 | Native file dialog and OS drag-and-drop; physical touch targets | No |
| ME-6 | Real phone scanning and print/PDF of PNG, SVG, JPG and WebP exports (already in RELEASE_CHECKLIST) | No |
| ME-7 | Firefox and WebKit behaviour for mislabeled SVG reaching `createImageBitmap`, and for image bombs. Even if decoded, SVG-as-image is script-free and load-free | No |
| ME-8 | The production host must actually serve `public/_headers`. `frame-ancestors 'none'`, `nosniff` and `Permissions-Policy` exist only as HTTP headers. Check the deployed response headers after deploy | No (post-deploy check) |

## 27. Release Readiness

- **Security boundaries:** URL schemes, Open Link, SVG, raster decode, UTF-8, CSP, privacy and the artifact all hold, by source reasoning and runtime probe.
- **Functional correctness:** generation, exact target-size geometry, the four export formats, transparency, draft separation and the menu were verified.
- **B5 UI:** presentation-only, with no security or behaviour change.
- **Tests:** the four changed assertions are legitimate geometry updates, and no quality gate was weakened.
- **Outstanding:** ME-1 (Firefox and WebKit runs) and non-blocking Minor items M-1 to M-6.

## 28. Recommended Next Step

1. On a machine with Playwright browsers, check out `cec3c82`, run `npm ci && npm run test:browser`, and confirm 231/231 with retries 0, skipped 0 and flaky 0. If any Firefox or WebKit failure appears, treat it as a new audit input before tagging.
2. During release prep, correct the CHANGELOG 1.1.0 bullet and the RELEASE_CHECKLIST header pointer (M-3).
3. Tag `v1.1.0` on the audited code and deploy, then verify the live response headers (ME-8).
4. Schedule M-1, M-2 and M-4 for a v1.1.x patch. M-5, M-6 and F-1 to F-5 are optional.

## 29. Git / Session Integrity

- No production source, tests, package files, lockfile, CSP, headers, README, CHANGELOG or RELEASE_CHECKLIST were modified. `git status` was clean apart from this report.
- No merge, amend, rebase, force-push, tag creation or deletion, release, publish or deploy.
- Tags `v1.0.0` (`0c41a74` → `47600c5`) and `v1.0.1` (`1e5f113` → `214cea3`) are unchanged. `v1.1.0` does not exist.
- Temporary artifacts were removed from the repository: the wrapper config `.audit-pw.config.mjs` and `test-results/`. Probe scripts, logs and screenshots stayed in the session scratchpad. `dist/` and `node_modules/` remain and are git-ignored.
- No server is left listening on 4173, 4174 or 5173.
- Network use was limited to the npm registry (`npm ci`, `npm audit`) and the failed Playwright CDN attempt. No source, fixtures or user data were sent anywhere.
- The only repository addition is this file, `V1_1_FINAL_RELEASE_SECURITY_AUDIT.md`, committed as a docs-only commit on `audit/v1.1.0-rc` on top of the audited candidate `cec3c82`.

## 30. Final Status

**PASS_WITH_NOTE**

- No Blocker and no Important findings.
- 6 non-blocking Minor findings.
- Manual/Environment ME-1 must be completed before tagging: the Firefox and WebKit browser projects could not run in this cloud environment, and Chromium passed 77/77.

# URL QR Converter: B5 Production Implementation Verification

**Status:** `READY_FOR_PRODUCTION_VISUAL_REVIEW`
**Date:** 2026-10-05
**Brief:** `B5_PRODUCTION_IMPLEMENTATION.md`
**Visual source of truth:** `design-exploration/b5/screenshots/refine-final/` and `design-exploration/b5/B5_VISUAL_SPEC.md`
**Production screenshots:** `production-b5-review/` (untracked)

No commit, amend, tag, push, release or deploy was made. This is **not** the Final Security Audit.

---

## 1. Executive summary

- **The accepted B5 design is now the production UI.** The old R2 ultramarine band, the large white workspace card and the dotted light table are gone.
- **Markup changes are minimal.** `index.html` has five small edits. `src/main.ts` has one presentation-only line (`notice.dataset.tone`). `src/styles.css` is rewritten as the B5 system, on the same production selectors.
- **Unchanged:** encoder, decoder, SVG parser, CSP, `_headers`, dependencies and every behavioural guard.
- **All gates pass on the final build:**
  - typecheck;
  - Node 66/66;
  - build;
  - artifact 4/4;
  - browser **231/231** (Chromium, Firefox and WebKit, 77 each, axe included);
  - `npm audit` 0 vulnerabilities;
  - `git diff --check` clean.
- **73 production state captures** (plus keyboard and forced-colors extras) were reviewed by eye against `refine-final/`. All have 0 horizontal overflow and 0 console or page errors. The elevation rule holds in every capture: Level 1 = 0 when there is no output and 1 when there is; Level 2 appears only with the menu open.
- **Four browser assertions were updated.** Each encoded R2-only geometry that B5 explicitly replaces (§18.2). No accessibility threshold was lowered.
- **One B5 rule was adapted** to keep production keyboard behaviour (§13 / §17).

## 2. Starting state

- **HEAD:** `da4f4ab`. Tags: `v1.0.0` and `v1.0.1`, both unchanged.
- **Working tree:** 13 tracked `M` files from earlier v1.1 rounds, and the untracked B-series docs and `design-exploration/`. That uncommitted v1.1 tree was the production baseline.
- **Backups:** `index.html`, `src/styles.css` and `src/main.ts`, plus SHA-256 of all source, `_headers` and package files, were saved to the session scratchpad before any edit.
- **Baseline browser run:** it was started in the background on the untouched tree and stopped by Claude Code because the system was low on memory.
  - Before it stopped: Chromium 77/77 passed, and Firefox 29 had passed with no failures.
  - It then stalled on one Firefox test while the machine was idle; the logged duration was 8.6h.
  - This is **not** used as a gate result. I stopped its orphaned processes (preview server and Playwright Firefox).

## 3. Files read

- **Production:**
  - `index.html`;
  - `src/styles.css`, `src/main.ts`, `src/qr.ts`, `src/decode.ts`, `src/svg.ts`;
  - `package.json`, `playwright.config.mjs`;
  - `public/_headers`, `RELEASE_CHECKLIST.md`;
  - every browser spec plus `helpers.mjs`, `tests/release/artifact.test.mjs`, `tests/preview-server.mjs`.
- **B5:**
  - `B5_VISUAL_SPEC.md`;
  - `generate.html`, `decode.html`, `styles.css`;
  - `generate.js` and `decode.js` (only to understand which states exist; no logic was ported).
- **Screenshots:** `refine-final/`, the desktop, m390 and m320 sets.
- **Reports:**
  - `B5_REFINEMENT_ROUND_VERIFICATION.md`;
  - `B5_POLISH_ROUND_VERIFICATION.md`;
  - `TITLE_WORDMARK_EXPLORATION_REPORT.md` (TW-11 / TW-13);
  - `B5_VISUAL_EXPLORATION_REPORT.md` (outline).

## 4. Implementation mapping

| B5 element | Production hook | Kind |
| --- | --- | --- |
| PB-C wash | `:root` background (two radial notes on `--wash-base`) | CSS |
| W-B, no frame | `.workspace` loses background, radius and shadow; `.page-shell` 70rem column | CSS |
| Title TW-13 + TW-11 | `<h1 class="wordmark">` with `.t-url`, visually-hidden ` ↔ `, `svg.t-arrow`, `.t-qr` (`::before` crop marks) | Markup (title only) |
| Framed tabs | `.mode-switch button`, `.tab-mark` | CSS |
| Command row | `.url-row` becomes a two-column grid matching the inspector column | CSS |
| Matte (SD-D texture) | `.preview-stage` (matte + hatch) | CSS |
| `QR Code 預覽` zone label | Existing `h2#preview-title`: class `visually-hidden` → `zone-label` | Markup (class) |
| EG-C empty | `#qr-placeholder` keeps its text; the fake-QR SVG is **removed** | Markup (removal) |
| Artboard (L1) | `.qr-canvas` | CSS |
| Measure line | `#qr-image-container::before/::after` (border-drawn, pixel-snapped) | CSS |
| Readout | `#preview-dimensions` as a plate | CSS |
| Notice glyph (warning / info) | `#qr-notice[data-tone]` | **main.ts, 1 line** |
| Settings region | `.output-options`, `.transparent-control`, `.output-size-control` | CSS |
| Download under settings, menu downward (L2) | `.download-control`, `#download-menu` | CSS |
| ED-G split field | `.decode-layout` grid; `.upload-field { display: contents }`; drop zone and label as **subgrid** | CSS |
| Action face `選擇圖片` | `.decode-layout::after` (generated content, empty alt text, `pointer-events: none`) | CSS |
| Decode error in action side | `#decode-error` placed in the action column | CSS |
| Processing line (visible) | Existing `#result-hint` in the drop side while processing | CSS |
| D-PV-B specimen (L1) | `.decode-result` (only when `#open-link` is shown) | CSS |
| Status `已找到網址` | Existing `#result-hint`, top right of the specimen, success glyph | CSS |
| Copy with visible text | `#copy-button` plus `<span class="copy-text">複製網址</span>` | Markup (1 span) |
| Source column | Drop zone `[data-state=preview]` plus the existing pill `.upload-cta` | CSS |
| Decode flow arrow | `.decode-flow` **removed** (not part of B5) | Markup (removal) |
| `theme-color` | `#131943` → `#ebe6e6` | Markup (meta) |

**Not rebuilt or moved:** every element with an `id`; every ARIA attribute; the tab, panel, input and label pairing; `#qr-image` and its single label; the live regions; `#download-menu` and its items; `#open-link` with `target` and `rel`. DOM order is unchanged everywhere.

## 5. Files modified (this round)

| File | Change |
| --- | --- |
| `index.html` | Title markup; zone-label class; fake-QR placeholder SVG removed; decode-flow removed; Copy text span; `theme-color` |
| `src/main.ts` | Added `notice.dataset.tone = modifiedMessage ? 'warning' : 'info';` (presentation only) |
| `src/styles.css` | Replaced the R2 system with the B5 system (942 lines) |
| `tests/browser/uiux-redesign.spec.mjs` | Two layout tests updated to B5 geometry (§18.2) |
| `tests/browser/quality.spec.mjs` | Selected-tab indicator check now targets the B5 framed tab (§18.2) |
| `tests/browser/final-ux-svg.spec.mjs` | `#result-hint` is now visible; checks a single exposure instead of `width: 1px` (§18.2) |
| `B5_PRODUCTION_IMPLEMENTATION_VERIFICATION.md` | This report (new) |
| `production-b5-review/` | Screenshots, `capture-log.json` and `tools/` capture scripts (new, untracked) |

**Not modified:**
- `src/qr.ts`, `src/decode.ts`, `src/svg.ts`;
- `public/_headers`, `package.json`, `package-lock.json` (SHA-256 identical to the start);
- `functional.spec.mjs` and the other specs;
- README / CHANGELOG / RELEASE_CHECKLIST;
- `.gitignore`.

## 6. Visual system ported

- **Tokens** follow the spec: wash, paper / region / matte, ink 1–3, black, `--field-stroke`, cobalt accent, success / warning / error / info glyph colours, `--stroke-faint`, `--rule`, the single hatch, and `--elev-1` / `--elev-2`.
- **Units:** type and control heights are in `rem` (prototype px ÷ 16), so user text-size settings still apply. The existing 200 % text checks pass.
- **Texture:** one hatch, in two places only: the Generate matte and the Decode drop side.
- **Elevation:** L1 is only the QR artboard or the decode specimen; L2 is only the download menu. This was measured on every capture (`capture-log.json`).
- **Colour (MC-C, SC-F):** components are black, white or neutral. Accent appears only on the selected tab foot and icon, the focus ring, the measure line, the drag-over edge and hatch, and the processing hairline.
- **Semantic signals (SC-A):** 16px glyphs with distinct shapes (✓ circle, ! circle, ! triangle, i circle). Strips are neutral; colour never fills a section.
- **Decode URL:** one colour (ink), one weight (400), one size (20px desktop / 17px mobile). No blue scheme, no bold host, no hostname hero.

## 7. Title implementation

- `URL` is the display serif in italic 400, `--ink-2`.
- `↔` is an inline SVG thin double arrow, `aria-hidden`, non-scaling 1.25px stroke, `--ink-2`.
- `QR Code` is roman 600, `--ink`, with four `currentColor` crop marks 0.24em long, using the spec's padding.
- **Sizes:** 40 / 34 / 30 / 27px at the spec breakpoints.
- **Fonts:** local only (Sitka → Iowan / Charter → `ui-serif` → Georgia); no CSP change.
- **Accessibility:** `textContent` and the accessible name are `URL ↔ QR Code` (tests assert `h1` and `header` text).
- **Forced colors:** the crop marks are kept (`forced-color-adjust: none` on the pseudo-element) and draw in the system text colour.
- **Fit:** `.t-qr` is `nowrap`, so the marks never split. At 320px the title fits with no overflow.

## 8. Tabs

- **Unselected:** two framed blocks (faint frame, translucent white fill, `--ink-2`, 500).
- **Selected:** paper fill, ink frame, a **2px accent foot**, accent icon, 600.
- **Not a segmented control:** no shared track and no pill.
- **Equal width:** both tabs are equal-width grid columns with a 10.25rem floor, so the 600 / 500 weight change never shifts geometry. Firefox showed a 1.7px shift before this, and the existing quality test caught it.
- **Mobile:** two equal full-width columns with an 8px gap; the icon hides at ≤360px, as before.

## 9. Generate layout

- **Command row:**
  - URL input in the main column, `產生 QR Code` over the inspector column, one grid.
  - The input is single-line, 48px tall and 16px type.
- **Main grid:** matte | 304px inspector (272px at ≤1000px), with a 12px seam and no enclosing frame.
- **Mobile:** stacked in DOM order: label, input, Generate (full width), matte, settings, Download (full width).

## 10. Generate preview

- **Matte:**
  - 500px tall on desktop, 152px minimum on mobile;
  - `QR Code 預覽` zone plate at the top left;
  - the artboard is the real raster, up to 300px on desktop, and pixelated.
- **Measure line:** equals the **displayed** width (the container hugs the canvas), cobalt with end ticks. It is drawn with borders, so it stays crisp at any centring offset; an earlier gradient version anti-aliased to grey.
- **Readout:** `實際尺寸：W × H px` on a plate.
- **States:** transparent shows the checkerboard only inside the artboard; large targets scale down while the readout stays at real pixels; notices sit in a neutral strip with a warning or info glyph.
- **Empty:**
  - Texture plus one `尚未產生 QR Code` plate.
  - No fake QR (the old placeholder SVG is deleted), no artboard, no settings echo.
  - No L1 object.

## 11. Settings / Download placement

- **Settings:** the region hugs its content; the `透明背景` row and `目標尺寸` group are separated by a rule.
- **Checkbox:** native `<input type="checkbox">` drawn at 18px. The label fills the row from the checkbox edge with line-height 1, giving one optical centre and no dead zone (test-verified). It falls back to native rendering in forced colors.
- **Download:** the split pair sits **directly below settings**: 16px on desktop (14px on mobile), measured gap ≤ 20px, and test-asserted.
- **Menu:** opens **downward**, 6px below the toggle, full inspector width, at L2.
- **Unchanged and test-verified:** JPG disabled with strike-through when transparent, keyboard navigation, Escape / Tab focus return, outside-click close.
- The column below Download is wash.

## 12. Decode empty

- **Desktop:** one split field.
  - Hatched drop side with the production sentence on a plate.
  - Region action side with the black `選擇圖片` face.
  - One faint edge drawn over both halves.
  - It is one label and one drop target (the label spans both halves via subgrid).
- **The action face:** generated content (`content: "選擇圖片" / ""`), because `#qr-image`'s label `textContent` must stay exactly `選擇圖片或拖曳到這裡` (test-asserted). `pointer-events: none` lets clicks reach the label underneath.
- **Errors** sit in the action side above the button.
- **Not shown:** no fake preview, thumbnail, sample QR or empty URL field.
- **Mobile:** drop side on top (152px minimum), error then full-width 48px face below.
- **Drag-over:** 2px dashed accent edge plus accent hatch.
- **Processing:** the sentence dims, and the production status `正在讀取圖片…` appears under it with an accent hairline.

## 13. Decode result

- **Layout:** the source narrows to 300px (240px at ≤1000px, see §20) and the L1 paper specimen takes the wide column.
- **Specimen content:**
  - `網址` label;
  - status at the top right (success glyph plus the production status text);
  - the URL **once**, in the production read-only `<textarea>`;
  - Copy (outlined, icon plus `複製網址`; accessible name unchanged);
  - a rule, then `開啟連結` (black, 48px). The rule uses visual `order` only; DOM order is unchanged.
- **Source column:** image on a plate (max 200px) with the production pill `選擇圖片或拖曳到這裡` as re-pick.
- **Verified in captures:** URL shown only once, no hostname hero, no mixed colour or weight (`capture-log.json` records the URL colour / weight / size).
- **Before a result exists** (adapted ED-G, see §17): `.decode-result` stays in the DOM and tab order, as in production, but is visually collapsed to 1px. Only if keyboard focus enters it does it appear as a flat L0 strip under the field, so focus is never invisible. Mouse users never see an empty URL field. Captured as `desktop-d14-keyboard-empty-result-focus.png`.

## 14. Mobile

At 390 / 375 / 320:

- **Generate:** command row stacked, primaries full width, matte artboard at 1:1 within the matte, settings full width, Download below settings, menu downward within the viewport.
- **Decode:** stacked split field; success becomes a thumbnail-plus-re-pick row, then the specimen with Copy full width under the URL.
- **Checks:** long URLs wrap with no horizontal overflow (0px in every capture) and no clipping.
- **Height:** command 48px, secondary buttons 44px.

## 15. Functionality preservation

- Logic files (`qr.ts`, `decode.ts`, `svg.ts`) are byte-identical; `main.ts` has one presentation line only.
- The full browser suite (231) passes. It covers:
  - URL normalization and the HTTP(S)-only / dangerous-scheme rules;
  - Enter-to-generate; draft A / generated B; failed Generate keeping the old result;
  - stale generation and export guards; target-size snapping and minimum size; integer module geometry;
  - transparent background, JPG disabled; PNG / SVG / JPG / WebP round trips;
  - menu keyboard behaviour;
  - the 20 MiB limit, 768 → 2048 staged decode, fatal UTF-8, the SVG safe parser;
  - Copy, Open Link (`_blank`, `noopener noreferrer`, `opener === null`, no referrer);
  - drop / file races, cleanup, and no storage or network.
- Production screenshots exercise all 14 Generate and 13 Decode states from the brief.

## 16. Security preservation

- **Unchanged:** CSP and `_headers` (hash and artifact test), dependencies (`npm ls`: jsqr 1.4.0, qrcode-generator 2.0.4), and the URL / Open Link policy.
- **Nothing added:** no remote font, image, CDN, network request, inline script or inline style.
- **CSP compatibility:** the hatch, crop marks and glyphs are CSS gradients or borders (no `data:` images, which `img-src 'self'` would block).
- **Generated content:** the only one is a static decorative string with empty alt text.
- **Suite results:** the security, SVG-malicious, transparent-privacy and CSP-violation specs pass.

## 17. Accessibility preservation

- **Semantics kept:** tablist / tab / tabpanel with roving tabindex; labels; native checkbox and file input; menu and menuitem semantics plus keyboard; live regions (same nodes, same text); the accessible QR name; Copy's name `複製網址`; Open Link semantics; error associations (`aria-describedby`, `aria-invalid`).
- **Focus-visible:** kept at **3px** (B5 spec says 2px, see §20) in accent; tab offset 4px.
- **Other checks:** reduced motion disables all animation and transitions. Forced colors were checked visually (`forced-colors-*.png`): regions and buttons get real borders, the selected tab foot uses `Highlight`, and glyphs keep their shapes.
- **axe** (wcag2a / 2aa / 21aa) is clean in every scanned state across 3 browsers.
- **Contrast fix:** colour transitions on buttons now run only on entering hover. Before, enabling Download animated grey → black, and axe sampled a mid-frame at 4.44:1.
- **Keyboard order:** production lets Tab from the file input land on the read-only result field while a decode is pending; the field then keeps focus when the URL arrives (`functional.spec` "stale decode and Copy preserve newest result and focus"). Hiding the empty result with `display: none` broke this, so the hidden-until-focused approach in §13 keeps the behaviour. That test is unchanged and passes.

## 18. Automated gates

### 18.1 Results (final build)

| Gate | Command | Result |
| --- | --- | --- |
| Typecheck | `npm run typecheck` | Pass |
| Node product tests | `npm test` | **66 / 66** pass, 0 skipped |
| Build | `npm run build` | Pass |
| Artifact | `npm run test:artifact` | **4 / 4** pass |
| Browser: Chromium + Firefox | `npx playwright test --project=chromium --project=firefox` | **154 / 154** pass (5.6 min) |
| Browser: WebKit | `npx playwright test --project=webkit` | **77 / 77** pass (8.5 min) |
| axe | inside the browser suite (quality, uiux, uploaded-preview, output-preview-transparent) | 0 violations |
| Audit | `npm audit` | 0 vulnerabilities |
| Runtime deps | `npm ls --omit=dev --all` | jsqr 1.4.0, qrcode-generator 2.0.4 |
| Whitespace | `git diff --check` | Clean |

**How the browser suite was run:**
- Same `playwright.config.mjs`: `retries: 0`, 1 worker, real `dist` served with the deployment headers. 0 skipped, 0 flaky.
- The canonical `npm run test:browser` is build plus all three projects in one process (about 14 min). It was run as `npm run build` followed by the two project invocations above on that same build, because a long background process had already been stopped for low memory once this session.
- Coverage is identical: 231 tests.

### 18.2 Browser assertions updated (R2 geometry superseded by B5)

| Spec / test | R2 assertion | B5 replacement | Why |
| --- | --- | --- | --- |
| `uiux-redesign` · generate layout | Download bottom within 24px of the stage bottom ("anchored to the stage baseline") | Download pair directly below settings (gap ≤ 20px) and well above the matte bottom; mobile order unchanged | B5 refinement explicitly cancelled the pin-to-foot |
| `uiux-redesign` · decode layout | Empty `#decoded-url` visible; error below the zone and left of the result field; Copy right of the URL at all widths | Empty result not drawn (box ≤ 1px) but `#decoded-url` still `''` and Copy still disabled; error inside the field's action side; Copy right of the URL at ≥768px, below it on mobile | ED-G forbids an empty URL field; B5 puts errors in the action side and Copy below the URL on mobile |
| `quality` · selected tabs | Indicator is an inset `0 -3px 0` box-shadow; the other tab has no shadow | Indicator is a 2px `border-bottom`; ≥3:1 against the tab paper, the page wash and the unselected tab surface (3 ratios, as before); the other tab has a 1px foot of a different colour. Focus 3px / offset 4px and the no-layout-shift check are unchanged | B5 framed tabs |
| `final-ux-svg` · minimal visible copy | `#result-hint` has `width: 1px` (visually hidden) | `#result-hint` is visible and `已找到網址` appears exactly once in the aria snapshot | B5 §10 / §11 accepted showing the production status visibly |

**Not changed:** timeouts, retries, browser projects, axe rules, fixtures, the 44px button target check, the 3px focus checks, the contrast thresholds and `functional.spec.mjs`.

## 19. Screenshot / visual review

**Production build, `production-b5-review/`** (Chromium; `tools/capture.mjs` drives the real UI on the `tests/preview-server.mjs` build):

| Set | States |
| --- | --- |
| desktop 1280 | g01–g15 (empty, typed, generated, transparent, small 58px, large 1024, dense, modified, modified + dense, invalid, size error, menu, menu with JPG disabled, draft A / generated B, failed Generate keeps the old result); d01–d13 (empty, drag-over, processing, success, long, copied, no QR, not URL, unsupported, corrupt, too large, stale race, same file again); d14 keyboard-revealed empty result |
| wide 1440 / tablet 768 | g01, g03, g12, d01, d04, d07 |
| m390 / m375 / m320 | g01, g03, g09, g11, g12, d01, d03, d04, d05, d07, d09 |
| forced colors (1280) | Generate with menu, Decode empty, Decode success |

**Compared by eye with `refine-final/`:**

| Area | Result |
| --- | --- |
| Title | Matches (italic grey `URL`, hairline arrow, crop-marked `QR Code`) |
| Framed tabs | Matches (see the 8px gap and equal widths in §20) |
| Checkbox alignment | Matches |
| Generate empty | Matches (zone label plus one plate, no echo) |
| Generated artboard | Matches |
| Settings → Download spacing | Matches (16px) |
| Menu direction | Downward, matches |
| Decode empty, error, drag-over, processing | Matches |
| Decode success | URL once; matches |
| Long URL | Matches |
| Mobile 390 / 320 | Matches |

**Fixed during review:**
- the empty field collapsing (subgrid `min-height`);
- the measure line rendering grey;
- tabs stretching full width;
- crop marks lost in forced colors.

`capture-log.json` holds overflow, errors, L1 / L2 counts and geometry for every capture: 73 / 73 have 0 overflow and 0 errors.

## 20. Differences from the prototype

| # | Difference | Reason |
| --- | --- | --- |
| 1 | Command controls 48px (B5 46) and secondary **buttons** 44px (B5 36): Download pair and Copy. Inputs, the checkbox row and menu items stay 36px on desktop | Production keeps a 44px minimum height for every visible button (`quality.spec`); 48 / 44 keeps the CD-E step. Equal to B5's own mobile values |
| 2 | Focus ring 3px (B5 2px) | Production accessibility checks (3px on tabs, menu items, inputs, upload field) |
| 3 | Tab gap 8px (B5 6px); equal-width tabs with a 10.25rem floor | The 4px-offset 3px ring would otherwise overlap the neighbouring frame; prevents layout shift from the weight change |
| 4 | Readout numbers not bold | The readout stays one text node, as production builds it; no change to the DOM or aria snapshot |
| 5 | Decoded URL wraps at the browser's own break opportunities, not at `<wbr>` after `. / ? & # = -`; very long hosts can break mid-word on narrow screens | It is production's `<textarea>` (the spec says to keep it); `<wbr>` is impossible there |
| 6 | Firefox has no `field-sizing: content`, so the textarea uses a fixed minimum height (6em desktop, 9em mobile) and scrolls inside for longer URLs | Engine support |
| 7 | Copied state: the top-right status reads `網址已複製。` instead of a second line under the URL | Production has one status region; showing both would need new copy and DOM |
| 8 | Empty result kept in the tab order and revealed on keyboard focus as a flat strip | Production keyboard behaviour (§17) |
| 9 | Source column 240px at ≤1000px (B5 300) | Keeps the URL column readable at 768px with Copy beside it |
| 10 | Mobile breakpoint 720px, as B5 (production R2 was 767px); 721–767px now uses the desktop layout | B5 spec |
| 11 | Processing plate positions use fixed offsets from the centred sentence | No wrapper markup added |

## 21. Git / production integrity

- No commits, amends, tags, pushes, releases or deploys.
- HEAD is still `da4f4ab`; tags are `v1.0.0` and `v1.0.1` only; there are no stashes.
- **SHA-256 identical to the start:** `src/decode.ts`, `src/qr.ts`, `src/svg.ts`, `public/_headers`, `package.json`, `package-lock.json`.
- **Changed tracked files beyond the 13 pre-existing `M` files:** none new. `index.html`, `src/main.ts`, `src/styles.css`, `quality.spec.mjs` and `final-ux-svg.spec.mjs` were already `M`; `uiux-redesign.spec.mjs` is untracked.
- **New untracked:** this report and `production-b5-review/` (78 screenshot / log files plus `tools/`). `.gitignore` was not edited, so decide whether to keep, ignore or delete the review directory.
- No test or preview server is left listening on 4173 or 5173. `dist/` holds the final build.

## 22. Manual review checklist

- [ ] Title at 1280 / 390 / 320: italic grey `URL`, thin arrow, crop marks only around `QR Code`.
- [ ] Tabs: both framed; selected has paper, ink frame and accent foot; no shift when switching.
- [ ] Generate empty: hatch, zone label, `尚未產生 QR Code` only.
- [ ] Generated: artboard is the only raised object; cobalt measure line equals the displayed width; readout.
- [ ] `透明背景` checkbox centred with its label; click anywhere on the row.
- [ ] Download directly below settings; menu opens downward; JPG struck through when transparent.
- [ ] Modified (warning ▲) and dense (info ⓘ) notices.
- [ ] Decode empty: one split field, black `選擇圖片`, no empty URL field; drag-over dashed edge.
- [ ] Processing line; error strip in the action side.
- [ ] Success: URL once, one colour, weight and size; Copy; Open Link; narrow source column.
- [ ] Keyboard: Tab from the file input reveals the result field (flat strip) with a visible ring.
- [ ] Mobile 390 / 320: stacked, no horizontal scroll; long URL wrapping (see §20 #5) acceptable?
- [ ] Real Safari / other OS: serif fallback (Iowan / Charter / Georgia) acceptable?
- [ ] Decide what to do with `production-b5-review/`.

## 23. Final status

**`READY_FOR_PRODUCTION_VISUAL_REVIEW`**

Waiting for your visual acceptance. The Final Security Audit is a separate, later step.

# URL QR Converter — B5 Production Implementation

## 任務定位

B5 high-fidelity prototype 已經完成多輪人工審查與 refinement。

使用者已正式接受目前 B5 視覺方向。

本輪任務：

# 將「已接受的最終 B5 prototype」忠實移植到正式 production UI。

這不是新的 design exploration。
這不是 redesign。
這不是 reference research。
這不是功能開發。
這不是 Final Security Audit。
這不是 release。

Production behavior / security model / accessibility semantics 是硬邊界。

最終狀態只能是：

`READY_FOR_PRODUCTION_VISUAL_REVIEW`

或

`BLOCKED_OR_INCOMPLETE`

完成後停止，等待人工審查。

---

# 1. 開始前必讀

不要只依這份 prompt 重建 B5。

先自行讀取 repository 中實際檔案。

至少完整閱讀：

## Current production

- `index.html`
- `src/styles.css`
- `src/main.ts`
- `src/qr.ts`
- `src/decode.ts`
- `src/svg.ts`
- 其他直接影響 UI / state / accessibility / export / decode 的 source
- `package.json`
- Playwright config
- 現有 Node tests
- 現有 browser tests
- README
- RELEASE_CHECKLIST
- current CSP / `_headers`

目的是理解：

- production DOM
- production state model
- production async guards
- production keyboard behavior
- production accessibility semantics
- production security constraints

---

## Final accepted B5 prototype

完整閱讀目前：

`design-exploration/b5/`

尤其：

- `generate.html`
- `decode.html`
- `states.html`
- `styles.css`
- `B5_VISUAL_SPEC.md`

以及最新版 screenshots：

- `screenshots/refine-final/`

不要把：

- `screenshots/final/`
- `screenshots/polish-final/`

誤當最終版本。

它們是歷史 before states。

---

## B5 reports

至少閱讀：

- `B5_VISUAL_EXPLORATION_REPORT.md`
- `B5_POLISH_ROUND_VERIFICATION.md`
- `B5_REFINEMENT_ROUND_VERIFICATION.md`
- `TITLE_WORDMARK_EXPLORATION_REPORT.md`

如果 filename / location 有些不同，
請自行從 repo 搜尋並確認實際路徑。

---

# 2. Source of truth priority

遇到 prototype 與 production 不一致時：

## Behavior / security / accessibility

Production 是 source of truth。

## Visual presentation

最新版：

`design-exploration/b5/screenshots/refine-final/`

與最新版：

`B5_VISUAL_SPEC.md`

是 source of truth。

## Copy

Production 現有正式 copy 是 source of truth，
除非最新 B5 refinement 已經由使用者明確接受「顯示方式」的改變。

不要因 prototype 有自己的 demo JS
就把 prototype logic 複製回 production。

---

# 3. 最終已接受的 visual direction

以下全部已鎖定。

不要重新設計。

## Title

T-A 最終變體：

### TW-13 + TW-11 hybrid

- `URL`：
  - italic serif
  - ink-2 / grey
  - 比 `QR Code` 視覺上稍輕

- `QR Code`：
  - roman serif
  - dark ink
  - 較強的 visual weight

- `QR Code` 四周：
  - 使用 TW-11 crop marks
  - 只框 `QR Code`
  - 不是完整矩形框
  - crop marks 要跟文字比例響應

- `↔`：
  - thin double-arrow
  - neutral ink
  - 不使用 accent colour

- accessibility：
  - H1 的 accessible name / reading order 仍應等價於：
    `URL ↔ QR Code`

不要：

- slogan
- hero banner
- coloured title
- gradient text
- giant logo treatment
- external web font

保留現有 system / local serif fallback strategy。

不要修改 CSP 來載字型。

---

# 4. Page background

### PB-C · Soft colour wash

沿用最終 B5：

- low-saturation rose → mist wash
- colour 主要存在於 ground
- 不新增 hue
- 不做 purple / blue SaaS glow
- 不做 mesh / aurora / blobs

---

# 5. Workspace

### W-B · Tonal regions, no enclosing frame

Production 最終不應再有：

- giant app card
- browser-window frame
- enclosing rounded slab

Workspace 主要依靠：

- tonal regions
- spacing
- material transitions
- faint edges

建立結構。

---

# 6. Surface depth

### SD-D · Texture zone + one floating solid

使用最新版 B5 的唯一 texture system。

## Texture

只使用一套 hatch language。

不要建立第二套 pattern。

它可存在於：

- Generate output matte
- Decode empty drop side

但不要大量出現在其他地方。

Texture：

- 必須 subtle
- 不可以比內容搶眼
- 不直接承載大量文字

---

# 7. Main colour

### MC-C

Colour lives in the ground.

Components 主要使用：

- black
- white
- neutral
- near-neutral

不要把 page wash palette 灌進所有 controls。

---

# 8. Secondary colour

### SC-A + SC-F hybrid

## SC-F

保留一個 restrained accent family。

只能用在：

- selected indicators
- focus
- small lines
- outlines
- small icon strokes
- small structural details

不要用 accent 填滿：

- button
- panel
- card
- workspace region
- title

注意：

Decode URL 最新 refinement 已取消：

- blue `https://`
- bold hostname

不要重新帶回。

## SC-A

semantic colours 只用在小型：

- success
- warning
- error
- info

並且：

- 不只靠 colour 表達
- 保留 icon / shape distinction

---

# 9. Tabs

使用已人工接受的 framed tabs。

要求：

- `URL → QR Code`
- `QR Code → URL`

各自有完整 frame
但看起來屬於同一組。

保留最新版 B5：

- faint framed unselected state
- clearer selected frame
- selected accent bottom edge
- selected icon accent
- selected weight hierarchy

不要：

- pill
- shared segmented-control track
- reverting to underline-only tabs

Mobile：

- equal width
- 保留合理 gap
- 不 horizontal overflow

---

# 10. Control density

### CD-E · Mixed density

Primary command controls 比 secondary controls 大一級。

例如：

Primary:
- URL input
- Generate
- Choose file
- Open Link

Secondary:
- target size
- transparency
- Download split
- Copy
- menu entries
- tabs where applicable

URL input 必須保持：

- single line
- 不像 textarea
- 不 oversize

不要改 functionality。

---

# 11. Generate desktop layout

忠實依最新版 B5。

## Command row

左：

URL input

右：

`產生 QR Code`

保持兩欄 alignment。

---

## Main content

左：

Generate preview matte

右：

settings / export column

### Settings

保留：

- `透明背景`
- `目標尺寸`

並保留已修正：

- checkbox 與 label 視覺中心對齊
- whole-row reasonable hit target
- 正常 spacing

### Download

最新版 refinement 已決定：

# Download split button 直接放在 settings panel 下方。

不要再 pin 到整個 inspector column 底部。

Desktop：

settings panel
↓
16px normal spacing
↓
Download split button

Mobile 使用最新版對應 spacing。

不要為了和 preview 底邊對齊
留下巨大空洞。

---

## Download menu

因為 Download 已移到 settings 下方：

Desktop menu 使用最新版 B5 refinement 的：

# 向下展開

不要重新改回向上蓋住 settings。

保留：

- split-button behavior
- PNG main action
- SVG / JPG / WebP menu
- transparent → JPG disabled
- keyboard navigation
- focus restoration
- outside close behavior
- accessibility semantics

---

# 12. Generate preview

### G-PV-A

保留：

- QR artboard
- matte
- size measure line
- `實際尺寸：W × H px`

Generated QR 才是 raised object。

---

## Generate empty

### EG-C refined

Empty 不得：

- fake QR
- fake artboard
- sample QR
- skeleton
- blank-paper object
- repeated settings info

已人工接受的最新版：

- 保留 `QR Code 預覽`
- 保留簡單的 `尚未產生 QR Code`
- 不顯示：
  - `目標尺寸 256 px`
  - `透明背景`
  - 其他右側 panel 的 echo

不要重新加入 `.empty-readout` 類型 card。

---

# 13. Decode empty

### ED-G · Split upload field

Empty state 只顯示真實 upload interaction。

Desktop：

- drop side
- action side

是一個 coherent split field，
不是兩張 cards。

禁止：

- fake preview
- fake image frame
- grey thumbnail
- sample QR
- fake result
- empty URL field

Mobile：

合理 stack，
不要硬塞左右 split。

---

# 14. Decode success

### D-PV-B refined

URL 是 hero result。

但最新人工接受的 refinement 已經簡化。

## 最終 URL presentation

只顯示：

# 完整 normalized URL 一次

例如：

`https://studio.example.org/events/...`

不要再顯示：

- 大型 `studio.example.org`
- hostname hero
- blue `https://`
- bold hostname
- 同一 URL 的第二種 representation

URL：

- one colour
- one weight
- one typography treatment
- readable size
- natural wrapping

保留一個簡單：

`網址`

label。

保留：

- found state
- Copy
- Open Link
- source image preview
- result floating surface

不要為了填空間新增 metadata。

---

# 15. Decode source image

成功後：

- source image 應該退位
- URL result 是 visual hero

保留最新版 B5 的：

source narrow region
+
result wide region

不要變回：

image ≈ result equal weight

也不要變成：

image-as-floor editor canvas

---

# 16. Border treatment

### BO-F

Layer edges 主要靠：

- tone step
- faint stroke

不要：

- strong border everywhere
- nested outlined cards
- technical grid

Editable controls 可以有較清楚 stroke。

不要讓：

tone + heavy border + heavy shadow

全部堆在同一個 surface。

---

# 17. Shadow system

### SH-D + SH-E + SH-F hybrid

## Level 0

正常：

- page
- tonal regions
- controls

維持 flat。

## Level 1

只有 primary output floating family。

例如：

- generated QR artboard
- Decode URL result surface

使用：

- shallow
- soft
- low-alpha
- subtly ground-tinted shadow

Empty / error 若沒有 output：

不要有 fake L1 object。

## Level 2

真正 overlay：

- Download menu

使用：

- deeper
- clearer shadow

不要讓所有 card 都浮起來。

---

# 18. Mobile

### MD-B

Mobile 要按照最新版 B5 responsive behavior 實作。

不是縮小 desktop。

至少保持：

- stacked command row
- full-width primary where appropriate
- Generate preview readable
- settings reflow
- Download below settings
- Decode split upload becomes stacked
- result readable
- long URL wraps
- no horizontal overflow at 390 / 320

---

# 19. Prototype code不是 production code

非常重要：

不要把：

- `generate.js`
- `decode.js`
- prototype vendor copies

直接當 production implementation source。

那些只是 high-fidelity comp tooling。

Production 必須繼續使用：

- 現有 production state model
- 現有 production TypeScript
- 現有 encoder
- 現有 decoder
- 現有 SVG parser
- 現有 security guards
- 現有 async generation guards

B5 prototype 只提供：

# Visual specification + layout reference

---

# 20. 功能完全凍結

不得改變：

- scheme-less URL normalization
- HTTP(S)-only policy
- dangerous scheme rejection
- Enter generates
- draft edits preserve old QR until Generate
- generated result / draft separation
- stale async guards
- target-size behavior
- minimum-size behavior
- integer module geometry
- transparent background behavior
- JPG disabled when transparent
- PNG / SVG / JPG / WebP export
- Download keyboard behavior
- 20 MiB decode limit
- 768 → 2048 staged decode
- fatal UTF-8 behavior
- SVG safe parser / raster path
- Copy
- Open Link
- `_blank`
- noopener / noreferrer
- file drop behavior
- decode race protection
- cleanup
- no storage
- no upload
- no tracking
- browser-only processing

---

# 21. Security hard boundaries

不要改：

- CSP
- `_headers`
- dependency list
- package versions
- SVG allowlist
- URL validation
- Open Link policy
- sandbox / browser-only privacy model

不要新增：

- remote font
- external image
- CDN
- analytics
- network request
- inline script workaround
- unsafe HTML

如果視覺實作需要 CSP 放寬：

# 不要做。

改用 CSP-compatible implementation。

---

# 22. Accessibility hard boundaries

保留 / 驗證：

- tablist / tab / tabpanel semantics
- labels
- native checkbox
- native file input
- focus-visible
- error associations
- status / alert behavior
- menu semantics
- menu keyboard controls
- disabled semantics
- forced-colors support
- reduced motion
- accessible QR name
- Copy accessible name
- Open Link semantics

不要因視覺重構破壞 DOM reading order。

Mobile 的 visual reordering
不能破壞 keyboard / screen-reader order。

---

# 23. Implementation strategy

先做一份簡短 implementation mapping：

B5 visual element
→
production DOM / CSS / hook

確認：

- 哪些只需 CSS
- 哪些需要 wrapper
- 哪些需要小型 markup change
- 哪些 production node 絕對不能重建

再開始修改。

優先：

# 最少結構變更，最大視覺忠實度。

不要為了「跟 prototype DOM 一樣」
重寫 production markup。

---

# 24. 不要進行 unrelated cleanup

本輪不要：

- refactor encode logic
- refactor decode logic
- rename unrelated functions
- reorganize tests
- upgrade dependencies
- rewrite CSS framework-style
- cleanup unrelated historical code
- remove security comments
- rewrite copy
- fix unrelated TODOs

只做：

# B5 production visual implementation + necessary regression fixes

---

# 25. 必須驗證的 Generate states

至少實際檢查 production：

1. initial empty
2. URL entered
3. generated
4. transparent
5. small QR
6. large constrained preview
7. dense notice
8. modified URL
9. invalid URL
10. target-size validation error
11. Download menu
12. transparent + JPG disabled
13. draft A / generated B state boundaries
14. failed Generate preserves old result

---

# 26. 必須驗證的 Decode states

至少：

1. empty
2. drag-over
3. processing
4. success
5. long URL
6. copied
7. no QR
8. QR not URL
9. unsupported image
10. corrupt image
11. oversized image
12. stale decode race
13. repeated same-file selection where currently supported

確認 success：

- URL only once
- no giant hostname
- no mixed colour/weight URL
- Copy / Open Link correct

---

# 27. Responsive visual verification

至少 capture：

Desktop:
- 1280
- 1440

Tablet / intermediate:
- existing required breakpoint coverage

Mobile:
- 390
- 375 if existing suite covers it
- 320

另外保留現有：

- 200% / enlarged-text checks
- reflow checks

確認：

- 0 horizontal overflow
- no clipping
- long URL wraps
- title crop marks don't clip
- framed tabs fit
- Download menu stays in viewport
- QR preview constrained correctly
- Decode result stays readable

---

# 28. Automated gates

完成 implementation 後：

依 repository 現有正式 release / verification 流程完整執行。

至少：

- typecheck
- Node product tests
- build
- artifact tests
- full browser suite
- Chromium
- Firefox / WebKit if required by current canonical suite
- axe / accessibility suite
- npm audit

不要：

- skip
- lower expectations
- increase timeout just to pass
- remove flaky failures
- disable axe rules
- reduce browser coverage
- change fixtures to hide regressions

報告實際 counts。

不要預先硬寫 PASS。

---

# 29. Independent visual review inside this task

Automated PASS 後，
用 production build / preview 實際 screenshot。

不是 B5 prototype。

建立一組：

`production-b5-review/`

或使用 repo 現有適合的 ignored evidence directory。

不要把大量 screenshots commit 到 production tracked tree，
除非 repository 現有 workflow 本來就是如此。

目視比較：

Production B5
vs
`design-exploration/b5/screenshots/refine-final/`

重點確認：

- title
- framed tabs
- checkbox alignment
- Generate empty
- generated artboard
- settings → Download spacing
- menu direction
- Decode empty
- Decode success
- URL only once
- mobile

若有視覺差異：

先修到合理 fidelity，
不要只寫 NOTE。

---

# 30. Visual acceptance boundaries

不要機械追求 pixel-perfect prototype clone。

Production 應該忠實保留：

- hierarchy
- composition
- spacing intent
- materials
- colour role
- edge language
- elevation language
- typography relationship

如果因：

- semantic HTML
- accessibility
- browser behavior
- production state requirements

需要少量 geometry adjustment，

可以做。

但要記錄。

---

# 31. Documentation

建立：

`B5_PRODUCTION_IMPLEMENTATION_VERIFICATION.md`

至少包含：

1. Executive summary
2. Starting state
3. Files read
4. Implementation mapping
5. Files modified
6. Visual system ported
7. Title implementation
8. Tabs
9. Generate layout
10. Generate preview
11. Settings / Download placement
12. Decode empty
13. Decode result
14. Mobile
15. Functionality preservation
16. Security preservation
17. Accessibility preservation
18. Automated gates
19. Screenshot / visual review
20. Differences from prototype, if any
21. Git / production integrity
22. Manual review checklist
23. Final status

---

# 32. Git policy

本輪：

- 不要 commit
- 不要 amend
- 不要 tag
- 不要 push
- 不要 release
- 不要 deploy

保留所有 changes uncommitted，
交給使用者人工驗收。

不要移動既有 tags。

---

# 33. Final Security Audit

這一輪：

# 不做 Final Security Audit。

可以做必要 security regression verification，
但不要宣稱 release-level final security audit。

Final Security Audit 要等：

1. production B5 implementation
2. automated gates
3. 使用者人工視覺接受

都完成後，
再開獨立 review。

---

# 34. Completion criteria

只有以下全部成立，
才能回報：

`READY_FOR_PRODUCTION_VISUAL_REVIEW`

- B5 已真正移植到 production
- production 不再是舊 R2 visual design
- TW-13 + TW-11 title implemented
- framed tabs implemented
- PB-C / W-B / SD-D / MC-C preserved
- SC-A + SC-F preserved
- G-PV-A preserved
- SE-B preserved
- BO-F preserved
- SH-D/E/F preserved
- CD-E preserved
- EG-C refined preserved
- ED-G preserved
- MD-B preserved
- Generate Download directly follows settings
- desktop Download menu opens in the accepted direction
- Generate empty has no duplicate settings echo
- checkbox aligned
- Decode URL appears only once
- no large hostname duplicate
- no mixed blue scheme / bold hostname
- all production functionality preserved
- all production security boundaries preserved
- accessibility semantics preserved
- full required automated gates pass
- visual screenshots reviewed
- 1280 / 1440 / 390 / 320 reviewed
- no horizontal overflow
- no unexpected console / page errors
- no dependency changes
- no CSP changes
- no Final Security Audit
- no commit
- no tag
- no push
- no release
- no deploy

如果任何 required gate 失敗：

`BLOCKED_OR_INCOMPLETE`

不要把失敗寫成 NOTE 後繼續宣稱完成。

---

# 35. Stop condition

完成 production implementation、
完整驗證、
production screenshots 後停止。

不要自動：

- commit
- audit
- release
- deploy

等待使用者人工檢查正式 production B5。
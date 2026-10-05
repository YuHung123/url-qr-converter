# URL QR Converter v1.1.0 — Module-Aligned Target Size Fix

$model-routing

請先盤點目前實際安裝的 skills，並主動使用真正適合本任務的 skills。

優先考慮：

- `$model-routing`
- receiving-code-review
- systematic-debugging
- verification-before-handoff
- browser / Playwright / accessibility / testing 類 skill（若實際存在）

只使用實際存在的 skill。
不要宣稱使用不存在的 skill。
不要為了使用 skill 擴大任務。

---

# 任務定位

目前 URL QR Converter v1.1.0 處於：

`BLOCKED_OR_INCOMPLETE`

上一輪已成功實作：

- output-size-aware preview
- dynamic dimension display
- transparent background
- transparent PNG
- transparent WebP
- transparent SVG
- transparent mode 下 disabled JPG
- checkerboard preview
- responsive preview sizing
- accessibility behavior

但上一輪指定的 compact raster geometry：

`boundary(i) = floor(i * size / totalModules)`

會造成同一張 QR 內不同 module 寬度不一致。

例如：

185 total modules
target 512 px

會產生：

- 43 格 × 2 px
- 142 格 × 3 px

雖然：

- pixel geometry 正確
- 沒有 interpolation
- 沒有 gray edge
- 4-module quiet zone存在

但 jsQR 1.4.0 會對部分密集 QR 錯估 dimension，造成實際 decode regression。

明確 blocker：

185 total modules / 512 px

compact mapping：

QR version / matrix 正確，
但 jsQR dimension estimation錯誤，
PNG／JPG／WebP round-trip FAIL。

因此本輪要：

**撤銷 variable-width compact geometry。**

改成：

**uniform integer pixels per module + target-size snapping。**

使用者輸入的不再是「精確輸出尺寸」，而是：

**目標尺寸**

實際輸出尺寸則選擇最接近目標、同時能讓所有 QR modules 完全等寬的合法尺寸。

---

# 1. 開始前完整閱讀

完整閱讀：

- `V1_1_OUTPUT_PREVIEW_TRANSPARENT_VERIFICATION.md`
- `V1_1_CUSTOM_OUTPUT_SIZE_VERIFICATION.md`
- `V1_1_FUNCTIONAL_FREEZE_VERIFICATION.md`
- `V1_1_FINAL_SVG_AUDIT.md`
- `V1_1_PRE_TAG_CLEANUP_VERIFICATION.md`
- `README.md`
- `CHANGELOG.md`
- `RELEASE_CHECKLIST.md`
- `index.html`
- `src/main.ts`
- `src/qr.ts`
- `src/svg.ts`
- `src/decode.ts`
- `src/styles.css`
- `tests/`
- `package.json`
- `playwright.config.mjs`

特別理解上一輪 report 中：

- compact geometry root cause
- jsQR dimension diagnostic
- 185 / 512 failure
- preview implementation
- transparency implementation
- SVG security status
- current failed tests

不要只從本 prompt 猜現有實作。

---

# 2. Git / Working Tree

目前上一輪失敗版本仍為：

uncommitted working tree。

開始前執行：

git status
git log --oneline --decorate -8
git tag -n
git diff --check
git diff --cached --check

不要：

- reset
- checkout 丟棄修改
- stash
- clean
- amend
- rebase

不要退回上一個 commit 後重新做。

應直接在目前 working tree 上：

保留上一輪已成功的 preview / transparency 功能，
只修正必要的 geometry contract、UI copy、tests 與 docs。

如果看到無法由歷史報告解釋的 unrelated changes：

停止並報告。

---

# 3. 核心決策

本輪採用：

**uniform integer module size**

而不是：

**variable-width compact boundary mapping**

核心原則：

每一個 QR grid cell：

- width完全相同
- height完全相同
- integer pixels
- square
- no interpolation

因此：

使用者輸入值只是：

`targetSize`

實際輸出：

`actualSize`

不一定等於 targetSize。

---

# 4. UI Copy — Final Specification

將現有 visible label：

`輸出尺寸`

改為 EXACT：

`目標尺寸`

Unit 保持：

`px`

Default 保持：

`256`

不要 placeholder。

不要正常 helper text。

---

# 5. Size Validation Copy

同步修改所有與欄位名稱相關的產品文案。

## Empty

EXACT：

`請輸入目標尺寸。`

## Malformed

EXACT：

`請輸入有效的目標尺寸。`

## Decimal

保持：

`請輸入整數尺寸。`

## Below global minimum

EXACT：

`目標尺寸不得小於 64 px。`

## Above global maximum

EXACT：

`目標尺寸不得大於 2048 px。`

## QR-specific minimum

保持 EXACT pattern：

`此 QR Code 至少需要 {minimum} px。`

例如：

`此 QR Code 至少需要 370 px。`

---

# 6. Other Existing Copy

保持：

`透明背景`

保持：

`QR Code 較密，建議下載後掃描。`

保持：

`圖片檔案過大(上限20MB)`

不要新增透明背景 helper / warning。

尤其不要加入：

`透明背景請搭配淺色、單純的背景。`

或任何同義說明。

---

# 7. Preview Actual Size Copy

上一輪 preview dimension：

`{size} × {size} px`

本輪改成 EXACT pattern：

`實際尺寸：{actualSize} × {actualSize} px`

例如：

`實際尺寸：246 × 246 px`

或：

`實際尺寸：555 × 555 px`

這是正常資訊。

不要把尺寸 snapping 當 warning。

不要新增：

- 尺寸已調整
- 已自動調整
- 最接近尺寸
- 建議尺寸
- QR 已放大
- QR 已縮小

只顯示：

`實際尺寸：...`

---

# 8. Target Size Range

使用者仍可輸入：

64–2048

正整數。

這個範圍是：

**targetSize 的輸入範圍**

不是要求 actualSize 必須與 targetSize完全相等。

保持上一輪 parsing rules：

拒絕：

- empty
- malformed
- text
- scientific notation
- expression
- unit suffix
- decimal
- negative
- zero

不要改回 native number validation messages。

---

# 9. Minimum QR Size

保持：

`MIN_PIXELS_PER_MODULE = 2`

以及：

`minimumTargetSize = totalModules * 2`

如果：

targetSize < minimumTargetSize

不要 snap。

直接拒絕 raster output，顯示：

`此 QR Code 至少需要 {minimumTargetSize} px。`

例如：

185 total modules

minimum：

370

target：

300

→ error：

`此 QR Code 至少需要 370 px。`

---

# 10. Uniform Module Geometry

定義：

`totalModules = qrModules + 8`

其中：

4-module quiet zone / side。

對合法 targetSize：

計算最接近目標的 uniform integer scale。

候選：

`lowerScale = floor(targetSize / totalModules)`

`upperScale = ceil(targetSize / totalModules)`

只允許：

`scale >= 2`

actual size：

`actualSize = totalModules * scale`

---

# 11. Choose Nearest Valid Scale

從合法的 lower / upper candidates 中：

選擇：

`abs(actualSize - targetSize)`

最小者。

如果距離完全相同：

**選擇較大的 scale。**

理由：

在完全同距離時偏向較高 raster detail。

不得根據：

- payload
- browser
- format

使用不同策略。

---

# 12. Maximum Actual Raster Size

產品現有 raster resource ceiling 不應因 snapping 無限制擴張。

Actual raster output：

不得超過：

`2048 px`

因此合法候選 scale 還必須符合：

`totalModules * scale <= 2048`

如果 upper candidate 超過2048：

使用合法的 lower candidate。

Target input 本身仍限制 ≤2048。

不要讓 target 2048 最後生成 2100+ raster。

---

# 13. Example — Required Regression

## Near-capacity

totalModules：

185

target：

512

計算：

512 / 185 ≈ 2.7676

lower：

2
→ 370

upper：

3
→ 555

距離：

|512 - 370| = 142

|555 - 512| = 43

因此選：

scale = 3

actual：

555 × 555

每格：

3 × 3 px

要求：

- every grid cell exactly 3×3
- no outer centering padding
- no mixed 2/3 px cells
- quiet zone = 4 grid cells
- direct jsQR round-trip PASS
- production decoder round-trip PASS
- PNG PASS
- JPG PASS
- WebP PASS
- transparent PNG PASS
- transparent WebP PASS

這是本輪最重要 regression。

---

# 14. More Examples

不要 hardcode以下尺寸。

只是 algorithm examples。

## 41 total modules / target 256

256 / 41 ≈ 6.24

候選：

6 → 246
7 → 287

246較接近。

actual：

246 × 246

---

## 97 total modules / target 256

256 / 97 ≈ 2.64

2 → 194
3 → 291

291較接近。

actual：

291 × 291

---

## 133 total modules / target 300

300 / 133 ≈ 2.26

2 → 266
3 → 399

266較接近。

actual：

266 × 266

---

## 185 total modules / target 387

387 / 185 ≈ 2.09

2 → 370
3 → 555

370較接近。

actual：

370 × 370

---

# 15. No Padding

新的 actual canvas：

`actualSize × actualSize`

整個 canvas正好就是：

`totalModules × scale`

因此：

不要加入：

- centering padding
- remainder padding
- extra whitespace
- boundary distribution

真正的外圍空白只來自：

QR 規格本身的 4 logical quiet-zone modules。

---

# 16. Remove Compact Boundary Mapping

撤銷 production renderer 中：

`boundary(i) = floor(i * selectedSize / totalModules)`

用來產生 variable-width grid 的邏輯。

不要保留兩套 production mode：

- compact
- uniform

不要根據 density 自動切換。

Raster export與preview一律：

uniform integer grid。

---

# 17. Do Not Change Decoder

不要為了救 compact geometry：

- fork jsQR
- patch node_modules
- monkey-patch computeDimension
- inject known QR version
- add decode fallback
- rotate image
- nearest-neighbor upscale retry
- change dependency
- upgrade dependency
- replace decoder

上一輪 diagnostic只用來確認 root cause。

本輪正確修復點是：

renderer contract。

`src/decode.ts` 應保持 byte-identical。

---

# 18. QR Logical Data

不要修改：

- EC M
- Byte mode
- payload
- URL normalization
- QR auto version
- matrix
- quiet-zone module count

這些不是 root cause。

---

# 19. Preview Behavior

保留上一輪成功的：

output-size-aware preview。

但現在 preview應反映：

**actual snapped size**

而不是 target canvas size。

例如：

target input：

512

current QR：

185 totalModules

actual：

555

preview canvas：

555 × 555

dimension text：

`實際尺寸：555 × 555 px`

---

# 20. Preview CSS Display Size

保留上一輪：

`displayedPreviewSize = min(actualSize, availablePreviewSize)`

概念。

所以：

actual 555

如果 desktop preview container只有369 CSS px：

canvas intrinsic：

555 × 555

CSS displayed：

369 × 369

dimension text仍：

`實際尺寸：555 × 555 px`

不要把 CSS display size當 output size。

---

# 21. Immediate Preview

已有 generated QR 時：

修改 target size為另一個合法值：

立即：

- calculate new scale
- calculate actualSize
- rerender generated matrix
- update dimension text

不需要：

- Generate
- blur
- Download

例如：

target：

256

→ actual 246

使用者改：

512

→ actual 533 / 555 / 582 等，依該 QR totalModules決定

preview立即更新。

---

# 22. Invalid Target Input

保持上一輪 UX：

如果 input暫時為：

- empty
- abc
- decimal
- <64
- >2048
- below QR-specific minimum

不要 destroy preview。

保留：

最後一個 valid actual preview。

正式 validation仍按照既有 timing：

- blur
- raster Download
- Enter

---

# 23. Generated vs Draft URL

保持：

Generate A
→ preview A

Edit URL to B
→ preview仍A

Change target
→ rerender A

Toggle transparent
→ rerender A

Download raster
→ A

Successful Generate B
→ matrix才換B

Target/background不應重新 encode draft URL。

---

# 24. Transparent Background

保留上一輪已成功實作。

Default：

OFF

Label：

`透明背景`

OFF：

- PNG white
- JPG white
- WebP white
- SVG white

ON：

- PNG transparent
- WebP transparent
- SVG transparent
- JPG disabled

不要重做此功能。

---

# 25. Transparent Raster Geometry

Transparent PNG/WebP也必須使用：

uniform integer scale。

例如：

185 / target512

transparent PNG/WebP：

actual555

每格3px。

Transparent background不能使用 compact boundary mapping。

---

# 26. JPG Disabled

保持上一輪通過的：

transparent ON
→ JPG disabled

包括：

- native disabled semantics
- keyboard skip
- cannot activate
- accessible disabled state

transparent OFF：

恢復 JPG。

不要加常駐說明文字。

---

# 27. SVG

SVG不使用：

target raster size
或
actual raster size。

保持：

- intrinsic module-unit geometry
- viewBox
- vector output
- transparent variant
- white variant
- picker round-trip
- drag/drop round-trip

Raster target invalid：

仍不得阻擋 SVG。

---

# 28. SVG Security

`src/svg.ts` 上一輪已證明不需要修改。

本輪要求：

**保持 byte-identical。**

不要修改：

- parser
- allowlist
- namespace policy
- geometry bounds
- external-resource rules

Existing malicious SVG regressions仍需PASS。

---

# 29. Preview Transparency

保留：

transparent ON
→ CSS checkerboard behind transparent canvas

checkerboard：

- presentation only
- not raster output
- not SVG
- aria-hidden / decorative

OFF：

white background output preview。

---

# 30. Actual Size Calculation Helper

優先建立或修改成 small pure helper，例如概念上：

`resolveRasterSize(targetSize, totalModules)`

return：

- scale
- actualSize
- minimumSize

不要讓 main.ts UI handler自行複製算法。

PNG/JPG/WebP/preview：

必須共用同一 helper / rendering geometry。

---

# 31. Raster Renderer

Production renderer直接建立：

`actualSize × actualSize`

RGBA buffer。

對 logical grid：

每個 module固定：

`scale × scale`

所有 coordinates：

integer multiples of scale。

不要：

- drawImage resize
- CSS screenshot
- interpolation
- mixed-width modules
- post-resize

---

# 32. Pixel Properties

White mode：

- background RGB 255/255/255
- alpha255
- black modules 0/0/0 alpha255

Transparent mode：

- background alpha0
- dark modules black alpha255
- no partial alpha
- no white matte

JPG：

white mode only。

---

# 33. Existing Size Range Semantics

README / code comments / UI不得再說：

「輸入多少就一定輸出多少」。

現在語意為：

**目標尺寸**

Actual output由 QR grid決定。

不要稱它：

exact output size。

---

# 34. Tests — Remove Wrong Expectations

上一輪因 compact geometry新增的：

- mixed cell-width expectations
- boundary floor mapping expectations
- exact target raster-size assertions

如果它們與新 contract衝突：

應更新為：

uniform-grid + nearest-actual-size expectations。

但：

不要刪除 round-trip assertions。

上一輪真正重要的 FAIL tests：

必須轉成 PASS。

---

# 35. Dedicated 185 / 512 Regression

建立明確且獨立的 regression：

Input：

near-capacity 177-module QR
totalModules185
target512

Expected：

- scale3
- actual555
- 555×555
- 4-module quiet zone
- first finder dark coordinate符合 uniform scale
- all grid cells3px
- direct jsQR exact payload
- application decoder exact payload

White:

- PNG
- JPG
- WebP

Transparent:

- PNG
- WebP

全部 PASS。

不要只測 dimension。

---

# 36. Previous Four Decoder Failures

上一輪 report列出的至少四種失敗情況：

- medium / total97 / target256
- dense / total133 / target300
- near-capacity / total185 / target387
- near-capacity / total185 / target512

全部改成新 snapped geometry後：

必須 direct jsQR PASS。

也必須 production application decode PASS。

記錄：

- target
- chosen scale
- actual size
- expected modules
- decoded payload

---

# 37. Target Size Test Matrix

至少測：

64
128
256
300
387
512
1024
2048

在適用 QR 上。

驗證：

- parsing
- valid target
- snapped actual
- preview dimensions
- downloaded actual dimensions

不需要每個 QR測每個target。

---

# 38. Actual Size Must Be Deterministic

同一：

- matrix
- target

在：

- Chromium
- Firefox
- WebKit
- PNG
- JPG
- WebP

必須得到同一：

scale
actualSize

不能由 browser canvas行為決定。

---

# 39. Nearest-Size Tie Test

加入 pure unit test。

構造 target正好位於：

lowerActual
與
upperActual

中點。

Expected：

選擇：

higher scale / larger actual size。

確保 tie rule deterministic。

---

# 40. 2048 Ceiling Test

至少建立一個：

nearest upper multiple > 2048

的 case。

確認：

選擇合法 lower scale，
actualSize ≤2048。

不得生成超過 ceiling 的 raster。

---

# 41. Preview Tests

至少：

Generate A

Target 256
→ actual X
→ dimension `實際尺寸：X × X px`

Target 300
→ actual Y
→ immediate preview Y

Target 512
→ actual Z
→ immediate preview Z

Target 2048
→ actual ≤2048
→ CSS constrained

Invalid input
→ last valid preview retained

不要把 target text誤當 actual display。

---

# 42. Transparency Preview Tests

保留：

white
→ transparent ON
→ same payload / matrix / actual size
→ alpha changes only

OFF
→ same actual size
→ white restored

Target changes：

可以改 actual size，
但 transparency state保持。

---

# 43. Format Regression

White mode：

PNG
JPG
WebP
SVG

Transparent mode：

PNG
WebP
SVG

JPG disabled。

所有支援 raster格式：

下載 dimensions必須等於：

actualSize

不是：

targetSize。

---

# 44. Documentation

## README

將：

custom exact raster output size

相關說明改成：

使用者設定目標尺寸，
工具會選擇最接近且可保持 QR module完整對齊的實際尺寸。

保持簡潔。

說明：

preview會顯示實際尺寸。

不要解釋完整數學公式給一般 README 讀者。

---

# 45. CHANGELOG

在 unreleased v1.1.0 entry：

記錄：

- target-size snapping
- module-aligned uniform raster geometry
- decoder compatibility correction

保留：

- preview
- transparency

不要建立1.1.1。

---

# 46. RELEASE_CHECKLIST

更新 manual acceptance：

- target256 → observe actual size
- target300
- target512 dense / near-capacity
- actual preview matches downloaded file
- no excessive padding
- phone scan
- transparent PNG/WebP
- white JPG
- SVG

---

# 47. Historical Reports

不要修改：

- `V1_1_OUTPUT_PREVIEW_TRANSPARENT_VERIFICATION.md`
- `V1_1_CUSTOM_OUTPUT_SIZE_VERIFICATION.md`
- `V1_1_FUNCTIONAL_FREEZE_VERIFICATION.md`
- `V1_1_FINAL_SVG_AUDIT.md`
- 其他歷史報告

它們保留當時狀態。

---

# 48. Security

本輪不是 Final Security Audit。

但必須確認：

- SVG parser unchanged
- CSP unchanged
- dependencies unchanged
- decoder unchanged
- malicious SVG regressions PASS
- no-network PASS
- no-storage PASS
- active-payload PASS

如果為了 geometry fix發現必須改 decoder：

停止並報告。

不要自行擴 scope。

---

# 49. Accessibility

更新 accessible label：

從：

`輸出尺寸`

到：

`目標尺寸`

保持：

- native label
- input accessible name
- px unit不污染 name
- error association
- aria-invalid
- transparent checkbox
- JPG disabled semantics
- dimension text只讀一次
- keyboard
- focus-visible

Axe：

0 violations。

不要 disable rules。

---

# 50. Responsive

保留上一輪成功的 preview constraints。

Actual intrinsic size例如：

555

在 container只有369 CSS px時：

display 369

dimension text：

`實際尺寸：555 × 555 px`

測：

- desktop
- 768
- 375
- 320
- 200% equivalent text/reflow

要求：

- no overflow
- no overlap
- no clipping

---

# 51. Required Gates

完成後在 clean Windows native repository執行：

npm.cmd ci
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
npm.cmd run test:artifact
npm.cmd run test:browser
npm.cmd audit
npm.cmd ls --omit=dev --all
git diff --check
git diff --cached --check

要求：

- Node全部 PASS
- artifact全部 PASS
- Chromium全部 PASS
- Firefox全部 PASS
- WebKit全部 PASS
- skipped0
- retry0
- flaky0
- unexpected0
- axe0 violations
- npm audit0 vulnerabilities

不得：

- skip failing decode test
- change failure to expected failure
- add retry
- increase timeout to hide issue
- weaken jsQR assertion
- remove application round-trip
- remove near-capacity case

---

# 52. Verification Report

建立：

`V1_1_TARGET_SIZE_GEOMETRY_FIX_VERIFICATION.md`

至少包含：

## 1. Executive Summary

## 2. Root Cause

說明上一輪：

variable-width 2/3px modules
→ jsQR dimension estimation failure。

## 3. Product Contract Change

說明：

`輸出尺寸`
→
`目標尺寸`

以及：

target != guaranteed actual。

## 4. Exact UI Copy

列：

- 目標尺寸
- validation messages
- 實際尺寸
- 透明背景

## 5. New Geometry

說明：

- uniform integer scale
- nearest legal actual size
- tie higher
- min scale2
- max actual2048
- no padding
- 4-module quiet zone

## 6. Snapping Examples

至少：

41/256
97/256
133/300
185/387
185/512

列：

- target
- lower
- upper
- chosen scale
- actual

## 7. 185 / 512 Regression

必須明確證明：

target512
→ actual555
→ 3px/module
→ PNG/JPG/WebP decode PASS
→ transparent PNG/WebP PASS

## 8. Previous Failure Recovery

列出上一輪四個主要失敗案例現在結果。

## 9. Preview

列：

- target
- actual
- intrinsic canvas
- CSS display size
- dimension text

## 10. Transparency

確認上一輪功能沒有 regression。

## 11. SVG / Security

確認 parser byte-identical。

## 12. Accessibility

## 13. Responsive

## 14. Required Gates

## 15. Scope Integrity

確認：

- decoder unchanged
- EC M unchanged
- Byte unchanged
- payload unchanged
- URL normalization unchanged
- CSP unchanged
- deps unchanged
- no UI redesign

## 16. Git State

## 17. Remaining Manual Acceptance

至少：

- real phone scan
- real camera
- Word/PDF
- actual visual size acceptance
- real Android
- real Safari
- print
- Narrator/NVDA/VoiceOver
- native200% zoom
- deployment

## 18. Functional Freeze Decision

只能：

- FUNCTIONALLY_FROZEN
- BLOCKED_OR_INCOMPLETE

---

# 53. Completion Criteria

只有以下全部成立才能重新標：

`FUNCTIONALLY_FROZEN`

要求：

- `輸出尺寸` 改為 EXACT `目標尺寸`
- default256
- target range64–2048
- no placeholder
- empty EXACT `請輸入目標尺寸。`
- malformed EXACT `請輸入有效的目標尺寸。`
- decimal EXACT `請輸入整數尺寸。`
- min EXACT `目標尺寸不得小於 64 px。`
- max EXACT `目標尺寸不得大於 2048 px。`
- dynamic minimum unchanged
- preview EXACT pattern `實際尺寸：{actual} × {actual} px`
- target snapping implemented
- all modules same integer width/height
- minimum2px/module
- no variable-width boundary mapping
- no centering padding
- 4-module quiet zone preserved
- actualSize deterministic
- tie chooses larger scale
- actualSize <=2048
- 185/512 → 555
- 185/512 all raster white round-trip PASS
- 185/512 transparent PNG/WebP round-trip PASS
- previous compact-geometry decoder failures recovered
- preview uses actual snapped dimensions
- preview updates immediately
- generated/draft separation preserved
- transparent background preserved
- transparent PNG PASS
- transparent WebP PASS
- transparent SVG PASS
- JPG disabled under transparency
- checkerboard preview-only
- invalid raster target does not block SVG
- SVG parser unchanged
- decoder unchanged
- EC M unchanged
- Byte mode unchanged
- payload unchanged
- normalization unchanged
- dense guidance unchanged
- oversize upload copy unchanged
- CSP unchanged
- production dependencies unchanged
- version1.1.0
- Node PASS
- typecheck PASS
- build PASS
- artifact PASS
- Chromium PASS
- Firefox PASS
- WebKit PASS
- skipped0
- retry0
- flaky0
- unexpected0
- axe0 violations
- npm audit0 vulnerabilities
- git diff check PASS
- no commit
- no tag
- no push
- no release
- no deploy

完成後停止。

不要開始完整 UI/UX redesign。
不要開始 Final Security Audit。
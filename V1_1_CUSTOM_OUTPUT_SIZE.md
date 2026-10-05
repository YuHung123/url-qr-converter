# URL QR Converter v1.1.0 — Custom Raster Output Size

$model-routing

請先盤點目前已安裝的 skills，並主動使用真正適合本任務的 skills。

優先考慮：

- `$model-routing`
- receiving-code-review
- verification-before-handoff
- systematic-debugging（只有遇到非預期問題時）
- browser / Playwright / accessibility / testing 類 skill（若目前實際存在）

只使用實際可用的 skill。
不要宣稱使用不存在的 skill。
不要為了使用 skill 擴大任務。

---

# 任務定位

URL QR Converter v1.1.0 先前已達：

`FUNCTIONALLY_FROZEN`

但人工驗收後，使用者確認固定約 512 px 的 raster QR 仍不符合實際需求。

因此：

**暫時解除 functional freeze。**

本輪新增一個小型、明確的功能：

> 使用者可以自行輸入 PNG / JPG / WebP 的輸出尺寸。

完成並重新驗證後，若所有 gates 通過：

重新標記：

`FUNCTIONALLY_FROZEN`

本輪不是 UI/UX redesign。

之後會另外交給 Claude 重新設計網站 UI/UX。

---

# 1. 開始前閱讀

完整閱讀：

- `V1_1_FUNCTIONAL_FREEZE_VERIFICATION.md`
- `V1_1_PRE_TAG_CLEANUP_VERIFICATION.md`
- `V1_1_FINAL_SVG_AUDIT.md`
- `README.md`
- `CHANGELOG.md`
- `RELEASE_CHECKLIST.md`
- `index.html`
- `src/main.ts`
- `src/qr.ts`
- `src/decode.ts`
- `src/svg.ts`
- `src/styles.css`
- `tests/`
- `package.json`
- `playwright.config.mjs`

以及所有與：

- QR raster export
- Download PNG / JPG / WebP / SVG
- download split button
- validation / error state
- accessibility

直接相關的程式。

先執行：

git status
git log --oneline --decorate -8
git tag -n
git diff --check

確認目前狀態。

不要：

- reset
- checkout 丟棄修改
- amend
- rebase
- stash
- clean
- 覆蓋未知修改

如果出現無法解釋的 unrelated changes：

停止並報告。

---

# 2. Scope

本輪只處理：

1. 新增「輸出尺寸」數字欄位
2. raster output 改成使用使用者指定的精確 canvas dimensions
3. 尺寸 validation 與錯誤文案
4. PNG / JPG / WebP 共用尺寸
5. SVG 不受尺寸設定影響
6. 對應 tests / docs / verification

不要做其他功能。

---

# 3. 最終 UI 文案

## Field label

EXACT：

`輸出尺寸`

## Unit

EXACT：

`px`

呈現概念：

輸出尺寸
[ 256 ] px

---

# 3.1 Default

預設值：

`256`

---

# 3.2 Placeholder

不要設定 placeholder。

不要顯示：

- 64–2048
- 建議 256
- 請輸入尺寸
- 最小尺寸
- pixels/module
- 任何正常狀態 helper text

正常狀態只需要：

`輸出尺寸`
input
`px`

---

# 4. Input Rules

允許：

**64–2048 px**

而且只接受：

**正整數**

不允許：

- 空白
- 文字
- NaN
- Infinity
- 小數
- 負數
- 0
- scientific notation
- expression
- 單位一起輸入，如 `256px`

不要依賴 browser native validation message 作為產品錯誤文案。

產品自己控制 validation copy。

---

# 5. Exact Error Copy

以下文字全部視為產品規格。

## Empty

EXACT：

`請輸入輸出尺寸。`

---

## Invalid number / malformed value

例如：

- abc
- --
- 1e2
- 256px
- 非數字字串

EXACT：

`請輸入有效的輸出尺寸。`

---

## Decimal

例如：

- 128.5
- 256.1

EXACT：

`請輸入整數尺寸。`

---

## Below global minimum

例如：

32

EXACT：

`輸出尺寸不得小於 64 px。`

---

## Above global maximum

例如：

4096

EXACT：

`輸出尺寸不得大於 2048 px。`

---

## Current QR is too dense for requested size

動態訊息：

`此 QR Code 至少需要 {minimum}px。`

注意：

使用者已確認一般尺寸文案使用：

`64 px`

這類帶空格格式。

因此這句也請統一為：

`此 QR Code 至少需要 {minimum} px。`

例如：

`此 QR Code 至少需要 266 px。`

不要使用：

- 尺寸太小
- QR 密度太高
- 無法產生
- 建議提高解析度
- technical pixels/module wording

---

# 6. Existing Oversize Upload Error

保持現有 EXACT：

`圖片檔案過大(上限20MB)`

不要改回：

- MiB
- 全形括號
- 空格版本
- 句尾句號

內部實際限制仍維持 20 MiB。

---

# 7. Size Validation Timing

不要在使用者輸入每一個字元時 aggressive 顯示錯誤。

例如使用者從：

256

改成：

128

輸入過程中不應因短暫空白立刻大量跳 error。

請沿用專案目前既有 validation UX，採最自然、最少干擾的行為。

至少在以下時機必須驗證：

- raster Download action
- blur（若目前表單 pattern 適合）
- Enter / keyboard activation 如適用

核心要求：

**絕不能下載與欄位值不一致的 raster file。**

---

# 8. Raster Formats

尺寸欄位只影響：

- PNG
- JPG
- WebP

三者必須共用完全相同：

- final canvas width
- final canvas height
- QR placement
- quiet-zone geometry
- pixels/module calculation

只允許：

- MIME
- lossy encoder quality

有差異。

---

# 9. SVG

SVG 是向量格式。

本輪：

**完全不受輸出尺寸設定影響。**

保持現有：

- intrinsic width / height
- viewBox
- vector modules
- quiet zone
- security parser compatibility
- picker round-trip
- drag/drop round-trip

不要把 SVG rasterize。

不要把使用者輸入的：

256
512
2048

寫入 SVG。

---

# 9.1 Current Download UX

目前 SVG 是 download split menu 中的立即下載 action，不是持久的 format selection。

因此：

**不要為了隱藏輸出尺寸欄位而重新設計 download component。**

本輪尺寸欄位可以維持可見。

點擊 SVG 時：

- 不讀取 raster size 作為 SVG dimensions
- 不因 raster size invalid 阻擋 SVG download
- SVG 應正常下載

例如 raster size 欄目前輸入：

`32`

雖然 PNG/JPG/WebP 不合法，

但 SVG download 本身仍應可以正常工作。

這點請加 regression test。

未來完整 UI/UX redesign 時，再決定 SVG 選取狀態下是否隱藏尺寸欄位。

---

# 10. Exact Raster Canvas Size

使用者輸入：

`256`

產品 raster download 必須真的得到：

`256 × 256 px`

輸入：

`300`

必須得到：

`300 × 300 px`

輸入：

`512`

必須得到：

`512 × 512 px`

不要像前一版：

使用者目標 512，
實際得到 528 / 533 / 582。

這一輪的核心就是：

**final raster canvas dimension = exact requested size**

---

# 11. Integer QR Modules

即使 final canvas 要精確符合輸入尺寸：

QR module 本體仍不能 interpolation。

定義：

`totalModules = qrModules + 8`

其中：

4-module quiet zone × 2。

計算：

`pixelsPerModule = floor(selectedSize / totalModules)`

QR logical drawing size：

`qrPixelSize = totalModules * pixelsPerModule`

剩餘：

`remaining = selectedSize - qrPixelSize`

把 QR 整體置中在：

`selectedSize × selectedSize`

白色 canvas。

---

# 12. Centering

如果 remaining 是偶數：

左右／上下平均。

例如：

selectedSize = 100
qrPixelSize = 82

remaining = 18

則：

9 px
+
82 px QR
+
9 px

---

如果 remaining 是奇數：

例如：

remaining = 19

允許：

- top/left = 9
- bottom/right = 10

或等價 deterministic placement。

只要：

- QR完整
- 中心偏差最多 1 px
- 所有 module 邊界仍是整數 pixel

不要 interpolation。

---

# 13. Minimum Pixels Per Module

本輪規格：

**至少 2 px/module**

因此：

`MIN_PIXELS_PER_MODULE = 2`

需要：

`floor(selectedSize / totalModules) >= 2`

否則：

raster download 不允許。

---

# 14. Dynamic Minimum Size

依目前 QR 計算：

`minimumSize = totalModules * 2`

如果使用者輸入：

selectedSize < minimumSize

顯示：

`此 QR Code 至少需要 {minimumSize} px。`

例如：

QR totalModules = 133

則：

minimumSize = 266

使用者輸入 128：

`此 QR Code 至少需要 266 px。`

---

# 15. Global vs QR-specific Validation Order

Validation 順序固定：

1. empty
2. malformed / non-number
3. decimal
4. < 64
5. > 2048
6. QR-specific minimum

例如：

QR minimum = 266

輸入：

32

應顯示：

`輸出尺寸不得小於 64 px。`

不是：

`此 QR Code 至少需要 266 px。`

因為先違反 global product range。

輸入：

128

才顯示：

`此 QR Code 至少需要 266 px。`

---

# 16. Default 256 and Dense QR

預設：

256

但有些高密度 QR 可能需要：

>256

Generate 成功後，如果目前 QR 的 minimum size 高於 256：

不要偷偷：

- 把欄位改成 minimum
- 自動提高 output size
- 下載不同尺寸

使用者決定輸出值。

如果他按 raster download：

顯示：

`此 QR Code 至少需要 {minimum} px。`

行為必須 predictable。

---

# 17. Do Not Change QR Logical Density

本輪不要修改：

- Error Correction M
- Byte encoding
- payload
- URL normalization
- auto QR version
- matrix generation
- quiet zone
- dense threshold

不要試圖：

- M → L
- shorten URL
- remove query
- re-encode payload differently

這一輪只控制 raster canvas。

---

# 18. High-density Existing Notice

保持：

`QR Code 較密，建議下載後掃描。`

以及目前：

- modules threshold
- live announcement
- accessibility duplicate handling

全部不變。

尺寸 validation 是另一件事。

不要混用兩個訊息。

---

# 19. Input HTML / Accessibility

輸出尺寸必須是正確的表單 control。

要求：

- visible `<label>` 或等價 native label
- accessible name = `輸出尺寸`
- `px` 不要被錯誤合併成欄位名稱
- error 可被 screen reader 關聯
- invalid 時有適當 `aria-invalid`
- error message 有合理 `aria-describedby` / existing error pattern
- keyboard可操作
- focus-visible正常

不要只靠 placeholder 當 label。

---

# 20. number input vs text input

請 review目前跨 Chromium / Firefox / WebKit 的行為後，選擇最穩定方案。

如果使用：

`input type="number"`

要確認：

- browser spinner是否符合目前極簡 UI
- scientific notation輸入行為
- decimal validation
- native validity不會冒出不同語言錯誤
- keyboard / mobile usability

如果使用：

`inputmode="numeric"`

搭配 text validation更穩定，

也可以。

不要只為了方便使用 native validation，導致三個 browser出現不同產品錯誤。

最終 exact error copy 由 application控制。

---

# 21. Input Persistence

使用者修改輸出尺寸：

不要：

- 重新生成 QR matrix
- 清除 QR
- 改變 URL
- 重新 normalize URL

因為尺寸只是 export preference。

若 QR A 已經生成：

改尺寸後：

QR preview A 應保持不變。

Download 下一次使用新的有效尺寸。

---

# 22. Draft URL State

保持目前既有：

Generate A
→ 修改 URL 成 B
→ QR A 仍顯示

此時 raster download 仍應：

下載顯示中的 QR A

但使用：

目前合法的 output size。

不要把未生成的 URL draft B 寫進下載內容。

既有 stale/export protection 必須保留。

---

# 23. Raster Export Architecture

優先重用：

- existing QR matrix
- existing render helper
- existing canvas/export pipeline

不要建立三份 renderer。

建議將：

- parse / validate output size
- calculate raster geometry

抽成小型 pure helpers，方便 Node tests。

避免 UI handler內堆大量 calculation。

---

# 24. Raster Geometry Example

例如：

totalModules = 41

selectedSize = 256

`floor(256 / 41) = 6`

所以：

QR logical pixel area：

`41 × 6 = 246`

remaining：

`10`

四周新增：

5 px 額外白邊。

final file：

`256 × 256`

QR modules仍全部：

6 × 6 px。

注意：

原有 4-module quiet zone 已經包含在 246 px QR area中。

額外 5px只是 canvas centering padding。

不要把它誤算成 quiet zone replacement。

---

# 25. 64 px Behavior

不要保證：

64px一定可用。

例如：

totalModules = 41

`floor(64 / 41) = 1`

不符合：

2 px/module

所以：

64px在此 QR 上應被拒絕。

錯誤：

`此 QR Code 至少需要 82 px。`

64 只是 global minimum，

不是所有 QR 都可輸出的保證。

---

# 26. 2048 px

最大：

2048

即使 QR 很小，也允許：

2048 × 2048

因為這是使用者明確要求的輸出尺寸。

不要再自動縮回較小尺寸。

---

# 27. No Raster Interpolation

禁止：

- scale existing 512 image
- drawImage resize
- CSS screenshot
- bilinear filtering

QR modules應直接以 final:

pixelsPerModule

畫入：

selectedSize × selectedSize

canvas。

QR module edges仍要是整數 coordinates。

---

# 28. Background

PNG / JPG / WebP：

保持：

- white background
- opaque canvas
- black QR modules

尤其：

JPG / WebP 不應因新 centering padding出現：

- transparency
- gray background
- black edge

---

# 29. Raster Test Matrix

至少測：

## Field validation

- empty
- abc
- `1e2`
- `256px`
- 128.5
- 63
- 64
- 2048
- 2049

---

## QR-specific minimum

至少用：

- short QR
- medium QR
- dense QR
- near-max capacity QR

計算各自：

- modules
- totalModules
- minimumSize

測：

- minimum - 1 → reject
- exact minimum → PASS
- minimum + arbitrary value → PASS

---

# 30. Exact Dimension Tests

至少測實際 raster output：

- 64（只有 QR允許時）
- 128
- 256
- 300
- 512
- 1024
- 2048

不需要每個 QR都測全部尺寸。

但要證明：

不是只支援固定 powers-of-two。

特別加入：

`300 × 300`

或其他非 preset 數字。

---

# 31. Three Raster Formats

對同一：

URL
size

PNG / JPG / WebP：

final dimensions必須完全相同。

例如：

selectedSize = 300

則三者：

300 × 300

---

# 32. Raster Decode Regression

對實際下載的：

- PNG
- JPG
- WebP

使用現有 decoder / jsQR regression驗證。

至少：

- short
- medium
- dense

在合法尺寸下：

exact URL round-trip。

---

# 33. SVG Regression

確認：

output size欄：

- 32
- empty
- malformed

時，

SVG仍可下載。

因為 SVG 不依賴 raster size。

SVG：

- picker round-trip
- drag/drop round-trip
- security regression

保持 PASS。

不要修改 SVG parser。

---

# 34. Download Menu

不要 redesign download component。

保持既有：

- main PNG download action
- dropdown menu
- SVG
- JPG
- WebP

目前項目順序如果與現有產品一致：

不要在這輪調整。

Download format order留待後續 UI/UX redesign一起決定。

---

# 35. Error State Interaction

尺寸錯誤只屬於：

raster export controls。

不要把它誤顯示成：

URL validation error
或
QR decode error。

建立或沿用清楚的：

output-size error region。

錯誤被修正後：

要清除。

---

# 36. Format-specific Behavior

PNG / JPG / WebP：

invalid size
→ 不下載
→ 顯示 size error

SVG：

invalid raster size
→ 正常下載
→ 不因 raster size error被阻擋

如果之前已有 size error：

點 SVG 不應讓使用者誤以為 SVG download失敗。

請設計合理的 error-state cleanup，但不要引入大量新 UI logic。

---

# 37. Existing Oversize Upload Error Regression

再次確認：

圖片上傳 > internal 20 MiB 時：

EXACT：

`圖片檔案過大(上限20MB)`

此 error和：

`輸出尺寸`

完全不同。

不要混用 error region。

---

# 38. Responsive

新欄位必須在：

- desktop
- 768
- 375
- 320
- 200% equivalent reflow

正常。

至少確認：

`輸出尺寸 [ 256 ] px`

不會：

- overflow
- label / input / unit互相擠壓
- error 撐破 layout
- download controls錯位

但：

**不要做 UI redesign。**

只讓新欄位自然融入現有 layout。

---

# 39. Axe / Accessibility

完整 browser gate仍需：

- axe 0 violations
- no disabled rules

新增 targeted assertions：

- visible label
- accessible name
- aria-invalid
- error association
- keyboard
- error clearing

實際 screen-reader仍保留人工驗收。

---

# 40. Documentation

最小更新：

## README

說明：

- PNG/JPG/WebP 可自訂 64–2048 px
- default 256 px
- QR 太密時有 dynamic minimum
- SVG 是 vector，不使用 raster output size

不要把 README 寫成 implementation manual。

---

## CHANGELOG

在未發布的 1.1.0 entry補：

- custom raster QR output size

不要建立：

1.1.1

---

## RELEASE_CHECKLIST

加入人工驗收：

- custom output size
- non-preset size，例如 300 px
- dynamic minimum
- SVG unaffected

---

# 41. Historical Reports

不要修改：

- V1_1_FUNCTIONAL_FREEZE_VERIFICATION.md
- V1_1_PRE_TAG_CLEANUP_VERIFICATION.md
- V1_1_FINAL_SVG_AUDIT.md
- V1_1_FINAL_UX_SVG_VERIFICATION.md
- 其他歷史 audit / verification

它們是當時的歷史紀錄。

---

# 42. Security Scope

本輪不要重新設計 security model。

必須保持：

- SVG parser byte-identical
- CSP unchanged
- dependencies unchanged
- URL normalize unchanged
- Open Link unchanged
- decoder security unchanged

如果 implementation需要碰：

`src/svg.ts`

立即停止並報告。

不要自行擴 scope。

---

# 43. Production Dependencies

不要增加任何 production dependency。

輸出尺寸不需要新 library。

---

# 44. Required Gates

完成後，在乾淨 Windows repository環境執行：

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

- Node 全 PASS
- artifact 全 PASS
- Chromium PASS
- Firefox PASS
- WebKit PASS
- skipped 0
- retry 0
- flaky 0
- unexpected 0
- axe 0 violations
- npm audit 0 vulnerabilities

不要修改：

- timeout
- retries
- projects
- skip
- axe rules

---

# 45. Manual-like Browser Inspection

在 Playwright / browser test中至少實際下載：

## short QR

- 128或256
- 300
- 512

## dense QR

- minimum - 1 → error
- exact minimum → download
- larger arbitrary size → download

確認 actual file dimensions。

---

# 46. No Phone Claim

Automated QR decode：

不等於：

real phone scan。

人工：

- phone
- camera
- print

仍標：

NOT VERIFIED。

---

# 47. Version

保持：

`1.1.0`

不要建立：

- 1.1.1
- v1.1.0 tag

因為 UI/UX redesign與最終 security audit尚未完成。

---

# 48. Git

完成後保持：

未 commit。

不要：

- commit
- tag
- push
- release
- deploy

---

# 49. Verification Report

建立：

`V1_1_CUSTOM_OUTPUT_SIZE_VERIFICATION.md`

至少包含：

## 1. Executive Summary

## 2. Scope

## 3. UI Copy

列出：

- label
- unit
- default
- exact errors

## 4. Validation Rules

列：

- 64–2048
- integer
- dynamic minimum
- validation order

## 5. Raster Geometry

說明：

- totalModules
- pixelsPerModule
- qrPixelSize
- centering
- exact final canvas size

## 6. Raster Samples

表格：

| QR case | Requested | Minimum | px/module | Actual PNG | JPG | WebP |

至少包含：

- 128 / 256 / 300 / 512
- dense minimum edge
- 2048 sanity

## 7. SVG Behavior

確認：

- unaffected
- raster-invalid input不阻擋 SVG
- round-trip

## 8. Error Interaction

## 9. Accessibility

## 10. Regression

包含：

- URL draft/generated
- download stale protection
- density notice
- Copy/Open Link
- SVG security tests

## 11. Required Gates

## 12. Scope Integrity

明確確認：

- SVG parser unchanged
- CSP unchanged
- dependencies unchanged
- QR M / Byte unchanged
- UI redesign未開始

## 13. Git State

## 14. Remaining Manual Acceptance

## 15. Functional Freeze Decision

只能：

- FUNCTIONALLY_FROZEN
- BLOCKED_OR_INCOMPLETE

---

# 50. Completion Criteria

只有全部成立才能重新標：

`FUNCTIONALLY_FROZEN`

要求：

- visible label EXACT `輸出尺寸`
- unit EXACT `px`
- default `256`
- no placeholder
- no normal helper text
- empty error EXACT `請輸入輸出尺寸。`
- malformed error EXACT `請輸入有效的輸出尺寸。`
- decimal error EXACT `請輸入整數尺寸。`
- <64 EXACT `輸出尺寸不得小於 64 px。`
- >2048 EXACT `輸出尺寸不得大於 2048 px。`
- QR-specific error EXACT dynamic：
  `此 QR Code 至少需要 {minimum} px。`
- global validation order正確
- valid range 64–2048
- arbitrary integer sizes支援
- exact requested raster canvas dimension
- no interpolation
- QR modules integer pixels
- min 2 px/module
- 4-module quiet zone保留
- QR置中
- PNG/JPG/WebP same dimensions
- SVG不受 raster size影響
- invalid raster size不阻擋 SVG
- default 256不自動改值
- high-density QR不偷偷提高尺寸
- EC M unchanged
- Byte mode unchanged
- URL payload unchanged
- existing dense guidance unchanged
- oversize upload EXACT：
  `圖片檔案過大(上限20MB)`
- SVG parser unchanged
- CSP unchanged
- production deps unchanged
- Node PASS
- typecheck PASS
- build PASS
- artifact PASS
- Chromium PASS
- Firefox PASS
- WebKit PASS
- skipped 0
- retry 0
- flaky 0
- unexpected 0
- axe 0 violations
- audit 0 vulnerabilities
- version 1.1.0
- no commit
- no tag
- no push
- no release
- no deploy

完成後停止。

不要開始 UI/UX redesign。
不要開始 final security audit。
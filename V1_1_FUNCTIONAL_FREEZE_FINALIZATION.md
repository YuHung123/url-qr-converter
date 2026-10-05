# URL QR Converter v1.1.0 — Functional Freeze Finalization

$model-routing

請先盤點目前已安裝的 skills，並依任務需要主動使用合適的 skill。

優先考慮：

- `$model-routing`
- receiving-code-review
- verification-before-handoff
- systematic-debugging（只有遇到非預期失敗時）
- browser / Playwright / accessibility / testing 類 skill（若實際已安裝）

只使用實際存在的 skill。
不要宣稱使用不存在的 skill。
不要為了使用 skill 擴大任務範圍。

---

# 任務定位

目前 URL QR Converter v1.1.0 已完成：

- URL → QR Code
- PNG / JPG / WebP / SVG 匯出
- QR image → URL
- PNG / JPG / WebP / SVG decode
- drag & drop
- Copy
- Open Link
- scheme-less URL
- localhost port
- accessibility cleanup
- SVG 安全解析
- Final UX + SVG audit
- clean Windows canonical browser verification

目前尚未建立：

- v1.1.0 tag
- release
- deployment

人工驗收又發現兩個最後的 functional / usability 問題。

本輪只處理：

1. oversized image error 文案
2. QR download 尺寸過大的問題

完成後若 required gates 全 PASS：

**將 v1.1.0 宣告為 FUNCTIONALLY_FROZEN。**

下一階段會另外交給 Claude 做完整 UI/UX redesign。

本輪不要做 UI redesign。

---

# 1. 開始前確認

完整閱讀：

- `V1_1_PRE_TAG_CLEANUP_VERIFICATION.md`
- `V1_1_FINAL_SVG_AUDIT.md`
- `V1_1_FINAL_UX_SVG_VERIFICATION.md`
- `README.md`
- `CHANGELOG.md`
- `RELEASE_CHECKLIST.md`
- `index.html`
- `src/qr.ts`
- `src/main.ts`
- `src/decode.ts`
- `src/svg.ts`
- `tests/`
- `package.json`
- `playwright.config.mjs`

以及所有與 QR export sizing 直接相關的程式與 tests。

先執行：

git status
git log --oneline --decorate -8
git tag -n
git diff --check

確認目前 repository state。

重要：

前一輪 Final UX + SVG 與 pre-tag cleanup 可能仍是未 commit 狀態。

不要：

- reset
- checkout 丟棄修改
- amend
- rebase
- 覆蓋未知修改

如果存在與已知工作無關的未知修改：

停止並報告。

---

# 2. Scope Lock

本輪只允許：

## A. Oversized image error copy

修改 oversized image error：

從目前：

`圖片檔案過大（上限 20 MiB）。`

改為 EXACT：

`圖片檔案過大(上限20MB)`

注意：

- 使用半形 `(`
- 使用半形 `)`
- `上限` 前後不要空格
- 顯示 `20MB`
- 句尾不要 `。`

這只是 UI copy。

## B. QR download pixel sizing policy

重新設計 QR download pixel sizing policy。

目標：

- 一般 QR 不再預設輸出約 1024～1056px 的大圖
- 普通 QR 約 512px 即可
- 高密度 QR 保持可掃描所需的合理 module pixel size
- 不任意 resize / interpolate QR
- QR module 邊界永遠對齊整數 pixels

---

# 3. 不要處理的事情

不要修改：

- QR error correction level M
- QR payload
- URL normalization
- Byte encoding policy
- QR matrix generation
- quiet zone module count
- scheme-less handling
- localhost handling
- SVG parser security model
- SVG allowlist
- decoder architecture
- UTF-8 validation
- Open Link
- Copy
- CSP
- dependencies
- file-size limit本身
- 20 MiB內部數值
- UI layout
- typography
- colors
- cards
- navigation
- tabs visual design
- animations
- personal-site integration

尤其：

**不要為了降低「密度」把 Error Correction M 改成 L。**

不要加入：

- URL shortener
- 自動移除 query string
- 自動縮短網址
- 新尺寸 selector
- 256 / 512 / 1024 選單
- QR customization controls

這些全部不在本輪 scope。

---

# 4. 20 MB 文案 vs Internal Limit

產品目前實際限制仍維持：

20 MiB

也就是既有 byte threshold 不改。

不要把程式限制改成：

20,000,000 bytes

只把使用者看到的錯誤文字改成：

`圖片檔案過大(上限20MB)`

這是刻意使用較容易理解的 UI 單位。

README / technical docs 若需要描述精確 implementation：

仍可使用：

20 MiB

不要因 UI 文案修改而讓內部限制 drift。

---

# 5. QR Export Sizing Problem

目前 raster export 使用至少約 1024px 的策略。

人工檢查實際短網址 QR 得到：

約：

1056 × 1056 px

對低密度 QR 而言：

- QR matrix 本身不大
- quiet zone 正確
- 但每個 module 被放大到過多 pixels
- 導致一般用途下載檔顯得過大

這對：

- 個人網站
- 備審資料
- Word
- PDF
- 一般分享

沒有必要。

---

# 6. QR Density vs Pixel Dimensions

請保持概念分離。

## QR logical density

由：

- payload 長度
- QR version
- encoding
- error correction

決定。

本輪不改。

## Export pixel dimensions

由：

- module count
- quiet zone
- pixels per module

決定。

本輪只改這一層。

不要把：

「降低輸出 pixel dimensions」

錯誤解讀成：

「修改 QR logical density」。

---

# 7. New Raster Sizing Goal

PNG / JPG / WebP：

一般 QR 的目標下載尺寸：

**約 512 × 512 px**

但：

不要把 QR rasterize 後再縮放到硬性 512px。

必須保證：

**1 QR module = 整數 pixels**

並維持：

**4-module quiet zone**

---

# 8. Recommended Sizing Formula

先 review 現有 QR renderer，再以最小改動實作等價策略。

定義：

`totalModules = qrModules + 8`

其中 8 來自：

- left quiet zone 4
- right quiet zone 4

上下同理。

普通目標：

`TARGET_SIZE = 512`

基本 pixels-per-module：

`ceil(TARGET_SIZE / totalModules)`

但高密度 QR 不應降到過小 module。

因此建議：

`MIN_PIXELS_PER_MODULE = 4`

最終：

`pixelsPerModule = max(ceil(TARGET_SIZE / totalModules), MIN_PIXELS_PER_MODULE)`

然後：

`exportSize = totalModules * pixelsPerModule`

---

# 9. Expected Consequences

例如：

如果：

`totalModules = 33`

則：

`ceil(512 / 33) = 16`

所以：

`33 × 16 = 528 px`

這是合理的普通 QR 大小。

---

如果：

`totalModules = 93`

則：

`ceil(512 / 93) = 6`

所以：

`93 × 6 = 558 px`

---

如果是極高密度：

`totalModules = 185`

則：

`ceil(512 / 185) = 3`

但：

`MIN_PIXELS_PER_MODULE = 4`

所以：

`185 × 4 = 740 px`

因此高密度 QR：

- 不會硬壓成 512px
- 也不會一律膨脹到 1024+
- 每個 module 至少維持 4×4 pixels

這是目前希望的平衡。

---

# 10. Do Not Hardcode Example Sizes

上面的：

- 528
- 558
- 740

只是推導範例。

實作應以：

- actual module count
- quiet zone
- integer pixels/module

動態計算。

不要針對特定 QR version 寫 size table。

---

# 11. Renderer Reuse

PNG、JPG、WebP：

應共用同一個：

- exportSize
- pixelsPerModule
- quiet zone geometry

策略。

不要出現：

- PNG 一套 size
- JPG 另一套 size
- WebP 又一套 size

三個 raster formats 應具有相同 pixel geometry。

僅：

- MIME
- encoder quality

不同。

---

# 12. No Interpolation

QR raster export 不應經過：

- image resize
- CSS scaling後截圖
- bilinear interpolation
- browser image resampling

QR modules 應直接畫在 final canvas resolution。

每個 dark module：

完整覆蓋整數 pixel rectangle。

quiet zone：

也必須是整數 module width。

---

# 13. SVG

先檢查目前 SVG export 真正的：

- width
- height
- viewBox

以及安全 SVG decoder 對：

- width
- height
- viewBox

的 validation requirement。

不要假設 SVG 和 raster 現在使用同一個 1024px sizing。

---

# 13.1 SVG Design Goal

SVG 本身是 vector。

因此：

**不要為了「解析度」把 SVG 做成 1024px。**

SVG 應：

- 保持真正的 vector modules
- 保持 4-module quiet zone
- 保持正確 viewBox
- 不 rasterize
- 任意放大仍清晰

如果目前 SVG intrinsic width / height 已經是：

`totalModules`

而不是 1024+：

不要為了強迫「512」而改壞既有安全 round-trip。

---

# 13.2 SVG User Experience

如果目前 SVG 真的帶有約 1024px 的 intrinsic display size：

才考慮將 intrinsic size 調整到約 512px。

但任何修改都必須確保：

Generate
→ SVG download
→ picker decode
→ drag/drop decode

仍然成功。

尤其目前安全 SVG parser 對：

- width
- height
- viewBox

有嚴格規則。

**不要為了視覺尺寸破壞自家 SVG round-trip。**

如果 SVG 其實沒有 1024px 問題：

保持 SVG export byte-identical 或邏輯不變。

並在報告中說明：

`SVG 為 vector，實際尺寸問題只存在 raster download。`

---

# 14. High-density QR

不要試圖在這一輪降低 QR logical density。

保持：

- Byte mode
- Error Correction M
- existing QR version selection

理由：

相同完整網址要放入 QR 時，logical module count 有容量下限。

把：

M → L

雖可能降低部分 QR version，

但會犧牲：

- 印刷容錯
- 手機相機掃描
- 模糊容錯
- 角度容錯
- 污損容錯

不符合目前產品用途。

---

# 15. Existing Dense Guidance

現有：

`QR Code 較密，建議下載後掃描。`

保留。

不要修改：

- threshold
- text
- live-region behavior

本輪 export 尺寸改變後，仍保留該提示。

---

# 16. Export File Size

不要以：

檔案 byte size

作為主要 acceptance criterion。

重點是：

- dimensions合理
- module integer aligned
- QR 可 decode
- visual quality
- output不過度巨大

PNG / JPG / WebP 的實際 byte size自然可能不同。

---

# 17. Download Filename

保持既有下載檔名政策。

例如目前若為：

- `qr-code.png`
- `qr-code.jpg`
- `qr-code.webp`
- `qr-code.svg`

就保持不變。

不要修改 filename policy。

---

# 18. Raster Regression Tests

新增或修改 Node / browser tests，驗證 sizing policy。

至少覆蓋：

## Short QR

確認：

- raster output明顯低於舊 1024+ baseline
- 約 512px
- dimensions = totalModules × integer
- quiet zone正確
- decode成功

## Medium QR

確認：

- integer module geometry
- 約 512～合理略高
- decode成功

## Dense QR

確認：

- pixels/module >= 4
- 不硬壓成 512
- 不一律固定 1024+
- decode成功

## Maximum practical QR

使用目前 encoder 能成功產生的接近容量上限樣本。

確認：

- export不失真
- jsQR round-trip PASS
- dimensions合理
- 不產生沒有理由的大尺寸

---

# 19. Four-format Regression

實際產生：

- PNG
- JPG
- WebP
- SVG

確認：

## PNG

- correct dimensions
- decode成功

## JPG

- same raster dimensions as PNG
- white background
- decode成功

## WebP

- same raster dimensions
- correct MIME
- decode成功

## SVG

- valid vector output
- picker round-trip
- drag/drop round-trip

---

# 20. Exact Example Regression

如果方便，以短 URL 建立與人工截圖案例相近的 QR。

目前人工觀察：

約：

1056 × 1056 px

新結果應明顯下降。

如果該 QR：

`totalModules = 33`

則預期大約：

`528 × 528 px`

但：

不要把 528 硬編碼成產品規則。

只把它當 regression evidence。

---

# 21. Export Quality

對 raster output 檢查：

- pure white quiet zone
- black modules
- no gray interpolation edges
- square
- integer cell boundaries
- opaque background
- JPEG沒有透明背景問題

可以使用 pixel-level test 驗證幾何。

---

# 22. Phone Scan Is Manual

automated jsQR round-trip只是 regression。

不要宣稱它等於：

real phone scan。

本輪 report 中：

`real phone scan`

仍保持：

NOT VERIFIED

等待後續 manual acceptance。

---

# 23. Error Copy Regression

將 oversized file exact visible error改為：

`圖片檔案過大(上限20MB)`

更新必要的：

- implementation
- exact-text tests
- RELEASE_CHECKLIST 若其中仍要求舊文字
- README 若其中直接引用使用者可見舊文案

不要改內部 limit。

---

# 24. Search Old Copy

全 repo 搜尋：

- `MiB`
- `圖片檔案過大`
- `上限 20`
- `20 MiB`

分類處理：

## UI / exact user-facing copy

改成新指定文字：

`圖片檔案過大(上限20MB)`

## Technical documentation

如果是在解釋真實 byte limit：

可以保留：

`20 MiB`

## Historical audit / verification reports

不要修改。

歷史報告保留當時狀態。

---

# 25. Scope Integrity

本輪不得修改：

- `src/svg.ts` security parsing
- SVG allowlist
- SVG security boundary
- decode architecture
- CSP
- dependencies
- Open Link
- URL normalization
- accessibility cleanup
- UI styling

如果為了 export sizing 發現必須修改 SVG parser：

**先停止並報告。**

不要自行擴大 security-sensitive scope。

如果 oversized error copy 位於 decode UI mapping 中，允許只修改該文案，不得趁機重構 decode pipeline。

---

# 26. UI/UX Redesign

本輪：

**禁止重新設計 UI。**

不要：

- 換配色
- 換字體
- 加卡片
- 改 grid
- 改 tab風格
- 加 icon
- 改 page width
- 改 header
- 加 animation
- 改整體 visual hierarchy

下一階段會另外把：

**個人網站 design system + URL QR Converter redesign**

交給 Claude 的 UI/UX skill。

所以這輪只做 functional freeze。

---

# 27. Security Scope

本輪不需要重新執行完整 36 hostile SVG security audit。

因為：

SVG parser 不應修改。

但必須確認：

- existing SVG security tests仍 PASS
- CSP unchanged
- dependencies unchanged
- SVG round-trip unchanged

如果實際 diff 碰到：

- SVG parser
- CSP
- dependency

立即停止並報告 scope breach。

---

# 28. Required Gates

完成修改後，在乾淨 Windows環境執行：

npm.cmd test
npm.cmd run typecheck
npm.cmd run build
npm.cmd run test:artifact
npm.cmd run test:browser
npm.cmd audit
npm.cmd ls --omit=dev --all
git diff --check

要求：

- Node全 PASS
- artifact全 PASS
- Chromium全 PASS
- Firefox全 PASS
- WebKit全 PASS
- skipped 0
- retry 0
- flaky 0
- unexpected 0
- axe 0 violations
- audit 0 vulnerabilities

不要修改：

- timeout
- retry
- skip
- browser projects

---

# 29. Targeted Export Inspection

除了 automated tests，實際輸出至少：

1. short URL
2. medium URL
3. dense URL

記錄：

- QR logical module count
- totalModules including quiet zone
- pixels/module
- PNG dimensions
- JPG dimensions
- WebP dimensions
- SVG intrinsic dimensions
- SVG viewBox

將 before / after sizing寫入 report。

---

# 30. Version

保持：

`1.1.0`

不要建立：

`1.1.1`

原因：

v1.1.0 尚未 tag。

---

# 31. Git

本輪完成後：

保持未 commit。

不要：

- commit
- tag
- push
- release
- deploy

因為還要先人工查看新的下載尺寸。

---

# 32. Verification Report

建立：

`V1_1_FUNCTIONAL_FREEZE_VERIFICATION.md`

至少包含：

## 1. Executive Summary

## 2. Scope

只列：

- 20MB copy
- export sizing

## 3. Oversize Error

列：

- internal threshold
- visible message
- tests

## 4. Old Export Sizing

說明舊 formula 與實際 short QR example。

## 5. New Export Sizing Policy

列：

- TARGET_SIZE
- MIN_PIXELS_PER_MODULE
- totalModules
- formula

## 6. Raster Results

表格：

| Case | QR modules | Total modules | px/module | PNG | JPG | WebP |

## 7. SVG Result

說明：

- intrinsic dimensions
- viewBox
- 是否修改
- round-trip

## 8. Density Decision

明確記錄沒有修改：

- Error Correction M
- Byte mode
- logical QR matrix

並說明此輪只改 pixel dimensions。

## 9. QR Quality / Round-trip

## 10. Required Gates

## 11. Scope Integrity

確認：

- SVG parser unchanged
- decode architecture unchanged except required error copy
- CSP unchanged
- deps unchanged
- UI styling unchanged

## 12. Git State

## 13. Remaining Manual Acceptance

保留：

- real phone scan
- actual downloaded image visual size
- native 200% zoom
- Narrator
- real camera photo
- Safari / Android
- print
- deployment

## 14. Functional Freeze Decision

只能：

- FUNCTIONALLY_FROZEN
- BLOCKED_OR_INCOMPLETE

---

# 33. Completion Criteria

只有以下全部成立：

- visible oversize message EXACT：
  `圖片檔案過大(上限20MB)`
- internal 20 MiB byte threshold unchanged
- normal raster QR不再約1024+
- normal target約512px
- every QR module使用整數 pixels
- quiet zone仍為4 modules
- dense QR至少4 px/module
- dense QR不一律固定1024+
- PNG / JPG / WebP使用同一 geometry
- no interpolation
- all raster formats round-trip
- SVG round-trip保持
- QR Error Correction仍M
- Byte mode unchanged
- QR matrix generation unchanged
- dense guidance unchanged
- SVG security parser unchanged
- CSP unchanged
- production dependencies unchanged
- version仍1.1.0
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
- npm audit 0 vulnerabilities
- git diff check PASS
- no commit
- no tag
- no push
- no release
- no deploy

才可標記：

`FUNCTIONALLY_FROZEN`

完成後停止。

不要開始 UI/UX redesign。
不要自行 commit。
不要建立 v1.1.0 tag。

---

# Codex 啟動指令

將本文件存成：

`V1_1_FUNCTIONAL_FREEZE_FINALIZATION.md`

然後在 Codex 中執行：

Read V1_1_FUNCTIONAL_FREEZE_FINALIZATION.md in full and execute it. Use $model-routing and any other installed skills that are genuinely useful. Stay strictly within scope, do not commit/tag/push/deploy, and stop after producing the requested verification report.
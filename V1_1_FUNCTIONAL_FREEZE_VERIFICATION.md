# URL QR Converter v1.1.0 — Functional Freeze Verification

日期：2026-10-02。基礎與結束 HEAD：`da4f4ab5f1c9c176eedaf3ce16246d025a38f4a2`。本輪保持未 commit；沒有 tag、push、release 或 deploy。

## 1. Executive Summary

**FUNCTIONALLY_FROZEN**。指定的 oversized image error 已改為 exact `圖片檔案過大(上限20MB)`，內部 20 MiB byte threshold 不變。PNG／JPG／WebP 共用約 512 px 的整數 module sizing，高密度每格至少 4 px；SVG 向量輸出不變。

乾淨 Windows `npm.cmd ci` 後，required gates 全 PASS：Node 37/37、artifact 4/4、canonical browser 102/102（Chromium／Firefox／WebKit 各 34/34）、axe 21 scans／0 violations、npm audit 0 vulnerabilities。Browser skipped／retry／flaky／unexpected 全為 0。

功能凍結依本輪合約的 automated completion criteria 成立；實機／人工驗收仍需完成。Verification-before-handoff 狀態：**AUTOMATED_PASSED_HUMAN_ACCEPTANCE_REQUIRED**。本輪沒有 UI/UX redesign，也不表示已發布或部署。

開始前已完整閱讀任務指定的三份歷史報告、README、CHANGELOG、RELEASE_CHECKLIST、HTML、四份 TypeScript source、tests 全部文字程式與 fixture 說明、package.json、Playwright config，並搜尋 export sizing 的所有直接引用。

已盤點 session skill catalog 與可讀的實際 SKILL.md。實際使用：model-routing（依 opt-in gate 保留 PRIMARY，未派 subagent）、receiving-code-review（先核對 renderer 與回饋）、verification-before-handoff、systematic-debugging（Windows interop 與容量 fixture 失敗）、context7:context7-mcp（查核 Playwright 1.63.0 download／outputPath／attachment API）。本 session 沒有提供專用 browser／Playwright／accessibility／testing skill；使用 repository 原生 Playwright suite。其他已安裝 skills 與本輪範圍無關，未套用。

## 2. Scope

- 20MB copy。
- Export sizing。

配套修改只涉及上述兩項的 regression tests、README 現行 sizing 說明與 checklist exact error copy；歷史 audit／verification reports 保留原文。

## 3. Oversize Error

| 項目 | 結果 |
| --- | --- |
| Internal threshold | `20 * 1024 * 1024`＝20,971,520 bytes（20 MiB），unchanged |
| Visible message | EXACT：`圖片檔案過大(上限20MB)` |
| Implementation | `src/main.ts` 的 `too-large` UI mapping，只改字串 |
| Node boundary | Exactly 20 MiB 到達 image processing；20 MiB + 1 在讀取前拒絕 |
| Browser exact copy | PNG picker、SVG picker、PNG drag/drop，三引擎 PASS |
| Early rejection | Oversized PNG 的 `createImageBitmap` 呼叫 0，三引擎 PASS |

使用半形括號，`上限20MB` 無空格，句尾無 `。`。全 repo 搜尋 `MiB`、`圖片檔案過大`、`上限 20`、`20 MiB`：現行 user-facing expectations 與 checklist 已更新；README 與 boundary tests 的精確技術單位仍為 20 MiB，歷史報告及原任務文件不改寫。沒有改成 20,000,000 bytes。

## 4. Old Export Sizing

舊策略：`totalModules = modules + 8`；`pixelsPerModule = ceil(1024 / totalModules)`；`exportSize = totalModules * pixelsPerModule`。PNG／JPG／WebP 原本都從同一 canvas 匯出。

實際短 URL `https://example.com/`：25 QR modules、33 total modules，原本 `33 * 32 = 1056` px；現在 `33 * 16 = 528` px。Node regression 實際產生新 pixels、完整 jsQR round-trip、逐 pixel 檢查並斷言 528；這是 regression evidence，產品沒有硬編碼 528。

修改 renderer 前，更新後的 Node sizing assertions 在舊 renderer 上產生預期的 5 個 failure（32/37）；其中短 URL 顯示 `1056 !== 528`，證明測試可辨識舊問題。

## 5. New Export Sizing Policy

- TARGET_SIZE：512（implementation：`targetSize`）。
- MIN_PIXELS_PER_MODULE：4（implementation：`minPixelsPerModule`）。
- `totalModules = qrModules + 8`；每邊 quiet zone 保持 4 modules。
- `pixelsPerModule = max(ceil(512 / totalModules), 4)`。
- `exportSize = totalModules * pixelsPerModule`。

只改 `createQrPixels()` 的 scale／size calculation。既有 final-resolution RGBA buffer、dark module 整數座標迴圈與 `putImageData()` 保留；沒有 resize、interpolation、CSS screenshot 或 size table。PNG／JPG／WebP 共用同一 canvas；MIME 與既有 0.98 lossy encoder quality 不變。

## 6. Raster Results

以下來自 canonical browser gate 實際 Generate → Download → 讀取檔案 dimensions，三引擎結果一致；每個 case 都下載四種格式並保存 `export-sizing.json`。

| Case | QR modules | Total modules | px/module | PNG | JPG | WebP |
| --- | ---: | ---: | ---: | --- | --- | --- |
| Short ASCII（48 bytes） | 33 | 41 | 13 | 533 × 533 | 533 × 533 | 533 × 533 |
| Medium（520 bytes） | 89 | 97 | 6 | 582 × 582 | 582 × 582 | 582 × 582 |
| Dense Unicode normalized（1071 bytes） | 125 | 133 | 4 | 532 × 532 | 532 × 532 | 532 × 532 |
| Maximum practical（2331 bytes） | 177 | 185 | 4 | 740 × 740 | 740 × 740 | 740 × 740 |

| Case | Before px/module | Before raster | After raster |
| --- | ---: | --- | --- |
| Short ASCII | 25 | 1025 × 1025 | 533 × 533 |
| Medium | 11 | 1067 × 1067 | 582 × 582 |
| Dense Unicode normalized | 8 | 1064 × 1064 | 532 × 532 |
| Maximum practical | 6 | 1110 × 1110 | 740 × 740 |
| Exact short URL（Node） | 32 | 1056 × 1056 | 528 × 528 |

Before dimensions 由 unchanged logical matrix 與舊 formula 推導；1056 px 症狀另由修改前 Node run 實際重現。After dimensions 是本轮實際產物測量。

Samples：short 為 `https://example.com/independent?source=segno&v=1`；medium 為 `https://example.com/` + 500 個 `a`；dense 為 `https://例子.測試/採訪?q=😀&long=` + 1000 個 `a`，先沿既有 normalization；maximum 為 `https://example.com/` + 2311 個 `a`。

Maximum 是 encoder EC M／Byte 可成功生成的 2331-byte version 40 URL；Node 另斷言多一個 Byte 會被 encoder 拒絕。開發時第一次容量 fixture 誤用 2332 bytes，得到 `code length overflow. (18676>18672)`；已依實際容量更正 fixture，沒有改 encoder／encoding／error correction。

實際下載檔與 12 份 geometry JSON 位於 ignored `test-results/refinement-PNG-SVG-JPG-Web-*/`，可由本次 reporter 的 `export-sizing` attachments 定位；沒有納入 dist。

## 7. SVG Result

**SVG 為 vector，實際尺寸問題只存在 raster download。** `createQrSvg()` function 與本輪開始時 byte-identical；沒有修改 intrinsic dimensions、viewBox 或 vector path。

| Case | Intrinsic width × height | viewBox |
| --- | --- | --- |
| Short ASCII | 41 × 41 | `0 0 41 41` |
| Medium | 97 × 97 | `0 0 97 97` |
| Dense Unicode normalized | 133 × 133 | `0 0 133 133` |
| Maximum practical | 185 × 185 | `0 0 185 185` |

仍為 unit-sized vector modules、4-module quiet zone 與白底；沒有為 SVG 加入 512／1024 px intrinsic size，也沒有 rasterize SVG download。安全 decoder 要求 width／height 與 viewBox 相等，本輪保留此規則。

四個 cases 的實際 SVG download → picker → drag/drop 全部逐字 round-trip，三引擎 PASS。原 SVG suite 的 Unicode、Copy、Open Link、偽裝 PNG 與 stale SVG tests 也 PASS。測試為 jsQR inspection 將 SVG 畫到測試 canvas 的 1024+ 尺寸，只是既有測試流程，並非下載檔 intrinsic size 或產品 raster policy。

## 8. Density Decision

Error Correction **M**、**Byte mode**、既有 auto QR version selection、logical QR matrix 與完整 normalized URL payload 都沒有修改。`createQrMatrix()` 與 URL normalization 原文不變；既有 SVG matrix test 及新增 raster pixel checks 比對另行生成的 EC M／Byte reference。

本輪只改 export pixel dimensions。沒有 M → L、URL shortener、刪 query、縮 payload 或新 size selector。Dense guidance threshold ≥85 modules、`QR Code 較密，建議下載後掃描。` 與共用 live-region behavior 不變；既有三引擎 announcement regression PASS。

## 9. QR Quality / Round-trip

- Node 檢查七種 payload 長度（20／30／200／500／1000／1800／2331），全部 final pixels 精確對應 reference matrix 的完整整數 cells；四周 4-module white quiet zone、RGB 純 0／255、alpha 255、square、jsQR exact round-trip PASS。
- Browser 的四個 cases／三引擎逐 pixel 比對 production canvas，mismatches 全為 0；實際 PNG 檔每個 pixel 與 production canvas 相等。沒有 gray interpolation edges。
- 48 份實際下載檔（4 cases × 4 formats × 3 engines）檢查 filename、signature／MIME、dimensions、opaque background、quiet zone 與 jsQR exact payload；PNG／JPG／WebP 同一 final geometry。JPG 白底不透明。
- JPG／WebP 保留既有 lossy tolerance：完整 quiet zone 無 dark contamination，白邊內部接近純白；不把 codec compression 的灰階誤稱為 renderer interpolation。未放寬既有 pixel tolerances 或 encoder quality。
- 同一批下載檔再由 application picker 解碼，全部 exact URL；SVG 另做 drag/drop。下載仍代表 displayed QR，測試保留修改 draft 後的 export assertions。
- 目視檢查 Chromium 實際 short／medium／dense PNG：正方形、白邊完整、modules 清楚；此檢查不代替使用者對下載圖實際顯示大小的人工驗收。

Automated jsQR regression **不等於 real phone scan**。

## 10. Required Gates

環境：Windows 11 `10.0.26200`／build 26200、native Node `v24.21.0`、npm `11.19.0`、Playwright `1.63.0`。Native cwd：`C:\Users\yuhun\Desktop\url-qr-converter`。

初次 sandbox 內 Windows probe 在 WSL interop 層得到 `UtilBindVsockAnyPort: socket failed 1`，尚未執行任何 Windows gate；允許的 sandbox 外執行隨後成功。開始時 4173 有本專案的既有 Vite preview PID 46028；核對其完整 command line 後只停止此 project preview，再 `npm.cmd ci`。沒有停止其他專案或 Codex services。Manifest／lockfile hash 不變，沒有 unexpected install modification。

Canonical browser gate 開始前 4173／5173 free；使用原 repository config、原 preview-server、原 port 4173、single worker、retries 0、project timeout 60000。沒有 temporary config、copied tests、alternate server、skip、retry 或 timeout 修改。結束後兩個 ports free，沒有 project Node test／preview 殘留。

| Gate | Result |
| --- | --- |
| `npm.cmd ci` | PASS，exit 0，added 23 packages，0 vulnerabilities |
| `npm.cmd test` | PASS 37/37，exit 0；fail／cancelled／skipped／todo 0 |
| `npm.cmd run typecheck` | PASS，exit 0 |
| `npm.cmd run build` | PASS，exit 0；Vite 8.3.1 |
| `npm.cmd run test:artifact` | PASS 4/4，exit 0 |
| `npm.cmd run test:browser` | PASS 102/102，native process exit 0，240.283 s |
| Chromium 153.0.8010.12 | PASS 34/34 |
| Firefox 155.0 | PASS 34/34 |
| Playwright WebKit 26.6 | PASS 34/34 |
| Axe | PASS，21 scans、0 violations |
| `npm.cmd audit` | PASS，0 vulnerabilities，exit 0 |
| `npm.cmd ls --omit=dev --all` | PASS，exit 0；jsqr@1.4.0、qrcode-generator@2.0.4 |
| `git diff --check` | PASS，exit 0 |
| `git diff --cached --check` | PASS，exit 0；staged none |

Reporter：`test-results/results.json`，startTime `2026-10-02T13:51:59.454Z`。expected 102、skipped 0、unexpected 0、flaky 0、errors 空；102 個 results 全 passed，每個 test 只有一個 result，retry sum 0。Reporter rootDir 與每個 project testDir 指向原 repository，workers 1，各 project retries 0／timeout 60000。

相對本輪基準 96 tests，新增 medium／maximum practical 各一個四格式 regression／engine，共增加 6；原有 tests 保留。`quality.spec.mjs` byte-identical：encode 4 scans＋decode 3 scans，每 engine 7，共 21；violations assertions 全通過，沒有 disable rules 或 broad excludes。

`test:browser` 自行重建同一來源的 dist，JS／CSS 產物 hash 與先前 artifact gate 相同；artifact evidence 仍適用。最後僅新增本 Markdown report，不改任何 gate input。

## 11. Scope Integrity

開始時保存 52 份 tracked／原任務文件的 SHA-256 快照。結束比對只有下節列出的 9 個既有檔案改變，其他 43 份 byte-identical；新增檔只有本 report。

- `src/svg.ts` parser／allowlist／security boundary unchanged。
- `src/decode.ts` 完整 byte-identical；decode architecture、20 MiB、UTF-8、stale guard、cleanup unchanged。`src/main.ts` 僅 required error copy 一行 delta。
- `createQrSvg()`、`createQrMatrix()`、URL normalization、M／Byte policy unchanged。
- CSP／headers／Vite config unchanged：`index.html`、`public/_headers`、`vite.config.ts` byte-identical。
- Dependencies／version unchanged：`package.json`、`package-lock.json` byte-identical，package／lockfile root／root package 均為 1.1.0。
- UI styling／layout／accessibility cleanup unchanged：HTML、`src/styles.css`、dense announcement implementation 未修改。
- Download filename、Open Link、Copy、quiet zone count unchanged。
- `playwright.config.mjs` byte-identical；既有 SVG security、CSP、network／storage tests 全 PASS；沒有重做完整 36 hostile SVG audit。
- 原任務文件及所有歷史報告未修改；其餘 Minor／Future 項目未處理。

## 12. Git State

- Branch：`main`，仍 ahead `origin/main` 5 commits；HEAD unchanged：`da4f4ab5f1c9c176eedaf3ce16246d025a38f4a2`。
- 開始時 tracked working tree clean，唯一 untracked 為使用者提供的 `V1_1_FUNCTIONAL_FREEZE_FINALIZATION.md`；沒有未知 unrelated delta。
- 本輪 modified：`src/qr.ts`、`src/main.ts`、`tests/qr.test.mjs`、`tests/decode.test.mjs`、`tests/browser/functional.spec.mjs`、`tests/browser/refinement.spec.mjs`、`tests/browser/final-ux-svg.spec.mjs`、`README.md`、`RELEASE_CHECKLIST.md`。
- 本輪新增 untracked：`V1_1_FUNCTIONAL_FREEZE_VERIFICATION.md`；原 task document 保持 untracked／原文。
- Staged none。No commit、no tag、no push、no release、no deploy；沒有 reset、checkout 丟棄修改、amend、rebase、stash 或 clean。
- 無 `v1.1.0` tag。既有 tag objects 不變：v1.0.0 `0c41a74fb7c853f2f4f4ee65b5362a6bcfa71310`、v1.0.1 `1e5f113430adb830862d586e76a6eb42c1d79589`。
- Version 保持 **1.1.0**，沒有建立 1.1.1。

## 13. Remaining Manual Acceptance

下列全部 **NOT VERIFIED**：

- Real phone scan（短／中／密集／最大容量、四種格式）。
- Actual downloaded image visual size（使用者以實際 image viewer／Word／PDF 查看）。
- Native 200% browser zoom。
- Narrator／NVDA／VoiceOver 真實朗讀。
- Real camera photo。
- Real Safari on macOS／iOS、real Android；Playwright WebKit 不等同 Safari。
- Print：Word → PDF → 實際紙本掃描。
- Deployment：hosted HTTPS／response headers、deployed subdirectory。

自動化 pixel／ARIA／axe／等效 reflow 及軟體 QR round-trip 不冒充上述人工驗收。本輪沒有 tag／release／deploy，也沒有開始下一階段 UI/UX redesign。

## 14. Functional Freeze Decision

**FUNCTIONALLY_FROZEN**

本輪兩項指定修正及全部 required automated gates 已 PASS，scope integrity 成立。保留未 commit 狀態及上述 manual acceptance，至此停止。

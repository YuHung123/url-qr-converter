# URL QR Converter v1.1.0 — Output Preview + Transparent Background Verification

日期：2026-10-03（Asia/Taipei）。開始／結束 HEAD：`da4f4ab5f1c9c176eedaf3ce16246d025a38f4a2`。所有修改保持未 commit；沒有 tag、push、release 或 deploy。

## 1. Executive Summary

**BLOCKED_OR_INCOMPLETE**。本輪已實作 output-size-aware preview、指定的 compact boundary mapping、透明 PNG／WebP／SVG 與透明模式下 disabled JPG，但**不能恢復 FUNCTIONALLY_FROZEN**。

阻塞是實際解碼退步：像素完全符合 `floor(i * size / totalModules)`，但 jsQR 1.4.0 對部分不等寬 modules 誤估 QR dimension。指定的 **185 total modules／512 px** 案例，原本成功 round-trip，現在 PNG／JPG／WebP 的白底與已測透明輸出會回「圖片中找不到 QR Code。」。這不是 alpha、encoder fallback、環境或測試 timeout 問題。

乾淨 Windows native required gates：Node **49/56，7 FAIL**；browser **177/189，12 FAIL**，Chromium／Firefox／WebKit 各 **59/63，4 FAIL**。Typecheck、build、artifact **4/4**、axe **39 scans／0 violations**、npm audit **0 vulnerabilities** 均 PASS。Browser skipped／retry／flaky 為 **0**，unexpected 為 **12**，不能寫成 0。

Verification-before-handoff 狀態同為 **BLOCKED_OR_INCOMPLETE**。保留會失敗的 round-trip assertions；沒有降低 minimum、改 matrix／EC／Byte／payload、改用舊 padding、修改 dependency、或把解碼失敗改成預期成功。

開始前完整閱讀任務文件、四份指定歷史報告、README／CHANGELOG／RELEASE_CHECKLIST、HTML、全部 source、tests 文字程式與 fixture 說明、package.json、Playwright config，以及直接相關 renderer／export／validation／accessibility／SVG code。初始 Git delta 與上一輪 custom-size report 相符，沒有無法解釋的 unrelated changes。

Skills 依 session catalog 與實際可讀檔案盤點。實際使用：`model-routing`（PRIMARY 執行，未派 subagent）、`receiving-code-review`、`systematic-debugging`、`verification-before-handoff`、`context7:context7-mcp`。沒有宣稱專用 browser／accessibility skill；使用專案既有 Playwright suite。Context7 查核 Playwright **1.63.0** 的 screenshot／test-scoped output／attachment 用法，包含 [官方 outputPath 文件](https://github.com/microsoft/playwright/blob/v1.63.0/docs/src/test-parallel-js.md)。未套用無關 skills。

## 2. Scope

只處理 preview、compact raster geometry、transparent background 及必要 tests／docs／本報告。

| 本輪 delta | 用途 |
| --- | --- |
| `src/qr.ts` | 共用整數 boundary raster、alpha、SVG background option、拒絕透明 JPG |
| `src/main.ts` | 即時 preview、尺寸文字、背景狀態、JPG disabled navigation、背景編輯的 stale export guard |
| `index.html` | 原生「透明背景」checkbox、preview dimensions |
| `src/styles.css` | 局部 preview constraints／CSS checkerboard／checkbox／disabled item 樣式 |
| `tests/output-preview-transparent.test.mjs`（新增） | 全版本 boundaries、185／512 regression、完整 alpha／matrix 比對、SVG variant、透明 JPG rejection |
| `tests/browser/output-preview-transparent.spec.mjs`（新增） | 即時 preview、狀態、實際下載、三引擎 alpha／round-trip、a11y／reflow／privacy |
| `tests/output-size.test.mjs`、`tests/qr.test.mjs`、`tests/decode.test.mjs` | 更新被本輪規格取代的固定格寬／padding／preview-size assertions，保留 exact decode 要求 |
| `tests/browser/output-size.spec.mjs`、`refinement.spec.mjs`、`functional.spec.mjs`、`quality.spec.mjs` | 新 geometry、preview 跟隨尺寸、checkbox Tab 順序、容器限制 |
| `README.md`、`CHANGELOG.md`、`RELEASE_CHECKLIST.md` | 現行功能、已知 decoder 阻塞、必要人工驗收 |

版本仍是 **1.1.0**。沒有 UI/UX redesign 或 Final Security Audit。

## 3. Previous Geometry Problem

實際 near-capacity payload：`https://example.com/` + 2311 個 `a`，2331 bytes、QR version 40、177 QR modules，加 quiet zone 後為 **185**。

舊算法：`floor(512 / 185) = 2`，grid 只佔 **370 px**，剩餘 **142 px** 成為每側 **71 px** 額外 padding。加上 4 × 2 px quiet zone，第一個黑色 finder pixel 在 **(79, 79)**。

以開始時保留的 source snapshot 實際執行舊 renderer，比對現行 renderer，得到：

| Renderer | Canvas | 第一個黑色 pixel | jsQR exact round-trip |
| --- | --- | --- | --- |
| 本輪開始時的 fixed-scale＋padding | 512 × 512 | (79, 79) | PASS |
| 本輪指定 compact mapping | 512 × 512 | (11, 11) | FAIL |

兩者 matrix 完全相同；白底 SVG byte-identical。Evidence：`playwright-report/output-preview-transparent/old-new-512.json`。Whitespace 症狀已移除，解碼退步仍是必須解決的 blocker。

## 4. New Boundary Mapping

```text
totalModules = qrModules + 8
minimumSize = totalModules * 2
boundary(i) = floor(i * size / totalModules)

x0 = boundary(x + 4)
x1 = boundary(x + 5)
y0 = boundary(y + 4)
y1 = boundary(y + 5)
draw [x0, x1) × [y0, y1)
```

`rasterGeometry()` 提供共用 boundaries，`createQrPixels()` 直接填最終 RGBA buffer，canvas 使用 `putImageData()`。所有 edge 為 integer；合法尺寸每格至少 2 px，最大／最小格寬差 ≤1；四格 logical quiet zone 保留，沒有額外 centering padding。沒有 raster interpolation、drawImage scaling、post-render resize 或 CSS screenshot export。

185／512 案例為 **43 格 × 2 px＋142 格 × 3 px＝512 px**。Left/top quiet zone 11 px，right/bottom 12 px。新 regression 直接檢查 first dark pixel (11,11)，可辨識舊 (79,79) 算法。

Node 對所有 40 個 QR versions 的合法代表尺寸檢查 boundaries／minimum／width spread。Short／medium／dense／near-capacity 的 minimum、minimum+17、256／300／512（合法時）共 **34 份白底／透明 buffers**，逐 pixel 與獨立 EC M／Byte reference 及 inverse boundary calculation 比對，geometry／RGB／alpha mismatches **0**。Round-trip failures 在完成整組 pixel checks 後仍以 assertions 報錯。

### Decoder root cause

| Payload | Total modules | Size | 真正 QR modules | jsQR 首個 dimension estimate | Production pixel decode |
| --- | ---: | ---: | ---: | ---: | --- |
| Medium：example.com + 500 個 a | 97 | 256 | 89 | 87 | `no-qr` |
| Dense：既有 normalized Unicode sample + 1000 個 a | 133 | 300 | 125 | 131 | `no-qr` |
| Near capacity | 185 | 387 | 177 | 173 | `no-qr` |
| Near capacity | 185 | 512 | 177 | 181 | `no-qr` |

檢查 installed jsQR 的 `computeDimension()`／`scan()`／`extract()`，並在**僅存在於診斷記憶體中的副本**記錄 locator 輸出。對同一批失敗 pixels，診斷時注入已知的正確 module count，四例均恢復 exact decode，確認 dimension estimation 是原因。這項診斷不修改 installed dependency、產品或 gate，也不算產品 PASS。Evidence：`playwright-report/output-preview-transparent/locator-diagnostic.json`。

另試旋轉及 2–4 倍 nearest-neighbor 診斷（≤2048），仍無法恢復四個失敗案例；沒有把這些操作加入產品。未找到同時維持精確 mapping、現行 decoder／dependency 與 direct jsQR assertions 的範圍內修正。後續必須決定 decoder compatibility 策略或調整 geometry 合約；本輪未自行採用依賴 fork／upgrade、解码 workaround 或不同 geometry。

## 5. Preview Behavior

Preview 與 PNG／JPG／WebP 使用同一 matrix／geometry／background renderer。有效 input event 立即更新，不等待 blur、Download 或 Generate。Dimension text 為 EXACT `{size} × {size} px`；empty preview 不顯示尺寸。

以下為 canonical Chromium，1280 × 900 viewport 的實測；Firefox／WebKit 也通過 `min(requestedSize, availableWidth)` assertions：

| Requested | Canvas | CSS displayed size | Constraint |
| ---: | --- | --- | --- |
| 64 | 64 × 64 | 64 × 64 | 小 QR minimum 允許 |
| 128 | 128 × 128 | 128 × 128 | 1 output px = 1 CSS px |
| 256 | 256 × 256 | 256 × 256 | 1:1 |
| 300 | 300 × 300 | 300 × 300 | 1:1 |
| 512 | 512 × 512 | 369 × 369 | 既有兩欄 layout 可用 369 CSS px |
| 2048 | 2048 × 2048 | 369 × 369 | 同一容器上限 |

PNG 實際下載 bytes 與同一設定的 preview canvas PNG 相等，包含透明 near-capacity 檔；CSS 縮放／棋盤格不污染輸出。Evidence：`test-results/output-preview-transparent-f3f5d-trained-CSS-and-screenshots-*/preview-sizes.json` 與 screenshots。

## 6. Background Control

- Visible label／accessible name EXACT **`透明背景`**，native checkbox，default OFF。
- 正常狀態沒有 helper、warning 或背景使用建議。
- Tab switching、draft editing、成功 Generate 都保留 checkbox 值；reload 回 OFF，沒有新增 persistence。
- 切換時立即 render 已生成 QR；尺寸暫時無效則使用最後有效 preview size。
- Checkbox 放在 size field 上方，避免 size blur 顯示 error 時推移正在點擊的 checkbox。沒有改既有 size validation timing／copy。

## 7. Format Matrix

下表區分格式／pixel correctness 與 decoder round-trip，不能以格式正確代表整項功能 PASS。

| Format | White | Transparent | Size applies |
| --- | --- | --- | --- |
| PNG | dimensions／background PASS；部分密集 round-trip FAIL | alpha／dimensions PASS；near-capacity round-trip FAIL | yes |
| JPG | dimensions／opaque background PASS；near-capacity round-trip FAIL | disabled PASS | yes when white |
| WebP | dimensions／background PASS；near-capacity round-trip FAIL | alpha／dimensions PASS；near-capacity round-trip FAIL | yes |
| SVG | PASS | PASS | no raster-size dependency |

白底 short／medium／dense 512 px 四格式，以及各自 minimum／minimum+17 的三 raster formats 通過既有 browser tests。Near-capacity exact minimum 370 px 三格式通過；387／512 px 有上述退步。

透明 short **128**、medium **300**、dense **512** 的 PNG／WebP／SVG，三引擎 actual download → application decode 全部 exact URL PASS。Near-capacity **512** 的 SVG PASS，PNG／WebP FAIL。

由於原有白底測試在 PNG assertion 失敗後未繼續 JPG／WebP，另以 Windows 原生三引擎補測 **387／512 × PNG/JPG/WebP，共18檔**。全部 exact dimensions、alpha 255，但 direct jsQR 與 application 均失敗，UI 為 `圖片中找不到 QR Code。`。此補測沒有改正式 suite、config、port 或任何 test expectation，不替代 canonical gate。Evidence：`playwright-report/output-preview-transparent/white-near-capacity.json` 及同目錄實際檔案。

主 action 仍 PNG；dropdown 仍 SVG → JPG → WebP。Filnames 維持 `qr-code.png`／`.svg`／`.jpg`／`.webp`。

## 8. Transparent Pixel Evidence

三引擎各 8 個實際透明 raster downloads，共 **24** 檔：short／medium／dense／near-capacity × PNG／WebP。

- Exact width／height PASS。
- 所有 quiet-zone／light/background pixels 的 alpha **0**，opaque dark modules alpha **255**。
- Alpha mismatches **0**，沒有 partial-alpha edges。
- PNG module RGB 精確 **0,0,0**；decoded transparent RGB **0,0,0**。
- WebP 實測 `maxDarkRgb = 0`，沒有 white matte／checkerboard pixels／半透明 modules。三引擎均保留 alpha，未遇到平台 encoder limitation。
- PNG／WebP 的 `rgbMismatches = 0`；黑色區與透明區按 independent reference matrix／inverse boundaries 分辨，並非只檢查 corner。
- 解碼用測試副本 composited onto white；actual downloaded file 不改寫。產品既有 image decoder 也使用白底 compositing，仍然遇到 near-capacity dimension estimation failure。

透明 SVG 只省略 white rect，維持 black path／viewBox／unit geometry／quiet zone，沒有 rasterization、背景色或 checkerboard。

Evidence：`test-results/output-preview-transparent-*/transparent-pixels.json`。失敗的 near-capacity tests 也先保存全部 pixel evidence，再保留 production round-trip failure。

## 9. SVG Security

**`src/svg.ts` 完整 byte-identical**，沒有 parser extension 或 security-sensitive delta；現有 grammar 已接受只有 black path 的 generated SVG。

`src/decode.ts` 也 byte-identical。SVG 原文仍不進 DOM／browser SVG loader；同一安全 parser／canvas／UTF-8／URL pipeline 不變。

三引擎既有 malicious/corrupt SVG、CSP、no-network、no-storage、active payload、download safety、stale parse regressions PASS。新增透明輸出 privacy test 亦確認 no unexpected request／navigation／popup、no injected image/script/use/foreignObject、no CSP violation、no storage。

透明 short／medium／dense／near-capacity SVG 的 picker 與 drag/drop round-trip PASS。沒有重新執行完整 Final Security Audit，也沒有修正歷史 audit 中與本輪無關的 parser findings。

## 10. Preview / Draft / Size State

- Generated A → draft B → size 300 → transparent ON：preview、PNG download 都仍是 A；成功 Generate B 才切換 payload。無效 Generate 保留 A。
- Background／size edits 不 normalize 或重新 encode draft URL；沿用 generated matrix。
- 256 → 128 → 300 的有效值立即更新；empty／abc／1e2／decimal／too-small／too-large 保留最後有效 pixels 與尺寸文字。
- Current minimum 82 時輸入 64，blur 顯示既有 dynamic error；改回128清除 error 並更新 preview。
- 若**首次 Generate** 時尺寸無效，使用256或新 QR minimum中較大者；已有 preview 則以其尺寸為 fallback，必要時只提高 preview 到新 QR minimum。欄位不自動改寫。例如 dense QR 保留欄位256，實際 preview及文字266，raster download仍提示minimum266。這讓 Generate／SVG不被無效 raster preference 阻擋，且尺寸文字不造假。
- Raster encoding pending 時 size edit／edit-restore／background edit／edit-restore 會丟棄舊結果；新 Generate stale protection 保留，後續有效下載可恢復。
- Invalid raster values **32、empty、abc、128.5** 不阻擋白底／透明 SVG，成功 SVG action 清除既有 raster error；不同有效 raster sizes 下 vector內容相同。

既有 `輸出尺寸`／`px`／default256、64–2048、arbitrary integers、全部 validation copy、dynamic minimum、`圖片檔案過大(上限20MB)` 保留。尺寸／alpha／狀態行為通過；整體 custom-size 的解碼相容性因 §4 blocker 尚未維持 baseline。

## 11. Accessibility

Native label／checkbox name／checked state／Space／Tab／focus-visible 3px PASS。新順序為 Generate → 透明背景 → 輸出尺寸 → Download PNG → toggle。

透明 ON 時 JPG 保留在原位置，有 native `disabled`；ARIA snapshot 為 disabled menuitem，方向鍵／Home／End 略過它。實際 mouse click、native click 及直接 dispatched click 都不下載。OFF 後恢復 JPG keyboard download。既有 Escape／Tab／focus restoration 保留。

尺寸文字可在 accessible tree 讀取一次；checkerboard 純 CSS，沒有新增 accessible decoration。Size／background rendering不寫入 status；新 test 觀察 `#qr-status` mutations為0。既有 dense threshold、live region與duplicate prevention unchanged且PASS。

Axe：既有21＋custom-size3＋新增15＝**39 scans，0 violations**。新增每引擎5態：transparent ON、disabled JPG menu、size error＋transparent、320 mobile、640／200% text enlargement。沒有 disable rules、broad exclusion 或 skip。這不等同實際 screen-reader驗收。

## 12. Responsive

Canonical Chromium 的實測如下；三引擎同樣通過 square／container／no-overflow／no-overlap assertions：

| Viewport | Available preview width | 128 displayed | 256 displayed | 2048 displayed |
| ---: | ---: | ---: | ---: | ---: |
| 1280 | 369 | 128 | 256 | 369 |
| 768 | 257.36 | 128 | 256 | 257.36 |
| 375 | 301 | 128 | 256 | 301 |
| 320 | 246 | 128 | 246 | 246 |
| 640，200% text | 566 | 128 | 256 | 566 |

目視檢查本次 Chromium screenshots：white64／128／256／512、transparent128／256／dense、2048 constrained、320 mobile、640／200% text。Size hierarchy清楚；QR居中；dense沒有舊的大量額外padding；checkerboard限於canvas presentation；尺寸文字與controls未重疊，沒有clipping或horizontal overflow。

Evidence：`test-results/output-preview-transparent-f3f5d-trained-CSS-and-screenshots-chromium/`、`test-results/output-preview-transparent-98972-ments-and-responsive-reflow-chromium/`，以及 transparent dense tests 的 screenshots。這是本輪 screenshot inspection，不是使用者最終人工驗收或 native browser zoom。

## 13. Required Gates

環境：Windows **10.0.26200**、native Node **v24.21.0**、npm **11.19.0**、Playwright **1.63.0**，原 repository `<repo>`。最終 gate run 重新 `npm.cmd ci`，manifest／lockfile unchanged。

| Gate | Result |
| --- | --- |
| `npm.cmd ci` | PASS，exit0，added23 packages，0 vulnerabilities |
| 開始時 `npm.cmd test` baseline | PASS **48/48** |
| 最終 `npm.cmd test` | **FAIL，49/56，7 failed，exit1**；cancelled／skipped／todo0 |
| `npm.cmd run typecheck` | PASS，exit0 |
| `npm.cmd run build` | PASS，exit0，Vite8.3.1 |
| `npm.cmd run test:artifact` | PASS **4/4**，exit0 |
| `npm.cmd run test:browser` | **FAIL，177/189，12 failed，exit1** |
| Chromium153.0.8010.12 | **59 PASS／4 FAIL** |
| Firefox155.0 | **59 PASS／4 FAIL** |
| Playwright WebKit26.6 | **59 PASS／4 FAIL** |
| Axe | PASS，**39 scans／0 violations** |
| `npm.cmd audit` | PASS，exit0，**0 vulnerabilities** |
| `npm.cmd ls --omit=dev --all` | PASS，exit0，僅jsqr1.4.0／qrcode-generator2.0.4 |
| `git diff --check` | PASS，exit0 |
| `git diff --cached --check` | PASS，exit0；staged none |

Canonical reporter：`test-results/results.json`，startTime **2026-10-02T17:19:54.031Z**，duration **618.201s**。expected177、unexpected12、skipped0、flaky0、errors空。每個test只有一個result，retry sum0；rootDir／三個project testDir指向原repo；workers1、retries0，原有timeout／projects不變。未使用替代config、copied tests或alternate port。

Node7個失敗：185／512專項；medium／dense／near-capacity白底透明pixel suite的round-trip assertions；三個existing custom-size suites的相同round-trip assertions。Actual為`{ kind: 'no-qr' }`，像素比對本身全部PASS。

每引擎4個browser失敗：transparent near-capacity PNG、transparent near-capacity WebP、near-capacity minimum+17（387）白底、maximum-practical512白底。前兩者actual file→app得到empty URL及`圖片中找不到 QR Code。`，後兩者directjsQR返回undefined。沒有其他失敗。白底18檔supplement亦確認同一原因。

完整逐gate logs／exit codes：`playwright-report/output-preview-transparent/gates.json`、`node.log`、`browser.log`、`artifact.log`、`audit.log`、`dependencies.log`。Supplement的exit0只表示量測流程完成，**不表示18個round-trip通過**。

Node由48增至56；browser由129增至189。既有tests保留；只因本輪要求更新fixed module width／padding、independent preview、240／200px cap與新Tab順序的舊expectations。解碼assertions沒有刪除、skip或降低要求。

開發期先修正兩項獨立問題：blur error推移checkbox導致click失效（調整新control位置）；新menu test誤假設disabled click不會觸發既有focusout關閉（改為先明確重新展開，再驗證Escape）。Final canonical中這些tests全部PASS。

環境註記：sandbox內Windows probe得到WSL `UtilBindVsockAnyPort` error，經允許的sandbox外native commands執行。開始時4173為本repo既有Vite preview PID23260；核對完整command line後只停止該process。Windows拒絕`.ps1` file execution，因此以reviewed inline PowerShell commands執行相同npm gates，未修改execution policy。最後4173／5173 listeners **0**、project Node processes **0**。

所有source／tests／config在最終gates後未改。最後只產出本報告；既有PASS evidence仍適用，FAIL亦保留。

## 14. Scope Integrity

開始保存58份既有tracked／untracked檔案的SHA-256，最終14份有本輪delta（§2），其餘**44份byte-identical**；新增兩份tests與本報告。

- EC **M**、**Byte mode**、ASCII guard、payload、auto version、logical matrix、URL normalization原文不變。
- `MIN_PIXELS_PER_MODULE=2`、4-module quiet zone、64–2048、default256及全部size-validation copy保留。
- `src/svg.ts`、`src/decode.ts`、CSP／headers／Vite config、manifest／lockfile、Playwright config byte-identical。
- `src/main.ts`的decode／upload／Copy／Open Link實作、dense／modified status邏輯原文不變。
- Production依賴與version **1.1.0**不變；沒有1.1.1、foreground／background picker、margin／EC selector、logo、presets或new formats。
- 沒有改header、tabs architecture、overall grid、typography system、global colors、animations或personal-site integration。
- 四份指定歷史報告、其他歷史audit／verification與原任務文件全部原文保留。

Scope evidence：`playwright-report/output-preview-transparent/scope-checks.json`。Known decoder regression已明列，不能把scope preservation誤當作全部baseline功能PASS。

## 15. Git State

Branch **main**，仍ahead `origin/main` **5** commits；HEAD **da4f4ab5f1c9c176eedaf3ce16246d025a38f4a2**不變。開始與結束的所有Git refs逐byte比對相同。

原有functional-freeze／custom-size未提交修改保留。本輪modified-existing paths見§2；`tests/browser/final-ux-svg.spec.mjs`仍有前一輪delta，但本輪沒有修改它。原本untracked的custom-size／functional-freeze文件、size tests與本輪task document保留。

本輪新增：`tests/output-preview-transparent.test.mjs`、`tests/browser/output-preview-transparent.spec.mjs`、本報告。`test-results/`、`playwright-report/`、`dist/`為gitignored evidence／build output。

Staged **none**；沒有commit／tag／push／release／deploy，沒有reset／discarding checkout／amend／rebase／stash／clean。仍僅有既有`v1.0.0`／`v1.0.1` tags，objects／targets不變，沒有`v1.1.0` tag。

## 16. Remaining Manual Acceptance

以下全部 **NOT VERIFIED**，自動化及本輪截圖不能代替：

- Real phone scan，包括白底／透明、short／medium／dense／near-capacity。
- Real camera photo。
- Actual downloaded-file placement於外部browser、Word／PDF／其他文件。
- Real Android。
- Real Safari on macOS／iOS；Playwright WebKit不等同Safari。
- Print與最終PDF／紙本掃描。
- Narrator／NVDA／VoiceOver實際朗讀，含checkbox／disabled JPG／尺寸／error／dense status。
- Native **200% browser zoom**。
- 使用者最終preview尺寸感／background操作驗收。
- Deployment、hosted HTTPS／response headers、實際subdirectory。沒有進行部署。

軟體端另有§4／§13的必要decoder blocker，不能只把本輪狀態歸為待人工驗收。

## 17. Functional Freeze Decision

**BLOCKED_OR_INCOMPLETE**

指定boundary mapping與preview／transparency已實作，所測geometry／alpha／UI／security regressions符合要求；但部分合法custom sizes及明確指定的185／512 round-trip失敗，Node與三引擎browser gates均未全PASS。因此不恢復FUNCTIONALLY_FROZEN，不宣稱本輪完成全部acceptance criteria。

後續需解決／重新決定compact geometry與decoder相容性，再重跑相關required gates。本輪保留可重現失敗及完整evidence，產出本報告後停止；未開始UI/UX redesign、Final Security Audit或任何Git／release／deploy動作。

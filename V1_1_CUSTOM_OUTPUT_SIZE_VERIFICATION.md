# URL QR Converter v1.1.0 — Custom Output Size Verification

日期：2026-10-02。開始與結束 HEAD：`da4f4ab5f1c9c176eedaf3ce16246d025a38f4a2`。所有修改保持未 commit；沒有 tag、push、release 或 deploy。

## 1. Executive Summary

**FUNCTIONALLY_FROZEN**。PNG／JPG／WebP 現在可輸入 64–2048 px 的正整數輸出尺寸，預設 256 px；下載 canvas 寬高精確符合欄位值。QR 每格至少 2 個整數像素，保留四格 quiet zone，以額外白邊置中。SVG 維持原有向量幾何，無效 raster 尺寸不阻擋 SVG 下載。

乾淨 Windows `npm.cmd ci` 後，required gates 全 PASS：Node **48/48**、artifact **4/4**、canonical browser **129/129**（Chromium／Firefox／WebKit 各 **43/43**）。Browser skipped／retry／flaky／unexpected 全為 **0**；axe **24 scans／0 violations**，npm audit **0 vulnerabilities**。

功能凍結依本任務 automated completion criteria 成立。Verification-before-handoff 狀態：**AUTOMATED_PASSED_HUMAN_ACCEPTANCE_REQUIRED**。實機、列印、實際螢幕閱讀器與 native zoom 等人工驗收仍為 **NOT VERIFIED**，見 §14。

開始前完整閱讀本輪 spec、三份指定歷史報告、README／CHANGELOG／RELEASE_CHECKLIST、HTML、四份 TypeScript source、CSS、tests 全部文字程式與 fixture 說明、package.json、Playwright config，並搜尋 renderer／export／validation 的直接引用。Git 開始狀態與 functional-freeze report §12 相符；額外的 `V1_1_CUSTOM_OUTPUT_SIZE.md` 是本輪任務文件，没有無法解釋的 unrelated changes。

Skills 盤點以本 session 提供的 installed catalog 與實際可讀 SKILL.md 為依據。實際使用：model-routing（使用者指定的 skill；依 opt-in gate 保留 PRIMARY，未派 subagent）、receiving-code-review（先核對固定尺寸 renderer 與人工驗收回饋）、verification-before-handoff、systematic-debugging（Windows interop 與新 keyboard test 的非預期失敗）、context7:context7-mcp（查核 Playwright **1.63.0** 的 download／saveAs／outputPath／attachments API）。本 session catalog 沒有專用 browser／Playwright／accessibility／testing skill；採用 repo 原生 suite。沒有套用與本輪無關的 skills。

Context7 查核來源：[Playwright download API](https://github.com/microsoft/playwright/blob/v1.63.0/docs/src/api/class-download.md)、[testInfo API](https://github.com/microsoft/playwright/blob/v1.63.0/docs/src/test-api/class-testinfo.md)。

## 2. Scope

只新增輸出尺寸欄位、raster 精確尺寸與 validation、PNG／JPG／WebP 共用 geometry、SVG independence，及必要的 tests／docs／本報告。

| 本輪檔案 | 用途 |
| --- | --- |
| `index.html` | 原生 label、預設值、px、独立 error region |
| `src/styles.css` | 四條新欄位局部樣式，融入既有 layout |
| `src/qr.ts` | 小型 pure parsing／geometry helpers；既有 renderer 支援指定尺寸 |
| `src/main.ts` | Size validation、以 displayed matrix 匯出、size-edit stale protection |
| `tests/output-size.test.mjs`（新增） | Parsing、validation order、dynamic minimum、逐 pixel geometry／decode |
| `tests/browser/output-size.spec.mjs`（新增） | 真實下載、三格式、SVG bypass、鍵盤／axe／reflow／pending size edits |
| `tests/browser/functional.spec.mjs` | 新 Tab 順序與預設 256 px 的實際檔案 assertion |
| `tests/browser/refinement.spec.mjs` | 指定尺寸 export geometry、draft A／B 保護、既有四格式 round-trip |
| `tests/qr.test.mjs` | 僅把既有固定尺寸 test 名稱改為 preview；原 assertions 保留 |
| `README.md`、`CHANGELOG.md`、`RELEASE_CHECKLIST.md` | 最小現行功能說明及人工驗收項目 |
| 本報告（新增） | 本輪 evidence 與 freeze decision |

版本保持 **1.1.0**，未開始 UI/UX redesign 或 final security audit。

## 3. UI Copy

| 項目 | EXACT |
| --- | --- |
| Visible label／accessible name | `輸出尺寸` |
| Unit | `px` |
| Default | `256` |
| Placeholder／正常 helper text | 無 |
| Empty | `請輸入輸出尺寸。` |
| Malformed | `請輸入有效的輸出尺寸。` |
| Decimal | `請輸入整數尺寸。` |
| Below minimum | `輸出尺寸不得小於 64 px。` |
| Above maximum | `輸出尺寸不得大於 2048 px。` |
| QR-specific minimum | `此 QR Code 至少需要 {minimum} px。` |
| Existing oversized upload | `圖片檔案過大(上限20MB)` |

例如密集 QR 的最小值為 266：`此 QR Code 至少需要 266 px。`。內部 upload threshold 保持 `20 * 1024 * 1024`，沒有改成 20,000,000 bytes。

## 4. Validation Rules

允許 **64–2048** 的正整數；數字的原始字串先驗證，再轉成 Number。固定順序：empty → malformed／non-number → decimal → <64 → >2048 → QR-specific minimum。空白值為 empty；文字、NaN、Infinity、scientific notation、expression、帶單位及其他非十進位整數形式拒絕；小數形式（包含 `256.0`）拒絕。

`minimumSize = (qrModules + 8) * 2`，必須 `floor(selectedSize / totalModules) >= 2`。Global minimum 64 不保證所有 QR 都適用：21-module QR 的 minimum 為 58，所以 64 可用；33-module QR 的 minimum 為 82，所以 64 會提示 82。

採 **text + inputmode="numeric"**，由 application 控制 exact copy；不使用 native number validity message、spinner 或瀏覽器對 exponent／malformed 值的 sanitization。三引擎以相同文字輸入矩陣驗證。

Typing 只清除既有 size error，不對中途空值立即顯示錯誤。Blur、raster Download、尺寸欄 Enter 都驗證。Dense QR Generate 成功也保留 default 256；當 minimum >256，raster action 顯示動態 minimum，由使用者決定新值，沒有自動提高或改寫欄位。

## 5. Raster Geometry

Pure helper `rasterGeometry()` 計算：

```text
totalModules = qrModules + 8
MIN_PIXELS_PER_MODULE = 2
minimumSize = totalModules * 2
pixelsPerModule = floor(selectedSize / totalModules)
qrPixelSize = totalModules * pixelsPerModule
remaining = selectedSize - qrPixelSize
paddingTop = paddingLeft = floor(remaining / 2)
paddingBottom = paddingRight = remaining - paddingLeft
final width = final height = selectedSize
```

原有四格 quiet zone 包含在 `qrPixelSize`，額外 padding 並未取代它。Odd remainder 使 bottom／right 多 1 px；所有 module boundaries 保持整數座標。

例如 41 total modules／256 px：6 px/module、246 px QR area、左右／上下各 5 px 額外白邊，最終 256 × 256。29 total modules／512 px：17 px/module、493 px QR area，top／left 9 px、bottom／right 10 px，最終 512 × 512。

沿用同一 final-resolution RGBA renderer 與 `putImageData()`；直接畫 requested-size 的 canvas。未 resize 既有圖、未 drawImage scaling、未 CSS screenshot、未 interpolation。PNG／JPG／WebP 共用 geometry；只有 MIME 和既有 lossy quality **0.98** 的編碼差異。不透明白底、黑色 modules，含 centering padding。

Preview 仍沿用本輪開始時的 sizing（約 512 px、每格至少 4 px），與 export preference 分離。`createQrPixels()`／`createQrCanvas()` 未指定尺寸時仍供 preview 使用；raster download 必定傳入已驗證的使用者尺寸，重用已生成 matrix，不重新編碼 URL。Size edits 不重建或清除 preview。

## 6. Raster Samples

以下為 canonical browser gate 實際下載檔測量；三引擎 JSON metrics 逐項比對一致。`—` 表示該 row 沒有下載此格式，不是推導出的 PASS。所有三格式同尺寸 evidence 見 300 px、minimum edges 與 512 px rows。

| QR case | Requested | Minimum | px/module | Actual PNG | JPG | WebP |
| --- | ---: | ---: | ---: | --- | --- | --- |
| Minimal short | 64 | 58 | 2 | 64 × 64 | — | — |
| Minimal short | 128 | 58 | 4 | 128 × 128 | — | — |
| Minimal short | 256 | 58 | 8 | 256 × 256 | — | — |
| Minimal short | 300 | 58 | 10 | 300 × 300 | 300 × 300 | 300 × 300 |
| Minimal short | 512 | 58 | 17 | 512 × 512 | — | — |
| Minimal short | 1024 | 58 | 35 | 1024 × 1024 | — | — |
| Minimal short | 2048 | 58 | 70 | 2048 × 2048 | — | — |
| Short | 82 | 82 | 2 | 82 × 82 | 82 × 82 | 82 × 82 |
| Short | 99 | 82 | 2 | 99 × 99 | 99 × 99 | 99 × 99 |
| Medium | 194 | 194 | 2 | 194 × 194 | 194 × 194 | 194 × 194 |
| Medium | 211 | 194 | 2 | 211 × 211 | 211 × 211 | 211 × 211 |
| Dense | 266 | 266 | 2 | 266 × 266 | 266 × 266 | 266 × 266 |
| Dense | 283 | 266 | 2 | 283 × 283 | 283 × 283 | 283 × 283 |
| Near capacity | 370 | 370 | 2 | 370 × 370 | 370 × 370 | 370 × 370 |
| Near capacity | 387 | 370 | 2 | 387 × 387 | 387 × 387 | 387 × 387 |
| Near capacity | 512 | 370 | 2 | 512 × 512 | 512 × 512 | 512 × 512 |
| Medium | 512 | 194 | 5 | 512 × 512 | 512 × 512 | 512 × 512 |
| Dense | 512 | 266 | 3 | 512 × 512 | 512 × 512 | 512 × 512 |
| Short | 512 | 82 | 12 | 512 × 512 | 512 × 512 | 512 × 512 |

| QR case | QR modules | Total modules | Minimum - 1 | Exact minimum | Minimum + 17 |
| --- | ---: | ---: | --- | --- | --- |
| Short | 33 | 41 | 81：拒絕，提示 82 px | 82：三格式 PASS | 99：三格式 PASS |
| Medium | 89 | 97 | 193：拒絕，提示 194 px | 194：三格式 PASS | 211：三格式 PASS |
| Dense | 125 | 133 | 265：拒絕，提示 266 px | 266：三格式 PASS | 283：三格式 PASS |
| Near capacity | 177 | 185 | 369：拒絕，提示 370 px | 370：三格式 PASS | 387：三格式 PASS |

Payloads：Minimal short＝`https://a.co/`（21 modules）；Short＝`https://example.com/independent?source=segno&v=1`；Medium＝`https://example.com/` + 500 個 a；Dense＝既有 normalize 後的 `https://例子.測試/採訪?q=😀&long=` + 1000 個 a；Near capacity＝`https://example.com/` + 2311 個 a（2331 Byte、version 40）。

新 browser sample attachments 每引擎 33 個 measured raster outputs，共 99 個：四個 minimum cases 各 6 檔，加尺寸極值／300 三格式的 9 檔。另有既有四格式 tests 的 512 px samples、keyboard／draft／stale recovery downloads。Actual PNG 全像素與獨立 EC M／Byte reference matrix 比對，mismatches 0；三格式皆 opaque、quiet zone 與 white padding PASS。JPG／WebP 保留既有 200／250 的 quiet-zone codec tolerance，未放寬。

新 Node tests 另對 minimum、minimum+17、300 或更大 legal size、512 逐 pixel 檢查整数 cells／centering／alpha／完整 white margins，全部 production decoder exact URL round-trip。Browser 的 short／medium／dense／near-capacity 下載檔三格式皆做 jsQR exact round-trip 與 application picker round-trip；1024／2048 PNG 為 actual dimensions／pixel geometry sanity，Node 另在這兩個尺寸驗證 production decoder。

Ignored evidence：`test-results/output-size-*/custom-size-samples.json`、實際下載檔，以及 `test-results/refinement-PNG-SVG-JPG-Web-*/export-sizing.json`。沒有加入 dist。另目視檢查 Chromium 的實際 300 px short PNG 與 266 px dense PNG：完整正方形、黑白整數 cells、白邊完整。

## 7. SVG Behavior

SVG dimensions 保持 `modules + 8`：Short 41 × 41、Medium 97 × 97、Dense 133 × 133、Near capacity 185 × 185；相同 viewBox、unit-sized vector modules、四格 quiet zone。`createQrSvg()` 與本輪開始時 byte-identical；沒有寫入 raster 尺寸，沒有 rasterize SVG download。

新增 regression：raster size 為 **32、empty、abc** 時，先觸發 raster size error，再 Download SVG，仍成功下載；清除 size error 與 aria-invalid。尺寸為 256／512／2048 時同一 matrix 的 SVG 內容也 byte-identical。每個 SVG 都經 picker 與 drag/drop exact URL round-trip。

既有 SVG Unicode／medium／dense／near-capacity、Copy／Open Link、偽裝 PNG、stale parse 與惡意 SVG security regressions 三引擎全 PASS。`src/svg.ts` 完整 byte-identical，沒有重做 final security audit。

## 8. Error Interaction

尺寸錯誤專用 `#output-size-error`，不寫入 URL、QR generation 或 decode error region。Invalid PNG／JPG／WebP action 全部拒絕，無 download event。修正輸入即清除 error／aria-invalid；blur 再確認有效性。SVG action 清除既有 raster error，讓成功的 vector download 不帶錯誤狀態。

成功新 Generate 清除舊 matrix 所屬 size error，保留使用者欄位值；之後 raster action 依新 matrix 計算 minimum。Oversized upload 繼續走原 decode error region，現有 exact `圖片檔案過大(上限20MB)` 三引擎 PASS，20 MiB／+1 boundary Node tests 保留。

## 9. Accessibility

- 原生 visible label 提供 EXACT `輸出尺寸` accessible name；`px` 為獨立 aria-hidden unit，不併入名稱。
- Error region 保持 existing `role="alert"`／`aria-atomic="true"` pattern，以 `aria-describedby="output-size-error"` 關聯。
- Invalid 時 `aria-invalid="true"`；typing correction 與 SVG action 清除。
- 新 Tab 順序 Generate → size → Download PNG → toggle，Enter 在 size 欄可下載 PNG；keyboard focus-visible 3px 與 focus retention 三引擎 PASS。
- 原有 axe 21 scans + size-error 3 scans＝**24**，全部 **0 violations**；no disabled rules／broad excludes。
- 新欄位與 dense error 在 1280／768／375／320 CSS px、640×450 加 200% text enlargement 的等效 reflow 三引擎 PASS。Label 在 input 上方、input 與 unit 無重疊、size error／download controls 未越界、無 horizontal overflow。

目視讀取 Chromium 的 desktop／768／375／320／200% equivalent screenshots，欄位與 error 自然融入既有 layout。Screenshot、DOM／ARIA assertions、axe 不等於實際 screen-reader 或 native browser zoom 驗收。

## 10. Regression

| 項目 | 結果 |
| --- | --- |
| Draft/generated URL | Generate A → draft B／無效 Generate：preview A 保留；下載 A 使用現行 300 px；成功 Generate B 才更新 payload |
| Size persistence | 改 size 不改 URL／preview canvas identity／pixels；tab switching 保留欄位值 |
| Pending size edit | PNG／JPG／WebP encoding 中改為 300、abc、或修改後還原256：舊檔全部丟棄；下一次有效 300 px action 成功 |
| Existing stale export | 新 Generate 使旧 PNG／JPG／WebP result 過期，既有 rejection／failure recovery／focus tests PASS |
| Density notice | modules ≥85、EXACT `QR Code 較密，建議下載後掃描。`、live region／duplicate prevention unchanged；tests PASS |
| Copy／Open Link | 既有 clipboard、explicit normalized HTTP(S)、new-tab opener／referrer protection PASS |
| SVG security／decode | malicious SVG、no DOM／loader／network、stale decode／parse、UTF-8 與 unsupported payload tests PASS |
| CSP／privacy | production headers、local-only network、no persistence、no active payload HTML PASS |
| Preview geometry | 本輪原有整数 renderer／4-module quiet zone／matrix assertions 保留 PASS |

新 size-edit revision 與原 `generated !== result` guard 一起避免欄位值與 raster file 不一致；SVG 不受 raster revision 影響。沒有改 URL normalization、Open Link、Copy 或 decoder security。

## 11. Required Gates

環境：Windows **10.0.26200.9550**、native Node **v24.21.0**、npm **11.19.0**、installed Playwright **1.63.0**；cwd `<repo>`。

| Gate | Result |
| --- | --- |
| `npm.cmd ci` | PASS，exit 0，added 23 packages、audit 0 vulnerabilities；manifest／lockfile hash unchanged |
| Baseline `npm.cmd test` | PASS 37/37，exit 0 |
| Final `npm.cmd test` | PASS **48/48**，exit 0；fail／cancelled／skipped／todo 0 |
| `npm.cmd run typecheck` | PASS，exit 0 |
| `npm.cmd run build` | PASS，exit 0，Vite 8.3.1 |
| `npm.cmd run test:artifact` | PASS **4/4**，exit 0；fail／cancelled／skipped／todo 0 |
| `npm.cmd run test:browser` | PASS **129/129**，exit 0，363.036 s |
| Chromium 153.0.8010.12 | PASS **43/43** |
| Firefox 155.0 | PASS **43/43** |
| Playwright WebKit 26.6 | PASS **43/43** |
| Axe | PASS **24 scans／0 violations** |
| `npm.cmd audit` | PASS，exit 0，**0 vulnerabilities** |
| `npm.cmd ls --omit=dev --all` | PASS，exit 0；jsqr@1.4.0、qrcode-generator@2.0.4 |
| `git diff --check` | PASS，exit 0 |
| `git diff --cached --check` | PASS，exit 0；staged none |

Canonical reporter：`test-results/results.json`，startTime **2026-10-02T15:50:50.041Z**。expected 129、skipped 0、unexpected 0、flaky 0、errors 空；129 個 tests 各只有一個 result，全部 passed、retry sum 0。rootDir／三個 project testDir 指向原 repository `tests/browser`；workers 1、retries 0、project timeout 60000。沒有替代 config、copied tests、alternate port、skip、retry、timeout 或 axe-rule 修改。

Final browser gate 自行重建的 dist 與 artifact gate 所驗證檔案逐檔 SHA-256 相同，因此 artifact evidence 仍適用。最後只產出本報告，沒有改 gate inputs。

執行註記：sandbox 內 Windows probe 在 WSL interop 層得到 `UtilBindVsockAnyPort: socket failed 1`；允許的 sandbox 外 native probe 成功。開始前 4173 有本 repo 既有 Vite preview PID 18372；核對完整 project command line 後只停止這個 preview，再 clean Windows install。沒有停止其他專案／Codex process。Canonical gate 後 4173／5173 listeners **0**、project Node processes **0**。

開發期 targeted Chromium run 為 27 PASS／1 FAIL；唯一 failure 是新 test 用 `input.press('Tab')` 自動重聚焦 input，導致 Tab 去 Download 而非返回 input。修正為從既有焦點 `page.keyboard.press('Tab')`；focus assertion 未刪除或放寬。上述 final canonical run 三引擎全 PASS，沒有利用 retry／timeout 掩蓋失敗。

Node 由 37 增為 48（11 個新 size tests）；browser 由 102 增為 129（9 個新 size tests × 3）。既有 tests 保留；functional 的 default size expectation 更新是因本輪明確改為 **256 px exact download**，新增 control 的 Tab assertion 也同步更新。舊 preview sizing assertions 保留，不把 preview pixels 當作 raster download evidence。

## 12. Scope Integrity

開始時保存 **54** 份 tracked／既有 untracked project files 的 SHA-256。結束比對，只有 §2 所列 **10** 個既有檔案有本輪 delta，其餘 **44** 份 byte-identical；新增檔案只有兩份 size tests 與本報告。

- `src/svg.ts` 完整 byte-identical；沒有觸碰 parser／allowlist／security boundary。
- `src/decode.ts` 完整 byte-identical；internal 20 MiB、UTF-8、scan dimensions／retry、cleanup、stale logic 不變。
- `normalizeUrl()`、`createQrMatrix()`、`createQrSvg()`、`exportQr()` 原文不變；EC **M**、**Byte**、payload、auto version、quiet-zone count 不變。
- CSP／headers 不變：`vite.config.ts`、`public/_headers` byte-identical；HTML 只加 size control，沒有變更 policy。Artifact 與 production browser CSP assertions PASS。
- Dependencies／version 不變：`package.json`／`package-lock.json` byte-identical，package／lock root／root package 都是 **1.1.0**。
- Playwright config、既有 `quality.spec.mjs`／`security.spec.mjs`／`final-ux-svg.spec.mjs`／`tests/decode.test.mjs` 與本輪開始時 byte-identical。
- Main 的 `resultStatus()`、decode／Copy／Open Link code 保留；oversize error 的既有 uncommitted copy 不回退。
- Download split structure、SVG→JPG→WebP menu order、filenames unchanged。
- CSS 僅四條局部 size-field styles；未改配色、字體、grid、tabs、header 或整體 UI/UX。
- 原任務文件、functional-freeze／pre-tag／final-SVG 與其他歷史 audit／verification 全部 byte-identical。

沒有處理其他 Minor／Future items，沒有重新設計 security model，沒有新依賴、UI redesign 或 final security audit。

## 13. Git State

- Branch **main**，仍 ahead `origin/main` **5** commits；HEAD **da4f4ab5f1c9c176eedaf3ce16246d025a38f4a2** unchanged。
- 開始時 modified：README、RELEASE_CHECKLIST、main.ts、qr.ts、final-ux-svg.spec、functional.spec、refinement.spec、decode.test、qr.test。這是前一輪已知未提交 functional-freeze delta，保留並在必要檔案上疊加本輪變更。
- 開始時 untracked：`V1_1_CUSTOM_OUTPUT_SIZE.md`、`V1_1_FUNCTIONAL_FREEZE_FINALIZATION.md`、`V1_1_FUNCTIONAL_FREEZE_VERIFICATION.md`，全部原文保留。
- 本輪 existing-file delta：`CHANGELOG.md`、`README.md`、`RELEASE_CHECKLIST.md`、`index.html`、`src/main.ts`、`src/qr.ts`、`src/styles.css`、`tests/browser/functional.spec.mjs`、`tests/browser/refinement.spec.mjs`、`tests/qr.test.mjs`。
- 新增 untracked：`tests/output-size.test.mjs`、`tests/browser/output-size.spec.mjs`、`V1_1_CUSTOM_OUTPUT_SIZE_VERIFICATION.md`。
- Staged **none**。No commit、no tag、no push、no release、no deploy；沒有 reset、丟棄修改的 checkout、amend、rebase、stash 或 clean。
- 無 `v1.1.0` tag。既有 tag objects／targets：v1.0.0 `0c41a74fb7c853f2f4f4ee65b5362a6bcfa71310` → `47600c5c3741a86a74537e46eeb10f0bf774f64a`；v1.0.1 `1e5f113430adb830862d586e76a6eb42c1d79589` → `214cea38bea3ca43ecb0dc0c0b0f7f3a18a51dd9`，不變。
- Version 保持 **1.1.0**，沒有建立 1.1.1。

## 14. Remaining Manual Acceptance

下列仍為 **NOT VERIFIED**：

- Real phone／camera scan：短、中、密集／near-capacity QR，三種 raster formats 與 SVG。
- Actual downloaded image visual size／外部 image viewer、Word／PDF 的實際使用驗收。
- Real Android；real Safari on macOS／iOS。Playwright WebKit 不等同 Safari。
- Printed scan（Word → PDF → 紙本）與 real camera photo。
- Narrator／NVDA／VoiceOver 實際朗讀，包含新 size field、error、dense announcement、Copy／Open Link。
- Native **200% browser zoom**；自動化等效 reflow／text enlargement 不冒充此項。
- Hosted HTTPS／response headers、deployed subdirectory；本輪沒有部署。
- Checklist 中新 custom-size／300 px／dynamic-minimum／SVG-independent 項目的使用者人工驗收。

Automated jsQR／production decoder round-trip **不等於 real phone scan**；axe 與 accessibility-tree assertions **不等於實際 screen-reader PASS**。

## 15. Functional Freeze Decision

**FUNCTIONALLY_FROZEN**

本輪指定功能、exact copy、validation order、integer／centered QR geometry、exact raster dimensions、SVG independence、regressions 與所有 required automated gates 均 PASS，scope integrity 成立。Verification-before-handoff：**AUTOMATED_PASSED_HUMAN_ACCEPTANCE_REQUIRED**，保留 §14 的人工驗收。

所有修改未 commit。產出本報告後停止；未開始 UI/UX redesign、final security audit、commit、tag、push、release 或 deploy。

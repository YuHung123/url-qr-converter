# URL QR Converter v1.1.0 — Target Size Geometry Fix Verification

日期：2026-10-03（Asia/Taipei）。開始／結束 HEAD：`da4f4ab5f1c9c176eedaf3ce16246d025a38f4a2`。所有修改保持未 commit；沒有 tag、push、release 或 deploy。

## 1. Executive Summary

**FUNCTIONALLY_FROZEN**。已撤銷 variable-width compact raster geometry，改用 uniform integer pixels per module 與 nearest legal target-size snapping。185 total modules／target512 現在產生 **555 × 555、3 px/module**，白底 PNG／JPG／WebP 與透明 PNG／WebP 全部 direct jsQR 及 production application round-trip PASS。

Windows native clean `npm.cmd ci` 後，Node **66/66**、artifact **4/4**、canonical browser **204/204**（Chromium／Firefox／WebKit 各 **68/68**）PASS；skipped／retry／flaky／unexpected **0**，axe **39 scans／0 violations**，npm audit **0 vulnerabilities**。詳細 evidence 見 §14。

Verification-before-handoff：**AUTOMATED_PASSED_HUMAN_ACCEPTANCE_REQUIRED**。實機／實際排版／螢幕閱讀器／native zoom／部署仍 NOT VERIFIED，見 §17。

開始前完整閱讀本輪任務文件、指定五份歷史報告、README／CHANGELOG／RELEASE_CHECKLIST、HTML、全部 source、tests 的文字程式及 fixture 說明、package.json、Playwright config。開始的 dirty tree 與歷史報告相符；沒有無法解釋的 unrelated changes。

Installed skills 以 session catalog 與可讀檔案盤點。實際使用 `model-routing`（core geometry／integration 由 PRIMARY 執行，未派 subagent）、`receiving-code-review`、`systematic-debugging`、`verification-before-handoff`、`context7:context7-mcp`。本 session 無專用 browser／Playwright／accessibility skill；使用 repository 原生 Playwright suite。Context7 查核 installed Playwright **1.63.0** 的 [test-scoped outputPath](https://github.com/microsoft/playwright/blob/v1.63.0/docs/src/test-parallel-js.md) 與 [evidence attachments](https://github.com/microsoft/playwright/blob/v1.63.0/docs/src/test-api/class-testinfo.md)。沒有引入新 framework 或擴大任務。

## 2. Root Cause

上一輪 `boundary(i) = floor(i * selectedSize / totalModules)` 在 185／512 產生 **43 格 × 2 px＋142 格 × 3 px**；同一 QR 的 module 寬度不一致。pixel buffer 雖無 interpolation、gray edge 或缺失 quiet zone，但 jsQR 1.4.0 對部分密集 QR 的 dimension estimation 錯誤。

先前 report 的診斷記錄：真正 QR modules／估計 dimension 分別為 medium **89／87**、dense **125／131**、near-capacity387 **177／173**、near-capacity512 **177／181**。這些 locator 數值引用歷史診斷，沒有在本輪修改或注入 decoder。

本輪開始時實際執行 Windows `npm.cmd test`：**49/56 PASS、7 FAIL、exit1**，重現 185／512、medium／dense／near-capacity 白底／透明像素及原 custom-size round-trip failures。最終使用同一 payload／matrix／decoder，uniform geometry 後全部 PASS。Baseline log：`playwright-report/target-size-geometry/baseline-node.log`。

## 3. Product Contract Change

Visible／accessible label **`輸出尺寸` → `目標尺寸`**。使用者輸入 `targetSize`，不是保證精確輸出的寬高；preview 與 raster files 使用 snapped `actualSize`。

Default **256**，合法 target **64–2048** 正整數；input spelling／validation order／timing 保留。Small actual 可以低於 target range 下限，例如 29 total modules／target64 → actual58；64 是 target minimum。SVG 保持 module-unit vector dimensions，不受 target／actual raster size 或 invalid target 阻擋。

## 4. Exact UI Copy

| 項目 | EXACT |
| --- | --- |
| Visible label／accessible name | `目標尺寸` |
| Unit／default | `px`／`256` |
| Placeholder／正常 size helper | 無 |
| Empty | `請輸入目標尺寸。` |
| Malformed | `請輸入有效的目標尺寸。` |
| Decimal | `請輸入整數尺寸。` |
| Global minimum | `目標尺寸不得小於 64 px。` |
| Global maximum | `目標尺寸不得大於 2048 px。` |
| QR-specific minimum | `此 QR Code 至少需要 {minimum} px。` |
| Preview | `實際尺寸：{actualSize} × {actualSize} px` |
| Background checkbox | `透明背景` |
| Dense guidance | `QR Code 較密，建議下載後掃描。` |
| Oversize image | `圖片檔案過大(上限20MB)` |

沒有新增 snapping warning、調整尺寸提示、透明背景 helper／warning。暫時 invalid input 保留最後 valid actual preview；blur／raster Download／Enter 才正式驗證。Empty、malformed、scientific notation、expression、unit suffix、decimal、negative、zero、global range 與 dynamic minimum 都有 regression coverage。

## 5. New Geometry

`resolveRasterSize(targetSize, totalModules)` 為 small pure helper；`rasterGeometry(qrModules, targetSize)` 提供 `totalModules = qrModules + 8`，回傳共用 scale／actualSize／minimumSize。UI 僅呼叫 helper 驗證；preview、PNG、JPG、WebP 都使用同一 renderer。

- `minimumSize = totalModules * 2`，target 低於 minimum 直接拒絕，沒有 snap 到 minimum 來隱藏錯誤。
- 候選 `floor(target / totalModules)`／`ceil(target / totalModules)`；合法 scale ≥2、actual ≤2048。
- 距離 `abs(totalModules * scale - target)` 最小者勝出；同距離選較大 scale。
- `actualSize = totalModules * scale`；RGBA buffer 直接建立 actualSize × actualSize。
- 每格固定 scale × scale，所有座標為 scale 的整數倍，4 logical quiet-zone cells／side。
- 沒有 centering／remainder padding、boundary distribution、compact/uniform mode switch、post-resize、drawImage scaling 或 interpolation。
- 白底 RGB 255、alpha255；黑格 RGB0、alpha255。透明背景 alpha0、黑格 alpha255，無 partial alpha／white matte。

Node 遍歷全部 40 QR versions 的代表合法 targets；以**列舉全部合法 scales 的獨立 test oracle**核對 nearest actual，並以獨立 EC M／Byte matrix 逐 pixel 核對每個格子與 quiet zone。

Pure tie test：total40／target100，80 與120等距 → **scale3／actual120**。Ceiling test：total41／target2048，2050雖更近但超 ceiling → **scale49／actual2009**；total185／2048 → **scale11／actual2035**。

## 6. Snapping Examples

| Total modules | Target | Lower scale → actual | Upper scale → actual | Chosen scale | Actual |
| ---: | ---: | --- | --- | ---: | ---: |
| 41 | 256 | 6 → 246 | 7 → 287 | 6 | 246 |
| 97 | 256 | 2 → 194 | 3 → 291 | 3 | 291 |
| 133 | 300 | 2 → 266 | 3 → 399 | 2 | 266 |
| 185 | 387 | 2 → 370 | 3 → 555 | 2 | 370 |
| 185 | 512 | 2 → 370 | 3 → 555 | 3 | 555 |

這些是 helper tests 與實際矩陣 evidence，production 沒有 hardcode size table。

## 7. 185 / 512 Regression

Payload 為完整 `https://example.com/`＋**2311 個 `a`**，2331 bytes、version40、177 QR modules、total185，與上一輪相同。

Node dedicated regression：target512 → scale3 → actual555；逐 pixel 比對全部 **185 × 185 格**，每格3 × 3，四邊 quiet zone **12px**，第一個 finder 黑格起點 **(12,12)**；沒有額外 whitespace。Direct jsQR 核對 exact payload 與 decoded version40；production `decodePixels()` exact URL PASS，白底與白底合成的透明副本皆 PASS。

| Actual download | Dimensions | Direct jsQR | Application picker | 三引擎 |
| --- | --- | --- | --- | --- |
| White PNG | 555 × 555 | exact payload PASS | exact payload PASS | PASS |
| White JPG | 555 × 555 | exact payload PASS | exact payload PASS | PASS |
| White WebP | 555 × 555 | exact payload PASS | exact payload PASS | PASS |
| Transparent PNG | 555 × 555 | exact payload PASS | exact payload PASS | PASS |
| Transparent WebP | 555 × 555 | exact payload PASS | exact payload PASS | PASS |

White recovery evidence：`test-results/output-size-previous-compa-b4ca6--PNG-JPG-WebP-exact-payload-{chromium,firefox,webkit}/previous-failure-recovery.json`。Transparent evidence：`test-results/output-preview-transparent-{ce28b,cf4a1}-t-and-production-round-trip-{chromium,firefox,webkit}/transparent-pixels.json`。

JSON 保存完整 decoded／application payload、target、actual、scale、modules；實際 downloaded files 也保留在各 test outputDir。透明 alpha／RGB mismatch **0**；PNG bytes 與同設定 preview PNG 相等。Direct scanning 僅將測試副本透明區合成白色，原 download 不改寫，符合 unchanged application decoder 的既有 compositing 行為。

## 8. Previous Failure Recovery

| Case | Target | Scale | Actual | Expected QR modules | Decoded payload |
| --- | ---: | ---: | ---: | ---: | --- |
| Medium | 256 | 3 | 291 | 89 | exact `https://example.com/`＋500個a |
| Dense | 300 | 2 | 266 | 125 | exact normalized `https://例子.測試/採訪?q=😀&long=`＋1000個a |
| Near-capacity | 387 | 2 | 370 | 177 | exact §7 payload |
| Near-capacity | 512 | 3 | 555 | 177 | exact §7 payload |

四例 Node 的 white／transparent direct jsQR＋production pixels 全 PASS；各引擎的 actual white PNG／JPG／WebP downloads 全部 direct jsQR＋application picker exact payload PASS，共 **36 檔**專項 recovery outputs。另保留既有 minimum、minimum+17、four-format、transparent、SVG、draft、stale-export assertions。

Case-specific JSON 在 `test-results/output-size-previous-compa-*/previous-failure-recovery.json`；完整 URL 而非截斷內容寫入 JSON。本表以 payload construction 表示，避免重複列出2331 字元。

## 9. Preview

以下為 canonical Chromium／desktop1280、minimal QR total29；每個有效 input event 立即 rerender，沒有等待 Generate／blur／Download。

| Target | Actual | Intrinsic canvas | CSS displayed | Dimension text |
| ---: | ---: | --- | --- | --- |
| 64 | 58 | 58 × 58 | 58 × 58 | `實際尺寸：58 × 58 px` |
| 128 | 116 | 116 × 116 | 116 × 116 | `實際尺寸：116 × 116 px` |
| 256 | 261 | 261 × 261 | 261 × 261 | `實際尺寸：261 × 261 px` |
| 300 | 290 | 290 × 290 | 290 × 290 | `實際尺寸：290 × 290 px` |
| 387 | 377 | 377 × 377 | 369 × 369 | `實際尺寸：377 × 377 px` |
| 512 | 522 | 522 × 522 | 369 × 369 | `實際尺寸：522 × 522 px` |
| 1024 | 1015 | 1015 × 1015 | 369 × 369 | `實際尺寸：1015 × 1015 px` |
| 2048 | 2030 | 2030 × 2030 | 369 × 369 | `實際尺寸：2030 × 2030 px` |

External fixture total41 的 default target256 → actual246；near-capacity target512 → actual555，desktop CSS displayed369，文字仍為 **`實際尺寸：555 × 555 px`**，三引擎同 helper／actual dimensions。

Invalid empty／abc／decimal／range／QR minimum 保留 last valid pixels、canvas、actual text。Generate A → draft B → size/background edit → download 仍 A，successful Generate B 才換 matrix。Stale size/background edits／edit-restore 與 new-Generate guards 全 PASS。

一項必要 edge correction：actual 58 不能直接當合法 target 重用；背景 toggle／invalid-input Generate fallback 以 global target minimum 64 重入 helper，仍保留同一 58 px grid，不改寫輸入。新增三引擎 regression PASS。

Evidence：`test-results/output-preview-transparent-06707-trained-CSS-and-screenshots-*/preview-sizes.json` 與各尺寸 screenshots；CSS 為 min(actual, available)，未修改上一輪 CSS。

## 10. Transparency

上一輪成功功能保留：default OFF，ON 匯出透明 PNG／WebP／SVG、JPG native disabled，OFF 恢復白底及 JPG。Checkbox state／keyboard／tab persistence／reload OFF、JPG keyboard skip／cannot activate／accessible disabled semantics 全 PASS。

Checkerboard 純 CSS presentation、不在 accessible tree 或 PNG／WebP／SVG。Transparency 僅改變 background alpha，不改 payload／matrix／actual；target edits 保留 checkbox state。Transparent PNG／WebP 的全部 background alpha0、dark alpha255、無 partial alpha／white matte；四 payload ×兩 raster ×三引擎共 **24** 份 alpha evidence，mismatch0。

SVG 只省略 white rect，保持 black path、intrinsic module-unit width／height、viewBox、quiet zone、picker／drag-drop exact round trip。Invalid raster targets 不阻擋白底／透明 SVG，且 successful SVG action 清除 raster error。

## 11. SVG / Security

`src/svg.ts`、`src/decode.ts` 本輪 **byte-identical**：

| File | SHA-256（開始＝結束） |
| --- | --- |
| src/svg.ts | `0fa47ca4ef2fb9c4e04b20fbcff7faa7f31040bb7d7122cd003b518986af4d8e` |
| src/decode.ts | `2c1802f08f73d9807457b2fb78e176eea57972df8a3ad71af6ee890638b93f0d` |

Parser／allowlist／namespace／geometry bounds／external-resource rules 不變；SVG原文不進DOM。三引擎 malicious／corrupt SVG、active payload、CSP／headers、no-network、no-storage、explicit Open Link／opener、stale parsing regressions 全 PASS。

CSP／headers／Vite config、manifest／lockfile、decoder dependency 固定版本 unchanged，沒有 fork／monkey-patch／known-version injection／new decode fallback／rotation／upscale retry。這是既有 security regression gate，**不是 Final Security Audit**；歷史 audit 的 unrelated Minor／Future 沒有處理。

## 12. Accessibility

Native label提供 EXACT `目標尺寸` accessible name，px aria-hidden、不污染名稱；default 256、無 placeholder／正常 helper。Error association／aria-invalid／alert／validation timing 保留。透明 checkbox／native disabled JPG／Tab／Space／menu arrows／Escape／focus-visible 全 PASS。

Dimension text 在 body accessibility snapshot 只出現一次；size/background preview edits 的 `#qr-status` mutation count0；dense／modified notice 的單一 live-region semantics 保留。Axe **39 scans／0 violations**：既有21、target error3、透明／disabled menu／error／320／200% equivalent15。沒有 disableRules、exclude、skip、retry、expected failure 或放寬 matcher／codec tolerance。

## 13. Responsive

三引擎測 desktop1280、768、375、320、640／200% text equivalent；no overflow／overlap／clipping、square／container constraint PASS。以下為 Chromium total41／透明 preview：

| Viewport | Available CSS px | Target128 → actual123 display | Target256 → actual246 display | Target2048 → actual2009 display |
| ---: | ---: | ---: | ---: | ---: |
| 1280 | 369 | 123 | 246 | 369 |
| 768 | 257.36 | 123 | 246 | 257.36 |
| 375 | 301 | 123 | 246 | 301 |
| 320 | 246 | 123 | 246 | 246 |
| 640，200% text | 566 | 123 | 246 | 566 |

目視檢查本次 Chromium desktop white 256、transparent dense，以及768／375／320／640-200% transparent screenshots：實際尺寸文字／controls 未重疊，dense 無多餘 padding，checkerboard 只在 canvas presentation。三引擎 metrics 吻合 actual size；CSS 寬度僅有正常 subpixel rounding 差異。不是 native zoom或使用者最終視覺驗收。

## 14. Required Gates

Windows **10.0.26200**、native Node **v24.21.0**、npm **11.19.0**、Playwright **1.63.0**，原 repository `C:\Users\yuhun\Desktop\url-qr-converter`。Clean指重新 `npm.cmd ci` 安裝；依任務保留已知未提交working tree，未清除source changes。

| Gate | Result |
| --- | --- |
| npm.cmd ci | PASS，exit0，added23 packages，0 vulnerabilities |
| npm.cmd test | PASS，exit0，66/66；fail／cancelled／skipped／todo0 |
| npm.cmd run typecheck | PASS，exit0 |
| npm.cmd run build | PASS，exit0 |
| npm.cmd run test:artifact | PASS，exit0，4/4 |
| npm.cmd run test:browser | PASS，exit0，204/204 |
| Chromium | PASS，68/68 |
| Firefox | PASS，68/68 |
| Playwright WebKit | PASS，68/68 |
| Axe | PASS，39 scans／0 violations |
| npm.cmd audit | PASS，exit0，0 vulnerabilities |
| npm.cmd ls --omit=dev --all | PASS，exit0，jsqr1.4.0／qrcode-generator2.0.4 |
| git diff --check | PASS，exit0 |
| git diff --cached --check | PASS，exit0，staged none |

Canonical reporter startTime **2026-10-03T03:49:21.314Z**、duration **520.228s**；expected204、unexpected0、skipped0、flaky0、errors 空。204 個 tests各只有一個passed result，retry sum 0。Chromium **153.0.8010.12**、Firefox **155.0**、Playwright WebKit **26.6**。rootDir 與三個 project testDir指向原 repository。Canonical attachments的18 份 axe scans，加上quality suite 21 份，合計 39；沒有重複計數outputPath 原檔與Playwright attachment 副本。Summary：`playwright-report/target-size-geometry/reporter-summary.json`。

Canonical 使用原 config／testDir／preview-server／4173、workers1、retries0、原timeout；無alternative harness／port／test copies。Browser 由 189 增至 204（四個white failure recovery＋actual 58 edge，五個 tests × 三引擎）；Node 由 56 增至 66。Compact boundary／exact target assertions因本轮明確新contract而更新，所有round-trip要求保留。

開發期 targeted Chromium **52/52 PASS**；小尺寸edge在後續canonical確認。最後新增一個更強的 ceiling assertion（closer 2050 仍拒），只影響 Node test；已重新 `npm.cmd test` PASS 66/66，不影響 browser／typecheck／artifact evidence。Browser 重建 dist 後已重新執行 artifact gate，確認 final 產物 4/4 PASS；source／config 未改，其他 PASS evidence仍適用。

Logs／exit codes：`playwright-report/target-size-geometry/`，含 `gates.json`、`ci.log`、`node.log`、`typecheck.log`、`build.log`、`artifact.log`、`browser.log`、`audit.log`、`dependencies.log`。`test-results/results.json` 為canonical reporter。

Sandbox內Windows probe遇WSL `UtilBindVsockAnyPort`；經允許的sandbox外native commands成功。開始時 4173 free；5173 的 existing listener屬於**另一個project**，保持不動。Canonical runner自動管理本 project 4173，結束無本 project listener／test server殘留；未停止其他 project／Codex service，也未修改execution policy。

## 15. Scope Integrity

開始保存 **63** 份project files的SHA-256；本輪 **14** existing paths改變，其餘 **49** byte-identical，另新增兩份test-support／regression files及本報告。

| 本輪 delta | 用途 |
| --- | --- |
| src/qr.ts | pure snapping helper、uniform direct renderer、target validation copy |
| src/main.ts | actual-size prefix、actual58 preview reuse guard |
| index.html | native label改目標尺寸 |
| tests/output-size.test.mjs、output-preview-transparent.test.mjs、qr.test.mjs、decode.test.mjs | 更新superseded exact-target／compact expectations，保留pixel／alpha／decode assertions |
| tests/browser/output-size.spec.mjs、output-preview-transparent.spec.mjs、refinement.spec.mjs、functional.spec.mjs | actual dimensions／uniform pixels／copy及專項recovery、actual 58 edge |
| tests/raster-expectations.mjs（新增） | independent exhaustive legal-scale oracle |
| tests/target-size-geometry.test.mjs（新增） | examples／tie／ceiling／four failures專項pure及pixel round-trip |
| README.md、CHANGELOG.md、RELEASE_CHECKLIST.md | target semantics、decoder compatibility correction、manual checklist |
| 本報告（新增） | evidence與freeze decision |

EC **M**、**Byte mode**、ASCII guard、payload、URL normalization、QR auto version／matrix原文不變。qr.ts 自 import 至 MIN 常數前及 exportPng／SVG／format encoders 後半段與開始snapshot相等。Main decode／upload／Copy／Open Link後半段原文相等；density／stale guards與preview／transparency成功功能保留。

`src/styles.css`／SVG parser／decoder／CSP headers／Vite config／package manifest／lockfile／Playwright config 全 byte-identical；version **1.1.0**，runtime dependencies unchanged。全部歷史 reports／task docs unchanged；`final-ux-svg.spec.mjs`與`quality.spec.mjs`僅保留其pre-existing delta，本輪未寫入。沒有 UI redesign、new formats、presets、dependency adoption、security expansion。

Scope hashes／changed paths：`playwright-report/target-size-geometry/scope-checks.json`。

## 16. Git State

Branch **main**，仍ahead origin/main **5** commits；HEAD unchanged **da4f4ab5f1c9c176eedaf3ce16246d025a38f4a2**。全部 Git refs與開始逐 byte 相同；tags 仍僅`v1.0.0`／`v1.0.1`，沒有`v1.1.0`。

Staged **none**。既有dirty／untrackedpreview／transparent／custom-size／functional-freeze修改保留；本輪新增`tests/raster-expectations.mjs`、`tests/target-size-geometry.test.mjs`、本報告。`dist/`、`test-results/`、`playwright-report/`為既有gitignored build／evidence。

沒有 commit、tag、push、release、deploy、reset、discarding checkout、stash、clean、amend或rebase。Final status／refs evidence保存在ignored verification directory。

## 17. Remaining Manual Acceptance

以下全部 **NOT VERIFIED**，自動化及screenshot inspection不能代替：

- Real phone scan：短／中／dense／near-capacity；white PNG／JPG／WebP、transparent PNG／WebP、SVG。
- Real camera photo。
- Word／PDF實際下載檔排版與最終PDF掃描。
- 使用者actual visual size／target snapping／preview尺寸感與background操作驗收。
- Real Android。
- Real Safari on macOS／iOS；Playwright WebKit不等同Safari。
- Print／實際紙本掃描。
- Narrator／NVDA／VoiceOver實際朗讀：目標尺寸、實際尺寸、error、checkbox、disabled JPG、dense announcement。
- Native **200% browser zoom**。
- Deployment、hosted HTTPS／response headers、actual subdirectory；本輪未部署。

## 18. Functional Freeze Decision

**FUNCTIONALLY_FROZEN**

本輪所有指定 automated criteria成立：uniform module-aligned nearest actual、min scale 2、max actual 2048、tie higher、四格quietzone、無padding、185/512 → 555 所有支援 raster round-trip、四個previous failure恢復、exact copy、preview／transparency／SVG／security／accessibility／responsive及required gates全PASS。

Verification-before-handoff仍為 **AUTOMATED_PASSED_HUMAN_ACCEPTANCE_REQUIRED**，§17未驗收項目保留。所有修改未commit。產出本報告後停止，未開始UI/UX redesign、Final Security Audit、任何Git write／release／deploy步驟。

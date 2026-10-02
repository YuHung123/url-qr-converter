# v1.1.0 Final UX + SVG Security Delta Audit

日期：2026-10-02。審查對象：HEAD `0fde32f` + 未提交的 Final UX + SVG 修改。本輪為 review only：沒有修改 product source、tests、README／CHANGELOG 或既有文件；沒有 commit、tag、push、release、deploy。唯一新增檔案是本報告。

## 1. Executive Summary

| 類別 | 數量 |
| --- | --- |
| Blocker | 0 |
| Important | 0 |
| Minor | 10 |
| Manual / Environment | 9 manual + 3 environment notes |
| Future | 2 |

- **Final UX：PASS WITH NOTE**（兩個 Minor 無障礙細節，見 §5、§17）
- **SVG decode security：PASS WITH NOTE**（安全邊界成立；有界的資源耗用 Minor，見 §9）
- **Candidate：READY WITH MANUAL CHECKS**

結論依據：獨立重跑所有 automated gates（含 Windows 上真實 Chromium／Firefox／Playwright WebKit 93/93）、自建 36 個 SVG／檔案偽裝 fixture 在三引擎的 runtime probe、parser 55 種變體矩陣，以及兩個 pr-review-toolkit agent 的審查（其發現皆已自行重現或對照 source 後才採納）。

## 2. Git / Diff Scope

- HEAD：`0fde32f`；分支 `main`。
- Modified（10）：`CHANGELOG.md`、`README.md`、`index.html`、`src/decode.ts`、`src/main.ts`、`src/styles.css`、`tests/browser/functional.spec.mjs`、`quality.spec.mjs`、`refinement.spec.mjs`、`tests/decode.test.mjs`。
- Untracked（3）：`src/svg.ts`、`tests/browser/final-ux-svg.spec.mjs`、`V1_1_FINAL_UX_SVG_VERIFICATION.md`（加上本報告）。
- 分類：UI copy cleanup（index.html、main.ts、styles.css）；accessibility preservation（visually-hidden、role=group、live regions）；SVG detection／parsing／rasterization（svg.ts、decode.ts）；tests（四個既有檔的小幅修改＋新 spec）；docs（README、CHANGELOG、verification 報告）。
- Unexpected product modification：**None**。
- `package.json`／`package-lock.json`／`vite.config.ts`／`public/_headers`／`playwright.config.mjs`：`git diff` 為空，未修改。version `1.1.0`。tags：僅 `v1.0.0`、`v1.0.1`，無 `v1.1.0`。`git diff --check` PASS。
- 備註：working tree 的 `test-results/`（ignored）被我清掉並重建；`dist/`（ignored）由我重建，檔名 hash（`index-DPK1Q4_h.js`、`index-BTQzJSDN.css`）與原有 dist 相同，build 可重現。

## 3. Skills / Tools Used

- **pr-review-toolkit**：實際使用 `code-reviewer`（diff 全面審查：svg.ts／decode.ts／main.ts／a11y）與 `pr-test-analyzer`（race test 修改、decode.test 修改、SVG 覆蓋缺口、skip／only 掃描）。兩者的發現我逐一重現或對照 source：WebP sniff 位移、`<?xml-stylesheet` 前導、AVIF 拒絕、dense 提示未進 live region 皆重現；trailing-whitespace 二次方耗時重現（見 §9）。
- **security-guidance**：安裝清單中**沒有**此名稱的 skill。我嘗試載入最接近的 `security-review`，但它的前置 shell 步驟（`git diff origin/HEAD...`）因本 repo 沒有 `origin/HEAD` 而失敗，未載入。因此 SVG 威脅模型、parser／allowlist／no-CSP 思想實驗與資源邊界審查由我自行完成，並以獨立 probe 驗證，並非由該 skill 產出。
- **ui-regression-check**：載入並依其流程（scope → 既有檢查 → 主要互動 → 視覺 → 鍵盤／焦點 → a11y → runtime errors → 鄰近回歸）執行。
- **Playwright**：載入了 `playwright-cli` skill，但實際以 Playwright library scripts（`@playwright/test` 的 chromium／firefox／webkit launchers）執行 probe，未使用 `playwright-cli` 互動指令。用於：aria snapshot、computed style、Tab 順序、Space 開啟選檔器、request／console／pageerror／popup／navigation／CSP 監聽、截圖。
- 未使用：MarkItDown 等與本審查無關的工具。

## 4. Final UX Audit

以 1280 寬實測三引擎的 DOM 與截圖（五個寬度共 55 張）：

- URL → QR 正常態只有：H1 `URL ↔ QR Code`、tabs、`網址` label、input（無 placeholder）、`產生 QR Code`、QR 預覽（含初始「尚未產生 QR Code」placeholder）、Download split button。沒有「可省略 https://」、沒有可見「已產生 QR Code」、沒有 footer。
- `網址已修改，請重新產生。` 只在 draft ≠ generated 時出現（`#qr-notice`）；`QR Code 較密，建議下載後掃描。` 在 modules ≥ 85 才出現（實測 89、105 modules 出現；65、81 不出現）；兩者同時成立時以空格串接，單行自然換行。
- QR → URL 正常態只有「選擇圖片或拖曳到這裡」與 `網址` 結果欄；無「未選擇任何檔案」、無單檔／20 MiB 說明、無結果 placeholder、無可見「已找到網址」；Copy icon 與（成功後的）開啟連結存在。截圖中畫面清楚、無空洞，錯誤出現時排版不跳動。
- 判斷：移除的文字沒有讓畫面難以理解。

## 5. Accessibility Audit

三引擎實測：

- **File input**：`display:block`、`visibility:visible`、`opacity:1`、`position:absolute`、1×1px、`tabIndex=0`；Tab 可聚焦；聚焦時 drop zone 顯示 3px `rgb(19,106,171)` outline；Space 在三引擎都開啟 file chooser。不是 `display:none`／`visibility:hidden`。
- **Drop zone**：`role=group`、name「QR Code 圖片上傳區」；點擊 label 可觸發；不依賴 drag/drop。
- **Hidden live regions**：`#qr-status`、`#result-hint` 為 `role=status`、`aria-atomic=true`、`position:absolute`、`clip:rect(0,0,0,0)`、1×1（空時 0×0）；成功後 aria snapshot 出現 `status: 已產生 QR Code。`／`status: 已找到網址`，仍在 accessibility tree，不占版、不形成 focus point。
- **Result／actions**：結果 textbox name「網址」；Copy 按鈕 name「複製網址」；`開啟連結` link 有 name 與 href；下載選單 menu／menuitem／方向鍵／Escape 語意由既有 suite 保護，且 PASS；tab semantics PASS。
- **axe**：quality.spec 以單一 helper `scan()` 執行 `wcag2a／wcag2aa／wcag21aa`；encode 4 次（初始、錯誤、成功、展開選單）＋decode 3 次＝7 次／引擎＝21 次，全 0 violations；`tests/` 內無 `disableRules`／`exclude`。
- **發現（Minor，見 §17）**：
  1. 高密度提示只寫入 `#qr-notice`（非 live region、未被 `aria-describedby` 引用）。HEAD 是附加到 live 的 `#qr-status`。實測三引擎 modules=89／105 時，status 僅「已產生 QR Code。」。螢幕閱讀器使用者生成後不會被主動告知，只有逐段瀏覽才會讀到。另外「網址已修改」同時存在於 hidden status 與可見 notice，瀏覽模式會讀兩次。
  2. file input 的 `aria-label="QR Code 圖片"` 覆蓋了可見 label「選擇圖片或拖曳到這裡」，accessible name 不含可見文字（aria snapshot：`button "QR Code 圖片"` 與獨立 text「選擇圖片或拖曳到這裡」）。語音控制使用者說「點擊 選擇圖片」可能無法命中（WCAG 2.5.3 Label in Name）。HEAD 的 name 來自 label。
- 以上皆不影響鍵盤可用性；真正的螢幕閱讀器朗讀仍是人工項目。

## 6. Error Classification Audit

在三引擎以 exact text 驗證（既有 spec 加我自己的 probe）：

| Case | 實際 kind | 實際可見文字 |
| --- | --- | --- |
| 圖片無 QR | `no-qr` | 圖片中找不到 QR Code。 |
| `.heic`／`.txt`／`.pdf`／`.html`（無法辨識且未宣告支援） | `unsupported-format` | 不支援此檔案格式。 |
| 損毀 PNG／JPEG／WebP（宣告支援但無法讀取） | `invalid-image` | 無法讀取這張圖片。 |
| 損毀或惡意 SVG、空檔 `.svg`／`.png` | `invalid-image` | 無法讀取這張圖片。 |
| 20 MiB + 1（png 與 svg 皆測） | `too-large` | 圖片檔案過大（上限 20 MiB）。 |
| 多檔 drop | — | 一次只能選擇一張圖片。 |
| QR payload 非網址 | `unsupported-url` | 這個 QR Code 不是網址。 |
| 空的非檔案 drop | — | 請選擇一張圖片。 |

分類穩定：unsupported、corrupt supported、no-QR 沒有掉進同一個 generic error。備註：截斷 PNG 在 Chromium 為「無法讀取」，Firefox／WebKit 為「找不到 QR Code」，是 `createImageBitmap` 的既有引擎差異，非本輪引入。

## 7. SVG Architecture Review

```
File (≤ 20 MiB, 先檢查 size)
  → slice(0,512).arrayBuffer() → 內容 sniff（SVG 起始標記／PNG／JPEG／WebP／GIF／BMP signature）＋ MIME／副檔名
  ├─ raster：createImageBitmap(file) ─────────────────────────────┐   （既有路徑）
  └─ SVG：file.text() → parseSafeSvg(source)                       │
        [trust boundary：純字串 regex 靜態文法；無 DOMParser／DOM／<img>／blob URL]
        → 數值幾何（Number、finite、≤2048）＋ 固定黑白色 ＋ allowlisted path d
        → Canvas fillRect／Path2D（先補白底）                      │
  → getImageData（768 → 必要時 2048）←──────────────────────────────┘
  → jsQR → 每個 Byte chunk fatal UTF-8 → normalizeUrl() → 結果
```

- 使用者 SVG 原文從未進入 DOMParser、innerHTML、`<img>`、blob／data URL、`<object>`／`<embed>`／`<iframe>`；source 中除 `file.text()` 與 regex／`Number()`／`new Path2D(allowlisted d)` 外沒有其他消耗點。
- 唯一例外路徑（Minor）：若 SVG 內容不被 sniff 認出（例如以註解開頭）又被命名成 `.png`／宣告 `image/png`，會走 raster 的 `createImageBitmap`。我實測惡意版本（含 `<script>`、外部 `<image>`、onload）在三引擎都回「無法讀取」、0 request、sentinel 未觸發；`createImageBitmap` 是 image mode，不執行 script、不載外部資源，且此行為與 HEAD 相同。所以 README「原始 SVG 不會交給影像載入器」對「被辨識為 SVG 的檔案」成立，對這種偽裝檔是 fail-closed 但並非「從不交給」；安全不依賴此點。
- **No-CSP 思想實驗**：若 CSP 完全不存在，驗證路徑本身仍不會執行或載入任何使用者 SVG 內容（沒有任何 browser parser 看到原文）。安全不依賴 CSP；CSP 是額外保護。

## 8. SVG Parser / Allowlist Review

直接 source review（`src/svg.ts`）加 55 種變體矩陣（Node 直接呼叫 `parseSafeSvg`）：

- **Fail-closed：是。** root 與每個 element 都用 anchored（`^…`、root 尾端 `$`）regex 逐段消耗，不是 substring blacklist；尾端 payload（`</svg><script>`）、第二個 root、多餘 element 全部被拒。
- **Unknown elements：拒絕**（`<g>`、`<title>`、`<style>`、`<script>`、`<image>`、`<use>`、`<foreignObject>`、`<a>`、prefixed `svg:rect`、巢狀）。
- **Unknown attributes：拒絕**（`style`、`stroke`、`onload`、`xmlns:*`、`e:x`）。屬性順序與引號固定；單引號、改順序、重複屬性（root 與 rect）、大寫 `<SVG>`／`<RECT>`／`VIEWBOX` 全拒。
- **Namespace tricks：拒絕**（prefixed root、`xmlns:xlink`、其他 xmlns 值）。
- **XML tricks**：DOCTYPE、entity（`&x;` 在屬性內因數值文法被拒）、CDATA、註解（root 前或內）、`<?xml-stylesheet?>` 在 body 內皆拒。數值 `Infinity`／`NaN`／`1e2`／`1e999`／負數／0／>2048／500k 位小數皆拒。
- **External refs／CSS／scripts／events：** 沒有任何路徑可通過——允許的屬性只有 `xmlns`（固定值）、`viewBox`（`0 0 W H`）、`width`／`height`（必須等於 viewBox）、可選 `shape-rendering="crispEdges"`、rect 的 `x`／`y`／`width`／`height`／`fill`、path 的 `d`／`fill`；`fill` 僅允許黑／白 keyword 或 `#000`／`#fff` 系列。
- **有限的 regex／XML 差異面：** 因為不經過任何 XML parser，「regex 嚴格但 XML 有另一種合法語法」的繞過類型不成立——不被 regex 接受的字串一律拒絕，被接受的只會變成 `Number` 或 allowlist 字元。實測未找到繞過。
- **兩個鬆動處（Minor）：**
  1. prolog 的 `/^\s*<\?xml\b[^>]*\?>/i` 因 `\b` 也吻合 `<?xml-stylesheet …?>`、`<?xml-model …?>`，這類前導 PI 被靜默剝除後檔案仍可解碼（實測三引擎皆 OK、0 request）。無任何抓取或執行，只是與「不允許 processing instructions」的意圖不一致；建議改為 `<\?xml\s`。
  2. sniff（decode.ts）同樣寬鬆，但因 parseSafeSvg 為嚴格文法，不構成問題。

## 9. Resource / DoS Boundary

| 邊界 | 實際 |
| --- | --- |
| File | 20 MiB；`file.size` 先檢查；exact 20 MiB 進入處理、+1 → `too-large`（png、svg 都測） |
| SVG text | `source.length > 1_000_000` 拒（實測 1,000,000 接受、1,000,001 拒） |
| Element／shape 數 | > 10,000 拒（實測 10,000 接受、10,001 拒） |
| Dimension | 0 < 值 ≤ 2048；coordinate ≤ 2048；`2048` 接受、`2049` 拒 |
| Canvas | 沿用 768 → 2048 兩階段；SVG 以最長邊 2048 縮放後仍受同一上限 |
| Path2D | 只允許 `M m L l H h V v Z z` 與 `0-9 . , + - 空白`（無曲線／弧／指數）；`d` 受 1M 總長限制（`path[1].length > 1_000_000` 因總長已受限為 dead code） |
| Numeric | `Number()` + finite + 上限；無 NaN／Infinity／指數可通過 |

**Path2D 評估：allowlist 限制了語法，但沒有限制 workload。** workload 由「shape 數 × 覆蓋面積」決定。實測（Windows，三引擎；同一個選檔路徑）：

| 檔案 | 大小 | 三引擎耗時 |
| --- | --- | --- |
| 本工具產出的最大容量 QR SVG | 224 KB | 165–178 ms（成功） |
| 80k 個 `M0 0h1v1h-1z`（單一 path） | 960 KB | 0.5–0.8 s |
| 40k 段自交星形 path | 240 KB | 0.45–0.6 s |
| 1k 個全畫布 rect（2048×2048） | 46 KB | 1.0–1.7 s |
| 10k 個全畫布 rect | 460 KB | **7.7–9.7 s** |
| 10k 個全畫布 path | 410 KB | **7.7–9.4 s** |

最壞情況是約 8–10 秒的同步主執行緒凍結（來源：使用者自己選取的惡意檔、無持久影響、結果為「找不到 QR Code」），受 10,000 shapes × 2048² canvas 上限所界定，不是無界。這與 README 已記載的 jsQR 同步阻塞屬同類風險，但 SVG 路徑把 460 KB 檔案放大成秒級工作量。評估為 **Minor**。建議的低風險緩解（非必須）：把 shape 上限由 10,000 降到幾十（本工具輸出只有 1 個 rect + 1 個 path），或加總覆蓋面積上限。

另有一個二次方行為（Minor）：`while (body.trim())` 在每輪重掃尾端空白，使 10,000 個 shape 加上大量尾端空白時耗時為二次方。實測（Node／V8）：尾端 100k 空白 0.42 s、400k 空白 1.64 s、接近 1M 上限時約 3–4 s（code-reviewer 量到 4.0 s，我重現同量級）。修法：迴圈前 trim 一次，改用 `while (body)`＋`trimStart()`。

其他 regex 輸入（百萬空白、重複 `</svg>`、屬性間大量空白、40 萬位數字）皆為線性、≤ 10 ms；沒有 ReDoS。

## 10. Malicious SVG Results

自建 fixture，正式 dist＋原 CSP＋原 `_headers`，監聽 request／requestfailed／console／pageerror／popup／navigation／`securitypolicyviolation`，並檢查 sentinel、DOM 元素數、script 數、storage／cookie。**以下每一列在 Chromium 153／Firefox 155／WebKit 26.6 結果相同。**

| Payload | Expected | Actual | Network | Script | DOM | Result |
| --- | --- | --- | --- | --- | --- | --- |
| `<script>` | 拒絕 | 無法讀取這張圖片 | 0 | 未執行 | 不變 | PASS |
| root／rect `onload=` | 拒絕 | 同上 | 0 | 未執行 | 不變 | PASS |
| `<image href=https://…>`、`xlink:href` | 拒絕 | 同上 | 0 | — | 不變 | PASS |
| `<use href=https://…#x>` | 拒絕 | 同上 | 0 | — | 不變 | PASS |
| `<style>@import…`、`style="background:url()"` | 拒絕 | 同上 | 0 | — | 不變 | PASS |
| `<foreignObject><iframe …>` | 拒絕 | 同上 | 0 | — | 不變 | PASS |
| `<a href="javascript:…">` | 拒絕 | 同上 | 0 | 未執行 | 不變 | PASS |
| `<?xml-stylesheet?>` 在 body | 拒絕 | 同上 | 0 | — | 不變 | PASS |
| DOCTYPE＋external entity | 拒絕 | 同上 | 0 | — | 不變 | PASS |
| DOCTYPE／註解在合法 SVG 前 | 拒絕 | 同上 | 0 | — | 不變 | PASS |
| `xmlns:e` ＋ prefixed attr／`svg:rect` | 拒絕 | 同上 | 0 | — | 不變 | PASS |
| 大寫 `<SVG><RECT>`、換行屬性 | 拒絕（嚴格文法） | 同上 | 0 | — | 不變 | PASS（fail-closed） |
| HTML 內含 `<svg>`、命名 `.svg` | 拒絕 | 無法讀取 | 0 | 未執行 | 不變 | PASS |
| 任意 XML 命名 `.svg` | 拒絕 | 無法讀取 | 0 | — | 不變 | PASS |
| 惡意 body、註解開頭、命名 `.png` | 拒絕 | 無法讀取（走 raster 路徑，被拒） | 0 | 未執行 | 不變 | PASS（見 §7） |
| `<?xml-stylesheet …?>` **在 prolog**＋合法 QR | （嚴格應拒） | 解碼成功 | 0 | — | 不變 | PASS WITH NOTE（見 §8） |
| BOM＋合法 SVG | 接受 | 成功 | 0 | — | 不變 | PASS |
| UTF-16LE＋BOM 合法 SVG | — | Chromium／WebKit 成功、Firefox 拒絕 | 0 | — | 不變 | NOTE：`Blob.text()` 的引擎差異，無安全影響 |

整體：external／failed request 0、pageerror 0、console error／warning 0、popup 0、unexpected navigation 0、CSP violation 0、sentinel 全 false、DOM 元素數不變、storage／cookie 0。**重點：CSP violation = 0 是因為 SVG 根本沒進入會觸發 CSP 的 browser path（見 §7），不是被 CSP 擋下。**

## 11. Generated SVG Round-trip

由實際 URL → QR UI 產生並下載 `qr-code.svg`，再 picker 與 drag/drop 解碼（我自己的 probe，另加既有 spec）。全部逐字等於 `#url-input` 的 normalized URL，Open Link href 相同、`target=_blank`、`rel="noopener noreferrer"`。

| Case | SVG 大小 | Chromium | Firefox | WebKit |
| --- | --- | --- | --- | --- |
| short ASCII | 4.3 KB | picker／drop EXACT | EXACT | EXACT |
| Unicode／IDN（`例子.測試/採訪?q=😀`） | 9.6 KB | EXACT | EXACT | EXACT |
| medium（500 字元） | 53 KB | EXACT | EXACT | EXACT |
| dense（~1000 字元） | 106 KB | EXACT | EXACT | EXACT |
| scheme-less `localhost:3000/a` | 4.3 KB | EXACT | EXACT | EXACT |
| 最大容量（~2300 字元） | 224 KB | EXACT（92 ms） | EXACT（217 ms） | EXACT（206 ms） |

既有 spec 另覆蓋 Copy（`網址已複製。`）、explicit popup 與 `window.opener === null`，以及偽裝 PNG 的 SVG。

## 12. Raster Regression

三引擎皆通過（由我在頁面內從獨立 fixture 轉碼）：PNG、JPEG、WebP、BMP、透明 PNG、PNG 改名 `.jpg`、JPEG 改名 `.png`、WebP／PNG 無 MIME 且無副檔名（皆以內容 signature 辨識）→ 全部解出 `https://example.com/independent?source=segno&v=1`。損毀 JPEG／garbage `.webp`／截斷 PNG → 「無法讀取」（或引擎差異下的「找不到 QR」）；`.txt`／`.pdf` → 「不支援此檔案格式」。GIF 沒有獨立測（沒有現成編碼器，我未自製），僅靠 signature 邏輯與既有行為判斷，未驗證。既有 suite 的 768 → 2048、large JPEG、transparent、cleanup 皆 PASS。

發現（Minor）：
- **AVIF（以及 ICO；Safari 上的 HEIC）** 在 HEAD 會交給 `createImageBitmap` 並可能解碼；現在 sniff 與 `known` 都不含它們，直接回「不支援此檔案格式」。已實測 `a.avif`／`image/avif` → unsupported。README 並未承諾這些格式，且 `.heic` → unsupported 是預期規格；但對 AVIF 是行為縮減。選項：把 avif 加進 sniff（`ftypavif`）或對 `image/*` 先嘗試 raster。
- **WebP sniff 位移**：以 `TextDecoder` 解碼 header 後用字元索引（`prefix.slice(8,12)`），RIFF size 位元組若恰成合法多位元組 UTF-8（例如 `C3 A9`）會位移。我實測：該檔案若同時沒有 MIME 與副檔名，會被判 unsupported（HEAD 可解）。有 MIME 或副檔名時無影響，實際機率低。修法：直接比對位元組。

## 13. Race / State Regression

- **header sniff race 修改**（functional.spec、refinement.spec）：我與 pr-test-analyzer 逐行對照——兩處修改只新增 `waitForFunction(pendingBitmaps.length === n)`，等待新增的 header sniff stage 完成、`createImageBitmap` 被攔截後才進行下一步；resolve 順序（較新的先、舊的後）與所有斷言不變，沒有弱化 stale-decode，也沒有把 race 變成沒有 race。舊 operation 仍不能覆蓋新 operation（三引擎 PASS）。已知小缺口（修改前就存在）：`toHaveValue(unicodeUrl)` 在 resolve 舊 bitmap 後立即成立，不等待舊 decode 結束。
- **decode.test.mjs 修改**：`{size}` stub 改為真 `File`（因為現在用到 `slice`／`type`／`name`）；`() => ++checks < 2` 讓第一次 `isCurrent`（header 後）為 true、第二次（bitmap 建立後）為 false，仍驗證「stale 時 bitmap 被 close（`closed === 1`）」；20 MiB／+1 邊界語意保留。稍脆（依賴 `isCurrent` 呼叫次數）但失敗會明確。
- **stale SVG**：新 spec 以暫停 `File.prototype.text` 製造「SVG 解析中被較新 raster 取代」，三引擎 PASS，結果不被覆寫。header 讀取後的 stale 視窗沒有專屬測試（Minor）。
- **raster ↔ SVG 交錯、Copy、Open Link**：既有 stale Copy／focus 測試 PASS；失敗路徑清除 `href`，惡意／無效 SVG 不產生 Open Link（`#open-link` hidden、無 href）。

## 14. Security / Privacy

- **CSP／headers**：`public/_headers` 與 vite config 未改；實測回應含 `default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'none'; object-src 'none'; frame-ancestors 'none'`、`nosniff`、`no-referrer`、`Permissions-Policy`。
- **Network**：所有 probe 0 external request；security.spec PASS。
- **Storage／DOM／navigation**：無 storage／cookie 變動；惡意 SVG 不產生 DOM 注入；Open Link 只在明確點擊後以 `_blank`＋`noopener noreferrer` 導航；解碼成功不自動開啟。
- **URL 安全**：SVG 與 raster 共用 `jsQR → per-chunk fatal UTF-8 → normalizeUrl()`；沒有 SVG 專屬捷徑；`decode.ts` 的 `decodePixels` 未動。既有測試中 javascript／data／file／自訂 scheme 仍拒絕，scheme-less 與 localhost port 行為保留。
- **Dependencies**：`npm ls --omit=dev --all` 只有 `jsqr@1.4.0`、`qrcode-generator@2.0.4`；`npm audit` 0 vulnerabilities；無新 production dependency、無 sanitizer／XML parser／遠端 library。

## 15. Linux WebKit Environment Review

- 原 verification 報告的 Linux 作法（`/tmp` 共享函式庫、替代 launcher、暫存 config、`PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1`）**我無法重新檢視**：該 `/tmp` 內容在 WSL 中已不存在，這台 WSL 也缺少 browser 共享函式庫（`libnspr4.so` 找不到），所以我沒有重現它。
- 可確認：repo 的 `playwright.config.mjs` 沒有任何修改（`git diff` 為空）；timeout 60 s、`retries: 0`、`workers: 1` 保持原值；tests 中沒有 Linux 特化。測試檔內沒有 `.skip`／`.only`／`.fixme`／`test.fail`／`expect.soft`／`waitForTimeout`。
- 取代方式：我改在**本機 Windows（專案的 canonical 環境）**以真實 Playwright browsers 執行完整 suite，見 §16。這樣不需要依賴 Linux workaround 的可信度；WebKit 是 Playwright WebKit 26.6 的真實 process，不是 Safari。
- 判斷：原 Linux 作法若如報告所述僅為 host dependency workaround，可接受；但我不將它作為本次結論的依據。

## 16. Automated Gates

| Gate | Result |
| --- | --- |
| Node `npm test` | PASS：37/37 subtests（22 decode + 15 QR） |
| typecheck | PASS |
| build | PASS（WSL，見環境註記；產物 hash 與既有 dist 相同） |
| artifact `npm run test:artifact` | PASS：4/4（Windows 與 WSL 各一次） |
| Chromium | PASS 31/31（153.0.8010.12，Windows 原生） |
| Firefox | PASS 31/31（155.0，Windows 原生） |
| WebKit | PASS 31/31（Playwright WebKit 26.6，Windows 原生） |
| 合計 | 93/93，約 3.5 分鐘；list reporter 沒有 skipped／flaky／retry 輸出，config `retries: 0` |
| axe | 21 scans（7×3）、0 violations、無 disabled rules |
| `npm audit` | 0 vulnerabilities |
| runtime deps | 只有 jsqr、qrcode-generator |
| `git diff --check` | PASS |

**我實際使用的執行方式（environment-only，沒有進入 repository）：**
- repo 的 `node_modules` 是在 Linux 安裝的（symlink `.bin`、缺 Windows 的 rolldown binding），因此原生 Windows 的 `npm run build`／`vite` 無法執行（`vite` 不被 cmd 辨識、rolldown native binding 缺失）。我在 WSL Ubuntu（nvm Node 24.21.0）以 `npm run build` 建置 dist。
- 埠 4173 已被一個**預先存在**的 `vite preview`（PID 28004，今天 08:31 啟動，不是我啟動的）占用；我沒有停止它。因此我在 scratch 目錄建立 harness：把 `tests/` 與 `playwright.config.mjs` 複製過去，**只**把 `4173` 改成 `4174`（逐檔 diff 確認 `tests/browser/*.mjs` 除 port 外位元組相同；`timeout`／`retries`／`workers`／projects 不變，另外 `reuseExistingServer` 設為 true），以 WSL 內的 Vite preview（讀取同一份 `dist/_headers`）服務 `dist`，Windows 原生 Playwright 與真實 browsers 連線 `127.0.0.1:4174`。
- 因此上述 93/93 不是「canonical command 逐字」的結果；仍需在乾淨的 Windows `npm ci` 後以 `npm run test:browser` 逐字確認（列入 Manual／Environment）。

## 17. Findings

### Blocker
None.

### Important
None.

### Minor
1. **高密度提示未進入 live region；「已修改」重複朗讀**（`src/main.ts:128-133`、`index.html`）。HEAD 附加到 `#qr-status`；現在 SR 不會主動聽到。建議把 dense 文字也附加到 `status.textContent`，並讓可見 `#qr-notice` 設為 `aria-hidden` 或移除 hidden 重複。（唯一與 HEAD 相比的 a11y 行為縮減；建議在 tag 前順手修，但不阻擋。）
2. **file input `aria-label` 覆蓋可見 label**（`index.html:61`）：accessible name「QR Code 圖片」不含可見文字「選擇圖片或拖曳到這裡」，違反 Label in Name 的精神。移除 `aria-label` 即可由 label 取名（需同步更新 `final-ux-svg.spec.mjs` 對 name 的斷言）。
3. **AVIF／ICO（及 Safari 的 HEIC）被預先拒絕**（`src/decode.ts:52-60`）：HEAD 可解碼的瀏覽器原生格式現為「不支援此檔案格式」。README 未承諾這些格式；可擇一：sniff 加入 avif、或 `image/*` 先嘗試 raster 再分類。
4. **SVG 渲染 workload 有界但可達 8–10 秒**（`src/svg.ts`，10,000 shapes × 2048²）。建議降低 shape 上限（本工具輸出只需 2 個）或加總面積上限。
5. **body 迴圈對尾端空白為二次方**（`src/svg.ts:46-47`），最壞約 3–4 秒。改為先 trim 一次、用 `while (body)`。
6. **prolog 的 `<?xml\b` 也剝除 `<?xml-stylesheet?>`／`<?xml-model?>`**（`src/svg.ts:37`；sniff 同款 `decode.ts:52`）。無執行／載入，僅與「不允許 PI」意圖不一致；改為 `<\?xml\s`。
7. **WebP signature 以解碼後字串索引比對**（`src/decode.ts:51,55`）：RIFF size 位元組成合法 UTF-8 時偏移；僅影響無 MIME／無副檔名的 WebP。
8. **測試缺口**：沒有任何 Node 層的 `parseSafeSvg` 單元測試；DOCTYPE／entity、prolog PI、root 層攻擊、10,000／1,000,000／2048 邊界、BOM、header 讀取後的 stale 視窗都沒有測試保護（目前靠 regex 本身的嚴格性）。惡意 spec 的 `svgExecuted`／DOM 斷言在不進 DOM 的設計下偏弱，但主要依據的 `無法讀取這張圖片。` 文字確實能區分拒絕與 no-qr。
9. **受限 SVG 的錯誤文案**：格式正確但不在受限文法內的第三方 SVG（`<g>`、`<title>`、`version=`、註解、width≠viewBox）回報為「無法讀取這張圖片。」（暗示損毀），語意上是「不支援」。README 已說明只接受受限子集，行為 fail-closed，僅文案可更精確。
10. **文件小落差**：`RELEASE_CHECKLIST.md` 的 Screen reader walkthrough 第 5 步仍寫「選圖 label／20 MiB 提示」，而正常畫面已不顯示 20 MiB 提示（本輪未改該檔；歷史報告不需改）。

另列 NOTE（不計入 Minor）：UTF-16 SVG 在 Chromium／WebKit 因 `Blob.text()` 偵測 BOM 而可解、Firefox 不可，無安全影響；`file.text()` 在 size 檢查通過但超過 1M 字元的 SVG 上仍會先讀入完整字串（≤ 20 MiB，之後立即拒絕）。

### Manual / Environment
Manual：real phone scan、real Android、real Safari（macOS／iOS）、printed scan、real camera photo、screen reader、native 200% zoom、hosted HTTPS／response headers、deployed subdirectory。
Environment：(a) 乾淨 Windows `npm ci` 後以 canonical `npm run test:browser` 逐字確認（目前 node_modules 為 Linux 安裝，原生 Windows 無法 build）；(b) 本機有預先存在的 `vite preview` 占用 4173，我未停止；(c) 原 verification 的 Linux WebKit workaround 無法重現（WSL 缺共享函式庫），已以 Windows 真實 WebKit 取代驗證。

### Future
1. 若希望支援第三方／編輯器匯出的 SVG：需擴充受限文法（屬於另一個決策，非 v1.1.0）。
2. 將 jsQR／raster 解碼移出主執行緒（Worker）以消除同步凍結（README 已記載為已知限制）。

## 18. Manual Checks Remaining

- real phone scan（短／中／長網址，PNG／SVG／JPG／WebP 畫面與下載檔）
- real Android（兩模式、選圖、drag/drop 若適用、Copy、Open Link）
- real Safari on macOS／iOS（Playwright WebKit 不等同 Safari）
- printed scan（Word → PDF → 紙本）
- real camera photo
- screen reader（NVDA／Narrator／VoiceOver）：尤其確認高密度提示是否被聽到（Minor 1）與 file input 的朗讀名稱（Minor 2）
- native 200% browser zoom
- hosted HTTPS／response headers
- deployed subdirectory

## 19. Commit Decision

### Can the Final UX + SVG delta be committed?

**YES**

## 20. Release Preparation Decision

### After commit, can v1.1.0 proceed to final manual acceptance / tag preparation?

**YES WITH MANUAL CHECKS**

## 21. Final Verdict

No software-side must-fix issue remains in the Final UX + SVG delta before committing it and proceeding to final manual acceptance for v1.1.0.

補充：上列 10 個 Minor 皆為真實但可 patch 的項目，建議至少在 tag 前處理 Minor 1（dense 提示的 live announcement）與 Minor 2（file input accessible name），因為它們是相對 HEAD 的 accessibility 行為縮減且修正成本很低；其餘可安排到 v1.1.1。

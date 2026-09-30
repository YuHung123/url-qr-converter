# URL QR Converter v1.0.1 — Final Pre-Push Independent Audit

審查日期：2026-09-30　審查對象：`v1.0.1`（`214cea38bea3ca43ecb0dc0c0b0f7f3a18a51dd9`）
審查方式：只做 inspection／verification。沒有修改正式 source、沒有 commit／amend／rebase、沒有移動 tag、沒有建立 remote、沒有 push、沒有部署、沒有新增 production dependency。

`V1_0_1_VERIFICATION.md` 只當作線索。下列結論都來自：直接讀 source、tests 與 Git object；在 repository 外建立 **從正式 repository 的 release commit** clone 出來的 Windows default fresh clone；重跑全部 gates；另外寫的三引擎 browser probe；以及與 jsQR 無關的獨立 decoder（ZXing-C++）。

---

## 1. Executive Summary

| 項目 | 結果 |
|---|---|
| Blocker | **0** |
| Important | **0** |
| Minor | **1**：`test:artifact` 的新 LF byte gate 需要 Git metadata，在非 Git 的 source export（例如 GitHub「Download ZIP」）中會失敗（test tooling，非產品） |
| Manual / Environment | **9**（均為 NOT VERIFIED） |
| Future | **3**（沿用 v1.0.0 audit，沒有變嚴重） |
| Local v1.0.1 baseline | **PASS** |
| Ready to create remote / push | **YES WITH MANUAL CHECKS** |

重點：

- **I-1 已 CLOSED。** 用 Git for Windows 預設 `core.autocrlf=true`，直接從正式 repository clone（不是 snapshot／bundle），`public/_headers` checkout 為 `w/lf`，全部 gates 通過，包含三引擎 48/48 browser tests。同一台機器上 clone `v1.0.0` 作為對照，仍會重現原本的 CRLF 失敗，證明是修正生效，不是環境改變。
- **M-1、M-2 已修正**，沒有 regression。
- `v1.0.0` 完整保留：tag object、target commit 都沒變。
- v1.0.1 的 **JS bundle 與 v1.0.0 byte-identical**；CSS 與 HTML 的差異恰好只有預期的兩處。

---

## 2. Git / Tag Integrity

| Item | Result | Evidence |
|---|---|---|
| HEAD | PASS | `214cea38bea3ca43ecb0dc0c0b0f7f3a18a51dd9`（`main`），message `fix: prepare public v1.0.1 release` |
| `v1.0.0` target | PASS | `v1.0.0^{commit}` = `47600c5c3741a86a74537e46eeb10f0bf774f64a` |
| `v1.0.0` tag object | PASS，未變 | `0c41a74fb7c853f2f4f4ee65b5362a6bcfa71310`，與 v1.0.0 audit 記錄的 `0c41a74f…` 相同；tagger 2026-09-29 23:37:14 +0800，message `URL QR Converter v1.0.0` |
| `v1.0.1` target | PASS | `v1.0.1^{commit}` = HEAD = `214cea3…` |
| `v1.0.1` tag object | PASS | `1e5f113430adb830862d586e76a6eb42c1d79589`，`git cat-file -t` = `tag`（annotated），2026-09-30 08:24:27 +0800（commit 08:24:03 之後），message `URL QR Converter v1.0.1` |
| History | PASS | 8 個線性 commits；`47600c5` 是 `214cea3` 的直接 parent；reflog 只有 8 次 `commit`，沒有 amend／reset／rebase 紀錄 |
| Working tree | PASS | 開始時 `git status` clean（本報告為唯一新增的 untracked 檔） |
| Remote | PASS | `git remote -v` 為空；沒有 `refs/remotes`；`for-each-ref` 只有 `main` 與兩個 tag |
| Versions | PASS | `package.json`、lockfile root、`packages[""]` 均為 `1.0.1`；lockfile 其餘沒有任何變化（diff 只有兩行 version） |
| 不該存在的檔案 | PASS | 全部歷史中沒有 `node_modules`、`dist`、`test-results`、`playwright-report`、trace、log、`.env`、source map、scratch；`dist/`、`node_modules/`、`test-results/` 都是 ignored |
| Secrets | PASS | 全部 commits 的 pattern 掃描唯一命中是 v1.0.0 audit 裡描述掃描的那一行文字 |
| `git fsck` | PASS | 無輸出 |
| `git diff --check v1.0.0 v1.0.1` | PASS | 無 whitespace 問題 |

v1.0.0 → v1.0.1 變更檔案共 14 個：`.gitattributes`（新）、`tests/deployment-headers.mjs`（新）、`V1_RELEASE_AUDIT.md`（新）、`V1_0_1_VERIFICATION.md`（新）、`index.html`、`src/styles.css`、`tests/preview-server.mjs`、`tests/release/artifact.test.mjs`、`tests/browser/quality.spec.mjs`、`package.json`、`package-lock.json`、`README.md`、`CHANGELOG.md`、`RELEASE_CHECKLIST.md`。**`src/*.ts`、`vite.config.ts`、`public/`、`tsconfig.json`、`playwright.config.mjs`、其他 tests 與 fixtures 都沒有變更。**

---

## 3. v1.0.0 Preservation

**完全保留。**

- `v1.0.0` 的 tag object hash 和 target commit 與 v1.0.0 audit 記錄的值完全一致，沒有被 retag 或 rewrite。
- `v1.0.1` 是在 `47600c5` 之上新增的 commit，沒有改寫舊歷史。
- 我在 scratch clone 中 checkout `v1.0.0` 並 build，產出的 `index-Cve07lVc.js`／`index-gAu6sPc5.css` 名稱與 v1.0.0 audit 記錄一致，代表 v1.0.0 仍可原樣重建。
- `V1_RELEASE_AUDIT.md` 在 `214cea3` 首次納入；SHA-256 為 `92e7a28f6353de5f2bbfa484f0e8ce187c786441e4a99f90c20724fc409ee309`，與 V1_0_1_VERIFICATION 所記錄的原報告 hash 相同。內容檢查：I-1 仍為 **Important**、M-1／M-2 仍為 **Minor**、v1.0.0 verdict 仍為 **PASS WITH NOTE／READY WITH MANUAL CHECKS**，而且保留「沒有 `.gitattributes`」「CRLF checkout 下 FAIL」等原始敘述。沒有被改寫成「當時其實沒問題」。
  - 限制：那份報告在 v1.0.1 之前從未進入 Git，所以我能驗證的是「commit 內容等於作者記錄的原始 hash」，以及內容本身沒有被弱化；無法用 Git history 驗證更早的版本。

---

## 4. Windows Fresh Clone

| 項目 | 值 |
|---|---|
| Windows | Windows 11 Home 10.0.26200（`ver`：10.0.26200.9457） |
| Git | `git version 2.55.0.windows.2` |
| Node / npm | v24.19.0 / 11.17.0 |
| `git config --show-origin --get core.autocrlf` | `file:C:/Program Files/Git/etc/gitconfig	true` |
| `git config core.autocrlf` | `true`（global 未設定，沒有任何 override） |
| Clone method | `git clone --no-local file:///C:/Users/yuhun/Desktop/url-qr-converter <scratchpad>/fresh-clone`，來源是**正式 repository 本身**（HEAD = `214cea3`，兩個 tag object hash 與原 repo 相同），位置在 repository 外的 scratchpad |
| Manual line conversion | **沒有**。沒有設 `core.autocrlf=false`、沒有轉檔、沒有複製 working tree、`node_modules` 或 `dist` |
| 資源狀態 | 開始時可用 RAM 約 600 MB（總共 7.7 GiB）；全部重型工作依序執行 |

```text
git ls-files --eol
i/lf    w/crlf  attr/                 	.gitattributes
i/lf    w/crlf  attr/                 	index.html
i/lf    w/crlf  attr/                 	package.json
i/lf    w/lf    attr/text eol=lf      	public/_headers
i/lf    w/crlf  attr/                 	src/styles.css
```

- 一般 text 為 `w/crlf`（Windows 預設行為，符合預期）；`public/_headers` 為 `w/lf`，attr 為 `text eol=lf`。
- 用 Node 直接數 byte：fresh clone 的 `public/_headers` 與 `dist/_headers` 都是 330 bytes，**0 個 CR**，結尾為 LF。
- **對照組**：同樣方式 clone `v1.0.0`，`_headers` 為 `i/lf w/crlf`（335 bytes、5 個 CR）；`test:artifact` 1 fail；`node tests/preview-server.mjs` 在第 7 行拋出錯誤。原始 I-1 仍能在舊 tag 重現，所以 v1.0.1 的 PASS 是修正本身帶來的。

---

## 5. Commands Run

| Command | Current Worktree | Fresh Clone（Windows default） |
|---|---|---|
| `git status` / `log --graph --all` / `tag -n` / `show` / `cat-file -p` / `rev-parse` / `remote -v` / `for-each-ref` / `fsck` | PASS | PASS（tag objects 相同，status clean） |
| `git config --show-origin --get core.autocrlf` | system `true` | system `true` |
| `git ls-files --eol` | 全部 `w/lf`；`_headers` 有 `attr/text eol=lf` | 一般檔 `w/crlf`；`_headers` 為 `w/lf` |
| `npm ci` | PASS，0 vulnerabilities | PASS，0 vulnerabilities |
| `npm test` | PASS 30/30（skipped／todo／cancelled 0） | PASS 30/30（同左） |
| `npm run typecheck` | PASS | PASS |
| `npm run build` | PASS：`index-BXjJTOA6.js` 158.97 kB、`index-DgS34Gl6.css` 5.38 kB | PASS：JS／CSS hash 與 worktree 相同 |
| `npm run test:artifact` | PASS 4/4 | PASS 4/4 |
| `npm run test:browser` | **PASS 48/48，第一次就通過**（304.4 s） | **PASS 48/48**（307.3 s） |
| `npm audit` | 0 vulnerabilities | 0 vulnerabilities |
| `npm ls --omit=dev --all` | 只有 `jsqr@1.4.0`、`qrcode-generator@2.0.4` | 同左 |
| 獨立三引擎 probe（見第 8–10 節） | — | Chromium 45/45、Firefox 45/45、WebKit 43/45（2 項為 probe 本身造成，見第 10 節） |
| ZXing-C++ 3.1.1 獨立解碼 | — | 9/9 下載 PNG 完全相符 |
| `v1.0.0` scratch build 與 bundle diff | — | JS byte-identical |
| 非 Git source export（`git archive v1.0.1`）執行 `test:artifact` | — | 3/4，見 Minor m-1 |

兩次完整 browser run 都在第一次就通過，沒有出現 timeout，所以不需要做資源壓力判斷，也沒有重跑。

---

## 6. Release Gates

| Gate | Result |
|---|---|
| Node | 30/30（兩邊） |
| Artifact | 4/4（兩邊） |
| Chromium 153.0.8010.12 | 16/16（兩邊） |
| Firefox 155.0 | 16/16（兩邊） |
| Playwright WebKit 26.6 | 16/16（兩邊） |
| Browser JSON stats | 兩次都是 expected 48、skipped 0、unexpected 0、flaky 0；每個 project 的 retry 最大值 0；config `retries: 0`、`workers: 1`、沒有 `grep` |
| `.only` / `.skip` / `.fixme` / `.fail` / `expect.soft` | 無（grep tests 全部） |
| axe（套件內） | 2 tests × 3 states × 3 引擎 = 18 次掃描，`withTags(['wcag2a','wcag2aa','wcag21aa'])`，沒有 `disableRules`／`exclude`／`include`；0 violations |
| axe（我的 probe，預設全部非 experimental 規則，含 best-practice） | 5 states × 3 引擎 = 15 次掃描，**0 violations、0 incomplete** |
| `npm audit` | 0（含 dev） |
| Production dependencies | 只有 `jsqr@1.4.0`、`qrcode-generator@2.0.4`，沒有 transitive；lockfile 非 dev 套件剛好就是這兩個 |

唯一的 `test.setTimeout(120_000)` 是 v1.0.0 就有的 image corpus test，v1.0.1 沒有更動。

---

## 7. I-1 Closure Assessment

**CLOSED**

逐條對照完整關閉的條件：

| 條件 | 結果 |
|---|---|
| source `_headers` 為 LF | 是：`w/lf`，0 CR |
| dist `_headers` 為 LF | 是：0 CR，與 source byte 相同 |
| artifact suite PASS | 是：4/4 |
| preview server 成功啟動 | 是：Playwright webServer 啟動，48 tests 全部執行 |
| 完整 browser suite 實際執行 | 是：48/48，三引擎 |
| 不需要手動轉換 | 是 |

**`.gitattributes`**：只有 `public/_headers text eol=lf` 一行。

- 在 fresh clone 中實際覆蓋了 `core.autocrlf=true`。
- 不會造成全 repo line-ending churn：index 本來就全是 LF，其他檔案的 checkout 行為不變。
- 範圍夠用：只有 `_headers` 會被 parser 解析，並原樣成為部署 policy。HTML、CSS、JS、JSON 與 notices 在 CRLF 下語意不變。例外是 Windows clone build 出的 `dist/index.html` 為 CRLF（6.27 kB，LF 為 6.18 kB），內容無害，JS／CSS hash 不受影響。

**Parser（`tests/deployment-headers.mjs`）**：以 `split(/\r?\n/)` 切行，除此之外維持嚴格。我另外用 27 種輸入測試：

- 接受：LF、CRLF、CRLF 無結尾換行、LF／CRLF 混用、結尾多餘空行、tab 縮排。
- 拒絕：空字串、只有 `/*`、缺 `/*`、`/other`、第二個 block（`/other` 或 `/*`）、缺冒號、空值、只有空白的值、大小寫不同的重複 header、完全相同的重複 header、非法名稱（底線、空白）、沒有縮排、block 內空行、註解行、冒號後無空白、行中孤立 CR、BOM 前綴、CRLF 加第二個 block、CRLF 加重複 header。
- 沒有 try/catch 吞錯誤。preview server 與 artifact test 共用同一個 parser。

**Artifact gate 設計**：

- 語意驗證：`parseDeploymentHeaders` 對 LF 與 CRLF 輸入都完整比對 4 個 expected headers，並逐一斷言 8 種 malformed 輸入會 throw。
- Byte invariant：分開成一個 test，用 `git show :public/_headers`（index blob）、checkout 檔與 `dist/_headers` 三者分別斷言 `endsWith('\n')` 與不含 `\r`，並斷言 dist 與 source byte 相同。
- 原本的 CSP、notices、dist 白名單與 dependency assertions 都保留。

---

## 8. Accessibility Findings

### Selected tab（M-1 修正）

實作是 `box-shadow: inset 0 -3px 0 var(--accent), 0 1px 3px #202d2a0a`，只作用於 `[aria-selected="true"]`。

我的 probe 在三引擎、1280 與 320 兩種寬度下，量測 11 種狀態：mouse 選取、選取後 hover、hover 未選取的 tab、ArrowRight、ArrowLeft、End、Home、Home 後 hover。三引擎的 computed 值完全相同：

| 比較（indicator `rgb(40, 92, 73)` = `#285c49`） | 對比 |
|---|---|
| vs selected 白底 `#ffffff` | **7.73:1**（手算 L ≈ 0.0859，(1.05)/(0.1359) = 7.73） |
| vs selected hover `#f9faf8` | **7.38:1** |
| vs tablist `#eaeee8` | **6.59:1** |
| vs selected border `#dce2dc` | **5.87:1** |
| （參考）selected 白底 vs tablist | 1.12–1.17:1，未改。狀態現在由 indicator 表達，不再依賴這個低對比 |

所有狀態最低為 5.87:1，≥ 3:1。與 V1_0_1_VERIFICATION 的數字一致。

- **只有 selected 顯示 indicator**：每個狀態都檢查過；hover 未選取的 tab 也不會出現。
- **沒有 layout shift**：每個寬度下，兩個 tab 在所有狀態的 bounding box 完全相同（inset shadow 不佔版面）。
- **320 px 沒有 overflow**：`scrollWidth ≤ innerWidth`。
- **Focus-visible**：鍵盤操作後，selected tab 為 `:focus-visible`，outline 3px、offset 4px，畫在 border box 外側。inset indicator 畫在 padding box 內，兩者不可能重疊。三引擎截圖目視確認：綠色底線與藍色外框清楚分開。
- **Keyboard**：ArrowRight／ArrowLeft（含 wrap）、End、Home 選到正確的 tab（`encode, decode, decode, encode`），indicator 跟著移動。
- Forced-colors 的 `border-color: Highlight` 規則沒有改動。

### ARIA cleanup（M-2 修正）

- `.output-section` 的 `aria-labelledby` 已刪除（兩個 `.output-section` 都沒有 `aria-labelledby` 或 `role`）。
- 沒有新增任何 `role="region"`（DOM 中為 0）。
- `h3#preview-title` 保留；accessibility tree 顯示 `heading "QR Code 預覽" [level=3]`。
- 所有 `aria-labelledby` 引用的 id 都存在。
- tablist／tab／tabpanel 結構與名稱正常，隱藏的 panel 不在 tree 中。

### axe

- 套件內 18 次掃描為 0 violations，設定沒有任何抑制。
- 我用預設全部規則（含 best-practice）掃描 initial encode、encode error、encode success、decode success、decode error，三引擎共 15 次：**0 violations、0 incomplete**。v1.0.0 audit 唯一的 needs-review（`aria-prohibited-attr`，即 M-2）已消失。

---

## 9. Functional Regression

以下由我的獨立 probe 在三引擎、以 fresh clone 的正式 `dist` 加上 `_headers` headers 驗證。

### M1

| 檢查 | Chromium | Firefox | WebKit |
|---|---|---|---|
| 無效 URL `example.com`：`aria-invalid="true"`、alert 文字、沒有 canvas | PASS | PASS | PASS |
| `javascript:alert(1)` 拒絕 | PASS | PASS | PASS |
| HTTPS（path／query／fragment）Generate 並用鍵盤 Download | PASS | PASS | PASS |
| Unicode `https://例子.測試/採訪?q=😀` | PASS | PASS | PASS |
| 長 HTTP URL（約 520 字元） | PASS | PASS | PASS |
| 下載的 PNG 用 jsQR（Node）解碼，結果等於 `new URL(input).href` | 3/3 | 3/3 | 3/3 |
| 下載的 PNG 用 **ZXing-C++**（獨立 decoder）解碼：完全相符、EC level M、只有純黑／純白像素 | 3/3 | 3/3 | 3/3 |
| 尺寸 1036²／1035²／1067²，檔名 `qr-code.png` | 相同 | 相同 | 相同 |
| Download 之後 focus 留在 Download | PASS | PASS | PASS |
| 修改輸入後：canvas 清除、Download disabled | PASS | PASS | PASS |

### M2

| 檢查 | Chromium | Firefox | WebKit |
|---|---|---|---|
| 解碼 M1 下載的 PNG（ASCII 與 Unicode） | PASS | PASS | PASS |
| 獨立 Segno fixtures（ascii、unicode） | PASS | PASS | PASS |
| 無效 UTF-8（`0xE9`）與 overlong（`C0 AF`）Byte segment 拒絕，Copy disabled | PASS | PASS | PASS |
| 純文字 `Hello World`、`javascript:`、含 raw newline 的 URL 拒絕 | PASS | PASS | PASS |
| 損壞的圖片：錯誤訊息，Copy disabled | PASS | PASS | PASS |
| 錯誤後選有效圖片可恢復（error 清除、`aria-invalid` 移除） | PASS | PASS | PASS |
| 鍵盤 Copy 成功（Chromium 讀回 OS clipboard，內容完全相同） | PASS | PASS | PASS |
| Copy 失敗（注入 reject）：保留結果、提示手動複製、focus 留在 Copy | PASS | PASS | PASS |
| Stale decode：先選 6000×4000 無 QR 的慢圖，立刻選 Unicode fixture，最終結果為較新的圖、沒有錯誤 | PASS | PASS | PASS |

加上兩次完整 48/48 的 E2E（涵蓋 capacity、stale export、SVG／HEIC、20 MiB、corpus、race），沒有發現產品 regression。

---

## 10. Security / Privacy Regression

- **Source 層面**：`src/*.ts`、`vite.config.ts`（meta CSP 來源）、`public/_headers` 在 v1.0.0 與 v1.0.1 之間 **完全沒有 diff**。
- **Bundle 層面**：在 scratch 中 build `v1.0.0`，與 v1.0.1 的 JS 比對為 **byte-identical**（158,978 bytes，`cmp` 相同）。檔名 hash 不同（`Cve07lVc` → `BXjJTOA6`），只因為 Vite 把 import 的 CSS 納入 entry chunk 的 hash。因此 URL validation、encoder、decoder、staged decode、clipboard、state／race 邏輯都不可能改變。
- CSS diff 只有 selected-tab 規則那一行。HTML diff 只有 asset 檔名與刪除的 `aria-labelledby`。`favicon.svg`、`THIRD_PARTY_NOTICES.txt` byte 相同，`_headers` 內容相同（v1.0.0 clone 只差 CR）。
- **CSP（runtime 實測）**：
  - meta 為 `default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'none'; object-src 'none'`。
  - HTTP CSP 等於 meta 加 `; frame-ancestors 'none'`。
  - 沒有 wildcard、`unsafe-*`、`data:` 或 `blob:`。
  - `nosniff`、`no-referrer`、`camera=(), microphone=(), geolocation=()` 都存在。
- **Network**：
  - 頁面載入只請求 `/`、JS、CSS；Firefox 另外請求 `favicon.svg`，全部 same-origin。
  - 之後 Generate ×3、Download ×3、Decode ×12、Copy ×2 以及 stale decode，**新增請求 0**。
  - Bundle 中唯一的 `fetch(` 是 Vite modulepreload polyfill（v1.0.0 已知，且被 `connect-src 'none'` 阻擋）；沒有 storage、beacon、XHR、WebSocket API。
- **Storage**：localStorage、sessionStorage、cookie、IndexedDB、CacheStorage、Service Worker 全部為 0 或空（三引擎）。
- **Errors／CSP violations**：Chromium 與 Firefox 都是 0。WebKit probe 記錄到 4 個 `style-src-elem` violation。我另外寫 isolation script 逐步檢查，確認這 4 個 **只**出現在 Playwright `locator.screenshot()` 注入 inline `<style>`（用於隱藏 caret）時，每次 screenshot 2 個；嚴格 CSP 正確擋下了它。產品本身的每一步（load、tabs、Generate、Download、Decode、Copy、axe、aria snapshot）三引擎都是 **0**。套件內的 security test 不截圖，三引擎也都是 0。**不是產品問題。**
- **Dependencies**：production 仍只有兩個套件；Playwright 與 axe 都是 dev only。

---

## 11. Artifact Audit

- `dist/`（兩邊一致）：
  - `index.html`
  - `assets/index-BXjJTOA6.js`
  - `assets/index-DgS34Gl6.css`
  - `favicon.svg`
  - `THIRD_PARTY_NOTICES.txt`
  - `_headers`
- 沒有 `.gitattributes`、Markdown、V1 報告、tests、fixtures、screenshots、traces、source maps（`sourceMappingURL` 0 次）或 `test-results`。
- `_headers`：worktree 與 fresh clone 的 source／dist 都是 330 bytes、0 CR、結尾 LF，而且 dist 與 source byte 相同。
- Notices：與 `public/` byte 相同；qrcode-generator MIT 與 jsQR Apache-2.0 都在（由 artifact test 斷言）。

---

## 12. Documentation Audit

- **README**：正確。
  - 功能、隱私、開發、測試、部署、`_headers` 的適用範圍與限制都沒有誇大。
  - v1.0.1 只把驗證連結改為 V1_0_1_VERIFICATION 與 v1.0.0 audit。
  - 仍明確寫出 Playwright WebKit ≠ real Safari，以及 axe ≠ screen reader。
- **CHANGELOG**：有 `1.0.1` 與 `1.0.0`。1.0.1 只有三點：Windows fresh-clone 重現性與 LF headers、selected-tab indicator、刪除多餘 ARIA，沒有誇大功能。
- **RELEASE_CHECKLIST**：
  - 「fresh checkout」的 `[x]` 現在有 Windows default clone 證據，而且本次在正式 commit 上獨立重現。
  - 明確寫出 v1.0.0 的舊 claim 曾因 I-1 失敗。
  - 數字（30／4／48）與實測相符。
  - Manual 與 Deployment 項目都維持 `[ ] NOT VERIFIED`，沒有假勾選。
- **V1_RELEASE_AUDIT**：作為歷史紀錄原樣保存（見第 3 節）。最後一行「本報告為 untracked」是當時的事實，保留原文是正確的。
- **V1_0_1_VERIFICATION**：與我的實測一致，包括 contrast 數字、dist 檔名、30／4／48、兩次 run 約 5 分鐘、首輪資源 timeout 的如實記錄。
  - 補充：該報告的 fresh clone 是從 commit 前的 snapshot bundle（`85da770`）建立，再逐檔比對。本次 audit 直接從正式 release commit `214cea3` clone 並重跑全部 gates，補上了這個間接性。

---

## 13. Findings

### Blocker

無。

### Important

無。

### Minor

#### m-1 — `test:artifact` 的 LF byte gate 需要 Git metadata

- **Evidence**：`tests/release/artifact.test.mjs:28` 使用 `execFileSync('git', ['show', ':public/_headers'])`。我把 `git archive v1.0.1` 解到沒有 `.git` 的目錄，並放入 fresh clone 的 `dist`，執行 `node --test tests/release/*.test.mjs`：結果 **3/4**，`tracked source, checkout and release _headers retain LF bytes` 以 `fatal: not a git repository` 失敗。
- **影響**：只影響從 GitHub「Download ZIP」或 tarball 取得 source 的人。文件定義的 release gate 是 Git checkout，而且在 Git checkout 中完全通過。這不是產品問題，也不影響部署產物。
- **建議（發布後即可）**：在 README 的測試段落註明 `test:artifact` 需在 Git checkout 中執行；或者在沒有 Git metadata 時只略過 tracked-blob 那一項，但仍檢查 checkout 與 dist 的 bytes。不要把整個 byte gate 靜默略過。

### Manual / Environment

以下 9 項維持 **NOT VERIFIED**：real phone scan、real Android、real Safari（macOS／iOS）、real printed scan、real camera photo、screen reader、native browser zoom 200%、hosted HTTPS／response headers、deployed subdirectory。

### Future（沒有變化）

- **F-1 URL userinfo**：`src/qr.ts` 沒有改動，行為與 v1.0.0 相同。App 不會自動開啟 URL，也不產生可點連結，風險沒有變嚴重。
- **F-2 Worker／OffscreenCanvas**：沒有新證據。兩次完整 run 都在第一次通過，沒有卡頓類 timeout。
- **F-3 Project LICENSE**：仍然由使用者決定；repo 沒有專案 LICENSE。這不是 v1.0.1 的要求。

---

## 14. Remaining Manual Checks

| Item | Status | 時機 |
|---|---|---|
| Real phone scan（畫面與下載 PNG，短／長網址） | NOT VERIFIED | 部署前後，建議首次公開使用前 |
| Hosted HTTPS／response headers（確認 `_headers` 被採用、四個 headers 與 `frame-ancestors`） | NOT VERIFIED | 部署當下 |
| Deployed subdirectory（若嵌入 portfolio 子路徑） | NOT VERIFIED | 部署當下 |
| Real Safari（macOS／iOS） | NOT VERIFIED | 部署後 |
| Real Android | NOT VERIFIED | 部署後 |
| Real printed scan | NOT VERIFIED | 放入正式文件前 |
| Real camera photograph | NOT VERIFIED | 部署後 |
| Screen reader | NOT VERIFIED | 部署後（建議儘早） |
| Native browser zoom 200% | NOT VERIFIED | 部署後 |

本審查沒有上述任何實體環境，所以一律不宣稱通過。

---

## 15. Pre-Push Readiness

### Software-side must fix before remote / push

> No software-side must-fix issue found before creating a remote and pushing v1.0.1.

m-1 可以在發布後處理，不影響建立 remote、push `main` 或 push `v1.0.0`／`v1.0.1` tags。

### Manual checks

建立 remote 與 push 不需要任何實機檢查。部署時與部署後依序完成：

1. Hosted HTTPS 與 response headers。
2. Subpath，若適用。
3. 手機掃描。
4. 一台真機瀏覽器的完整 smoke（生成、下載、選相簿照片、Copy）。
5. 其餘項目依用途補做。

---

## 16. Final Verdict

### Local v1.0.1 baseline

**PASS**

### Ready to create remote / push

**YES WITH MANUAL CHECKS**

理由：

- `v1.0.0` 的 tag object 與 target 完全保留；`v1.0.1` 是正確指向 release commit 的 annotated tag。
- 在 Git for Windows 預設 `core.autocrlf=true` 下，直接從正式 repository clone，沒有任何手動轉換：`_headers` 為 LF，Node 30、artifact 4、三引擎 browser 48 全部一次通過。舊 tag 的對照組仍會失敗，證明 I-1 真正關閉。
- Selected tab 的 indicator 在所有狀態都有 ≥ 5.87:1 的對比，沒有 layout shift，也不遮住 focus。ARIA cleanup 乾淨，全部 axe 規則 0 violations。
- 產品 JS 與 v1.0.0 byte-identical；CSP、headers、network、storage 與 dependencies 都沒有 regression。
- 唯一的 Minor 只影響非 Git source export 的測試工具。剩下的工作是部署與實機驗收，而不是新的開發 milestone。

---

*審查期間建立的 scratch clones（v1.0.1 fresh clone、v1.0.0 對照 clone、git archive export）、Python venv、probe scripts、截圖、下載的 PNG 與 log，全部放在 repository 外的 session scratchpad，結束前已刪除。我啟動的 preview server 與 browsers 都已結束，4173／5173 沒有 listener，也沒有本專案的 Vite／preview／Playwright process。另外有一個與本專案無關、由先前 session 在 2026-09-29 19:17 啟動的 `tail.exe`（追蹤另一個 scratchpad 的 log），不是本次建立的，所以沒有動它。在原 repository 中，本次只重新產生了 ignored 的 `node_modules/`、`dist/`、`test-results/`，並新增本報告（untracked，未 commit）。*

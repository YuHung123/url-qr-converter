# URL QR Converter v1.0.0 — Independent Final Release Audit

審查日期：2026-09-30　審查對象：`v1.0.0`（`47600c5c3741a86a74537e46eeb10f0bf774f64a`）
審查方式：只做 inspection／verification。未修改正式 source、未 commit、未移動 tag、未新增 dependency、未 push、未建立 remote、未部署。

M3_VERIFICATION.md 只當作線索使用。下列結論都來自我自己讀 source、重跑命令、另寫 browser probe，以及使用獨立 decoder 取得的證據。

---

## 1. Executive Summary

| 項目 | 結果 |
|---|---|
| Blocker | **0** |
| Important | **1**：Windows 預設 Git 設定的 fresh clone 會讓兩個 release gate 失敗（test tooling，非產品 runtime） |
| Minor | **2**：selected tab 狀態對比偏低；一處無作用的 `aria-labelledby` |
| Manual / Environment | **9**（均為 NOT VERIFIED，見第 16 節） |
| Future | **3** |
| Local v1.0.0 baseline 是否成立 | **成立（PASS WITH NOTE）** |
| 是否有 software blocker 阻止 push/deploy | **沒有 application-side blocker。** 但有 1 個 repository-side Important，建議在 push 前以 follow-up commit 修正（一行 `.gitattributes`）；此修正不改變部署產物 |

兩個核心功能的獨立驗證結果：

- URL → QR：PNG 用 ZXing-C++ 解碼成功，這是與 jsQR 完全獨立的 decoder。
- QR → URL：UTF-8 integrity 與 stale-state 都成立。

Security、privacy、CSP、artifact 與 dependency 的宣稱經我重新驗證都屬實。唯一實質問題是 M3 的「可在乾淨 checkout 重跑」宣稱：在作者本身的平台（Git for Windows，`core.autocrlf=true`）上不成立。

---

## 2. Repository / Git Integrity

| 項目 | 實測值 |
|---|---|
| HEAD | `47600c5c3741a86a74537e46eeb10f0bf774f64a`（`main`） |
| `v1.0.0^{commit}` | `47600c5c3741a86a74537e46eeb10f0bf774f64a`（與 HEAD 一致） |
| Tag type | **annotated**（tag object `0c41a74f…`，tagger YuHung123，2026-09-29 23:37 +0800，message `URL QR Converter v1.0.0`，未簽章） |
| Release commit | `chore: finalize v1 release`（hash 與 tag target 相符） |
| Working tree | clean（審查開始與結束時皆 clean） |
| Remote | 無（`git remote -v` 為空）；只有 `main` 一個 branch |
| History | 7 個線性 commits，作者皆 YuHung123 |
| Version | `package.json`、`package-lock.json`（`version` 與 `packages[""]`）均為 `1.0.0` |

History 衛生：

- 所有 commit 中沒有 `node_modules`、`dist`、`test-results`、`playwright-report`、trace、screenshot、zip、`.env` 或 scratch file。
- 最大的 blob 是 `package-lock.json`（28.9 KB）。只有兩個 binary：fixtures PNG，各 450 B 與 387 B。
- Secrets 掃描（api key、token、password、private key、`ghp_`、`AKIA`、`sk-` 等 pattern）無命中。
- 唯一的本機路徑出現在歷史驗證文件裡的一行 `C:\Users\yuhun\…\vite.js` 命令輸出，屬於非敏感資訊。
- `.gitignore` 涵蓋 `node_modules/`、`dist/`、`.vite/`、`test-results/`、`playwright-report/`、`.env*`。
- **沒有 `.gitattributes`**，見 I-1。

---

## 3. Commands Actually Run

環境：

- OS／工具：Windows 11 Home 10.0.26200、Node 24.19.0、npm 11.17.0。
- Git 2.55.0.windows.2；system gitconfig 為 `core.autocrlf=true`。
- 審查開始時可用 RAM 約 600 MB（總共 7.7 GiB）。
- Playwright browsers：Chromium 153.0.8010.12（Chrome for Testing）、Firefox 155.0、WebKit 26.6。

建立了兩個 scratch clone，都放在 repository 外：

- **clone-default**：`git clone --branch v1.0.0`，使用本機預設 Git 設定，working tree 為 CRLF。
- **clone-lf**：同上，但加 `-c core.autocrlf=false`，working tree 為 LF。

| Command | Result | Notes |
|---|---|---|
| `git status` / `log --graph --all` / `tag -n` / `show v1.0.0` / `cat-file -p v1.0.0` / `rev-parse` / `remote -v` | PASS | 見第 2 節 |
| `git ls-files --eol` | 發現問題 | index 全部是 LF；repo 無 `.gitattributes`；clone-default 的 working tree 為 `w/crlf` |
| `npm ci`（兩個 clone） | PASS | added 23 packages、audited 24、0 vulnerabilities、約 8 s；無平台錯誤 |
| `npm test`（兩個 clone） | PASS | 30/30；skipped、todo、cancelled 皆為 0 |
| `npm run typecheck` | PASS | `tsc --noEmit`（src + vite.config.ts） |
| `npm run build` | PASS | `index-Cve07lVc.js` 158.97 kB（gzip 58.48）、`index-gAu6sPc5.css` 5.35 kB；兩個 clone 的 JS/CSS hash 相同 |
| `npm run test:artifact`（clone-default, CRLF） | **FAIL 1/2** | `artifact.test.mjs:16` 的 `headers.includes("…frame-ancestors 'none'\n")` 為 false |
| `npm run test:browser`（clone-default, CRLF） | **FAIL（0 tests 執行）** | `[WebServer] Error: Expected one global _headers rule`（`tests/preview-server.mjs:7`） |
| `npm run test:artifact`（clone-lf） | PASS 2/2 | |
| `npm run test:browser`（clone-lf，三引擎） | **PASS 48/48** | 5.5 min；JSON stats 為 expected 48、skipped 0、flaky 0、unexpected 0；retries 0；每引擎 16 tests |
| clone-default 只把 `public/_headers` 轉成 LF 後，重跑 `test:artifact` 與 `playwright --project=chromium` | PASS 2/2、16/16 | 證明 I-1 的影響範圍只限於 `_headers` 的行尾 |
| `npm audit`（含 dev）／`npm audit --omit=dev` | PASS | 0 vulnerabilities |
| `npm ls --omit=dev --all` | PASS | 只有 `jsqr@1.4.0`、`qrcode-generator@2.0.4` |
| `git diff --check`、`--cached --check`、empty-tree→HEAD 全樹 whitespace 檢查 | PASS | |
| 獨立 Node probe：`normalizeUrl` 48 個邊界輸入 | PASS WITH NOTE | 見第 6 節 |
| Mutation test（在 scratch clone 改 source 後跑 `npm test`） | 見第 4 節 | 已還原並刪除 |
| Segno 1.6.6 重新產生 fixtures（scratch venv） | PASS | 與 committed PNG **byte-identical** |
| ZXing-C++ 解碼 fixtures 與 12 個下載 PNG（3 引擎 × 4） | PASS | payload 完全相符、EC level M |
| 獨立 Playwright probes（Chromium／Firefox／WebKit，`dist` 加 `_headers` headers） | PASS | 見第 6–13 節 |
| 本機 subpath 服務測試（`/tools/qr/`） | PASS | 0 個 404、0 errors |
| 結束時確認 4173／4198／4199／5173 | 無 listener | Playwright 正確收掉 webServer |

---

## 4. Test Verification

### Node（30 tests）

- 有效 URL 與無效 URL 的正規化。
- 0x00–0x20、DEL 及 Unicode whitespace 在 host、path、query 三個位置的拒絕。
- PNG export 的失敗路徑。
- ASCII encoder guard。
- 在 5 個 QR version 上驗證四格 quiet zone、整數 module 與原尺寸 decode。
- Byte segment 含無效 UTF-8（4 種）時拒絕；有效的 multi-segment UTF-8 正確接受。
- 3 種 raw control QR 與 6 種不支援內容。
- decoder exception 對應到安全的錯誤結果。
- 尺寸 cap 與 20 MiB 邊界。
- stale bitmap cleanup，以及 getContext／drawImage 失敗時的 cleanup。

測試中沒有 `.only`、`.skip` 或 `.todo`；`node --test` 的輸出顯示 skipped 0。

Mutation 驗證（只在 scratch clone 內進行）：

| Mutation | 結果 |
|---|---|
| 移除 per-chunk `TextDecoder` 驗證 | **被抓到**：1 fail（UTF-8 integrity test） |
| 移除 raw control/whitespace 拒絕 | **被抓到**：4 fail |
| 移除 ASCII encoder guard | **被抓到**：1 fail |
| 移除 `url.protocol` 檢查 | 未被抓到，但行為不變：下一行的 `^https?://` 原字串檢查拒絕同一批輸入。屬於冗餘的 defense-in-depth，不是測試缺口 |
| 把 fatal `TextDecoder` 換成 `chunk.text === ''` | 未被抓到。原因是 jsQR 1.4.0 的 `decodeURIComponent` 是全有或全無，兩種策略在釘住的版本下行為等價。現行實作確實使用 fatal decoder，對未來 jsQR 行為變動更穩健 |

### Artifact（2 tests）

測試比對以下項目：

- meta CSP（考慮 Vite 的 `&#39;` escape）。
- `dist/_headers` 與 `public/_headers` byte 相同。
- HTTP CSP 等於 meta CSP 加上 `frame-ancestors 'none'`。
- 其他三個 security header。
- notices 內容。
- dist 根目錄白名單，assets 只有 1 JS 與 1 CSS，沒有 source map。
- 正式依賴只有兩個，lockfile 版本一致。

在 LF checkout 下 PASS；在 CRLF checkout 下 FAIL（I-1）。

### Browser（48 = 16 × 3 engines）

- `webServer` 是 `tests/preview-server.mjs`，用 Vite preview API 服務**正式 `dist/`**，並注入從 `dist/_headers` 解析出的 HTTP headers。
- 設定為 `reuseExistingServer: false`、`strictPort`、`workers: 1`、`retries: 0`，沒有 `forbidOnly` 以外的 grep／filter。
- 用來確認不是 dev server 的證據：security test 斷言 meta CSP 存在，而且 HTTP CSP 等於 meta 加 `frame-ancestors`。dev mode 不會注入 meta CSP。
- 三種引擎都實際啟動，版本見第 3 節。
- 我的 run：0 skipped、0 flaky。

依瀏覽器調整的 assertion：

- 剪貼簿只在 Chromium 讀回 OS clipboard；Firefox／WebKit 只驗 native write resolve 與 UI 狀態，並以 annotation 誠實記錄。
- 大圖的 `choose()` 先等待 terminal state（最長 30 s），再做精確值比對。這是等待，不是容忍失敗。
- 低對比樣本預期回傳 no-QR，屬於誠實記錄的限制，不是弱化。

沒有看到被不合理弱化的 assertion。

### Accessibility

- 套件內：2 個 axe test × 3 引擎，每個 test 3 個 state，共 18 次 scan。使用 `withTags(['wcag2a','wcag2aa','wcag21aa'])`，**沒有** `disableRules`、`exclude` 或 `include`。
- 另有 keyboard、hidden-panel live region 與 contrast regression tests。
- 我自己在 Chromium 用 **全部規則（含 best-practice）** 掃了 5 個 state，0 violations。唯一的 needs-review 是 M-2。

### Audit

`npm audit` 為 0（含 dev）；lockfile v3 的 `integrity` 完整；Linux／macOS 的 rolldown 與 lightningcss optional bindings 都在 lockfile 中，所以 Linux host build 也可用 `npm ci`。

### Test architecture 評估（Phase 5）

- 不依賴作者 Temp directory：路徑都用 `import.meta.url` 解析。
- 不依賴已啟動的 server：由 Playwright 啟動與關閉；結束後確認 4173 無 listener。
- 不依賴殘留 browser state：每個 test 使用新的 context。
- 不修改 production state：只重建 ignored 的 `dist/`，輸出只寫入 ignored 的 `test-results/`。

**唯一例外**：在 Windows 預設 Git 設定下的 fresh checkout 無法重跑，見 I-1。

---

## 5. Findings

### Blocker

無。

### Important

#### I-1 — Windows fresh checkout 讓 `test:artifact` 與 `test:browser` 失敗（CRLF `_headers`）

**Severity**：Important（release-evidence 的可重現性問題；不影響 application runtime）

**Evidence**

- Repo 沒有 `.gitattributes`。Git for Windows 安裝時預設 `core.autocrlf=true`，本機的 system gitconfig 也是如此。
- `git clone` 後，`public/_headers` 的 byte 內容為 `/*\r\n  Content-Security-Policy…`。
- `tests/preview-server.mjs:6-7`：`split('\n')` 之後 `lines.shift()` 得到 `'/*\r'`，觸發 `throw new Error('Expected one global _headers rule')`。結果 `webServer` 無法啟動，48 個 browser tests 一個都沒跑。
- `tests/release/artifact.test.mjs:16`：`headers.includes(\`…frame-ancestors 'none'\n\`)` 在 CRLF 下為 false，導致 FAIL。
- 作者目前的 working tree 是 LF（`git ls-files --eol` 顯示 `w/lf`，推測由 WSL 寫入），所以 M3 的 run 沒有遇到這個問題。M3 表格也註明是「同一 worktree」，不是 fresh clone。
- `RELEASE_CHECKLIST.md` 把「在乾淨 checkout…」的 `npm ci`／test gates 標記為 `[x]`。對 Windows 預設設定而言，這個宣稱不成立。

**Why it matters**

- Push 之後，repository 就是正式來源。在 Windows 上重新 clone 時，文件列出的 8 個 gate 中會有 2 個失敗，而且錯誤訊息看起來像產品或部署設定壞了。這會同時誤導作者和 reviewer。
- 在 CRLF checkout 上 build 出來的 `dist/_headers` 也會是 CRLF。各 hosting provider 能否正確解析 CRLF 的 `_headers`，本次 **NOT VERIFIED**。
- JS／CSS bundle 完全不受影響：兩種 checkout 的 hash 相同。

**Reproduction**

```sh
git clone --branch v1.0.0 <repo> fresh   # Git for Windows 預設 autocrlf=true
cd fresh && npm ci
npm run build && npm run test:artifact   # 1/2 FAIL
npm run test:browser                     # WebServer: Expected one global _headers rule
```

範圍驗證：同一個 clone 只把 `public/_headers` 轉成 LF 後，`test:artifact` 2/2、Chromium 16/16 PASS。

**Recommended action**（不在本次修改）

- 用一個 follow-up commit 加入 `.gitattributes`：至少包含 `public/_headers text eol=lf`，或全域使用 `* text=auto eol=lf` 並加 `*.png binary`。這同時保證部署出去的 `_headers` bytes 是 LF。
- 可選：讓 `preview-server.mjs` 改用 `split(/\r?\n/)`，artifact test 在比對前先正規化行尾。
- **不要移動 `v1.0.0`**。若希望有一個在 Windows 也能直接重跑 gate 的 tag，可另切 `v1.0.1`。
- 修正後，把 RELEASE_CHECKLIST 的「乾淨 checkout」描述更新為實際驗證過的內容。

### Minor

#### M-1 — Selected tab 的視覺狀態對比偏低

**Severity**：Minor（WCAG 1.4.11 風險，屬判斷題）

**Evidence**：`src/styles.css:44-46`。以 computed style 計算的對比：

| 比較 | 對比 |
|---|---|
| selected tab 的白底 vs tablist 底色 `#eaeee8` | **1.17:1** |
| selected tab 的邊框 `#dce2dc` vs tablist 底色 | **1.12:1** |
| selected 與 unselected 的文字色互比 | **1.30:1** |

各自的文字對比都合格：unselected 為 5.06:1。

**Why it matters**：低視力使用者較難一眼分辨目前是哪個模式。mitigating factors：

- `aria-selected` 已正確提供給輔助技術。
- 兩個 panel 的 h2 與控制項完全不同，模式本身其實很明顯。
- axe 不檢查這一項。

**Recommended action**：可發布後再 patch。例如為 selected tab 加上 ≥3:1 的指示，像 2–3 px accent 底線或 accent 邊框。不需要 redesign。

#### M-2 — `aria-labelledby` 放在沒有 role 的 `<div>` 上，沒有作用

**Severity**：Minor

**Evidence**：`index.html:46` 的 `<div class="output-section" aria-labelledby="preview-title">`。axe（全部規則）把 `aria-prohibited-attr` 列為 needs-review；ARIA 1.2 禁止在 generic role 上使用 naming 屬性。

**Why it matters**：目前只是無效，沒有造成錯誤朗讀，因為 `h3#preview-title` 本身已是 heading。

**Recommended action**：之後刪除該屬性即可。若確實想要 landmark，可改成 `role="region"`，但本工具不需要。

### Manual / Environment

以下 9 項都是 NOT VERIFIED，本環境無法實測：

1. real phone scan
2. real Android
3. real Safari（macOS／iOS）
4. real printed scan
5. real camera photograph
6. screen reader
7. native browser zoom UI
8. hosted HTTPS／response headers
9. deployed subdirectory

分類與建議見第 16 節。

### Future

- **F-1 — 含 userinfo 的 URL 會被接受並原樣顯示。** 例如 `https://example.com:443@evil.test/` 通過驗證，實際 host 是 `evil.test`。App 不會自動開啟或產生可點連結，所以風險低。未來可以考慮拒絕 credentials，或把 hostname 另外標示出來。
- **F-2 — jsQR 在 main thread 上同步執行。** 只有在真機驗收發現明顯卡頓時，才考慮 Worker／OffscreenCanvas。目前沒有證據需要這樣做（見第 8 節）。
- **F-3 — Repository 沒有專案本身的 LICENSE。** 公開 push 前要決定是否允許他人重用。這不是缺陷，保持 all-rights-reserved 也可以。

---

## 6. M1 Release Audit

**Validation（我的 48 個輸入 probe，加上 browser 中的實際 UI 操作）**

- 接受：HTTP、HTTPS、大寫 scheme／host、path、query、fragment、port、IPv6、`%20`／`%09`、Unicode host（IDNA 轉成 punycode）、Unicode path／query／fragment（轉成 percent-encoding）、首尾空白（包含 U+3000 與 BOM）。
- 拒絕：裸網域、`javascript:`（包括 `javascript://…` 與大寫形式）、`data:`、`file:`、`blob:`、`ws:`、`mailto:`、`https:\\`、`https:/`、`https:example.com`、內部空白、C0 控制字元與 DEL、無效 IPv4、無效 punycode。
- **所有被接受的輸出都是 ASCII、idempotent，而且可被 encoder 編碼。**
- 備註：C1 控制字元（U+0080–U+009F）與 U+200B 出現在 path 時會被 percent-encode，而不是拒絕。這是 lossless 的轉換，而且畫面顯示的就是正規化後的結果。出現在 host 時，這些字元會被 IDNA 拒絕或移除，行為與瀏覽器一致。README 寫「拒絕其餘空白／控制字元」略為寬泛，可以考慮改寫，但不算 finding。

**QR 正確性與 PNG**

- Chromium、Firefox、WebKit 各下載 3 次一般 PNG 與 1 次高密度 PNG，全部用 **ZXing-C++** 獨立解碼，payload 完全相符，EC level **M**。
- 尺寸符合 `(modules+8)×ceil(1024/(modules+8))`，例如 33 modules 得到 1025²，145 modules 得到 1071²。
- 四格 quiet zone 全白，像素只有純黑與純白。
- 同一引擎內重複下載的檔案 byte-identical。
- PNG 中的 ancillary chunks 由瀏覽器的 encoder 自行加入：Firefox 是 `deBG`（內容 hash），WebKit 是 `sBIT`／`iCCP`。其中沒有 URL 或使用者資料。
- Capacity：2331 bytes（v40-M）可編碼；超出時 `qrcode-generator` 丟出非 Error 物件，被 `main.ts` 的 bare `catch` 接住，顯示為 `#qr-error`（E2E 已涵蓋）。

**State**：我的 probe 在三引擎都確認：

- 生成後修改輸入：canvas 清除、Download 停用，status 顯示「網址已修改…」。
- 由有效改成無效：清除結果，並設定 `aria-invalid` 與 alert。
- 由無效改回有效：錯誤清除。
- 連續 3 次 Download 都成功。
- stale export 不會產生下載：E2E 以延後 `toBlob` 驗證。

**Focus**：E2E 驗證了鍵盤 Generate、Download 後保留 focus、busy 狀態使用 `aria-disabled` 加內部 guard。WebKit 以滑鼠點擊時 button 不取得 focus，這是 macOS 平台慣例，不是 bug。

**Race**：`generated !== result` 與輸入值比對兩層 guard 閱讀起來正確，E2E 也覆蓋。

---

## 7. M2 Release Audit

**Decoder**：

- 三引擎都成功解出：M1 產生的 PNG、Segno fixtures（ASCII 與 Unicode）、JPEG、resize、rotate、invert、blur、skew、透明底。
- 低對比樣本回傳 no-QR，是已記錄的限制。
- 從 v2 到 v40 共 14 個長度，以真實 UI 先生成再解碼，**三引擎全部完全相符**。

**UTF-8 integrity（Phase 9 release gate）**

- 我讀了 `node_modules/jsqr/dist/jsQR.js:915-931`：`decodeByte` 在 `decodeURIComponent` 失敗時會吞掉錯誤，回傳 `text: ''`，但保留 `bytes`。這證實了 M2 finding 的前提。
- `src/decode.ts:15-24`：對**每一個** Byte chunk 使用單一 `TextDecoder('utf-8', { fatal: true })` 驗證 `bytes`。缺少 `bytes` 或 decode 丟出錯誤，都回傳 `unsupported-url`。
- 這不是只檢查 `text === ''`。Mutation 證實拿掉驗證後 regression test 會失敗。
- 4 種無效序列（孤立 continuation byte、overlong、surrogate、超出範圍）全部拒絕；3 種有效的 multi-segment UTF-8 組合正確接受。
- 備註：如果某個 encoder 把一個多位元組字元拆進兩個 segment，會被保守地拒絕。jsQR 本身在這種情況也會丟失內容，所以拒絕是正確的選擇。

**Validation**：只有一套 `normalizeUrl`（`src/qr.ts`），M1 與 M2 共用，`decode.ts:2` 直接 import。沒有第二套驗證邏輯。

**Image pipeline**：

- 20 MiB 邊界在呼叫 `createImageBitmap` 之前就生效（E2E 驗證呼叫次數為 0）。
- corrupt、SVG、HEIC 會回報錯誤，之後可再選檔恢復。
- 沒有使用 object URL 或 `<img>`，所以維持 `img-src 'self'`。

**Race**：我的 probe 在三引擎確認：

- stale failure：先選的壞圖較晚才失敗，不會覆蓋較新的成功結果（error 為空、`aria-invalid` 為 null、Copy 仍啟用）。
- A→B→A，而且最後一個 A 最先完成時，最終結果是 A。

**Clipboard**：

- 三引擎 native Copy 都成功；Chromium 讀回的內容完全相符。
- 失敗與 API 不存在時，會提示手動複製，結果保留（E2E 注入測試）。
- 選新圖會讓進行中的 Copy 失效，focus 從 Copy 轉到 file input（E2E）。

**Cleanup**：兩個 stage 都在同一個 `finally` 中執行 `bitmap.close()` 並把 canvas 歸零；Node mock tests 也有覆蓋。

---

## 8. Staged Decode Assessment（768 → 2048）

**Correctness**（`src/decode.ts:54-70`）：

- 最長邊 ≤ 768 時只跑一次。
- 不會放大圖片：`decodeDimensions` 的 ratio 上限是 1。
- 維持 aspect ratio，而且每一邊至少 1 px。
- 只有結果為 `no-qr` 時才進第二階段；`unsupported-url`、`decode-failure` 與成功都直接回傳。
- 兩個 stage 共用 cleanup。
- 兩次 pass 之間沒有 `await`，所以不會有新的 change event 插入。stale guard 由 `main.ts` 在 await 之後的 generation 比對負責，仍然有效。

**First-pass false-positive**：沒有任何證據：

- 14 個 QR version × 3 引擎，全部完全相符。
- v35 與 v39 在 768 找不到 QR，正確退到第二階段並成功。
- v40 在 768 就能正確解出。
- Corpus 內所有樣本都完全相符。

同一張圖含兩個 QR、縮小後選到不同 QR 的情況屬於純理論，不列為 finding。

**Performance（同一 bitmap，只計 draw + getImageData + jsQR，3 次取中位數）**

| 圖片 | 768 pass（C/F/W ms） | 2048 單次（C/F/W ms） |
|---|---|---|
| 4000×3000 JPEG | 52 / 53 / 51 → 成功 | 403 / 408 / 429 |
| 1200×900 screenshot | 60 / 50 / 110 → 成功 | 122 / 156 / 201 |
| 長截圖 QR 800 | 24 / 18 / 43 → 成功 | 99 / 101 / 135 |
| 長截圖 QR 256 | 20 / 20 / 33 → no-qr | 95 / 75 / 194 → 成功（第二階段） |
| no-QR 1200×900 | 62 / 44 / 58 | 139 / 118 / 223（staged 總計多約 45%） |
| no-QR 4000×3000 | 62 / 46 / 63 | 494 / 427 / 492（staged 總計多約 12%） |

**判斷**：修改有實際依據。常見的大照片同步阻塞時間降到約 1/8；代價只落在 no-QR 的情況。M3 的方法把 fixture 生成排除在計時外（生成在 `choose()` 之前完成），計時包含 bitmap decode，沒有把 synthetic 極端案例當成一般使用情境，這是合理的。

---

## 9. Browser Compatibility

| Engine / Platform | Result | Evidence |
|---|---|---|
| Chromium（Chrome for Testing 153.0.8010.12） | PASS | 16/16，加上獨立 probes；剪貼簿可讀回 |
| Firefox 155.0（Playwright） | PASS | 16/16，加上獨立 probes；native Copy resolve |
| Playwright WebKit 26.6（Windows） | PASS WITH NOTE | 16/16，加上獨立 probes。本次 M1 PNG 中位數 149 ms（M3 在記憶體吃緊時記錄 1.9 s），支持 M3 所說的資源壓力解釋。秒級停頓屬於 PASS WITH NOTE，**不是 blocker** |
| Installed Google Chrome | NOT VERIFIED | 只測了 Chrome for Testing |
| Real Safari（macOS／iOS） | NOT VERIFIED | README、CHECKLIST、M3 都明確寫出 **Playwright WebKit ≠ real Safari**，措辭正確 |
| Node 22.12（engines 下限） | NOT VERIFIED | 只在 Node 24.19 上實測 |

---

## 10. Accessibility

- **Semantic**：
  - 結構：`h1 → h2 → h3`，以及 header、main、footer。
  - 模式切換：tablist、tab、tabpanel 與 `aria-controls`／`aria-labelledby`。
  - 表單：label 對應 input、file input 與唯讀 textarea；`aria-describedby` 指向提示與錯誤。
  - Canvas 設為 `role=img`，並帶有含 URL 的 accessible name。
  - 三個 `role=alert` 與兩個 `role=status` 在載入時已存在於 DOM。
  - 唯一瑕疵是 M-2。
- **Keyboard／Focus**：
  - E2E 在三引擎驗證了 skip link、方向鍵／Home／End、Tab 與 Shift+Tab、Space Generate、Enter／Space Download 與 Copy、busy 時保留 focus、新圖時 focus 從 Copy 轉到 file input、async 完成時不搶 focus。
  - 隱藏 panel 不在 accessibility tree 中。
- **axe**：0 violations，而且是真實結果：沒有抑制規則，也沒有排除範圍。我另外用全部規則掃 5 個 state，也是 0。axe PASS 不等於 WCAG 認證，也不代表 screen reader 實際可用，文件已正確說明這一點。
- **Contrast**（computed）：

| 元素 | 對比 |
|---|---|
| muted text vs page 背景 | 5.53 |
| hint vs 白底 | 5.94 |
| error | 7.52 |
| 輸入框、textarea、file button、secondary button 邊框 | 3.31（M3 的修正確實生效） |
| file input 邊框 vs 其底色 `#f8f9f6` | 3.13 |
| aria-invalid 邊框 | 7.52 |
| placeholder | 5.03 |
| focus outline vs 白底／page 背景 | 5.71／5.31（有 4 px offset，所以相鄰色是背景） |
| primary button 文字 | 7.73 |
| secondary button 文字 | 7.00 |

  唯一偏低的是 selected tab 狀態（M-1）。
- **Responsive**：
  - 1440／1280／768／375／320 在三引擎的 scrollWidth 都等於 innerWidth，沒有 input、button、textarea、canvas、文字超出 viewport。
  - 長 URL、長錯誤訊息、密集 QR 提示在 320 px 的截圖經人工目視檢查正常。
  - 200% reflow 的等效測試（640 px viewport 加 root 200%）已由 E2E 驗證。
- **Screen reader**：NOT VERIFIED。CHECKLIST 已附具體 walkthrough。

---

## 11. Security

- **XSS surface**：
  - `src/` 沒有 `innerHTML`、`outerHTML`、`insertAdjacentHTML`、`document.write`、`eval`、`new Function`，也沒有動態建立 script。
  - 唯一的動態 `href` 是固定檔名 PNG 的 `blob:` URL（`main.ts:133`），60 s 後 revoke。
  - 解出的 URL 只寫入 `textarea.value`。
  - 正式 bundle 裡的 `Function(` 命中都是 jsQR 的 `mappingFunction`／`getMaskFunction`。
  - 唯一的 `fetch(` 是 Vite 的 modulepreload polyfill；dist 沒有 modulepreload link，而且 `connect-src 'none'` 也會阻擋它。
  - qrcode-generator 裡未使用的 SVG／HTML 字串產生器是 dead code，app 從不呼叫。
- **CSP**：
  - meta CSP 與規格完全相同：`default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'none'; object-src 'none'`。
  - HTTP CSP 等於 meta 加 `frame-ancestors 'none'`。
  - 沒有 wildcard、`unsafe-inline`、`unsafe-eval`、`blob:` 或 `data:`。
  - Production policy 沒有為測試放寬。我的 probe 只在另一個 scratch context 使用 `bypassCSP` 注入 jsQR 做計時，與產品無關。
  - 三引擎的 CSP violation 數都是 0。
- **HTTP headers**：`nosniff`、`no-referrer`（HTML 另有 meta referrer）、`Permissions-Policy: camera=(), microphone=(), geolocation=()`。
- **Network**：頁面載入只請求 `/`、JS、CSS（Firefox 另外請求 `favicon.svg`）。生成、下載 ×4、解碼 ×6、Copy 之後，**新增請求數為 0**；三引擎都沒有 console error、pageerror 或 failed request。
- **Dependency／bundle**：見第 14 節。

---

## 12. Privacy

- 沒有上傳：在所有操作之後都沒有任何新的 request，URL、圖片與解出的 payload 都留在本機。
- 三引擎的 localStorage、sessionStorage、`document.cookie`、context cookies、IndexedDB databases、CacheStorage、Service Worker registrations 全部為 0 或空。
- `src/` 沒有任何 storage、analytics 或 tracking API。
- Reload 後結果被清空（E2E 驗證）。
- 下載檔與 OS clipboard 是使用者主動觸發的輸出；host access log 取決於部署環境。README 對這些邊界描述準確。

---

## 13. Artifact / Deployment Audit

- **`dist/` 內容**：
  - `index.html`（6.2 kB）
  - `assets/index-Cve07lVc.js`
  - `assets/index-gAu6sPc5.css`
  - `favicon.svg`
  - `THIRD_PARTY_NOTICES.txt`
  - `_headers`

  沒有 source map（也沒有 `sourceMappingURL`）、tests、fixtures 或 Markdown，與 artifact test 的白名單一致。總計約 180 KiB。
- **Headers／notices**：與 `public/` 下的檔案 byte 相同（前提是 LF checkout；見 I-1）。
- **Static host 假設**：
  - `base: './'` 產生相對路徑。
  - 我在本機用 `/tools/qr/` subpath 服務未修改的 dist，兩個模式都正常、0 個 404。這**不等於**實際的 hosted subdirectory 驗證。
  - meta CSP 放在 `<meta charset>` 之前，但 charset 仍在前 1024 bytes 內，合法。
- **`_headers` 文件**：README 已說明它只適用於 Netlify／Cloudflare Pages 這類支援的 host，**不會在所有主機自動生效**；其他主機需要設定等價 headers；放進 subpath 時要限縮 `/*`；部署後要實際檢查 response headers。說法正確，不需要另外建立多套 provider 設定。

---

## 14. Dependency / License Audit

- **Production**：只有 `qrcode-generator@2.0.4`（MIT）與 `jsqr@1.4.0`（Apache-2.0，套件中沒有 NOTICE 檔），沒有 transitive runtime 依賴。Lockfile 中非 dev 的套件恰好就是這兩個。
- **Dev only**：
  - `@playwright/test`／`playwright`／`playwright-core` 1.63.0（Apache-2.0）
  - `@axe-core/playwright`／`axe-core` 4.13.0（MPL-2.0）
  - `vite` 8.3.1、`typescript` 5.9.3

  這些都不會進入 bundle（bundle 字串檢查沒有命中）。不需要把 dev license 打包進 dist。
- **`THIRD_PARTY_NOTICES.txt`**：包含 qrcode-generator 的完整 MIT 全文與 copyright，以及 jsQR 的來源、「未修改」聲明與 Apache-2.0 全文。滿足兩者的散布條件。
- **Segno fixtures**：Segno 1.6.6（BSD-3-Clause）只在離線時用來產生 fixture，repo 中沒有它的程式碼。我重新產生的結果與 committed PNG **byte-identical**，證實來源宣稱。PNG 只有 IHDR／IDAT／IEND，沒有 metadata，內容只有保留用途的 example 網址，也不是正式 encoder 產生的。E2E 與 corpus 都實際使用這兩張圖。

---

## 15. Documentation Audit

**README**

- 準確涵蓋：用途、兩個模式、PNG、Copy、HTTP(S) only、本機處理、圖片格式與 20 MiB 限制、開發、測試、build、部署、`_headers` 的適用限制、各項限制。
- WebKit 與 Safari 的區分、axe 與 screen reader 的區分都寫對了，也沒有宣稱支援真實 Safari 或手機。
- 內容不是過時的 milestone 描述；M0–M2 文件被明確標示為歷史紀錄，只有 `M2_VERIFICATION.md` 還出現 `0.0.0`，屬合理的歷史紀錄。
- 小瑕疵：「控制字元」的描述略為寬泛（見第 6 節）；Node 22.12 下限未實測。

**CHANGELOG**：`1.0.0` 的四點內容簡潔，與實際功能相符。

**RELEASE_CHECKLIST**

- Automated 項目與實際 scripts 一一對應，在 LF checkout 下我全部重跑通過。
- 「乾淨 checkout」的前提在 Windows 預設設定下不成立（I-1）。
- 「原有 29 項保留」加上 1 項新測試，與 30 tests 一致。
- Manual 項目全部是 `[ ] NOT VERIFIED`，**沒有假勾選**；hosted headers 與 subdirectory 另列在 Deployment 區。

**Project LICENSE**：不存在，見 F-3。

---

## 16. Manual Acceptance Items

| Item | Status | Required before public deploy? | Note |
|---|---|---|---|
| Real phone scan（畫面 QR 與下載的 PNG，短網址與長網址） | NOT VERIFIED | **Yes（約 5 分鐘）** | 這是核心承諾。ZXing 與 jsQR 的軟體解碼是強證據，但不等於相機掃描 |
| Hosted HTTPS／response headers | NOT VERIFIED | **Yes（部署當下）** | 確認 CSP（含 `frame-ancestors`）、nosniff、Referrer-Policy、Permissions-Policy 確實生效；Clipboard 需要 secure context |
| Deployed subdirectory | NOT VERIFIED | **Yes，若放在 subpath** | 本機 subpath 測試已 PASS；仍需確認 host 上的 asset path 與 header 規則範圍 |
| Real Safari（iOS／macOS） | NOT VERIFIED | Recommended | 建議在部署後的網址至少用一台真實手機瀏覽器（iOS 或 Android）做一次選相簿照片、Copy 與下載的 smoke。iOS 從相簿選 HEIC 時的轉檔路徑只能在真機確認 |
| Real Android | NOT VERIFIED | Recommended | 同上。若手邊的手機是 Android，一次 smoke 即可 |
| Real printed scan | NOT VERIFIED | No（post-release） | 把 QR 放進備審或印刷資料之前，必須先對最終 PDF 與紙本實際掃描 |
| Real camera photograph | NOT VERIFIED | No（post-release） | 目前只有合成的 photo-like 樣本 |
| Screen reader | NOT VERIFIED | No（post-release，建議儘早） | 依 CHECKLIST 的 walkthrough 實測 |
| Native browser zoom 200% | NOT VERIFIED | No | 等效的 CSS viewport 與文字放大已自動化驗證 |

---

## 17. Public Deployment Readiness

### Must fix before push/deploy

- **Application（部署產物）**：No software-side must-fix issue found before deploy.
- **Repository（push 前）**：**I-1**。加入 `.gitattributes`，或讓 `_headers` 的解析容忍 CRLF。用 follow-up commit 處理，不移動 `v1.0.0`。這不會改變 JS／CSS 產物，但可以讓 push 後的 repository 在 Windows fresh clone 上重現文件列出的 gate，並確保部署出去的 `_headers` 是 LF。

### Recommended manual checks

1. 用手機掃描一個短網址和一個長網址的下載 PNG，並掃描螢幕上的預覽。
2. 部署後，用 devtools 或 `curl -I` 確認 HTTPS 與四個 security headers。若嵌入 portfolio 的 subpath，也要確認 asset path 與 header 規則範圍。
3. 在部署後的網址，用一台真實手機瀏覽器做一次完整 smoke：生成、下載、選相簿照片、Copy。

---

## 18. Final Verdict

### Local v1.0.0 baseline

**PASS WITH NOTE**

- Tag、commit、version 一致，working tree clean，沒有 remote。
- 兩個核心功能、UTF-8 integrity、stale-state、CSP、privacy、artifact、dependency 與 license 都經獨立驗證通過。
- Note：release gates 只有在 LF checkout 下才能重現（I-1）。保留 `v1.0.0` 作為本機 baseline 是適當的，不需要重打 tag。

### Public deployment readiness

**READY WITH MANUAL CHECKS**

- Application 沒有 must-fix。
- 前提是 push 前先以 follow-up commit 修 I-1（一行 `.gitattributes`，不影響 bundle）。
- 部署當下完成三項人工檢查：手機掃描、hosted headers／HTTPS、一台真機瀏覽器 smoke。
- M-1、M-2 與 Future 項目都可以在發布後再處理。

---

*審查期間建立的 scratch clones、Python venv、probe scripts、截圖、下載的 PNG 與 log，全部放在 repository 外的 scratchpad，結束前已刪除。所有 scratch server 已停止。原 repository 除本報告外沒有任何變動（本報告為 untracked，未 commit）。*

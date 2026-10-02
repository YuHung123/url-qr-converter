# URL QR Converter v1.1.0 — Independent Release Candidate Audit

審查日期：2026-09-30　審查對象：v1.1.0 candidate `523dc4f99b2d913812d3799a6d27dd7342ebefc2`（`main`）
審查方式：只做 inspection／verification。沒有修改正式 source／tests／文件（本報告是唯一新增檔案）、沒有 commit／amend／rebase／reset、沒有移動 `v1.0.0`／`v1.0.1`、沒有建立 `v1.1.0` tag、沒有 push／deploy、沒有新增 production dependency。

`V1_1_VERIFICATION.md` 只當作 claims／線索。以下結論來自：直接讀 source 與 `git diff v1.0.1..HEAD`；在 repository 外（session scratch）從正式 repository clone 的 fresh copy 重跑全部 canonical gates；自寫的三引擎 Playwright probes（連到自己啟動的 dist preview，套用 `_headers`）；以及與 jsQR／qrcode-generator 無關的 **ZXing-C++ 3.1.1** 獨立 decoder（Pillow 12.3.0，scratch venv）。所有 scratch 材料、server、venv 已在完成後清除。

---

## 1. Executive Summary

| 項目 | 結果 |
|---|---|
| Blocker | **0** |
| Important | **0** |
| Minor | **3**（m-1 WebKit 再按 chevron 無法收合選單；m-2 Safari IME `keyCode 229` Enter 未被排除〔PLAUSIBLE〕；m-3 裸 `host:port` 規則與錯誤訊息不一致） |
| Manual / Environment | **9**（均 NOT VERIFIED） |
| Future | **4**（F-1 userinfo〔因 Open Link 提高關注度，但未變成 release issue〕、F-2 Worker、F-3 LICENSE、F-4 decode 端裸網域自動補 HTTPS 的提示） |
| v1.1.0 candidate | **PASS WITH NOTE** |
| 可以建立 v1.1.0 tag？ | **YES WITH MANUAL CHECKS** |

重點：

- 四種格式 × 三引擎 × 9 種情境共 **108 個實際下載檔**，全部由 ZXing-C++ 解出**完全相同**的 normalized URL，EC level 皆為 **M**；quiet zone 內沒有任何像素 < 250（PNG／SVG 為純白 255）。
- **Draft vs generated state 正確**：編輯草稿、無效 Generate 後，四格式都仍是 A；Generate B 後四格式全部變成 B。三引擎、PNG／JPG／WebP 的 stale export race 全部正確（舊 export 不下載、不解除 B 的 busy、不改 B 結果）。
- **Open Link 安全**：href 只在 decode success 時由 `normalizeUrl()` 結果設定；顯示值＝`href`＝實際 navigation URL（含 userinfo 案例）；`target=_blank`、`rel="noopener noreferrer"`，三引擎實測 `window.opener === null`、無 Referer；新圖片／錯誤時 href 移除並 hidden；未按 Open Link 前 0 個新增 request。
- **CSP／`_headers`／`vite.config.ts`／`src/decode.ts` 與 v1.0.1 byte-identical**；production dependencies 仍只有 `qrcode-generator@2.0.4`、`jsqr@1.4.0`。
- 三個 Minor 都是互動細節，沒有產生錯誤 payload、錯誤下載或安全問題，可在 1.1.x 處理。

---

## 2. Repository / Git Integrity

| Item | Result | Evidence |
|---|---|---|
| HEAD | PASS | `523dc4f99b2d913812d3799a6d27dd7342ebefc2`（`main`），message `feat: refine url and qr workflows`，author／committer YuHung123，2026-09-30 18:10:49 +0800 |
| Parent | PASS | `babe1c2034072d21cbfb7a7b79d8f12a2e226169`（`docs: add v1.0.1 pre-push audit`，= `origin/main`） |
| Version | PASS | `package.json`、`package-lock.json` root 與 `packages[""]` 均 `1.1.0`；lockfile 其餘內容無變化（diff 只有兩行 version） |
| Working tree | PASS | `git status`：clean，`main...origin/main [ahead 1]` |
| `v1.0.0` | PASS，未移動 | tag object `0c41a74fb7c853f2f4f4ee65b5362a6bcfa71310` → `47600c5c3741a86a74537e46eeb10f0bf774f64a` |
| `v1.0.1` | PASS，未移動 | tag object `1e5f113430adb830862d586e76a6eb42c1d79589` → `214cea38bea3ca43ecb0dc0c0b0f7f3a18a51dd9` |
| Remote tags | PASS | `git ls-remote --tags origin`：只有 v1.0.0／v1.0.1，objects 與本機相同 |
| `v1.1.0` tag | PASS | 本機與 remote 皆不存在 |
| History | PASS | 線性 10 commits；reflog 只有 `commit`，沒有 amend／reset／rebase |
| Remote／push | PASS | `origin` = `https://github.com/YuHung123/url-qr-converter.git`；candidate commit **尚未 push**（ahead 1） |

---

## 3. Diff Audit（v1.0.1 → v1.1.0）

`git diff --stat v1.0.1..HEAD`：18 files，+1248／−210。其中 `V1_0_1_PRE_PUSH_AUDIT.md`（+390）屬於 `babe1c2`，不是 candidate commit 本身的變更。

| 類別 | 檔案 | 判定 |
|---|---|---|
| Expected product UI／UX | `index.html`、`src/styles.css`、`src/main.ts` | 移除 eyebrow／intro／privacy note／milestone badge／panel headings／footer；split download、drop zone、result field、copy icon、Open Link；Enter；draft／result 分離；drag／drop |
| Expected product logic | `src/qr.ts` | `normalizeUrl()` 裸網址補 HTTPS；`createQrMatrix()`（抽出原 `isDark()` 迴圈）；`createQrSvg()`；`exportQr()`（PNG 仍走原 `exportPng()`） |
| Expected tests | `tests/qr.test.mjs`、`tests/decode.test.mjs`、`tests/browser/*.spec.mjs`、`helpers.mjs` | 新增 scheme-less／SVG／JPG-WebP guard／refinement；舊「裸網域拒絕」改為成功 coverage，並改以 `blob:`／`/article` 補回拒絕 case，沒有刪掉負向案例 |
| Expected docs | `README.md`、`CHANGELOG.md`、`RELEASE_CHECKLIST.md`、`V1_1_VERIFICATION.md` | 見第 16 節 |
| Version | `package.json`、`package-lock.json` | 只有 version |
| **未變更（byte-identical）** | `src/decode.ts`、`vite.config.ts`、`public/_headers`、`public/THIRD_PARTY_NOTICES.txt`、`public/favicon.svg`、`.gitattributes`、`tsconfig.json`、`playwright.config.mjs`、`tests/preview-server.mjs`、`tests/deployment-headers.mjs`、`tests/release/*`、`tests/byte-fixture.mjs`、fixtures | `git diff --stat` 為空 |

特別確認：

- **`src/decode.ts` 未改**：fatal per-byte-segment UTF-8、raw control rejection（經 `normalizeUrl()`）、20 MiB、768 → 2048 staged decode、`bitmap.close()`／canvas 歸零都原封不動。M2 行為唯一的變化來自共用的 `normalizeUrl()`（見第 6 節）。
- **CSP 未變弱**：meta CSP 由未改動的 `vite.config.ts` 注入；`_headers` 未改。
- **Dependencies 未增加**：`package.json` dependencies／devDependencies 不變。
- **Stale-state protections 保留**：decode generation guard、Copy generation guard 不變；export 改為以 `generated !== result` 判斷（依 v1.1 規格，草稿編輯不再使舊 export 失效，見第 7 節）。
- **Scope creep**：沒有。`createQrPixels()` 的變化是把 matrix 抽成參數，繪製迴圈、scale、quiet zone 與 ASCII guard 不變。

---

## 4. Commands Actually Run

環境：Windows 11、Node 24.19.0、npm 11.17.0、Playwright 1.63.0（Chromium／Firefox／WebKit 為 Playwright 管理版本）。Fresh copy：`git clone` 正式 repository 至 scratch，HEAD = `523dc4f…`。

| Command | Result | Notes |
|---|---|---|
| `git status` / `log --graph --all` / `tag -n` / `rev-parse` ×3 / `remote -v` / `reflog` / `cat-file -p` / `ls-remote --tags` | PASS | 第 2 節 |
| `git diff v1.0.1..HEAD`（全文）＋ `--stat` | PASS | 第 3 節 |
| `npm ci` | PASS | 0 vulnerabilities |
| `npm test` | PASS | **34/34**，fail 0／cancelled 0／skipped 0／todo 0 |
| `npm run typecheck` | PASS | |
| `npm run build` | PASS | `index-Un4EjKft.js`、`index-DCVimks5.css`；SHA-256 與 candidate 工作目錄的 dist **完全相同**（可重現） |
| `npm run test:artifact` | PASS | **4/4** |
| `npm run test:browser`（第 1 次） | **作廢** | 我同時在同一台機器跑三引擎 probes，CPU 爭用造成 Firefox／WebKit 測試 1–2 分鐘 timeout（60 passed／8 failed／7 did not run），並被 30 分鐘背景上限中止。這是審查者造成的環境干擾，**不作為任何結論的證據**；已清除殘留 server／browser |
| `npm run test:browser`（第 2 次，單獨執行） | **PASS** | 75 passed（13.5m），exit 0；JSON stats expected 75／skipped 0／unexpected 0／flaky 0，report errors 空，所有 results retry 0 |
| `npm audit` | PASS | 0 vulnerabilities |
| `npm ls --omit=dev --all` | PASS | 只有 `jsqr@1.4.0`、`qrcode-generator@2.0.4` |
| `git diff --check` | PASS | |
| `normalizeUrl()` edge-case probe（Node，84 inputs） | PASS WITH NOTE | 第 6 節；m-3 |
| Dropdown focus／mouse probe（三引擎） | PASS WITH NOTE | 第 9 節；m-1 |
| Export probe：A-draft／A-invalid／B ＋ 6 samples × 4 formats × 3 engines | PASS | 108 files |
| ZXing-C++ 3.1.1 ＋ Pillow 12.3.0 分析（signature、chunks、dimensions、quiet zone、SVG grammar、decode） | PASS | 108/108 exact |
| Stale export race probe（PNG／JPG／WebP × 5 cases × 3 engines） | PASS | 第 7 節 |
| Decode／drag-drop／Copy／Open Link／IME／network／storage probe（三引擎） | PASS WITH NOTE | m-2 |
| axe（**全部預設 rules**，無 tags 限制）7 states × 3 engines ＋ aria snapshot／tab order／responsive 1440–320 | PASS | 21 scans，0 violations |
| Preview density：5 URLs × 3 engines × 4 viewport/DPR，實際 element screenshot → ZXing | PASS | 60/60 |
| Userinfo／bare-text Open Link navigation probe（route 攔截） | PASS | 第 12 節 |
| `curl -sI` 自啟 preview | PASS | 四個 security headers 皆在 |

---

## 5. Automated Test Verification

### Test inventory

- `.only`／`.skip`／`.fixme`／`test.fail`／`expect.soft`／`grep`：**0 處**。`playwright.config.mjs` 未改：`retries: 0`、`workers: 1`、`fullyParallel: false`、timeout 60s，三個 projects，`reuseExistingServer: false`。package scripts 沒有 `|| true` 等容錯。
- Browser test 宣告：functional 7、quality 6（axe ×2 modes、corpus ×2 groups）、refinement 8（download-format ×2 samples）、security 1 → **25／engine**，與宣稱一致。

### 結果

| Gate | Result |
|---|---|
| Node | **34/34**（新 4 項：scheme-less、SVG matrix、JPG／WebP guard、M2 scheme-less） |
| Artifact | **4/4** |
| Chromium | **25/25** passed，retry 0 |
| Firefox | **25/25** passed，retry 0 |
| Playwright WebKit | **25/25** passed，retry 0 |
| Browser total | **75/75**（第 2 次單獨執行；第 1 次因審查者並行 probes 作廢，見第 4 節） |
| axe（產品 tests） | 每引擎 7 scans（encode 4 含展開 menu、decode 3），WCAG 2 A／AA、2.1 AA tags，**無 disableRules／exclude** |
| axe（本審查，全部預設 rules） | 7 states × 3 engines = **21 scans，0 violations**；只有 `aria-valid-attr-value`／`color-contrast` 在部分 state 為 *incomplete*（needs review：`aria-controls` 指向 hidden menu、canvas 上的文字背景），不是 violation |
| npm audit | 0 |
| Production deps | `jsqr@1.4.0`、`qrcode-generator@2.0.4`，無 transitive |

---

## 6. Scheme-less URL Audit

`normalizeUrl()`（`src/qr.ts:3`）流程：trim → raw C0／DEL／whitespace 拒絕 → `^[a-z][a-z\d+.-]*:` 偵測 scheme → 非 `http(s):` 一律拒絕（不補 HTTPS）→ 無 scheme 時要求 dotted host／`localhost`／`[` 開頭，且不得以 `/ \ ? #` 開頭 → 補 `https://` → WHATWG `URL` → protocol 與 `^https?://` 檢查 → hostname 字元檢查 → `href`。

### 自動補 HTTPS（PASS）

| Input | Output |
|---|---|
| `example.com` | `https://example.com/` |
| `www.example.com` | `https://www.example.com/` |
| `example.com/path` | `https://example.com/path` |
| `example.com/path?q=1` | `https://example.com/path?q=1` |
| `openai.com` | `https://openai.com/` |
| `例子.測試/採訪?q=😀` | `https://xn--fsqu00a.xn--g6w251d/%E6%8E%A1%E8%A8%AA?q=%F0%9F%98%80` |
| `http://example.com` / `https://example.com` | 保留原 scheme |

### 明確 unsafe schemes（PASS）

`javascript:`（含 `JavaScript:`／`JAVASCRIPT:`／`jAvAsCrIpT:`）、`data:`／`DATA:`、`file:`／`FILE:`、`blob:`、`mailto:`／`MailTo:`、`ws:`、`wss:`／`WSS:`、`ftp:`、`tel:`、`sms:`、`intent:`、`vbscript:`、`foo:bar` **全部拒絕**，訊息「只接受 http:// 或 https:// 網址。」。沒有任何 `https://javascript:…` 類 reinterpretation。`%6aavascript:alert(1)`、`javascript%3Aalert(1).com` 也被拒絕。

### Edge cases

| Input | 實際行為 | 判定 |
|---|---|---|
| `localhost`、`localhost/path` | `https://localhost/…` | 符合文件 |
| `127.0.0.1`、`[::1]`、`[::1]/p` | 補 HTTPS | 符合文件 |
| `localhost:3000`、`example.com:8080`、`www.example.com:8080` | **拒絕**（被解析為 scheme `localhost:`／`example.com:`），訊息「只接受 http:// 或 https:// 網址。」 | 安全；文件已說 port 需明確 scheme，但訊息誤導 → **m-3** |
| `127.0.0.1:8080`、`[::1]:8080` | **接受**（數字／括號開頭不構成 scheme） | 安全，但與上一列不一致 → **m-3** |
| `http:example.com`、`https:example.com`、`https:/example.com`、`https:\example.com` | 拒絕（「請檢查網址的格式與主機名稱。」） | PASS：有 scheme 的 malformed URL 不會被 reinterpret |
| `//example.com`、`\example.com`、`/example.com`、`?q`、`#frag` | 拒絕 | PASS |
| `example`、`一般文字`、`v1.0`、`xn--.com`、`[invalid]`、`[::1` | 拒絕 | PASS |
| `user:pass@example.com` | 拒絕（`user:` 被視為 scheme） | 安全 |
| `example.com@evil.test` | `https://example.com@evil.test/`（host = `evil.test`） | 既有 userinfo policy 延伸到裸輸入；完整顯示 → F-1 |
| `1.2`、`0x7f.1` | `https://1.0.0.2/`、`https://127.0.0.1/` | WHATWG IPv4 正規化；結果顯示在 input 與 canvas name |
| `hello.world`、`readme.md` | `https://hello.world/`、`https://readme.md/` | 依設計；F-4 |

結論：沒有 unsafe reinterpretation；拒絕是 fail-closed。

### M1／M2 一致性（PASS）

`src/decode.ts:30` 仍呼叫同一個 `normalizeUrl()`，沒有第二套 policy。因此 QR 內容 `example.com` 會解出 `https://example.com/`；`decode.test.mjs` 新測試與 browser Open Link 測試都明確覆蓋，README「兩模式共用 HTTP(S) URL validation … 裸網域 … 可省略 scheme」與之一致。危險 scheme 在 M2 一樣拒絕（Node test ＋ 三引擎 probe：`javascript:`、`data:`、`file:`、`blob:`、`mailto:` 均無 href、Copy disabled）。

---

## 7. Generated Result State Audit

`generated = { url, canvas, matrix }` 只在 Generate 成功時原子替換（`src/main.ts` generate handler）；input 事件只清錯誤、更新狀態文字。

| 情境（三引擎皆同） | 結果 |
|---|---|
| Generate A → 編輯草稿 B | canvas name 仍為 A；status「網址已修改，重新產生以更新 QR Code。」 |
| 下載 PNG／SVG／JPG／WebP | 4/4 ZXing 解出 **A** |
| 草稿改 `javascript:alert(1)` ＋ Enter | `#url-error`「只接受 http:// 或 https:// 網址。」、`aria-invalid=true`；A 保留，status 標示已修改；canvas name 仍為 A |
| 此時下載四格式 | 4/4 解出 **A** |
| Generate B | canvas name 變 B；四格式 4/4 解出 **B** |

Invalid draft 的 UI 同時顯示「錯誤」＋「網址已修改，重新產生以更新」＋ canvas 名稱 A，不會讓人把 A 誤認為 B 的結果。這是 UX 取捨，不是 correctness 問題。

### Stale export race（PNG／JPG／WebP × 三引擎，`toBlob` 延遲）

| Case | 結果 |
|---|---|
| A export pending → Generate B → A 完成 | **0 下載**；B 的 toggle 無 `aria-disabled`；無錯誤；canvas 為 B |
| A pending → Generate B → 開始 B export → A 先完成 | B 仍 busy（`aria-disabled=true`）；B 完成後下載 1 個，解出 **B** |
| A pending → 只編輯草稿 → 完成 | 下載 **A**（依 v1.1 設計） |
| A pending → 無效 Generate → 完成 | 下載 **A**（A 仍是顯示結果） |
| A pending → 以相同 URL 再按 Generate | 舊 export 被靜默捨棄（0 下載、無訊息）。結果物件已替換，屬安全方向；情境極窄，不列 finding |

SVG export 是同步字串 `Promise.resolve`，在兩次 user task 之間沒有可插入的 async 窗口。

---

## 8. QR Export Audit

108 個實際下載檔（Chromium／Firefox／WebKit 各 36：A-draft、A-invalid、B、short、unicode、medium、long、dense〔109 modules〕、inject；每種 × 4 格式），全部 `suggestedFilename` = `qr-code.{png,svg,jpg,webp}`，**ZXing-C++ 108/108 exact、EC M**。Quiet zone 以真實 modules 數計算（4 × scale 像素寬）。

### PNG

- Signature `89 50 4E 47 0D 0A 1A 0A`；MIME `image/png`（`exportPng()` 未改，含 null／empty／MIME guard）。
- 尺寸 `(modules+8) × ceil(1024/(modules+8))`：25→1056、37→1035、45→1060、65→1095、109→1053；正方形、整數 scale（32／23／20／15／9）。
- Quiet zone 全部 255；模組純黑白。
- Chunks：IHDR／IDAT／IEND；Firefox 另加 `deBG`（16 bytes 內容 hash），WebKit 加 `sBIT`／`iCCP`（Skia sRGB profile）。皆為瀏覽器 encoder 產生、不含 URL 或使用者資料，與 v1.0.0 audit 記錄相同。

### SVG

- 程式（`src/qr.ts:104`）只輸出 numeric geometry 與兩個固定顏色；**URL 不進入 markup**，函式甚至不接收 URL 參數。
- 108 中的 27 個 SVG 全部符合嚴格 regex：`<svg xmlns viewBox="0 0 N N" width=N height=N shape-rendering="crispEdges"><rect … fill="#fff"/><path d="(M\d+ \d+h1v1h-1z)*" fill="#000"/></svg>`。Tags 只有 `svg／rect／path`，attributes 只有 `d／fill／height／shape-rendering／viewBox／width`。
- 無 script、event attribute、`foreignObject`、`image`、`href`、`style`、metadata；inject 樣本（`<svg/onload=alert(1)>"'&%3Cscript%3E`）的 SVG 不含任何 payload 片段。
- 所有 dark cell 座標在 `[4, N−4)` → 四格白邊；以 Python（不經瀏覽器）獨立 rasterize 後 ZXing 解碼 27/27 exact。Node test 另逐格比對 EC M reference matrix。

### JPG

- Signature `FF D8 FF`；markers APP0（JFIF）[＋APP2 ICC]、DQT、SOF0、DHT、SOS；無 EXIF／COM。MIME `image/jpeg`（`exportQr()` 拒絕 mime 不符的 fallback）。
- 尺寸同 PNG；quiet zone 最低值 253–255，**< 250 的像素 0 個**。
- Quality 0.98：short／unicode／medium／long（65 modules）／dense（109 modules）三引擎皆 exact decode。實際品質足夠；README 仍建議文件使用 PNG／SVG，合理。

### WebP

- `RIFF….WEBP`，chunk `VP8 `（lossy）或 `VP8X`＋`ICCP`＋`VP8 `（WebKit）；**不是 PNG fallback**（三引擎實測 bytes，不只看 `Blob.type`）。
- 尺寸同 PNG；quiet zone 最低 251–255，< 250 的像素 0 個；三引擎 exact decode，包括 109 modules。
- Chromium、Firefox、Playwright WebKit 都真的支援 `toBlob('image/webp')`。

### Cross-format consistency

同一 generated result 的四格式在所有 9 情境 × 3 引擎都解出同一 URL；草稿 B 不影響；Generate B 後四格全部改為 B。

### Preview size

CSS 僅縮小（desktop `max-width: 240px`，≤640px 為 200px）；canvas intrinsic 尺寸與 export 尺寸不變（上表）。

---

## 9. Download Menu Audit

### Semantics（PASS）

Main `button "Download PNG"`；toggle `button "其他下載格式"`，`aria-haspopup=menu`、`aria-expanded`、`aria-controls=download-menu`；`div role=menu aria-label="下載格式"` 內三個原生 `button role=menuitem tabindex=-1`。三引擎 aria snapshot：關閉時 menu **不在 accessibility tree**；Tab 順序 main → toggle → 下一個控制項，menuitems 不在 tab order。

### Mouse（三引擎實際 `mouse.down/up`）

- 開啟 → 點 SVG／JPG／WebP（交錯重複 6 次）→ 每次都正確下載，menu 關閉，focus 回 toggle。
- Outside click 關閉（focus 到 body）。
- 選單在 1440–320 px 都在 viewport 內（320 px：x 37–283），`.workspace` 無 overflow clipping；1280×720 時選單延伸到 fold 附近，但頁面可捲動，不是 clipping。

### Keyboard（產品 test ＋ probe）

Enter／Space 開啟並 focus 第一項；ArrowDown／ArrowUp 循環、Home／End；toggle 上 ArrowUp 開到最後一項；Escape 關閉並回 toggle；Tab／Shift+Tab 關閉並正常離開（無 focus trap）；Enter 選項下載後 focus 回 toggle；busy 時 `aria-disabled` 保留焦點。

### Race／focus（`focusout.relatedTarget`）

Focus trace：Chromium／Firefox 點按鈕時 focus 移到按鈕，`relatedTarget` 為目的控制項。**Playwright WebKit 採 Safari 的 focus model**：未設 tabindex 的 `<button>` 按下時不取得 focus，focus 移到最近可 mouse-focus 的祖先（`tabindex=0` 的 `#encode-panel`）。

- Menuitems 因帶 `tabindex=-1` 在 WebKit 仍可 mouse-focus，所以滑鼠選格式**正常**（relatedTarget = menuitem）。這個修正不是只為 test framework 特化。
- 但 **toggle 沒有 tabindex**：在 WebKit 中選單開啟時再點 chevron，mousedown 讓 focus 從 menuitem 移到 `#encode-panel` → focusout 關閉 → click 又重新開啟。結果：**無法用再點 chevron 收合選單**（→ **m-1**）。Escape、outside click、選擇格式仍可關閉，不影響下載 correctness。

---

## 10. Drag & Drop Audit

- **共用 pipeline（PASS）**：file input `change` 與 zone `drop` 都只收集 `File[]` 後呼叫同一個 `readImage(files)`；state reset（generation++、清 value／Copy／Open Link／錯誤、焦點轉移）、單檔檢查、`decodeImage()` 全在同一函式，沒有分叉。
- 三引擎 probe：

| 動作 | 結果 |
|---|---|
| Valid PNG drop | 成功，Copy enabled，Open Link href = 結果 |
| Valid JPEG（900×700 灰底照片模擬） | 成功 |
| Corrupt PNG／text file／SVG file | 「無法讀取這張圖片…」，舊結果清除 |
| > 20 MiB | 「請選擇 20 MiB 以下的圖片。」 |
| 多檔 | 「請選擇一張圖片。」 |
| 非檔案（`text/plain` URL） | 「請選擇一張圖片。」，**不會**把拖入的文字當 URL |
| Drop 在 `<input type=file>` 上 | 只呼叫 1 次 `createImageBitmap`（zone 的 `preventDefault` 取消原生 input drop，不會雙重處理） |
| Drop 在 zone 以外（H1） | 不導航（URL 不變）、不解碼、既有結果不變 |
| drop→drop、drop→file、file→drop 交錯完成 | 產品 test：只保留最新結果，Copy／Open Link 對應最新 |

- **Drag UI（PASS）**：nested dragenter／dragleave 計數；drop 先 reset 再解碼，失敗後不殘留 highlight；`dragend` reset。`drag-active` 以 2px border＋17px padding 取代 1px＋18px，**不改變 layout**。可見文字「選擇圖片或拖曳到這裡」同時是 file input 的 label；鍵盤使用者直接操作 file input，不依賴 drag。

---

## 11. Decode Result / Copy Audit

- 成功：status「已找到網址」、readonly textarea 保留完整 normalized URL（host／path／query／fragment 不省略），可選取、可捲動；copy icon 固定 44×44，320 px 時 textarea 右緣 231、icon 左緣 239，**不重疊、不被擠壓**；695 字元 URL 在 320 px 無 horizontal overflow。
- 錯誤或新圖片：textarea 清空、Copy disabled、Open Link hidden 且 **`href` attribute 移除**；若焦點在 Copy／Open Link，移到 file input（三引擎確認 `activeElement = qr-image`）。
- Copy icon：原生 button、`aria-label="複製網址"`（`title` 只是輔助）、`:focus-visible` 3px outline、44×44。
- Clipboard（三引擎）：成功「網址已複製。」（Chromium 讀回剪貼簿內容一致）；rejection 與 API 不存在都顯示「無法複製網址，請在結果欄位手動選取並複製。」；pending 時 `aria-disabled=true`；pending Copy 期間換圖，舊 Copy 完成後不覆寫新結果的 status／error（stale guard 有效）。

---

## 12. Open Link Security Audit

| 問題 | 答案 | 證據 |
|---|---|---|
| href source | 只有 `readImage()` 的 `result.kind === 'success'` 分支設定 `openLink.href = result.url` | `src/main.ts` |
| Normalization | `result.url` 是 `decodePixels()` 回傳的 `normalizeUrl(payload)`；raw payload 從未進入 DOM／href | `src/decode.ts:30` |
| Schemes | 只有 `http:`／`https:`；`javascript:`、`data:`、`file:`、`blob:`、`mailto:` QR 在三引擎都無 href、hidden | 產品 test ＋ probe |
| Stale href removal | 每次 `readImage()` 一開始就 `hidden = true` 並 `removeAttribute('href')`，包括多檔／非檔案錯誤 | probe |
| Explicit activation | Source 沒有 `window.open`、`location` 指派，也沒有對 `#open-link` 呼叫 `click()`（唯一的程式化 `click()` 是 Enter → Generate 與暫時的 download anchor）；bundle 內無 `window.open` | grep source 與 dist |
| target／rel | `target="_blank"`、`rel="noopener noreferrer"`（靜態 HTML） | |
| opener | 三引擎 popup `window.opener === null` | probe |
| Referrer | 攔截到的 navigation request 無 `Referer`；popup `document.referrer === ""`（另有 `no-referrer` meta／header） | probe |
| No auto-open | Page load、decode success、Copy 後 popup 數為 0（產品 test 與三引擎 probe：未點擊前 0 個 navigation request）；source 對 `#open-link` 沒有任何 focus／keydown handler，只有原生 anchor 在 click／Enter 時導航 | 產品 test ＋ probe ＋ source |
| Display = navigation | `https://example.com:443@evil.test/`、`example.com@evil.test/login`、`readme.md` 三個 payload：textarea 值＝href＝popup URL；實際 host 為 parser 判定的 `evil.test`／`readme.md`，UI 沒有美化成 `example.com` | probe（route 攔截，無公共流量） |
| CSP | 未放寬；anchor navigation 不受 `connect-src` 影響，也不需要 | 第 14 節 |

Open Link 測試全部以 `context.route` 攔截回本機 fixture；href／target／rel 讀自產品 DOM，未被測試改寫。

---

## 13. Accessibility Audit

- **Semantics**：單一 H1「URL ↔ QR Code」；H2「QR Code 預覽」，沒有跳級；tablist／tabs／tabpanels 不變；URL input 有 label、`aria-describedby` 提示與錯誤；file input 以 drop-zone label 命名；結果 textarea 有 label；copy icon、toggle、menu、menuitems、Open Link 都有 accessible name；alert／status live regions 保留。
- **Keyboard**：第 9 節；decode tab order `tabpanel → file input → textarea → Copy → Open Link`。WebKit 預設不以 Tab 聚焦 link（Safari 需 Option+Tab），是平台設定，不是產品問題。
- **Focus**：copy icon、menuitems focus-visible 3px outline；menu 無 overflow 裁切 outline。
- **axe**：產品 7 scans／engine（含展開 menu）；本審查以全部預設 rules 21 scans，0 violations。
- **Responsive**：1440／1280／768／640×450（等效 200% reflow）／375／320，三引擎：`scrollWidth == innerWidth`、canvas 240／200 CSS px 正方形、menu 在 viewport 內、按鈕／link 高 ≥ 44、copy 44×44。目視 Chromium 320／1440 截圖：無 overlap、無 clipping、header 間距正常。
- **Screen reader**：**NOT VERIFIED**。axe 與 aria snapshot 不等於實際朗讀。

---

## 14. Security / Privacy Audit

- **CSP**：dist meta 為 `default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'none'; object-src 'none'`；served HTTP CSP 另有 `frame-ancestors 'none'`；`X-Content-Type-Options: nosniff`、`Referrer-Policy: no-referrer`、`Permissions-Policy: camera=(), microphone=(), geolocation=()` 皆在（`curl -sI` 與 artifact test）。SVG／WebP／dropdown／drag-drop／Open Link 都沒有導致放寬；`securitypolicyviolation` 三引擎 0 次。
- **Network**（三引擎，未按 Open Link）：Generate、PNG／SVG／JPG／WebP 下載、drop decode、file decode、Copy、多種錯誤 → 頁面載入後**新增 request 0**、failed 0、console 0、pageerror 0。
- **Storage**：localStorage／sessionStorage 0、`document.cookie` 空、context cookies 0、IndexedDB databases 0、CacheStorage keys 0、Service Worker registrations 0（三引擎）。
- **SVG injection**：不可能——`createQrSvg(matrix)` 不接收 URL，只有整數與固定色；27 個 SVG 通過嚴格 grammar。
- **DOM injection**：`src/`／`index.html` 無 `innerHTML`／`outerHTML`／`insertAdjacentHTML`／`document.write`／`eval`／`new Function`／`setAttribute('href'`／`window.open`／`location` 指派／`srcdoc`；production bundle（含第三方 library）也沒有 `innerHTML`／`insertAdjacentHTML`／`document.write`／`eval(`／`new Function`／`window.open`／`sourceMappingURL`。Decoded URL 只經 `textarea.value`、`anchor.href` property；canvas 名稱用 `setAttribute('aria-label', …)`（文字 attribute，非 markup）。
- **Navigation boundary**：只有使用者點擊 Open Link 才 navigation；README 把它與本地處理清楚區分。
- **Dependencies**：沒有為 icons／menu／SVG／JPEG／WebP／drag-drop 增加 runtime package；icon 為 inline SVG。

---

## 15. v1.0.1 Regression Audit

| Protection | 方法 | 結果 |
|---|---|---|
| HTTP(S) safety、raw control／whitespace、hostname 字元 | source diff ＋ 84-input probe ＋ Node tests | 保留（新增補 HTTPS 分支在所有檢查之前，且僅限無 scheme） |
| Unicode → punycode／percent-encoding、ASCII-only encoder guard | Node tests ＋ unicode 樣本 ZXing | 保留 |
| QR matrix、EC M | `createQrMatrix()` 與 reference 逐格一致；ZXing EC = M | 保留 |
| Quiet zone、整數 modules、≥1024 PNG | 108 檔分析 | 保留 |
| Stale export | race probe（語意依規格改為 Generate 失效） | 保留 |
| jsQR、fatal per-segment UTF-8、raw control rejection | `decode.ts` byte-identical ＋ 既有 tests 通過 | 保留 |
| 20 MiB、768 → 2048、cleanup | 同上 ＋ oversize drop probe | 保留 |
| Stale decode、stale Copy、clipboard failure | 產品 tests ＋ probe | 保留 |

---

## 16. Artifact / Documentation Audit

- **dist**：`index.html`、`assets/index-Un4EjKft.js`、`assets/index-DCVimks5.css`、`favicon.svg`、`THIRD_PARTY_NOTICES.txt`、`_headers`，沒有其他檔案（無 tests／fixtures／reports／screenshots／source maps／scratch／audit prompt）。Build 可重現（SHA-256 相同）。
- **Headers／notices／LF**：`_headers` tracked／checkout／dist 皆 LF（`.gitattributes eol=lf`，0 個 CR）；notices 未變；artifact test 4/4。
- **README**：正確描述可省略 `https://`、四種格式、drag／drop、Open Link（主動點擊、新分頁、noopener noreferrer、先確認網址）、本地處理邊界（產生、解析、四種下載、複製不發 request）與 Open Link 是外部 navigation、userinfo 行為、限制（小預覽高密度）。沒有舊 slogan／footer、「只能 PNG」、「必須輸入 http/https」或「永不 navigation」等過度宣稱。可補充：含 port 規則（m-3）。
- **CHANGELOG 1.1.0**：6 條都是真實產品變更，沒有把 test 數量寫成 feature。
- **RELEASE_CHECKLIST**：candidate gates 與 9 項 manual（NOT VERIFIED）清楚；screen reader walkthrough 已更新到新控制項。建立 tag 時需把標題從「candidate」更新並記錄 tag，這是 release 流程，不是 finding。
- **首頁文案**：H1 以外只剩操作必要文字（URL label、「可省略 https://」、產生按鈕、預覽標題、狀態、下載、選圖／拖曳 label、「一次一張，最大 20 MiB」、結果 label、錯誤訊息）。精簡後仍足以理解操作。

---

## 17. Findings

### Blocker

無。

### Important

無。

### Minor

#### m-1 — WebKit／Safari focus model 下，再點 chevron 無法收合下載選單

- **Severity**：Minor（互動細節；不影響任何下載 correctness）
- **Evidence**：Playwright WebKit 事件序列：menu 開啟、focus 在 SVG item → 點 toggle：`focusout svg → encode-panel`（menu 關閉）→ `click` → `openDownloadMenu()` 重新開啟。Chromium／Firefox 同操作會關閉。WebKit 中 `<button>` 未設 tabindex 時不會因滑鼠取得 focus；menuitems 因 `tabindex=-1` 不受影響，所以格式選擇正常。
- **Why it matters**：Safari（macOS／iOS）使用者以再點 chevron 關閉選單時會看到選單閃一下又打開；需改用 Escape、點外面或選項。
- **Reproduction**：WebKit 開頁 → 產生 QR → 點 ▾ → 再點 ▾ → 選單仍開啟。
- **Recommended action（1.1.x）**：讓 toggle 可 mouse-focus（例如 `tabindex="0"`，與 menuitems 同一原理），或在 toggle 的 `pointerdown` 記錄「點擊前是否開啟」並在 click 時依此切換；補一個 WebKit 專用 regression。實際 Safari 仍需人工確認。

#### m-2 — Enter 產生只排除 `isComposing`，未排除 Safari 的 IME `keyCode 229`（PLAUSIBLE）

- **Severity**：Minor
- **Evidence**：`src/main.ts` URL input keydown：`if (event.key === 'Enter' && !event.isComposing)`。三引擎合成事件：`isComposing: true` → 不產生（PASS）；`keyCode: 229, isComposing: false` → 會產生。Safari 已知在確認 IME 選字的 Enter 時先送 `compositionend`，再送 `isComposing=false`、`keyCode=229` 的 keydown。
- **Why it matters**：在 Safari 用注音／拼音輸入中文網址或路徑時，按 Enter 確認選字可能直接觸發 Generate。產生的是畫面上可見、已驗證的內容，不會錯誤或不安全，只是提早產生。
- **Reproduction**：真實 Safari ＋ 中文 IME，在 URL 欄輸入 `例子.測試`，按 Enter 選字。（未在真機驗證）
- **Recommended action**：條件加上 `event.keyCode !== 229`；列入 real Safari 手動檢查。

#### m-3 — 裸 `host:port` 的接受規則與錯誤訊息不一致

- **Severity**：Minor（UX／文件；不安全面向為 fail-closed）
- **Evidence**：`127.0.0.1:8080`、`[::1]:8080` 會補 HTTPS 並接受；`localhost:3000`、`example.com:8080` 會被 scheme regex 當作 scheme `localhost:`／`example.com:` 而拒絕，訊息「只接受 http:// 或 https:// 網址。」——使用者並未輸入 scheme。README 說「含 port 的網址請明確輸入 HTTP(S) scheme」，但 IPv4／IPv6 例外沒有說明。
- **Why it matters**：開發者常見輸入 `localhost:3000` 會得到看似不相關的錯誤；行為與文件不完全一致。沒有危險 reinterpretation。
- **Reproduction**：輸入 `localhost:3000` → 產生。
- **Recommended action**：對 `^[^:/?#]+:\d+` 類輸入給專屬提示（例如「含連接埠請輸入 http://localhost:3000」），或統一規則並在 README 說明。

### Manual / Environment

9 項 NOT VERIFIED：real phone scan、real Android、real Safari（macOS／iOS）、real printed scan、real camera photo、screen reader（NVDA／Narrator／VoiceOver）、native 200% browser zoom、hosted HTTPS／response headers、deployed subdirectory。詳見第 18 節。

### Future

- **F-1 URL userinfo（沿用，關注度提高）**：v1.0.1 時「App 不產生可點連結」，現在有 Open Link，且裸輸入 `example.com@evil.test` 也會變成 `https://example.com@evil.test/`。本審查確認顯示值＝href＝實際 navigation、host 為 parser 判定值，UI 沒有誤導性美化，所以**不是 v1.1.0 release issue**。未來可考慮拒絕含 userinfo 的 URL，或在結果中突顯實際 host。
- **F-2 Worker／OffscreenCanvas**：沒有新證據，不變。
- **F-3 Project LICENSE**：仍由使用者決定。
- **F-4 Decode 端裸網域自動補 HTTPS 的提示**：QR 內容若是純文字 `readme.md`／`hello.world`，會解成 `https://readme.md/` 並提供 Open Link。這是共用 normalization 的預期結果，文件與 tests 一致；未來可在結果標示「已自動補上 https://」，讓使用者知道原始內容沒有 scheme。

### Observations（不列 finding）

- 以相同 URL 在 export pending 時再按 Generate，舊 export 會被靜默捨棄（0 下載、無訊息）。屬安全方向、情境極窄。
- Firefox／WebKit PNG 的 ancillary chunks 由瀏覽器加入，不含使用者資料（v1.0.0 audit 已記錄）。
- axe `incomplete`（needs review）：`aria-valid-attr-value`（`aria-controls` 指向 hidden menu）、`color-contrast`（canvas 附近文字），均非 violation。

---

## 18. Remaining Manual Checks

| Item | Status | Required before release? | Note |
|---|---|---|---|
| Real phone scan | NOT VERIFIED | **建議在公開宣傳前**；不阻擋 tag | 畫面 240／200 px 預覽及四格式下載；本審查 ZXing 已從實際 element screenshot 解出 ~330 字元 URL（65 modules, 2.7 CSS px/module） |
| Real Android | NOT VERIFIED | 否（tag）／是（公開使用前） | drag-drop 不適用；選圖、四格式下載、Copy、Open Link |
| Real Safari macOS／iOS | NOT VERIFIED | 否（tag）／是 | 特別確認 m-1（chevron 收合）、m-2（IME Enter）、WebP 下載、Open Link opener |
| Real printed scan | NOT VERIFIED | 否 | PNG／SVG 插入文件 → PDF → 列印 |
| Real camera photo | NOT VERIFIED | 否 | |
| Screen reader | NOT VERIFIED | 否（tag）／建議 | 依 checklist walkthrough，重點是 split button／menu、copy icon、Open Link |
| Native 200% zoom | NOT VERIFIED | 否 | 自動化只驗證 640 px 等效 reflow |
| Hosted HTTPS／headers | NOT VERIFIED | 部署時必須 | `_headers` 需由主機套用 |
| Deployed subdirectory | NOT VERIFIED | 若使用子目錄則必須 | 相對 asset path 已由 `base: './'` 支援 |

---

## 19. Release Readiness

### Must fix before v1.1.0 tag

No software-side must-fix issue found before creating the v1.1.0 release tag.

m-1／m-2／m-3 可在 1.1.x patch 處理。

### Can create v1.1.0 tag?

**YES WITH MANUAL CHECKS** — 9 項實機／部署檢查仍為 NOT VERIFIED；公開部署與實際使用前應完成適用項目，特別是 real phone scan 與 real Safari。

---

## 20. Final Verdict

### v1.1.0 candidate

**PASS WITH NOTE**

### Release tag readiness

**READY WITH MANUAL CHECKS**

新功能正確：scheme-less parsing 不產生危險 reinterpretation、M1／M2 共用同一 policy；四種格式在三引擎都可靠、payload 經獨立 decoder 驗證；draft／generated 分離與 stale export 保護正確；drag／drop 與選檔共用 pipeline；Open Link 只使用驗證後 URL、無 opener／Referer、不自動開啟；CSP、headers、storage、network 與 dependencies 沒有 regression；v1.0.1 的 correctness／security／privacy baseline 保留。剩下 3 個 Minor 互動細節與 9 項人工檢查。

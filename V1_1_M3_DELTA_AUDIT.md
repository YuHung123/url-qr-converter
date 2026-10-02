# URL QR Converter v1.1.0 — m-3 + WebKit Delta Audit

審查日期：2026-10-02。HEAD：`523dc4f99b2d913812d3799a6d27dd7342ebefc2`。Review only：未修改任何 product source／tests／README／既有 audit 文件，未 commit／push／tag／release／deploy。唯一新增檔案是本報告。

---

## 1. Executive Summary

| Severity | Count |
|---|---:|
| Blocker | 0 |
| Important | 0 |
| Minor | 1（文件陳舊：`V1_1_VERIFICATION.md` 第 23 行） |
| Manual / Environment | 沿用 RC audit 的 9 項（未變） |
| Future | 0 新增（F-1～F-4 沿用） |

- **m-3：CLOSED**
- **WebKit required gate：CLEARED**（歷史 exact root cause 仍為 NOT PROVEN，保留為 NOTE）

---

## 2. Original m-3

出處：`V1_1_RC_AUDIT.md` §17 Minor「m-3 — 裸 `host:port` 的接受規則與錯誤訊息不一致」。

- **Severity**：Minor（UX／文件；安全面向為 fail-closed）。
- **原 finding**：`127.0.0.1:8080`、`[::1]:8080` 會補 HTTPS 並接受；`localhost:3000`、`example.com:8080` 被 scheme regex 當成 scheme `localhost:`／`example.com:` 而拒絕，訊息「只接受 http:// 或 https:// 網址。」，但使用者並未輸入 scheme。README 只說含 port 要明確 scheme，未說明 IPv4／IPv6 例外。
- **Reproduction**：輸入 `localhost:3000` → 產生。
- **原建議**：對 `host:port` 類輸入給專屬提示，或統一規則並在 README 說明。
- **影響**：開發者最常見輸入被拒、訊息誤導；無危險 reinterpretation。

（注意：RC audit 原本即是 Minor，且明確寫「可在 1.1.x patch 處理」。本次修正是提前處理，不是 release blocker 補救。）

---

## 3. Current Delta

`git diff`：5 檔、+68／−4。`git diff --check` exit 0。

| File | 用途 | Scope creep? |
|---|---|---|
| `src/qr.ts`（+5／−2） | `normalizeUrl()` 新增 `isLocalhost` 判斷，並調整 scheme 偵測與 naked-host 檢查 | 否 |
| `README.md`（1 行） | 說明 `localhost`／IPv4／括號 IPv6 含有效 port 可省略 scheme，其他網域含 port 仍要明確 scheme | 否 |
| `tests/qr.test.mjs`（+29） | 3 個新 Node tests：正向、port 負向、安全邊界 | 否 |
| `tests/decode.test.mjs`（±1 行） | 既有 scheme-less QR round-trip 清單加入 `localhost:3000`、`localhost:8080/path`、`127.0.0.1:8080` | 否 |
| `tests/browser/refinement.spec.mjs`（+32，0 刪除） | 新增 1 個 browser regression | 否 |

額外核對（相對 HEAD 皆無 diff）：`package.json`、`package-lock.json`、`playwright.config.mjs`、`src/main.ts`、`src/decode.ts`、`index.html`、`public/`、`tests/browser/quality.spec.mjs`。因此：m-1（chevron）、m-2（IME keyCode 229）未被碰觸；無 CSP／header 修改；無 dependency 修改；無 decoder pipeline、export、Open Link 政策修改；無 timeout／retry／skip 修改。

未 commit 的 untracked：`V1_1_RC_AUDIT.md`、`V1_1_WEBKIT_TIMEOUT_INVESTIGATION.md`（與本報告）。

---

## 4. m-3 Root Cause Review

- **Root cause 成立**：原 `hasScheme = /^[a-z][a-z\d+.-]*:/i` 會把 `localhost:` 視為 scheme，在 hostname normalization 之前就以「只接受 http(s)」拒絕。`127.0.0.1:` 因數字開頭不符 scheme 語法，一向進入 scheme-less 流程。我以 HEAD 版本的 `qr.ts` 重跑 probe 驗證：`localhost:3000`／`LOCALHOST:3000`／`localhost:1` 等全部被拒，`127.0.0.1:8080` 被接受，與 RC audit 敘述一致。
- **Fix**：`isLocalhost = /^localhost(?::\d+)?(?:[/?#]|$)/i`，`hasScheme = !isLocalhost && <原 scheme regex>`；naked-host 檢查改為 `!isLocalhost && !/^(?:[^/?#]+\.[^/?#]+|\[)/u`。
- **Narrowly scoped**：例外只對字面 `localhost`（大小寫不拘）＋純數字 port，且之後必須緊接 `/`、`?`、`#` 或字串結尾。`localhostx:3000`、`localhost-evil:3000`、`localhost:abc`、`localhost:12x`、`localhost:3000@evil.test`、`localhost:pw@evil.test`、`localhost.:3000` 全部仍落入原 scheme 偵測並被拒。
- **Explicit-scheme 偵測保留**：非 localhost 的所有輸入完全走原 regex；`foo:bar`、`abc:3000`、`custom:3000` 仍拒絕。
- **沒有自製 port parser**：regex 只負責「是否為 localhost 形式」，port 範圍與規範化（`:443` → 省略、`:00080` → `:80`）完全由 WHATWG `URL` 決定。
- 細節：naked-host 的 regex 原帶 `i` flag 以涵蓋 `localhost`，移除 `localhost` 後該 flag 已無作用，移除無影響。

結論：**未破壞 explicit-scheme safety model**。

---

## 5. URL Normalization Results

我用 `node --experimental-strip-types` 直接 import 工作樹 `src/qr.ts` 實測（並以 HEAD 版本對照 before/after）。

| Input | Expected policy | Actual（working tree） | HEAD（修前） | Result |
|---|---|---|---|---|
| `localhost` | 補 HTTPS | `https://localhost/` | 同 | PASS |
| `localhost/path` | 補 HTTPS | `https://localhost/path` | 同 | PASS |
| `localhost:3000` | 補 HTTPS | `https://localhost:3000/` | 拒絕 | PASS（fixed） |
| `localhost:8080/path` | 補 HTTPS | `https://localhost:8080/path` | 拒絕 | PASS |
| `localhost:8080/path?q=1#x` | 補 HTTPS | `https://localhost:8080/path?q=1#x` | 拒絕 | PASS |
| `LOCALHOST:3000`、`LocalHost:8080/path` | 補 HTTPS，host 小寫 | `https://localhost:3000/`、`https://localhost:8080/path` | 拒絕 | PASS |
| `127.0.0.1`／`:8080`／`:65535` | 補 HTTPS | `https://127.0.0.1/`、`:8080/`、`:65535/` | 同 | PASS |
| `[::1]:8080` | 補 HTTPS | `https://[::1]:8080/` | 同 | PASS |
| `example.com`、`example.com/path` | 補 HTTPS | `https://example.com/`、`…/path` | 同 | PASS |
| `example.com:8080`、`www.example.com:8080` | 維持拒絕（README 已寫） | 拒絕 | 拒絕 | PASS（as documented） |
| `http://localhost:3000`、`https://localhost:3000`、`HTTP://LOCALHOST:3000` | 保留 explicit scheme | `http://localhost:3000/`、`https://localhost:3000/`、`http://localhost:3000/` | 同 | PASS |
| `localhost:1`／`:80`／`:65535` | 接受 | `:1`／`:80`／`:65535` | 拒絕 | PASS |
| `localhost:443` | URL parser 預設 port | `https://localhost/` | 拒絕 | PASS（標準行為） |
| `localhost:00080` | URL parser 規範化 | `https://localhost:80/` | 拒絕 | PASS（標準行為） |
| `localhost:0` | 由 URL parser 決定 | `https://localhost:0/`（WHATWG 接受 port 0） | 拒絕 | PASS，見 §13 備註；與既有 `127.0.0.1:0` 行為一致 |
| `localhost:65536`、`localhost:99999/path` | 拒絕 | 拒絕（URL parser） | 拒絕 | PASS |
| `localhost:-1`、`localhost:abc`、`localhost:12x`、`localhost:`、`localhost::3000`、`localhost:3000:1`、`localhost.:3000` | 拒絕 | 全部拒絕 | 拒絕 | PASS |
| `javascript:alert(1)`、`JAVASCRIPT:alert(1)`、`Data:text/plain,test`、`data:text/plain,test` | 拒絕 | 全部拒絕 | 拒絕 | PASS |
| `file:///tmp/test`、`blob:https://example.com/id`、`mailto:test@example.com`、`ws://example.com`、`wss://example.com` | 拒絕 | 全部拒絕 | 拒絕 | PASS |
| `foo:bar`、`abc:def`、`custom:3000`、`abc:3000`、`abc:3000/path`、`localhostx:3000`、`localhost-evil:3000`、`javascript:3000`、`JavaScript:localhost:3000` | 拒絕、不補 HTTPS、不當 localhost | 全部拒絕 | 拒絕 | PASS |
| `localhost:3000@evil.test`、`localhost:pw@evil.test` | 拒絕（不得被視為 localhost host） | 拒絕 | 拒絕 | PASS |
| `abc`、`hello`、`hello world`、`localhost3000` | 拒絕 | 全部拒絕（無 `https://abc/`） | 拒絕 | PASS |
| `localhost:3000/javascript:alert(1)` | path 內含 `javascript:` 是一般 path | `https://localhost:3000/javascript:alert(1)` | 拒絕 | PASS（host 為 localhost，無 reinterpretation） |
| `localhost@evil.test` | 既有 userinfo policy（F-1） | `https://localhost@evil.test/` | 同 | 未變動（HEAD 相同） |

沒有任何「alphabetic-string:number」被當作 host:port；例外只對字面 `localhost`。

---

## 6. M1 / M2 Consistency

- `src/decode.ts` 與 `src/main.ts` 對 HEAD 無 diff；decode 仍呼叫同一個 `normalizeUrl()`，沒有第二套 policy。
- Generate：`localhost:3000` → input 回填 `https://localhost:3000/`、canvas accessible name 為該 URL。
- Decode：QR payload `localhost:3000`、`localhost:8080/path`、`127.0.0.1:8080` 皆解出 `https://…`（`decode.test.mjs` 以 `byteQrPixels` 產生 raw payload；browser 測試則用 `qrFile` 產生 raw scheme-less payload，以及 Generate 產出的 PNG round-trip）。
- 兩端結果一致，沒有「Generate 接受／Decode 拒絕」的 divergence。

---

## 7. Open Link Security Regression

由 browser regression（三引擎皆通過）與既有測試覆蓋：

- **normalized href**：Open Link `href` 與結果文字完全相同（`https://localhost:3000/`、`https://localhost:8080/path`）。
- **target／rel**：`_blank`、`noopener noreferrer`。
- **no auto-open**：decode 成功後 `popups` 長度為 0；僅在明確 click 後才出現 1 個 popup。
- **navigation 實際目標**：以 `context.route('https://localhost:8080/**')` 攔截，只看到 `https://localhost:8080/path`，`Referer` 為 undefined，popup 內 `window.opener === null`。沒有任何對外網路請求。
- **unsafe／custom scheme**：`refinement.spec.mjs:258` 的 loop 與 `decode.test.mjs:143` 對 `javascript:`／`data:`／`file:`／`blob:`／`mailto:`／`ws://` 仍拒絕且無 href，這些測試相對 HEAD 未改動並全數通過。
- Open Link 的程式碼（`main.ts`）沒有任何修改，政策未放寬。

---

## 8. Regression Tests

| Layer | 內容 | 評估 |
|---|---|---|
| Node `qr.test.mjs` | 正向 12 筆（含 case-insensitive、path／query／fragment、`:443` 規範化、`:65535`、explicit http/https、`127.0.0.1:8080`）；port 負向 8 筆（`65536`、`99999/path`、`abc`、`3000abc/path`、`-1`、`3.5`、`3000:8080`、`3000\path`）；安全邊界 11 筆（`javascript:`、`data:`、`file:`、`custom:3000`、`abc`、`abc:3000`、`Hello World`、`一般文字`、`localhostevil:3000`、userinfo 兩種） | 好。斷言輸出完整 normalized URL 而非 implementation detail；負向測試明確卡住「不得變成 `alphabetic:number` → host:port」 |
| Node `decode.test.mjs` | 既有 loop 增加 3 筆 raw payload，同一 loop 已斷言 `https://${input}` 結果 | 小而精準；dangerous scheme 的拒絕 loop 保持不動 |
| Browser `refinement.spec.mjs` | Generate（input 回填、canvas name）→ PNG round-trip decode → raw scheme-less QR decode → Open Link href／target／rel／no auto-open → route 攔截 navigation／referer／opener | 好；覆蓋 Generate、round-trip、Open Link 三條路徑 |

**會在修前失敗？** 我把 HEAD 的 `src/qr.ts` 放入 scratchpad 的專案副本，並搭配新 tests 執行：37 tests 中 2 個失敗——`scheme-less localhost ports normalize…`（正向）與 `scheme-less QR URLs share…`（decode round-trip）；其他 35 個（含負向／安全邊界）通過。這正是預期：正向 tests 防止回歸，負向 tests 在修前也應通過、修後仍須通過，作為安全護欄。Browser 測試修前必然在第一次 `encode(page, 'localhost:3000')` 失敗（輸入被拒，URL 不會回填），未另行重跑。**修後：37/37 PASS。**

輕微重複：browser 測試與 Node tests 都驗證同一 normalization，但 browser 版本是驗 UI 接線與 Open Link，不算無意義重複。不要求增加 cases。

---

## 9. WebKit Timeout Evidence Review

- **歷史 failure**：WebKit 24/26、rerun 25/26，`quality.spec.mjs:60` responsive test 兩輪耗盡 60 秒（使用者提供的歷史）。
- **原始 trace／log 缺失**：`/tmp/url-qr-m3-webkit-rerun.log` 不存在；調查報告明確標示 last operation、pending locator 等為 UNKNOWN，沒有推測。
- **目前 targeted**：調查報告三次連續 PASS（11.7–15.4 s）；我自行再跑一次 WebKit responsive：**PASS，13.6 s**。
- **目前 full suite**：調查報告 WebKit 26/26 及兩輪 78/78；我自行再跑一輪完整三引擎：**78/78 PASS**（230.999 s）；responsive：Chromium 6.9 s、Firefox 6.4 s、WebKit 13.5 s，皆遠低於 60 s。
- **Root cause**：**historical root cause not proven**。調查報告維持了證據邊界：沒有聲稱 memory pressure、特定 locator、screenshot 或產品 bug；明確寫 undetermined，且未聲稱已修復。
- **目前 gate**：**current required gate passes**。

這兩者是不同命題：前者 NOT PROVEN（保留為 NOTE），後者已獨立重現驗證。依你的指示，不以未重現的歷史問題作永久 blocker。

另：調查報告指出 WebKit 響應 test 約 11 s（本次我量到 13.5–13.6 s，在同一量級、離 60 s 上限仍有約 4.5 倍餘裕）。報告中「約 11 秒」是它自己的測量，我的量測略高但結論不變。

---

## 10. Test Standard Integrity

我直接檢查 `git diff HEAD` 與 source：

| Item | Result |
|---|---|
| timeout changed? | **No**。`playwright.config.mjs` 與 HEAD 無 diff，仍為 `timeout: 60_000`；`quality.spec.mjs` 與 HEAD 無 diff（其內 `test.setTimeout(120_000)` 是 HEAD 既有的 corpus test） |
| retries changed? | **No**。仍 `retries: 0`、`workers: 1`；本輪我另以 `--retries=0` 執行，78 個 results 全部 retry 0 |
| skips? | **No**。`tests/browser`、config 內無 `.skip`／`.only`／`.fixme`／`test.fail`／`expect.soft`／`waitForTimeout`／axe `disableRules`／`.exclude(`（grep 僅命中 `.skip-link` 這個 CSS selector） |
| assertions removed? | **No**。`refinement.spec.mjs` diff 為 +32／−0；`decode.test.mjs` 只是在清單中增加輸入；`quality.spec.mjs` 未改 |
| viewport coverage removed? | **No**。HEAD 版 `quality.spec.mjs` 的 viewport loop、640×450 的 200% reflow、10 張 screenshots 都仍存在（該檔未動） |
| WebKit special weakening? | **No**。三個 project 使用同一份 specs，config 無 browser-specific 設定 |

> **WebKit PASS was obtained without weakening the required browser gate.**

---

## 11. Current Gate Status

| Gate | Result | 來源 |
|---|---|---|
| `npm test` | PASS 37/37（0 fail／cancelled／skipped／todo） | 我自行執行 |
| 修前 HEAD `qr.ts` + 新 tests | 2 fail／35 pass（回歸測試有效） | 我自行執行（scratch） |
| `npm run typecheck` | PASS | 我自行執行 |
| `npm run build` | PASS | 我自行執行 |
| `npm run test:artifact` | PASS 4/4 | 我自行執行 |
| m-3 browser regression | PASS 3/3（Chromium 1.3 s／Firefox 4.4 s／WebKit 2.7 s） | 我自行執行 |
| WebKit responsive targeted | PASS 13.6 s | 我自行執行 |
| 完整三引擎 `playwright test` | PASS 78/78（各 26）；skipped 0／unexpected 0／flaky 0；retry 0 | 我自行執行並逐一核對 JSON |
| `npm audit` | 0 vulnerabilities | 我自行執行 |
| 生產依賴 | 只有 `jsqr@1.4.0`、`qrcode-generator@2.0.4`；manifest／lockfile 與 HEAD 無 diff | 我自行執行 |
| `git diff --check` | PASS | 我自行執行 |
| Axe | 每次完整 run 21 scans（每引擎 7 × 3）；`quality.spec.mjs` 與 HEAD 無 diff；見下 | 調查報告＋source 核對（我的全量 run 通過所有 axe 斷言） |

**Axe 28 vs 21**：`quality.spec.mjs`、`functional.spec.mjs`、`helpers.mjs`、`security.spec.mjs` 相對 HEAD 皆無 diff，而 axe 只出現在 `quality.spec.mjs`（2 處 `AxeBuilder`）。沒有任何 test coverage 變更，故不列 finding；歷史 28 的額外 7 次來源無法由失去的 log 確認，與 RC audit 當時測得的「7 states × 3 engines = 21」一致。

---

## 12. Git Integrity

| Item | State |
|---|---|
| HEAD | `523dc4f99b2d913812d3799a6d27dd7342ebefc2`（未變；branch `main`，僅「ahead 1」＝本地 commit 尚未 push，無新 push） |
| Modified | `README.md`、`src/qr.ts`、`tests/browser/refinement.spec.mjs`、`tests/decode.test.mjs`、`tests/qr.test.mjs` |
| Untracked | `V1_1_RC_AUDIT.md`、`V1_1_WEBKIT_TIMEOUT_INVESTIGATION.md`（以及本報告） |
| Staged | 無 |
| RC audit integrity | SHA-256 `2200f27614a75cba30a1cdd06c8432415918f28718f7ce614f849c69d783279a`，與調查報告所列值一致 |
| Tags | 只有 `v1.0.0`（object `0c41a74f…` → `47600c5`）、`v1.0.1`（object `1e5f1134…` → `214cea3`），與 RC audit §Git 記載完全一致；無 `v1.1*` tag |
| Commit／push／release／deploy | 本審查均未執行；`dist/`、`test-results/` 為 ignored 產物，已被我重新 build／執行覆寫 |

---

## 13. Findings

### Blocker

None.

### Important

None.

### Minor

**mn-1 — `V1_1_VERIFICATION.md` 第 23 行與 m-3 修正後的行為不同**

- 該 tracked 文件寫：「含 port 的網址建議明確輸入 HTTP(S)，避免將 RFC scheme syntax 誤認為網址」。m-3 修正後 `localhost`／IPv4／括號 IPv6 含 port 可省略 scheme。
- 影響：不影響產品、README 或 CHANGELOG（README 已正確更新）；這是 commit 時點的歷史驗證紀錄，內容在其當時為真。僅在日後有人以它為現行規則時會誤導。
- 建議：不需阻擋 commit；可在 commit 後的下一次文件整理中加註，或在 v1.1.0 release notes 中視為歷史紀錄。我沒有修改它（本次 review only）。

備註（非 finding）：`localhost:0` 被接受為 `https://localhost:0/`，這是 WHATWG URL parser 的標準行為，且與 HEAD 既有的 `127.0.0.1:0` 一致；符合「port 驗證交由既有 URL parser」的原則，不屬 m-3 引入的不一致。

### Manual / Environment

沿用 RC audit §18 的 9 項（real phone、real Android、real Safari、printed scan、camera photo、screen reader、native 200% zoom、hosted HTTPS／headers、deployed subdirectory）；本 delta 未使其變化。m-1／m-2 維持原分類（Minor，未被處理，仍屬 real Safari 手動檢查項）。

### Future

None（新增）。F-1 userinfo、F-2 Worker、F-3 LICENSE、F-4 decode 端提示維持不變；本 delta 沒有使其惡化。

---

## 14. Release-Process Decision

### A. Can the current delta be committed?

**YES**

### B. After that commit, can the project proceed to v1.1.0 release-tag preparation?

**YES WITH MANUAL CHECKS**（software-side 無 must-fix；9 項實機／部署檢查仍為 NOT VERIFIED，與 RC audit 結論相同）

---

## 15. Final Verdict

### m-3
- **CLOSED**

### WebKit required gate
- **CLEARED**

### Delta review
- **PASS WITH NOTE**（NOTE：歷史 WebKit timeout exact root cause 未證明、目前不可重現；另有 mn-1 文件陳舊一項）

### Release preparation
- **READY WITH MANUAL CHECKS**

No software-side must-fix issue remains in this delta before committing the m-3 fix and proceeding to v1.1.0 release-tag preparation.

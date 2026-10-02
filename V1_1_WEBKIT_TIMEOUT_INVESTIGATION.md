# URL QR Converter v1.1.0 — WebKit Timeout Investigation

調查日期：2026-10-02（Asia/Taipei）。HEAD：`523dc4f99b2d913812d3799a6d27dd7342ebefc2`。
範圍：WebKit responsive timeout 調查與本機 gates；保留開始時未 commit 的 m-3 修改。

## 1. Executive Summary

**READY_FOR_REVIEW（依使用者更新後的完成標準）；歷史 timeout 的 exact root cause 尚未證明。** 原 responsive test 三次單獨執行全部通過，完整 WebKit suite 26/26 通過，兩輪完整三引擎 browser gate 都是 78/78 PASS，其他 required gates 全 PASS。沒有對產品、tests、config 或 timeout 作任何修正，不能把這些 PASS 宣稱為已找出並修復根因。

指定的 `/tmp/url-qr-m3-webkit-rerun.log` 在本次環境不存在。現存 `test-results/results.json` 是另一輪成功結果，不是指定的 failing run；原失敗 trace／error context 也未取得。因此無法重建歷史 timeout 前最後一個成功 step，也無法確定它是產品行為、測試結構或環境問題。

目前觀察不到產品卡住、錯誤 locator、screenshot 卡住或 teardown 卡住。量測沒有支持「單一 test 的正常工作量超過 60 秒」，因此沒有在缺少證據時拆分 test。使用者後續明確授權：若歷史 timeout 不再重現、clean targeted／full suites 與 required gates 全 PASS，且測試標準未弱化，可保留 root-cause NOTE 並標記 READY_FOR_REVIEW。

`historical timeout is no longer reproducible; exact root cause not proven`

## 2. Original Failure

| Item | Evidence / result |
| --- | --- |
| Failing test | `tests/browser/quality.spec.mjs:60` — `responsive widths, long content, square QR and 200 percent reflow` |
| WebKit project | `webkit`，設定使用 `devices['Desktop Safari']` |
| First run | 使用者提供的歷史結果：WebKit **24/26** |
| Rerun | 使用者提供的歷史結果：WebKit **25/26** |
| Timeout | 使用者提供：responsive 兩輪耗盡 **60 秒**；目前 config 仍為 `timeout: 60_000` |
| Last known operation | **UNKNOWN** — 當輪 log／trace 缺失，不能從測試 source 推定最後成功步驟 |
| Test-level vs assertion timeout | 歷史描述是 test-level 60 秒耗盡；原 stack／pending call 無法核對。不能宣稱是特定 assertion 的 timeout |
| Pending locator / navigation / screenshot / evaluate / close / teardown | 歷史 failing run：**UNKNOWN**；本次成功 traces 均完整完成 |

保留上述兩輪失敗歷史。它們不因本次 PASS 被改寫或作廢。

開始時現存 JSON：start `2026-10-01T12:07:39.962Z`、Chromium／Firefox／WebKit 各 26，合計 78 expected／0 skipped／0 unexpected／0 flaky，78 個 results 全部 passed 且 retry 0，report errors 空。每個 project timeout 60000 ms／retries 0、workers 1；WebKit responsive 7.337 秒。已在新測試覆寫輸出前保存為 `/tmp/url-qr-webkit-investigation/preexisting-results.json`；這是已確認的後續成功紀錄，不取代本次新執行的 gates。

## 3. Investigation Evidence

### Targeted runs

實際只收集一個 test 的指令：

```text
node.exe node_modules/@playwright/test/cli.js test quality.spec.mjs --project=webkit --workers=1 --retries=0 --grep responsive
```

第二、三次另加 `--trace=on` 及各自的 output directory。每次獨立呼叫；沒有同時執行其他 browser suite。原 config 與 60 秒 timeout 保留。

| Run | Result | Test duration | Playwright run duration | Last completed action / assertion |
| --- | --- | ---: | ---: | --- |
| Original target 1 | PASS，1/1 | 15.4 s | 25.6 s | decode 200% overflow assertion、最後 screenshot、正常 test completion |
| Original target 2 + trace | PASS，1/1 | 11.7 s | 13.8 s | decode exact-value assertion、200% overflow assertion、最後 screenshot、context close |
| Original target 3 + trace | PASS，1/1 | 12.0 s | 13.8 s | decode exact-value assertion、200% overflow assertion、最後 screenshot、context close |

這是三個獨立正常執行，並非 retries。沒有用單次偶然 PASS 認定已修復。

前兩個指令啟動問題另有記錄：sandbox 內 Windows interop 被限制；核准在 sandbox 外呼叫同一 Windows 工具後可執行。第一次使用 anchored grep 的指令沒有收集到 tests，改用 `quality.spec.mjs` + `responsive` 後確認恰好收集 1 個 test；no-tests invocation 不算 PASS。一次 npm 啟動使用了 Linux 形式的 CLI 路徑，Windows Node 無法解析；改用 Windows CLI 路徑後正常。沒有修改 execution policy、安裝 dependencies 或改系統設定。

### Native trace and stage timing

使用 Playwright 原生 trace 的 `before`／`after` timestamps 量測；沒有修改 tests 或 production code 加 logging。沿用既有 trace 設定的 screenshots／snapshots 關閉；trace 提供 actions、assertions、locator 與操作耗時，不包含 DOM snapshots。成功狀態 screenshots 仍由原 test 全部執行。

下表從 viewport resize 開始，到下一個 resize 開始；最後一列到最後 screenshot 完成。包含該 stage 的 assertions、fixtures、browser 操作及截圖。setup／teardown 另列，避免把 sums 當成精確 test 總耗時。

| Stage | Trace run 2 | Trace run 3 |
| --- | ---: | ---: |
| 1440 checks | 3221.6 ms | 2934.8 ms |
| 1280 checks | 2033.7 ms | 1842.7 ms |
| 768 checks | 1724.1 ms | 1739.3 ms |
| 375 checks | 1545.0 ms | 1720.7 ms |
| 320 checks | 1681.2 ms | 2094.8 ms |
| 640×450 / 200% root text | 917.3 ms | 1005.3 ms |
| Ten screenshots, included above | 1820.7 ms | 1908.5 ms |

Trace run 2：Before Hooks 392.3 ms；`goto` 到第一次 resize 開始 94.5 ms；context close 4.4 ms；After Hooks 249.2 ms。最大單次 browser 操作約 309.9 ms（screenshot）。Trace run 3 最大單次操作約 311.3 ms（screenshot）。兩個 browser action traces 都沒有未配對的 pending call 或 error。

| Question | Current trace evidence |
| --- | --- |
| Page / DOM responsive? | locator actions、DOM evaluate、layout bounds 與 exact-value assertions 全部返回 |
| Viewport resize complete? | 1440／1280／768／375／320／640 六次 resize 全部完成 |
| QR Generate complete? | 每個寬度都有 visible canvas、square 與 maximum-size assertions 完成 |
| Menu stuck? | toggle click、menu bounds、Escape 全部完成 |
| Decode result available? | 長 URL fixtures 的 terminal-state wait 與 exact-value assertion 全部完成；invalid image error assertion 也完成 |
| Screenshot stuck? | 全部 10 張完成；合計約 1.8–1.9 秒 |
| Evaluate / layout stuck? | overflow、control bounds、button/link heights 全部完成 |
| Context close / fixture teardown stuck? | 正常完成；run 2 context close 4.4 ms |

**上述只證明目前成功執行沒有卡住；無法據此分類缺失的歷史 failing trace。**

### Process / resource inventory

以 Windows `Get-CimInstance Win32_Process` read-only 查詢 Node／Playwright／MiniBrowser／WebKit，並以 `Get-NetTCPConnection` 查 4173／5173 listeners。開始時與三次 targeted runs 後都沒有本專案 Node／preview／WebKit process，也沒有這兩個 port 的 listener。可見的四個 Node processes 屬 Codex services，未停止或修改。

`process-before.txt` 與 `process-after-targeted.txt` 保存在 evidence directory；後者同時是 WebKit full run 前的 inventory。沒有可確認的專案 orphan process，沒有執行任何 process termination。

未取得歷史 failing run 的 CPU、memory 或 process inventory；**CPU contention、memory pressure、orphan server 作為歷史根因均為 not proven。** Audit 文件中另一輪並行 probes 的干擾，不是本次兩輪失敗的證據。

## 4. Root Cause

**NOT PROVEN — 原失敗無法重現，且原始 log／trace 未取得。**

已可排除「目前每次都會卡在同一 locator 或 async operation」這個重現模式：三次單測與 fresh-build 完整 WebKit run 全部完成。沒有證據支持修改 production code；同樣沒有證據支持把累積 test workload 判為已確認的根因。現測每個 viewport 約 1.5–3.2 秒，截圖合計不到 2 秒，test 約 11–15 秒，明顯未耗盡既有 60 秒。

分類：**undetermined**。目前成功執行沒有觀察到 product bug；歷史問題是否來自 test structure、Playwright 或 environment，均尚未證明。

使用者已確認舊 log 沒有其他可提供路徑，並要求不再尋找或重建。精確根因保持未證明；沒有推測未保存的 failure details，也沒有為湊出 failure 而製造並行 browser workload 或固定等待。以目前 repository、native traces 與 clean sequential reruns 作為可驗證證據。

## 5. Fix

本次只新增這份獨立報告；沒有修正 source、tests、helpers 或 Playwright config。沒有足夠 root-cause 證據實施 test split，也沒有聲稱 timeout 已修復。

- Production code changed by this investigation：**No**。
- Test split：**No**；目前仍每引擎 26 tests。
- Timeout：仍 **60 秒**；既有 corpus 的 120 秒設定未動。
- Retries：仍 **0**；沒有 skip／fixme／only、弱化 matcher、放寬 tolerance 或 WebKit 特例。
- 所有 viewport、兩模式、long content、QR、menu、decode success/error、overflow、controls 與 200% reflow assertions 保留。
- 所有 10 張代表 screenshots 保留。

**No assertion or viewport coverage was removed.**

## 6. m-3 Interaction

Responsive test 的輸入是明確的 `https://example.com/...` 長網址及獨立 ASCII fixture，不包含 `localhost:3000`、`localhost:8080/path` 或 loopback payload；它不操作 Open Link navigation。

**No evidence that m-3 product change caused the WebKit timeout.**

既有 m-3 browser regression 原封不動：兩個 localhost inputs 的 Generate／PNG decode、raw scheme-less QR decode、normalized Open Link href／target／rel、route 攔截 navigation、opener-null／no-Referer assertions 保留。兩輪完整 gate 三引擎全部通過；WebKit-only 也通過。最後一輪 localhost regression：Chromium 0.814 s／Firefox 1.320 s／WebKit 2.586 s。Loopback `127.0.0.1:8080` QR payload decode 的 Node regression 保留並通過。沒有重新修改 normalization。

## 7. Targeted Verification

| Scope | Result |
| --- | --- |
| WebKit original responsive targeted | PASS — 三次獨立 1/1，0 retry／skip／flaky |
| WebKit responsive group | 現有 group 就是一個 test；三次 targeted 及 full-suite 內均 PASS，未拆分 |
| WebKit full suite, fresh canonical build | PASS — 26/26，85.257 s，0 skipped／unexpected／flaky、retry 0，report errors 空；responsive 11.4 s |

## 8. Full Browser Verification

第一輪 `npm run test:browser`：**78/78 PASS**，226.463 s，0 skipped／unexpected／flaky，report errors 空。每個 result retry 0。Responsive：Chromium 6.113 s／Firefox 6.412 s／WebKit 11.517 s。

最後 required-gate `npm run test:browser`：**78/78 PASS**，186.290 s（npm 指令包含 build 共 189.457 s），0 skipped／unexpected／flaky，report errors 空，78 個 results 全部 passed 且 retry 0。Responsive：Chromium 5.938 s／Firefox 6.343 s／WebKit 10.991 s。

| Engine | Result | Tests | Skipped | Retry | Flaky |
| --- | --- | ---: | ---: | ---: | ---: |
| Chromium, final full run | PASS | 26/26 | 0 | 0 | 0 |
| Firefox, final full run | PASS | 26/26 | 0 | 0 | 0 |
| WebKit, final full run | PASS | 26/26 | 0 | 0 | 0 |

兩輪 engine distribution 都逐一從 JSON suites/specs/tests/results 核對，沒有只讀 summary。原先 78/78 成功紀錄也核對為相同分布。Source search 確認沒有 `.skip`／`.only`／`.fixme`、`test.fail`／`expect.soft`、固定 `waitForTimeout` 或 axe rule exclusion。`quality.spec.mjs`／helpers／config 與 HEAD 無 diff；m-3 的新增 test 與開始時 byte-identical。三引擎使用相同 assertions，沒有 coverage 弱化。

## 9. Full Required Gates

使用本工作目錄的 Windows Node **24.21.0**、Playwright **1.63.0** 執行 canonical npm scripts；browser engine 用既有 Windows Playwright 安裝。所有 browser suites 依序執行，workers 1／retries 0。沒有 browser suite 並行。

| Gate | Result |
| --- | --- |
| `npm test` | PASS — 37/37，0 failed／cancelled／skipped／todo |
| `npm run typecheck` | PASS — exit 0 |
| `npm run build` | PASS — exit 0 |
| `npm run test:artifact` | PASS — 4/4，0 failed／cancelled／skipped／todo |
| `npm run test:browser` final required run | PASS — 78/78，三引擎各 26，0 skipped／unexpected／flaky／retry |
| `npm audit` | PASS — 0 vulnerabilities，exit 0 |
| `npm ls --omit=dev --all` | PASS — 只有 `jsqr@1.4.0`／`qrcode-generator@2.0.4`，exit 0 |
| Runtime dependency manifest / lockfile | SHA-256 unchanged since task start；沒有新增依賴 |
| `git diff --check` / `git diff --cached --check` | PASS — 最終報告更新後核對 |

已閱讀 package scripts、README、RELEASE_CHECKLIST、V1_1_VERIFICATION 與 RC audit。沒有適用的 AGENTS.md／CLAUDE.md 或額外 lint gate。`npm ci` 是安裝步驟；本次沒有 dependency／lockfile／toolchain install 修改，未重新安裝。

## 10. Accessibility

本次完整 browser suite 的 axe scans 是 **21／run**：每引擎 encode initial／error／success／expanded menu 4 次，decode initial／error／success 3 次，共 7×3。兩輪完整 gate 均 **0 violations**，既有 WCAG tags／rules／assertions 未修改或抑制。加上 WebKit-only 的 7 次，本次新執行共 49 scans／0 violations。

使用者提供的歷史數字是 **28 scans／0 violations**，保留此歷史。現有未修改的 canonical suite 只含 21 scans；缺少舊 log，無法確認額外 7 scans 的來源。不是 test split 或刪除掃描造成的變化；沒有降低原 suite 的任何 axe coverage。WebKit-only run 另有 7 scans、0 violations；三次 responsive-only runs 本身不包含 axe。

## 11. Git / File State

HEAD 保持 `523dc4f99b2d913812d3799a6d27dd7342ebefc2`。

開始時及最後保留的 pre-existing modified files：

- `README.md`
- `src/qr.ts`
- `tests/qr.test.mjs`
- `tests/decode.test.mjs`
- `tests/browser/refinement.spec.mjs`

Untracked files：

- `V1_1_RC_AUDIT.md`（pre-existing；不可修改）
- `V1_1_WEBKIT_TIMEOUT_INVESTIGATION.md`（本次新增）

RC audit 開始時及交付前 SHA-256 相同：`2200f27614a75cba30a1cdd06c8432415918f28718f7ce614f849c69d783279a`。上述五個 pre-existing modified files 與 manifest／lockfile 的 SHA-256 也全部與開始時相同。

No commit；no tag creation/movement；no push；no release；no deployment。m-3 保持未 commit。本次沒有暫時 source/test diagnostic。Logs／原生 traces／JSON 保存在 repository 外的 `/tmp/url-qr-webkit-investigation/`；canonical generated outputs 仍在 ignored `dist/`／`test-results/`，不列為交付變更。

Final process inventory：本專案 Node／preview／WebKit processes 0，4173／5173 listeners 0；四個無關 Codex Node services 保留，沒有停止任何程序。所有 browser runs 結束且 exit 0。

Final `git status`：modified 5 個、untracked 2 個，正是以上清單；沒有 staged changes。`git diff --check` 與 `git diff --cached --check` 均 exit 0。HEAD 不變；本機只有原 `v1.0.0`／`v1.0.1` tags，objects／targets 與 RC audit 一致，沒有新 tag。

暫時 verification runner 與重複的 trace 解包 dumps 已清除；原生 trace ZIP、各輪 JSON、timing data、process inventories 與 logs 是本次調查證據，保留在 `/tmp/url-qr-webkit-investigation/`。專案內的暫時 trace output directories 已由後續 canonical run 清理；最終 `test-results/results.json` 是最後 78/78 PASS。

## 12. Final Status

### READY_FOR_REVIEW

The earlier WebKit timeout could not be reproduced in the final verification runs. Its exact root cause is not proven. Current evidence shows no reproducible product regression, and the required browser gate now passes without weakened test criteria.

**NOTE：** 保留 WebKit 首輪 24/26、完整重跑 25/26、responsive 曾兩次耗盡 60 秒的歷史。當輪未保存的細節沒有被推測；exact root cause 未能證實。三次 clean WebKit targeted、WebKit full suite、兩輪三引擎 full browser gate 與其他 required gates 全 PASS；沒有提高 timeout、增加 retries、skip、刪除 meaningful assertions 或降低 viewport／browser coverage。依使用者更新後的完成標準，root-cause 未證明的 NOTE 不阻擋本次 review。

沒有降低測試標準，沒有未經證據修改產品或重做 m-1／m-2／m-3；完成本次可執行的驗證與報告後停止。

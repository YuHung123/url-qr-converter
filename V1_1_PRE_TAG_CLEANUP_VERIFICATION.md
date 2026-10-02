# URL QR Converter v1.1.0 — Pre-Tag Cleanup Verification

日期：2026-10-02。HEAD：`0fde32f096166e14df323cd7a7a322f411106b95`。本輪保留未 commit 狀態，沒有 tag、push、release 或 deploy。

## 1. Executive Summary

Minor 1、Minor 2、Minor 10 已修正。乾淨 Windows `npm.cmd ci` 後，repository 原生 required gates 全部通過：Node 37/37、artifact 4/4、canonical browser 96/96（Chromium／Firefox／WebKit 各 32/32），axe 21 scans、0 violations，npm audit 0 vulnerabilities。

Browser reporter 的 skipped／unexpected／flaky 全為 0；96 個 results 均 passed、retry 0。版本維持 1.1.0。實際 screen reader 與實機／部署人工驗收仍未執行。

## 2. Scope

**Only Minor 1, Minor 2, Minor 10.**

本輪相對開始時的 working tree，只修改：

- `src/main.ts`：`resultStatus()` 共用 announcement／notice 文案與條件。
- `index.html`：visible notice 的 duplicate prevention；file input 原生 label 命名。
- `tests/browser/final-ux-svg.spec.mjs`：必要 accessibility regression／snapshot attachments。
- `RELEASE_CHECKLIST.md`：現行 screen reader walkthrough 第 5 步。
- 新增本 verification report。

開始前已完整閱讀指定的四份 audit／verification、checklist、HTML、main.ts、CSS、全部 browser tests、package.json 與 Playwright config。開始時 Git 檔案清單與 Final SVG audit §2 的已知未提交 delta 一致，沒有未知修改；`V1_1_FINAL_SVG_AUDIT.md` 是 review-only 的既有 untracked 報告。

實際使用的 skills：model-routing（依 gate 保留 PRIMARY 執行，未派子代理）、receiving-code-review、verification-before-handoff、context7:context7-mcp（查核 Playwright 1.63.0 accessibility snapshot API）；外層命令中斷時使用 systematic-debugging。此 session 安裝清單及 skill 檔案盤點沒有 pr-review-toolkit、ui-regression-check 或專用 Playwright／accessibility skill；browser／responsive inspection 使用本 repo 的 Playwright suite，沒有宣稱使用不存在的 skill。

## 3. Accessibility Fix 1

`resultStatus()` 從同一個 `generated` 與 input 狀態，建立一次 `modifiedMessage` 和 `denseMessage`；visible notice 與 live status 都從這兩個值組成，不新增另一套 state，也不重複硬編碼文案。既有 modules ≥ 85 門檻不變。

| 狀態 | Visible notice | Live status |
| --- | --- | --- |
| Normal QR | 空、display none | 已產生 QR Code。 |
| Dense QR | QR Code 較密，建議下載後掃描。 | 已產生 QR Code。 QR Code 較密，建議下載後掃描。 |
| Modified normal | 網址已修改，請重新產生。 | 網址已修改，請重新產生。 |
| Modified dense | 網址已修改，請重新產生。 QR Code 較密，建議下載後掃描。 | 網址已修改，請重新產生。 QR Code 較密，建議下載後掃描。 |

可見 `#qr-notice` 保留，以 `aria-hidden="true"` 避免瀏覽模式再讀一份相同內容；`#qr-status` 維持 visually-hidden、`role="status"`、`aria-atomic="true"`，負責 assistive-technology 狀態。密度提示現在包含在單一 live region 中。

新增一個 test／engine，涵蓋 normal、modified normal、restored normal、dense、modified dense、restored dense。除文字外，驗證 live semantics、absolute 1×1 px、notice 仍可見／空時隱藏、notice 的 ARIA snapshot 為空、status snapshot 正確，以及 body snapshot 中修改／密度提示各只有一次。三引擎全部通過。

## 4. Accessibility Fix 2

只移除 file input 的 `aria-label="QR Code 圖片"`。既有 `<label for="qr-image">選擇圖片或拖曳到這裡</label>` 現在提供 accessible name；可見 UI 文案與上傳結構不變。

更新原 test 的 accessible-name expectation，是因 Minor 2 明確要求 Label in Name；其餘既有 assertions 保留，另外驗證原生 `input.labels`、label 可見且文字正確、沒有 ARIA override、drop zone 仍是名稱「QR Code 圖片上傳區」的 group。由 tabpanel 按 Tab 到 file input、Space 觸發真實 filechooser event，選圖後正確解出 fixture URL。focus-within 維持 3px solid outline。

三引擎 PASS。上傳區未重新顯示「QR Code 圖片」、native filename placeholder、支援格式或正常 20 MiB 提示。

## 5. Checklist Fix

只更新 Screen reader walkthrough 第 5 步：

- 正常上傳區可見「選擇圖片或拖曳到這裡」，file input accessible name 包含同一文字。
- 人工確認 Tab／Space／focus outline。
- 正常狀態不要求朗讀不存在的格式／大小限制提示。
- 真正超過 20 MiB 時仍要求顯示並朗讀「圖片檔案過大（上限 20 MiB）。」。功能限制未刪除；既有 PNG／SVG oversize regression 都通過。

其餘 checklist 與歷史 audit／verification 文件沒有改寫。

## 6. Scope Integrity

開始時對 50 個 tracked／既有 untracked 專案檔案保存 SHA-256 快照；結束時逐檔比對，只出現 §2 的四個既有檔案修改及新增本報告。`src/svg.ts`、`src/decode.ts`、`src/qr.ts`、CSS、package.json、package-lock.json、vite.config.ts、public/_headers、Playwright config 與所有歷史報告均與本輪開始時 byte-identical。

其他七個 Minor（3～9）完全未處理：AVIF／ICO／HEIC、SVG shape cap／workload、quadratic trailing-whitespace loop、XML processing instruction parsing、WebP sniff、parser Node tests／stale coverage、SVG unsupported-subset wording。Worker、第三方／generic SVG compatibility 與任何 Future item 也未處理。

**Deferred to v1.1.1 / future per scope.**

SVG parser／security logic、CSP、dependencies 沒有本輪修改。既有 SVG security／round-trip／stale tests 及 production CSP／network／storage browser tests 三引擎全部 PASS；沒有另做 36 hostile fixture audit。新 spec 中從 `exact image errors have stable copy` 起的所有既有 error／SVG／race test 內容也經比對，byte-identical。

## 7. Clean Windows Environment

- Windows 11，version 10.0.26200、build 26200。
- Native Node `v24.21.0`、npm `11.19.0`；installed Playwright `1.63.0`。
- Native cwd：`C:\Users\yuhun\Desktop\url-qr-converter`。
- 在 `npm.cmd ci` 前唯讀檢查 Windows Node／cmd command lines 與 4173／5173 listeners；只有 Codex service Node processes，沒有本專案舊 Vite／Playwright server，兩個 ports 都 free。沒有停止任何 process，也沒有碰其他專案／服務。
- `npm.cmd ci` exit 0：added 23 packages、audited 24 packages、0 vulnerabilities。manifest／lockfile hash 不變；安裝後 `git status` 與 hash 快照確認 0 unexpected install modification。
- 使用 `npm.cmd`，沒有修改 Windows execution policy。
- Browser gate 開始前再次確認 4173／5173 free；原 config 在 4173 啟動 repository `tests/preview-server.mjs`，gate 完成後兩個 ports 都 free，也沒有本輪 preview／test runner 殘留。

**外層執行註記：** 同一次 canonical run 在 Chromium 32/32 後，WSL 呼叫外層回報 exit 143，尚無完整 reporter。唯讀 process inspection 確認原 Windows npm PID 1620、Playwright PID 22920、preview PID 43652 仍持續執行，Firefox／WebKit attachments 隨後產生；因此沒有重跑、停止或另開 suite。使用同一 npm process 的 native process handle／WaitForExit 確認 `CANONICAL_NPM_EXIT_CODE=0`，再核對本次完整 repository JSON reporter。外層被終止的觸發原因未證明；143 不是 Windows npm 或某個 test 的退出碼。

## 8. Canonical Gates

下列 npm gates 全在乾淨 Windows install 上，從原生專案目錄執行。沒有 temporary Playwright config、test copy、scratch harness、alternate port／webServer、skip、retry 或 timeout 修改。

| Gate | Result |
| --- | --- |
| `npm.cmd ci` | PASS，exit 0，0 unexpected install modification |
| Node — `npm.cmd test` | PASS 37/37，fail／cancelled／skipped／todo 0，exit 0 |
| `npm.cmd run typecheck` | PASS，exit 0 |
| `npm.cmd run build` | PASS，exit 0；typecheck + Vite 8.3.1 build |
| `npm.cmd run test:artifact` | PASS 4/4，exit 0 |
| Browser — `npm.cmd run test:browser` | PASS 96/96；同一次 native npm process exit 0；257.042 s |
| Chromium | PASS 32/32 |
| Firefox | PASS 32/32 |
| Playwright WebKit | PASS 32/32 |
| Axe | PASS，21 scans、0 violations |
| `npm.cmd audit` | PASS，0 vulnerabilities，exit 0 |
| Runtime deps — `npm.cmd ls --omit=dev --all` | PASS，僅 jsqr@1.4.0、qrcode-generator@2.0.4，exit 0 |
| `git diff --check` | PASS，exit 0 |
| `git diff --cached --check` | PASS，exit 0；index 無 staged changes |

Canonical reporter：`test-results/results.json`（ignored），startTime `2026-10-02T12:41:07.696Z`。expected 96、skipped 0、unexpected 0、flaky 0、errors 空；96 個 results 都是 passed、單次執行、retry 0。reporter rootDir／project testDir 指向原 repository `C:/Users/yuhun/Desktop/url-qr-converter/tests/browser`；workers 1、retries 0、timeout 60000，與開始時 config 一致。

相對基準 31 tests／engine，本輪只新增 1 個 announcement regression／engine，總數由 93 增至 96；没有為維持舊 count 刪測試。既有 `quality.spec.mjs` byte-identical：encode 4 scans、decode 3 scans，共 7×3＝21；没有新增 scan、disable rules 或 broad exclude，全部 violations assertions 通過。

## 9. Accessibility Targeted Verification

在 canonical gate 中實際收集並閱讀三引擎的 `qr-status-accessibility.json` 與 `upload-accessibility.json` attachments：

| Target | 三引擎觀察 |
| --- | --- |
| Encode normal | `status: 已產生 QR Code。`，notice 空且隱藏 |
| Encode dense | `status: 已產生 QR Code。 QR Code 較密，建議下載後掃描。` |
| Modified URL | notice 可見；同一提示在 body ARIA snapshot 只有一次；notice 本身不進 tree |
| Modified dense／restored | 修改與密度提示共用 live region；還原 draft 後回到正常成功狀態 |
| Upload | `group "QR Code 圖片上傳區"` 包含 `button "選擇圖片或拖曳到這裡"`；原生 label 同文案 |
| Keyboard | Tab 可達、Space 真實 filechooser、解碼成功、focus-within outline PASS |

這是 DOM／ARIA semantics 和自動化 keyboard 驗證，**不等於 Narrator／NVDA／VoiceOver 的實際朗讀 PASS**。

## 10. Responsive Smoke

既有 responsive suite 三引擎全部 PASS：1440／1280／768／375／320 CSS px、兩模式、QR、選單、長結果及錯誤；沒有 horizontal overflow，控制項沒有越界。640×450 CSS px 加 200% 文字放大之等效 reflow 也 PASS。

目視閱讀本次 Windows Chromium screenshots：兩模式的 desktop 1440、320 px、200% text enlargement（六張 screenshots）。上傳文字不變，沒有 native filename／正常限制提示；hidden status 沒有可見占位空間；dense notice 換行正常，QR／result／Copy／Download 未重疊或裁切。新 accessibility test 另外確認 hidden status absolute 1×1 px 與 upload focus-within 3px outline；CSS 未修改。

Native 200% browser zoom 仍為人工項目，不將等效 reflow 當作實際 zoom PASS。

## 11. Git State

- HEAD／branch：`0fde32f096166e14df323cd7a7a322f411106b95`，`main`，仍 ahead origin/main 3 commits。
- Modified tracked：`CHANGELOG.md`、`README.md`、`RELEASE_CHECKLIST.md`、`index.html`、`src/decode.ts`、`src/main.ts`、`src/styles.css`、`tests/browser/functional.spec.mjs`、`tests/browser/quality.spec.mjs`、`tests/browser/refinement.spec.mjs`、`tests/decode.test.mjs`。
- Untracked：`V1_1_FINAL_SVG_AUDIT.md`、`V1_1_FINAL_UX_SVG_VERIFICATION.md`、`V1_1_PRE_TAG_CLEANUP_VERIFICATION.md`、`src/svg.ts`、`tests/browser/final-ux-svg.spec.mjs`。
- 本輪的四個既有檔案修改見 §2；其餘保留原 Final UX + SVG delta。新報告以外沒有未知新檔。
- Staged：none。No commit、no tag、no push、no GitHub Release、no deploy。
- package.json、lockfile root／root package version 都是 `1.1.0`，沒有 `1.1.1`。
- 無 `v1.1.0` tag；既有 tag objects／targets 與開始時及歷史 audit 一致：`v1.0.0` object `0c41a74fb7c853f2f4f4ee65b5362a6bcfa71310` → `47600c5c3741a86a74537e46eeb10f0bf774f64a`；`v1.0.1` object `1e5f113430adb830862d586e76a6eb42c1d79589` → `214cea38bea3ca43ecb0dc0c0b0f7f3a18a51dd9`。

## 12. Remaining Manual Acceptance

以下全部保留 **NOT VERIFIED**；本輪沒有自行開始人工驗收：

- Real phone scan。
- Real Android。
- Real Safari on macOS／iOS；Playwright WebKit 不等同 Safari。
- Printed scan（Word → PDF → 紙本）。
- Real camera photo。
- Actual screen reader：Narrator／NVDA／VoiceOver，包含 dense announcement、modified notice 與 file input name。
- Native 200% browser zoom。
- Hosted HTTPS／response headers。
- Deployed subdirectory。

## 13. Final Status

**READY_FOR_MANUAL_ACCEPTANCE**

三項指定 cleanup 與乾淨 Windows canonical required gates 已通過；其餘 Minor 留待 v1.1.1／future。保持未 commit，停止本輪工作，不開始 commit、tag、push、release、deploy 或人工驗收。

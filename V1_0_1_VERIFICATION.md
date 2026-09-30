# v1.0.1 — Public Release Fixes Verification

日期：2026-09-30。範圍：v1.0.0 獨立 audit 的 I-1、M-1、M-2；沒有新核心功能。

## 1. Executive Summary

v1.0.1 修正 Windows 預設 fresh clone 的 release gates 重現性、selected tab 視覺指示及一處無作用的 ARIA。v1.0.0 commit `47600c5c3741a86a74537e46eeb10f0bf774f64a` 與 annotated tag 保留，不 amend、rebase 或移動 tag。

**PASS WITH NOTE — local v1.0.1 baseline。** 目前工作目錄及 Windows default fresh clone 的全部必要 automated gates 通過；首輪資源壓力 timeout 與未執行的人工項目如實保留。正式 repository 以新的 follow-up commit／annotated tag 發布本機 baseline，沒有 remote／push／deployment。

## 2. Audit Findings Addressed

- **I-1**：`.gitattributes` 固定 `_headers` 為 LF；preview 與 artifact 共用接受 LF／CRLF 的 parser；artifact suite 額外檢查 tracked blob、checkout 與 dist 的 LF invariant。
- **M-1**：selected tab 加上 `inset 0 -3px 0 var(--accent)` 底線，保留既有外觀與外側 focus outline，沒有改動尺寸或加入 animation／icon。
- **M-2**：刪除 generic `.output-section` div 的 `aria-labelledby="preview-title"`，保留 h3，未新增 landmark。

`V1_RELEASE_AUDIT.md` 原文完整納入；仍保留 I-1 Important、M-1／M-2 Minor 與 PASS WITH NOTE 歷史結論。工作目錄原始報告 SHA-256：`92e7a28f6353de5f2bbfa484f0e8ce187c786441e4a99f90c20724fc409ee309`，修改前後相同。

## 3. .gitattributes

實際規則只有：

```gitattributes
public/_headers text eol=lf
```

審查 tracked files 後，需固定 checkout bytes 的部署政策只有 `_headers`。HTML／CSS／TS／JS／JSON 的語法接受兩種行尾，notices 只需由 build 原樣複製；PNG 已由 Git 自動視為 binary。因此沒有全樹 renormalization 或大量 extension rules。

此規則覆蓋 `core.autocrlf=true`：repository index 與 Windows／macOS／Linux／WSL checkout 的 `_headers` 應為 LF；build 原樣複製為 LF `dist/_headers`。本次實際完整 gate 平台為 Windows，未宣稱在其他 OS 跑過全套。

## 4. Test Tool Robustness

`tests/deployment-headers.mjs` 抽出 preview 使用的 parser，使用 `split(/\r?\n/)`。仍要求第一行為單一 `/*`、至少一個 header、縮排與合法 header name／非空 value；拒絕額外 rule、缺少冒號、空值及大小寫不敏感的重複 header。沒有 catch 後忽略錯誤。

Artifact 的 policy 語意比較先 normalize CRLF → LF，再確認完整四個 security headers；原本 CSP／notices／dist 白名單／dependency assertions 保留。另有獨立 byte gate：`git show :public/_headers`、checkout source、dist 均有終端 LF 且沒有 CR，dist 與 source bytes 相同。

新增兩個原生 Node artifact tests，沒有新 framework。LF 與 CRLF 輸入均比對完整 policy，malformed cases 均需 throw。修正前使用原 preview parser 的實際 code 做最小 reproduction：LF PASS，CRLF 拋出 `Expected one global _headers rule`，原 literal LF assertion 亦為 false。

## 5. Windows Fresh Clone Verification

環境：Windows 11 Home，OS 10.0.26200（`cmd /c ver`：10.0.26200.9457）；Git `2.55.0.windows.2`；Windows Node `v24.19.0`、npm `11.17.0`。Browser versions：Chromium 153.0.8010.12、Firefox 155.0、Playwright WebKit 26.6。由 WSL 呼叫 Windows 執行檔，npm 與三個 browsers 皆在 Windows 執行。

外部 scratch clone：`C:\Users\yuhun\AppData\Local\Temp\url-qr-v101-fresh-20260930`，在 repository 外的 Windows TEMP，未複製 node_modules／dist／測試結果。

為在最終 commit 前取得證據，先將目前候選檔案放入 `/tmp` 的獨立 bare Git repository，建立暫存 snapshot `85da770257ed30b689873a35b2a3afc04373efd6`，包含原歷史與 v1.0.0 tag，再輸出完整 Git bundle。正式 repository 的 HEAD／history 未因 snapshot 改變。Windows Git 從該 bundle 全新 clone／checkout；之後只補 verification／checklist 文件，最終交付前逐一核對全部 28 個非 Markdown tracked files：snapshot 與目前目錄 bytes 相同，Windows clone 的一般 text 只差預期 CRLF，PNG bytes 相同。暫存 snapshot 的 Linux executable mode 不作 Windows runtime 證據；正式 repository 保留原 file modes。

第一次直接從 WSL bare repository clone 被 Windows Git 的 dubious-ownership 檢查拒絕；改用相同 snapshot 的 bundle，不修改全域 safe.directory 或 autocrlf。這是 clone 來源路徑的互通問題，不是 release gate 失敗。

```text
git clone --branch main <external-candidate.bundle> <Windows-TEMP-fresh>
git remote remove origin
git config --show-origin --get core.autocrlf
file:C:/Program Files/Git/etc/gitconfig  true

git config core.autocrlf
true

git ls-files --eol public/_headers package.json
i/lf    w/crlf  attr/                 package.json
i/lf    w/lf    attr/text eol=lf      public/_headers
```

未使用 `core.autocrlf=false`，未手動轉換 clone 的檔案。Clone 的工作目錄乾淨；移除僅指向本地 bundle 的 origin，沒有任何網路 remote／push。

完整執行清單（目前工作目錄與 fresh clone 各一套）：

```text
npm ci
npm test
npm run typecheck
npm run build
npm run test:artifact
npm run test:browser
npm audit
npm ls --omit=dev --all
```

Fresh clone 全套 PASS：browser 48/48（5.1 分鐘）、零 skipped／flaky／unexpected；其餘 gates 見下表。

## 6. Automated Tests

| Gate | Current v1.0.1 worktree | Windows default fresh clone |
| --- | --- | --- |
| npm ci | PASS；23 installed／24 audited | PASS；23 installed／24 audited |
| Node | PASS 30/30 | PASS 30/30 |
| typecheck / build | PASS | PASS |
| artifact | PASS 4/4 | PASS 4/4 |
| Chromium | PASS 16/16 | PASS 16/16 |
| Firefox | PASS 16/16 | PASS 16/16 |
| Playwright WebKit | PASS 16/16 | PASS 16/16 |
| axe | PASS 18 scans；0 violations | PASS 18 scans；0 violations |
| npm audit | PASS 0 vulnerabilities | PASS 0 vulnerabilities |
| production dependencies | 僅 jsqr 1.4.0／qrcode-generator 2.0.4 | 僅 jsqr 1.4.0／qrcode-generator 2.0.4 |

首輪 current-worktree browser run 的 Firefox M1 round-trip 在第四次輸入前觸及 60 秒整組 timeout；前三次 PNG／decode 已成功。Trace 的 encode-tab locator resolution 停頓約 41.7 秒，同期 Windows 可用實體 RAM 433012 KiB（約 423 MiB／7.7 GiB）。當時另有 fresh clone npm／build 驗證；後續改為完全依序執行，未改 source、assertions、timeout 或 retries。首輪失敗保留於本次驗證紀錄，不能計為通過。首輪結果 47/48（8.5 分鐘）。完全依序執行後，fresh clone 全套 48/48（304.5 秒），接著 current worktree 全套 48/48（292.5 秒）；兩份 JSON stats 均 expected 48、skipped 0、unexpected 0、flaky 0。沒有自動 retry，也沒有把首輪失敗刪成 PASS。

最終 gates 後只改 verification／checklist 等文件；沒有變動 source、tests、manifest、lockfile 或 build config，既有測試證據仍有效。最終另檢查 Git diff／status、tag targets 與 process cleanup。

Browser count 保持 16 × 3 = 48，擴充既有 contrast test，不刪除案例；artifact 由 2 增為 4；Node product tests 保持 30。Playwright 仍為單 worker、零 retries，無 skip、無 timeout 放寬。

## 7. Accessibility Fix

原 selected 白底／tablist 僅約 1.17:1、border／tablist 約 1.12:1。新增只有 selected 才出現的 3px 內側底線，以形狀與位置表達狀態。Computed indicator color 為 `rgb(40, 92, 73)`（`#285c49`）。

| 鄰近顏色 | Computed contrast |
| --- | --- |
| Selected 白底 #ffffff | 7.73:1 |
| Selected hover #f9faf8 | 7.38:1 |
| Tablist #eaeee8 | 6.59:1 |
| Selected 邊框 #dce2dc | 5.87:1 |

三引擎針對 encode／decode、1280／320px、normal／hover 都量測並斷言 ≥3:1。Unselected 沒有 box shadow；selected 的 inset 不占 layout，切換前後兩個 tabs 的 bounding boxes 完全相同。鍵盤 Home／End 切換後 `:focus-visible`、3px outline、4px offset 保留；既有完整 keyboard test 另涵蓋方向鍵與 Tab／Shift+Tab。Forced-colors 的 Highlight border 規則未改動。

已目視檢查目前 worktree 的 Chromium 320px encode 截圖，底線與排版正常。結果保存於既有 ignored `test-results/*/selected-tab-contrast.json`。ARIA cleanup 僅刪除無作用的 naming attribute。axe、320px 與其他 responsive 完整結果見上表；真實 screen reader／native zoom 不冒充已驗證。

## 8. Functional Regression

### M1

Current worktree 與 fresh clone 均 PASS。覆蓋 HTTP(S)／Unicode normalization、Generate、真實 PNG Download／M2 round trip、capacity failure／恢復、input invalidation、stale export、quiet zone／整數 module／高密度原尺寸 decode。

### M2

Current worktree 與 fresh clone 均 PASS。覆蓋獨立 fixtures、UTF-8 integrity／raw controls、staged 768 → 2048、圖片 corpus／尺寸限制、Copy／failure recovery、stale decode／Copy protections。Firefox／WebKit 的 native clipboard write 與 UI 可驗證，但 OS clipboard readback 僅 Chromium。

## 9. Security / Privacy

`vite.config.ts`、`public/_headers` 與全部產品 TS 未改；meta CSP、HTTP CSP、四個 headers、URL validation policy、staged decode 設計保持 v1.0.0。沒有增加 network、storage、analytics、production dependency。Current worktree 與 fresh clone runtime security suites 均已確認 response headers／CSP、轉換後零新增 request、空 storage／cookies／IndexedDB／CacheStorage／Service Workers、reload 清空。

## 10. Artifact

Fresh clone 與 current build 的 dist 僅 `index.html`、`assets/index-BXjJTOA6.js`、`assets/index-DgS34Gl6.css`、`favicon.svg`、`THIRD_PARTY_NOTICES.txt`、`_headers`。Artifact gate 核對根目錄白名單、恰好一個 JS／CSS、完整 notices、headers 與來源一致且 LF；沒有 maps、tests、fixtures、audit、.gitattributes 或 screenshots。

## 11. Version / Git

- package.json 與 package-lock.json 的 root／packages[""]：`1.0.1`；其餘 dependency／integrity 不變。
- Release commit：`v1.0.1^{commit}`；message：`fix: prepare public v1.0.1 release`；本報告與修正同 commit。自身 hash 由交付訊息及 `git rev-parse 'v1.0.1^{commit}'` 提供。
- v1.0.0 target：`47600c5c3741a86a74537e46eeb10f0bf774f64a`；tag object `0c41a74fb7c853f2f4f4ee65b5362a6bcfa71310`，annotated，原封不動保留。
- v1.0.1 target：本報告所在 release commit（`HEAD`），annotated tag message `URL QR Converter v1.0.1`。先完成 gates、commit 與 clean 檢查，才建立 tag；交付時再次核對兩個 tag。
- `git diff --check`／`git diff --cached --check`：PASS。Commit 後 working tree clean；tag 後再次檢查。Windows 4173／5173 無 listener，無本專案 preview／Vite process。
- 正式 repository 無 remote；沒有 push、GitHub Release、deployment 或 portfolio 修改。

## 12. Remaining Manual Checks

全部 **NOT VERIFIED**：real phone scan、real Android、real Safari（macOS／iOS）、real printed scan、real camera photo、screen reader、native browser zoom、hosted HTTPS／response headers、real deployed subdirectory。

依本次 acceptance contract，這些不阻擋 local patch baseline。公開部署／實際使用時仍需適用的手機掃描、真機 smoke、HTTPS／headers 與 subpath 驗收。Playwright WebKit 不代表 real Safari。

未處理 Future：URL credentials／userinfo policy、Worker／OffscreenCanvas、專案 LICENSE。

## 13. Public Release Readiness

- Local v1.0.1 baseline：**PASS WITH NOTE**（自動化全部通過；初次環境 timeout 與 manual 限制已記錄）。
- Ready to create remote / push?：**YES WITH MANUAL CHECKS**。沒有新 software blocker；由使用者決定何時建立 remote／push，部署及實機檢查保持獨立。
- Handoff state：**READY_FOR_REVIEW**（本次 local patch 範圍；manual items 依任務明訂不是 patch 完成 gate，不代表公開部署或實機驗收已完成）。

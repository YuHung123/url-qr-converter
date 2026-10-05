# Release checklist — v1.1.0 candidate

本機 candidate，不建立 v1.1.0 tag、不 push、不部署。最終 B5 production 實作與既有驗證見 [B5_PRODUCTION_IMPLEMENTATION_VERIFICATION](B5_PRODUCTION_IMPLEMENTATION_VERIFICATION.md)；本次 cleanup 與 gate 狀態見 [V1_1_RELEASE_PREPARATION_VERIFICATION](V1_1_RELEASE_PREPARATION_VERIFICATION.md)。
v1.0.1 的 30 Node／4 artifact／48 browser、Windows default fresh-clone 結果保留於 [V1_0_1_VERIFICATION](V1_0_1_VERIFICATION.md) 與 [獨立 pre-push audit](V1_0_1_PRE_PUSH_AUDIT.md)，不改寫歷史結果。
`PASS WITH NOTE` 表示有已記錄的限制；`NOT VERIFIED` 不等於通過。

目前採用最終 B5 light UI、目標尺寸 snapping 與等寬整數 raster geometry，保留 output preview／transparent background。功能驗證仍見 [V1_1_VERIFICATION](V1_1_VERIFICATION.md)、[target-size geometry](V1_1_TARGET_SIZE_GEOMETRY_FIX_VERIFICATION.md) 與 [functional freeze](V1_1_FUNCTIONAL_FREEZE_VERIFICATION.md)。

Release security readiness 以 [V1_1_FINAL_RELEASE_SECURITY_AUDIT](V1_1_FINAL_RELEASE_SECURITY_AUDIT.md) 為 authoritative：`PASS_WITH_NOTE`，無 Blocker／Important；ME-1 是 tag 前必要條件。M-1（SVG leading processing instruction）、M-2（crafted SVG trailing whitespace stall）與 M-5（empty decode result focus reflow）刻意 deferred，維持非阻擋 Minor。

以下勾選保留既有 candidate 歷史結果，不代表本次 final gate 已通過。最終 Windows PowerShell browser gate 必須在本次 cleanup 後的相同 working tree 執行 `npm run test:browser`：Chromium 77/77、Firefox 77/77、WebKit 77/77，合計 231/231，0 skipped、0 retries、0 flaky，axe clean。結果未供應前不得宣告 release ready。

- [ ] Final Windows 231/231 browser result supplied and recorded in the release-preparation report.

## Automated candidate gates

- [x] `npm ci`
- [x] `npm test`：URL／ASCII／matrix／UTF-8／控制字元／cleanup，含 v1.1.0 新規則。
- [x] `npm run typecheck`
- [x] `npm run build`
- [x] `npm run test:artifact`：Git checkout 的 LF bytes、CSP／headers／notices、dist 白名單與 dependencies。
- [x] `npm run test:browser`：正式 build、Chromium／Firefox／Playwright WebKit、axe，零 skipped／flaky。
- [x] `npm audit`、`npm ls --omit=dev --all`。
- [x] `git diff --check`、`git diff --cached --check`。
- [x] package 與 lockfile 版本一致為 `1.1.0`；其餘 dependency versions／integrity 保持原值。
- [x] 本輪保留未提交 working tree；v1.0.0／v1.0.1 的 tag objects 與 targets 不變。
- [x] 無 v1.1.0 tag、push 或部署；4173／5173 沒有本次 test server listener。

Browser 安裝：`npx playwright install chromium firefox webkit`。
Playwright WebKit is not the same as testing real Safari on macOS/iOS.

## Manual

- [ ] **preview size**：目標 256／300 觀察實際尺寸；dense／near-capacity 目標 512（185 modules → 555 px），2048 目標的實際值不超過 2048 且受容器限制；預覽「實際尺寸」文字與下載檔寬高一致。
- [ ] **background formats**：白底 PNG／JPG／WebP 與透明 PNG／WebP／SVG 的實際檔案；透明模式下 JPG 保留但不可下載。
- [ ] **transparent preview**：棋盤格只在透明預覽顯示，不進入下載檔；切換背景與尺寸不改未重新生成的 QR payload。
- [ ] **placement**：實際外部瀏覽器、Word／PDF 排版，與 real phone scan 分別驗收。

- [ ] **target size**：PNG／JPG／WebP 預設目標 256 px，自訂 128／256／512／2048 px，確認等寬格子及實際寬高符合預覽文字。
- [ ] **non-preset target**：輸入目標 300 px，三種 raster 檔使用同一 snapped actual 尺寸，QR 與四格 quiet zone 完整，沒有多餘空白或置中 padding。
- [ ] **dynamic minimum**：密集 QR 的 minimum - 1 顯示正確最小尺寸，exact minimum 可下載；欄位不自動提高。
- [ ] **SVG unaffected**：尺寸為 32／空白／文字時 SVG 仍正常下載，可選圖／拖曳 round-trip；原 raster 錯誤清除。

下列項目皆為 **NOT VERIFIED**，不阻擋有誠實限制說明的本機 candidate 與下一輪獨立 review；公開部署／實際使用前需完成適用項目。

- [ ] **real phone scan**：短／中／長網址畫面及 PNG／SVG／JPG／WebP，核對完整 URL。
- [ ] **real Android**：兩模式、選照片／drag-drop（適用時）、下載、Copy、Open Link、觸控。
- [ ] **real Safari on macOS/iOS**：四種下載、圖片選擇、Copy 成功／拒絕、new-tab opener protection、鍵盤／觸控。
- [ ] **real printed scan**：插入 Word → PDF，保留正方形／白邊；掃描最終 PDF 及紙本。
- [ ] **real camera photo**：正常光照下拍攝 QR，再選圖解析。
- [ ] **screen reader**：NVDA／Narrator／VoiceOver，按以下順序操作。
- [ ] **native 200% browser zoom**：操作實際 Ctrl/Cmd +，檢查排版及焦點；自動化只驗證等效 viewport／文字放大。
- [ ] **hosted HTTPS / response headers**：主機採用 `_headers` 或等價 HTTP headers，含 frame-ancestors。
- [ ] **deployed subdirectory**：實際 host 的 asset paths 與 header 規則範圍。

### Screen reader walkthrough

1. H1、skip link、tablist 名稱／狀態；方向鍵／Home／End 切換，隱藏面板不被朗讀或聚焦。
2. URL label，輸入 `example.com` 按 Enter；聽到結果。錯誤有 alert／invalid 狀態。
3. 修改 draft 舊 QR 保留，聽到重新產生提示；下載仍代表顯示 QR。無效 Generate 保留舊結果，錯誤清楚。
4. Tab 到「透明背景」，確認名稱、預設未勾選、Space 切換及狀態朗讀；再 Tab 到「目標尺寸」，確認名稱不含 px、預設 256、有效值立即更新預覽及尺寸文字，無效值保留最後有效預覽；無效值下載時朗讀尺寸錯誤，修正後清除。再 Tab 到主 PNG 下載，再到「其他下載格式」；Enter／Space 展開，方向鍵／Home／End 選擇；透明時 JPG 為 unavailable 並被鍵盤略過，關閉透明後恢復；Escape 回 toggle，Tab／Shift+Tab 不困住焦點。
5. 上傳區只顯示「選擇圖片或拖曳到這裡」，選圖控制項的 accessible name 包含同一可見 label；Tab 可到達、Space 可開啟選檔器，聚焦時上傳區有外框。正常狀態不需朗讀格式／大小限制或不存在的 20 MiB 提示；實際選擇超過 20 MiB 的檔案時，顯示並朗讀「圖片檔案過大(上限20MB)」。成功 status、完整唯讀網址、可聚焦 copy icon（名稱「複製網址」）、開啟連結。
6. Copy 成功聽到確認；失敗仍能手動複製。新圖片清除結果與 Open Link；focused Copy／Open Link 回選圖控制項，完成不搶焦點。
7. Open Link 只有明確點擊才開新分頁；先確認結果中的實際 URL。
8. pending decode／Copy 時切換模式，隱藏 status 不打斷目前模式；DOM accessibility snapshot 不等於實際朗讀驗收。

本任務僅建立本機 candidate。既有 remote 保留，不做遠端或 hosting 操作。

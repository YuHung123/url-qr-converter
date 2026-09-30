# Release checklist — v1.0.1

本機 release baseline；不包含公開部署。實際執行結果見 [V1_0_1_VERIFICATION](V1_0_1_VERIFICATION.md)；[v1.0.0 audit](V1_RELEASE_AUDIT.md) 保留歷史 findings。
`PASS WITH NOTE` 表示有已記錄的限制；`NOT VERIFIED` 絕不等於通過。

## Automated

v1.0.0 的 Windows default fresh clone 曾因 CRLF 失敗（audit I-1），舊 claim 由本次實測取代。
v1.0.1 在目前工作目錄及 repository 外、Windows Git `core.autocrlf=true` 的全新 clone 驗證；需要支援的 Node/npm 及已安裝 Playwright browsers。
兩邊全套 gates 均已通過（各 30 Node、4 artifact、48 browser）；fresh clone 的 `_headers` 為 `i/lf w/lf attr/text eol=lf`。首輪環境 timeout 與最終完整重跑證據見 v1.0.1 報告。

- [x] `npm ci`
- [x] `npm test`：30 項 product tests 全部保留；UTF-8／control characters 正常拒絕。
- [x] `npm run typecheck`
- [x] `npm run build`
- [x] `npm run test:artifact`：4 項，含 LF／CRLF parser 與 tracked／checkout／dist LF、CSP／headers／notices、精簡正式依賴、無 source map／test fixture。
- [x] `npm run test:browser`：Chromium、Firefox、Playwright WebKit，正式 build。
- [x] `npm audit`：零已知漏洞；`npm ls --omit=dev --all` 只有 encoder／decoder。
- [x] `git diff --check` 及 `git diff --cached --check`。
- [x] `package.json`／lockfile 版本一致為 `1.0.1`。
- [x] 測試結束後 4173／5173 無本專案 listener。
- [x] release commit、乾淨 working tree，再建立本機 annotated `v1.0.1` tag；原 `v1.0.0` target 不變。
- [x] `git remote -v` 為空；沒有 push、GitHub Release 或部署。

Browser 安裝：`npx playwright install chromium firefox webkit`。
Playwright WebKit is not the same as testing real Safari on macOS/iOS.

## Manual

下列硬體／平台項目此次皆為 **NOT VERIFIED**；依本次 patch acceptance contract，
不阻擋有誠實限制說明的本機 release baseline。正式使用前應完成適用項目：

- [ ] **NOT VERIFIED — real phone scan**：掃描短／中／長網址的畫面與下載 PNG，核對完整 path/query。
- [ ] **NOT VERIFIED — real Android**：Chrome 操作兩模式、選擇照片、PNG 下載、Copy、橫直向與放大。
- [ ] **NOT VERIFIED — real Safari on macOS/iOS**：選圖、檔案下載、剪貼簿成功／拒絕、鍵盤／觸控。
- [ ] **NOT VERIFIED — real printed scan**：PNG 插入 Word → PDF，保留白邊與正方形；以約 3 cm 短 QR 起步，長 QR 增大；列印後用手機掃描最終文件。
- [ ] **NOT VERIFIED — real camera photograph**：一般光照下拍攝文件 QR，確認選取照片後可在本地解析。
- [ ] **NOT VERIFIED — native browser zoom**：桌面 Ctrl/Cmd + 放大至 200%，檢查兩模式與焦點。自動化已另驗證等效 CSS viewport 與 200% 文字放大。
- [ ] **NOT VERIFIED — screen reader**：使用 NVDA／Narrator／VoiceOver，按下面順序實際聽取。

### Screen reader walkthrough

1. Tab 到模式 tablist，聽到名稱、選取狀態；方向鍵／Home／End 切換，隱藏面板不被朗讀或取得焦點。
2. URL → QR：讀出 URL label、完整 HTTP(S) 提示；空值／無效網址按 Generate 後聽到錯誤及 invalid 狀態。
3. 輸入有效網址，鍵盤 Generate；聽到成功 status，QR 有 accessible name；Tab 到 Download，Enter/Space 後保留焦點。
4. 修改輸入：舊 QR／Download 失效；狀態說明需重新產生。
5. QR → URL：讀出選檔 label、格式與大小限制；選有效 fixture，聽到成功 status；結果 textarea 可讀且唯讀，Tab 可達 Copy。
6. 選無 QR 與非 HTTP(S) QR：各有正確錯誤；不得讀出不支援的 raw payload；Copy 停用。
7. Copy 成功聽到確認；於瀏覽器拒絕剪貼簿權限時，聽到手動選取複製提示，結果仍可選取。
8. 解析 pending／Copy pending 時切換模式；隱藏面板後續的 status／alert 不應打斷目前模式；切回後可讀取結果。DOM accessibility tree 測試不能證明實際朗讀行為。

### Deployment (separate task)

- [ ] **NOT VERIFIED — hosted response headers / HTTPS**：確認 `_headers` 被供應商套用或已設定等價 HTTP headers；meta CSP 不能提供 frame-ancestors。
- [ ] **NOT VERIFIED — deployed subdirectory smoke**：若嵌入既有網站子路徑，確認 asset paths 及 header 規則範圍。

本任務沒有設定 remote、上傳網站、修改個人網站或建立遠端 release。

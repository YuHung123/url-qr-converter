# URL ↔ QR Code Converter

將網址轉為 QR Code，或從 QR Code 圖片讀取網址。v1.1.0 candidate，純前端工具。

## 使用方式

- **URL → QR Code**：輸入網址（如 `example.com/path?q=1`），按 Enter 或 **產生 QR Code**。省略 scheme 時預設補 `https://`；明確輸入的 HTTP／HTTPS 保持原 scheme。
- **下載**：主按鈕下載 PNG，右側選單提供 SVG、JPG、WebP。四種格式都是黑色 QR、白底及四格白邊；PNG 保持至少 1024 px 的無損輸出，SVG 直接由 QR matrix 產生向量圖。JPG／WebP 使用高品質瀏覽器編碼；文件排版優先使用 PNG 或 SVG。
- 編輯網址時保留已生成 QR；只有成功按下產生後才替換。驗證失敗也保留舊 QR，短提示標明網址已修改。下載始終代表目前顯示的 QR，與輸入草稿分開。
- **QR Code → URL**：選擇一張圖片或拖曳到上傳區。成功後可按右側 **複製網址** 圖示，或 **開啟連結**。剪貼簿不可用時，可在完整結果欄手動選取複製。
- 新圖片會清除舊解析結果。拖入多個檔案會提示一次只能選一張；非檔案內容會提示選擇圖片。明確不支援的格式會直接提示，檔案損毀則顯示讀取失敗；失敗後可重新選圖。不做批次處理。
- **開啟連結**只在使用者主動點擊後以新分頁前往已驗證的 normalized HTTP(S) URL，使用 `noopener noreferrer`；解析成功不會自動開啟。結果欄完整保留 host、path、query 與 fragment，可換行及捲動。請先確認網址，再開啟。

兩模式共用 HTTP(S) URL validation。先去除首尾空白，再拒絕其餘 raw ASCII C0／DEL 控制字元及 JavaScript whitespace；`%20` 等百分比編碼可用。明確的 javascript／data／file／blob／mailto／ws 等 scheme 仍拒絕，不會被補成 HTTPS。裸網域、含路徑或 query 的網域、`localhost` 與括號 IPv6 可省略 scheme；相對路徑及一般單詞不接受。`localhost`、IPv4 與括號 IPv6 含有效 port 時也可省略 scheme（如 `localhost:3000`、`127.0.0.1:8080`）；其他網域含 port 時請明確輸入 HTTP(S) scheme。Unicode 網域與路徑會標準化為 punycode／百分比編碼。格式驗證不代表網站存在或安全；既有 userinfo 接受行為保留，完整 normalized URL 就是開啟的網址。

QR 圖片主要支援 **PNG、JPEG、WebP、SVG**；GIF／BMP 依瀏覽器支援。SVG 只接受有限的靜態黑白 `rect`／`path` 幾何，包含本工具下載的 SVG；不接受 script、事件、CSS、外部資源或嵌入內容。原始 SVG 不會插入頁面或交給影像載入器，而是解析幾何後畫成受限尺寸的 canvas，交由同一 jsQR／UTF-8／網址驗證流程處理。HEIC／HEIF 不保證支援。檔案上限 **20 MiB**，一次只解析一張圖中的一個 QR；正常畫面不顯示限制，違反時才提示。選檔與拖曳共用大小限制、768 → 2048 分階段掃描、過期結果保護及 cleanup。

## 隱私

**Images, URLs and decoded payloads are processed locally in your browser and are not uploaded.**

沒有分析追蹤、cookies、localStorage、IndexedDB、Service Worker 或其他應用程式持久儲存。頁面載入時只取得網站自身的靜態資源；產生 QR、解析圖片、四種下載與複製不發送網路請求。結果留在目前頁面記憶體，重新載入即清除。只有使用者主動按 **開啟連結**，瀏覽器才會前往該外部網站；該網站的網路與隱私行為由該網站決定。下載檔與系統剪貼簿可在頁面外保留。靜態主機自身的存取紀錄取決於部署設定。

## 開發

使用 Node.js 22.12 以上的受支援版本及 npm，從本專案根目錄執行：

```sh
npm ci
npm run dev
```

開發網址預設 `http://127.0.0.1:5173`。使用 Vite、strict TypeScript、原生 HTML/CSS；正式依賴只有 `qrcode-generator@2.0.4`（MIT）與 `jsqr@1.4.0`（Apache-2.0），無傳遞 runtime dependencies。授權見 [THIRD_PARTY_NOTICES](public/THIRD_PARTY_NOTICES.txt)。

## 測試

```sh
npm test
npm run typecheck
npm run build
npx playwright install chromium firefox webkit
npm run test:browser
npm run test:artifact
npm audit
npm ls --omit=dev --all
```

Linux 若缺少瀏覽器系統函式庫，依 [Playwright 官方安裝說明](https://playwright.dev/docs/browsers#install-system-dependencies)使用 `npx playwright install --with-deps`；可能需要管理員權限。日常 Node 測試不需安裝 browser。

`test:browser` 自動建立正式 build，使用單一 worker 跑 Chromium、Firefox、WebKit；由 Playwright 管理 preview 的啟動與關閉，不重用已占用的 4173。只跑一種引擎可用 `npm run test:browser -- --project=firefox`。`test:artifact` 驗證最近的 `dist/`，請先 build，並在 Git checkout 中執行（LF byte gate 需要 Git metadata，Download ZIP 不含此資訊）。

瀏覽器測試包含功能、鍵盤、axe、responsive、真實 PNG／SVG／JPG／WebP 下載與 round-trip、SVG matrix 驗證、Enter／預覽保留、dropdown／drag-drop／Open Link、獨立 encoder fixture、race、網路／儲存與效能記錄。輸出 JSON、截圖與失敗 trace 在忽略的 `test-results/`；效能與密度資料另存為各測試目錄中的 JSON，亦附於 report。沒有額外 E2E 框架。兩張 committed fixture 合計不到 1 KiB；生成方式見 [fixtures](tests/fixtures/README.md)。

**Playwright WebKit is not the same as testing real Safari on macOS/iOS.** axe 亦不能代替螢幕閱讀器與人工驗收。v1.1.0 candidate 實測結果與硬體限制見 [V1_1_VERIFICATION](V1_1_VERIFICATION.md) 及 [RELEASE_CHECKLIST](RELEASE_CHECKLIST.md)。

## Production 與部署

```sh
npm run build
npm run preview -- --strictPort
```

`build` 先 typecheck，再產生 `dist/`；preview 預設 `http://127.0.0.1:4173`，完成後以 Ctrl+C 停止。將 **dist 的內容**放到提供 HTTPS 的靜態主機即可；相對資源路徑可放於子目錄。請透過 HTTP(S) 載入，不直接開啟 `file://`。

正式 HTML 含嚴格 meta CSP：

```text
default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'none'; object-src 'none'
```

[public/_headers](public/_headers) 會複製至 dist，HTTP CSP 與 meta 一致並額外加入 `frame-ancestors 'none'`；另設 `nosniff`、`no-referrer` 及停用 camera／microphone／geolocation。`frame-ancestors` 必須透過 HTTP header，不能靠 meta 生效。[MDN 說明](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors)

`_headers` 可供 [Netlify](https://docs.netlify.com/manage/routing/headers/)／[Cloudflare Pages](https://developers.cloudflare.com/pages/configuration/headers/) 的靜態資源使用，**不會在所有主機自動生效**。其他主機需設定等價 HTTP headers；若放入既有網站子目錄，請將 `/*` 規則限縮到該工具路徑。實際部署後應檢查 response headers。

開發模式為了 Vite HMR 不注入正式 CSP。一般 `npm run preview` 有 meta CSP，但不自動讀 `_headers`；browser suite 的小型 preview wrapper 會載入此檔以驗證 HTTP headers。未部署或修改任何公開網站。

## 文件與掃描建議

QR 使用 M 級錯誤修正、黑色、不透明白底、四格 quiet zone。PNG 最少 1024 × 1024，每格為整數像素：`(modules + 8) × ceil(1024 / (modules + 8))`。下載保留原始尺寸；畫面預覽 desktop 最多 240 CSS px、mobile 最多 200 CSS px。當 QR 達 version 17（85 格）以上，介面會提示改用下載圖片並保留足夠尺寸。

插入 Word／PDF 時保持正方形與四周白邊，避免 JPEG 重壓縮、裁掉白邊或用模糊截圖取代 PNG。普通短網址可先以約 **3 cm** 正方形排版；較長網址需更大。保守起點為每格約 **0.5 mm**，含白邊總寬約 `(modules + 8) × 0.5 mm`，這是排版建議，不是所有印表機／手機的掃描保證。必須掃描最終 PDF 與實際列印版本。真實手機和列印掃描仍列於 manual checklist。

## 限制

- 不提供相機掃描、裁切、批次、歷史紀錄、縮網址、自訂樣式、PWA 或後端。
- 過長網址超出 QR 容量時會失敗；高密度 QR 在小預覽中可能難掃，請用下載圖片並放大。
- 過低對比、嚴重模糊／透視、QR 太小、或過長截圖縮小後可能無法辨識。請裁出 QR 或使用清晰原圖。
- 解碼先嘗試最長邊 768 px，找不到 QR 才重試最多 2048 px；raster 小圖不放大，SVG 會先依幾何縮放至受限 raster 尺寸。raster 的初始圖片解碼仍可能配置原圖記憶體，20 MiB 檔案限制並非所有 image bombs 的防護保證。jsQR 同步執行，大型／複雜影像或資源吃緊的裝置可能暫時阻塞介面；Windows WebKit 實測曾出現秒級停頓，詳見 M3 報告。
- 只接受完整可驗證的 UTF-8 Byte segments；不支援所有 QR 字元編碼。jsQR 1.4.0 發布已久，固定版本並以測試保護。
- Copy 需瀏覽器允許 Clipboard API（部署請用 HTTPS）；拒絕時可手動複製。

[CHANGELOG](CHANGELOG.md) · [Release checklist](RELEASE_CHECKLIST.md) · [v1.1.0 candidate 驗證](V1_1_VERIFICATION.md) · [v1.0.1 驗證](V1_0_1_VERIFICATION.md) · [v1.0.0 獨立審查](V1_RELEASE_AUDIT.md)。M0／M1／M2／M3 驗證文件與 v1.0.0 audit 保留原始歷史結果。

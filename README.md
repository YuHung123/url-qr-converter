# URL ↔ QR Code

個人使用的小型純前端工具，用於將個人網站、採訪與文章網址製作成 QR Code，或從 QR Code 圖片讀取網址，方便放入備審資料與作品集。

**目前完成 M2 — QR Code Image → URL。** 支援 URL → QR Code + PNG Download，以及選擇 QR Code 圖片 → 本地解析網址 → Copy URL。

## 使用方式

1. 在 `URL → QR Code` 輸入完整網址，例如 `https://example.com/article?id=123`。
2. 按 **Generate QR Code**，成功後右側顯示 QR Code，輸入欄顯示實際編碼的標準化網址。
3. 按 **Download PNG**，下載 `qr-code.png`，可插入 Word／PDF 文件。

切換到 **QR Code → URL**，使用 **Choose QR Code Image**（瀏覽器的選擇檔案控制項）選取圖片。成功後顯示標準化網址，按 **Copy URL** 複製；若瀏覽器不允許剪貼簿存取，可在結果欄手動選取複製。僅接受 HTTP / HTTPS URL；不會顯示其他 QR payload，也不會自動開啟網址。

只接受 `http://` 或 `https://` 且具有效主機名稱的網址。先去除首尾空白，再由瀏覽器 `URL` parser 驗證並取得 `href`；例如根網址可能補上結尾 `/`，中文路徑會轉為百分比編碼。`example.com` 不會自動補成 HTTPS，空白、一般文字及 `javascript:`、`data:`、`file:` 等會顯示欄位錯誤。

修改輸入會立即清除舊 QR 並停用下載；需再次按產生按鈕，不會隨輸入自動產生。網址不會被開啟或送至任何伺服器，亦不會驗證網站是否存在或安全。

這是一個完全獨立的小型 Web 專案，使用自己的 package.json 與 lockfile，不依賴任何父專案。

## 安裝與開發

使用 Node.js 22.12 以上的受支援版本（建議 Node.js 24 LTS）及 npm。在本資料夾執行：

```sh
npm ci
npm run dev
```

開啟終端機顯示的本機網址，預設為 `http://127.0.0.1:5173`。開發伺服器只供本機開發，不是產品後端。

```sh
npm run typecheck
npm test
npm run build
npm run preview
```

`build` 先執行 typecheck，再輸出 `dist/`。`preview` 預設使用 `http://127.0.0.1:4173`，供本機驗證正式產物。部署時將 `dist/` 放至靜態網站主機；資源使用相對路徑，支援個人網站的子目錄。使用 HTTP(S) 服務，不以直接開啟 `file://` 作為支援方式。

## 技術與結構

使用 Vite、TypeScript、原生 HTML/CSS，執行時套件只有 `qrcode-generator@2.0.4` 與 `jsqr@1.4.0`，沒有 UI 框架或額外狀態管理。

此 encoder 提供瀏覽器 ESM 與內建 TypeScript 型別，無執行時相依套件；加入前已查核官方 API、npm metadata 與發布紀錄。這是長期存在的 QR 實作，2.0.4 於 2025-08-07 發布修正，屬低頻維護。使用 `qrcode(0, 'M')`、`addData`、`make` 與矩陣 API，不使用其 HTML 字串輸出。參考：[官方 API](https://github.com/kazuhikoarase/qrcode-generator/blob/master/js/README.md)、[2.0.4 發布紀錄](https://github.com/kazuhikoarase/qrcode-generator/releases/tag/js2.0.4)。

```text
url-qr-converter/
├─ index.html          # 語意化介面與兩種模式
├─ src/
│  ├─ main.ts          # 模式切換、產生／下載／解析／複製與畫面狀態
│  ├─ qr.ts            # URL 驗證、QR 矩陣繪製與 PNG 匯出
│  ├─ decode.ts        # 本地圖片讀取、尺寸限制、pixel 解碼與 URL 驗證
│  └─ styles.css       # 響應式版面與 focus 樣式
├─ tests/qr.test.mjs   # Node 內建測試：網址規則、ASCII、PNG 匯出失敗
├─ tests/decode.test.mjs # 真實 QR pixels、round trip、拒絕 payload、資源釋放
├─ public/favicon.svg # 本機圖示
├─ public/THIRD_PARTY_NOTICES.txt # 隨正式產物附上的 encoder／decoder 授權
├─ vite.config.ts     # 相對資源路徑、正式 build 的 CSP
├─ tsconfig.json      # strict TypeScript 設定
├─ package.json
├─ package-lock.json
└─ README.md
```

Decoder 使用 [jsQR 官方套件](https://github.com/cozmo/jsQR) `1.4.0`（Apache-2.0），直接接受 RGBA buffer，不含執行時相依套件、WASM、Worker 或遠端 API。加入前查核 [npm metadata](https://registry.npmjs.org/jsqr)：latest 為 1.4.0，發布於 2021-04-24，發布已久、維護活躍度有限。其純 JS API 適合本工具；版本固定並以整合測試保護目前功能。完整授權保留在 `public/THIRD_PARTY_NOTICES.txt`，build 自動複製至 dist。

## QR 與 PNG

固定使用 M 級錯誤修正、自動 QR 版本、Byte 模式、黑色方塊、不透明白底與四個模組寬的 quiet zone。編碼內容為標準化的 HTTP(S) URL，中文網域／路徑由 URL parser 轉為 ASCII 表示；送入 encoder 前會明確拒絕非 ASCII payload，避免 Byte 模式誤編碼。

Canvas 的每格使用整數像素，邊長為 `(模組數 + 8) × ceil(1024 / (模組數 + 8))`，因此至少 1024 × 1024，實際尺寸依網址長度略增並顯示在介面上。預覽以 CSS 縮小同一畫布，下載不縮小原始像素；PNG 為無損格式。放入文件時保留白邊，並依實際列印尺寸測試掃描。

下載以同一 Canvas 的 `toBlob('image/png')` 匯出，確認 MIME／非空後建立暫存 Blob URL，透過固定檔名下載；URL 於 60 秒後釋放。匯出期間若輸入變更或重新產生，舊匯出結果直接捨棄。匯出失敗顯示可重試的錯誤，保留目前 QR。匯出中以 busy 狀態與 aria-disabled 阻擋重複操作，保留下載按鈕的鍵盤焦點。

## 圖片解析

使用 `File → createImageBitmap → temporary Canvas → ImageData → jsQR → normalizeUrl()`。`accept="image/*"` 僅為選檔提示，實際仍由瀏覽器讀取圖片及抽取像素。檔案上限 20 MiB；Canvas 保持長寬比且最長邊不超過 2048px，不放大小圖。透明背景先合成白底；jsQR 嘗試一般及反白 QR。只處理單張圖片的一個 QR。

選擇新圖片立即清除舊 URL 並停用 Copy；操作代號保護非同步結果，舊解析與舊 Copy callback 不更新新狀態。解析不強制移動焦點，Copy busy 使用 `aria-disabled` 與 internal guard 阻擋重複操作。無效圖片、找不到 QR、不支援的 URL、解析失敗、檔案過大及複製失敗都有可見訊息。

完成後關閉 ImageBitmap、清除暫存 Canvas，檔案 input 不保留選取檔案參考，可重選同一張圖片。不建立圖片 object URL。瀏覽器初始圖片解碼仍可能需要原圖記憶體；Canvas 尺寸限制不等於限制原始 bitmap 的記憶體。極大圖片或縮放後過小／模糊的 QR 可能無法解析；請使用清晰圖片。

## 介面與可及性

- 預設為 `URL → QR Code`；另一模式為 `QR Code → URL`。
- 模式使用 tablist、tab、tabpanel、aria-selected、aria-controls 與單一 Tab 停駐點；左右方向鍵循環切換，Home/End 跳至首尾，Enter/Space 使用原生按鈕行為。
- Tab 可進入目前面板及可用欄位，隱藏面板不參與焦點順序；提供跳至主要內容連結與清楚的 focus 外框。
- 所有欄位具 label，限制說明透過 aria-describedby 關聯；結果初始為空、Copy 停用；解析狀態使用 status，錯誤使用 alert。
- 網址錯誤具 aria-invalid、關聯文字及 alert；QR 產生／下載錯誤亦有 alert。產生成功以簡短 status 宣告，Canvas 有包含對應網址的 accessible name，不主動搬移焦點。
- 桌面並排顯示輸入與結果；640px 以下改為單欄。使用系統字型，不載入外部字型或圖像。

## 安全與隱私

**Images and URLs are processed entirely in the browser and are not uploaded.**

QR 編碼、PNG 匯出與圖片解碼全程在瀏覽器內完成，encoder／decoder 隨本地 bundle 載入。沒有第三方 QR API、遠端圖像、上傳、帳號、分析追蹤、資料庫、localStorage 或快取服務。網址與預覽只存在本次頁面狀態；PNG 僅由使用者主動下載。

應用程式不使用 inline JavaScript、eval 或 HTML 字串插入。TypeScript 開啟 strict、索引存取檢查及未使用程式碼檢查。依賴與產物、環境檔不納入 Git；前端不得放入 secret 或 API key。

正式 build 由 Vite 注入 meta CSP：預設禁止資源，僅允許同來源 script、style、image，禁止網路連線、表單提交、object 與 base URL 覆寫。M1 使用 Canvas 預覽，Blob URL 只供下載；M2 使用 createImageBitmap 與暫存 Canvas，因此 CSP 維持 M0 原樣，沒有新增 `blob:`／`data:` 圖像權限、wildcard 或 unsafe-inline。開發環境不套用正式 CSP，以保留 Vite 熱更新；正式產物另行驗證。Meta CSP 不提供 frame-ancestors 防護；部署端安全標頭留待 M3。

## V1 里程碑

- **M0 — Completed**：專案、模式切換與基本介面。
- **M1 — Completed**：URL → QR Code + PNG Download。
- **M2 — Completed**：QR Code Image → URL；選擇 QR Code 圖片、解析結果與複製網址。
- **M3 — Testing, Security, Accessibility & Release**：測試、資安、無障礙與發布。

V1 不包含相機掃描、拖放、剪貼簿圖片、SVG 匯出、QR 樣式與 Logo、歷史紀錄、縮網址、批次、PWA、離線快取或後端服務。

## 驗證

`npm test` 使用 Node 內建 test runner 與 TypeScript type stripping，不加入測試框架。20 項測試涵蓋既有 URL validation、ASCII invariant、hostname guard、PNG failure，以及四種 encode → render → decode round trip、空白圖、非 URL／禁止 scheme、decoder 例外、尺寸限制和 bitmap cleanup。

正式 preview 的 Chrome 驗證涵蓋實際下載 PNG 再解析、真實 clipboard、Copy failure／focus、decode／Copy／Download race、圖片格式與縮放、四種 responsive 寬度、CSP／network／storage。詳細實際結果與限制見 [M2 驗證紀錄](M2_VERIFICATION.md)。

[M0](M0_VERIFICATION.md)、[M1](M1_VERIFICATION.md)、[M1 review fixes](M1_REVIEW_FIXES_VERIFICATION.md) 保留為歷史紀錄。Firefox／Safari、實體裝置與列印掃描、螢幕閱讀器及公開部署驗收留待 M3，尚未宣稱完成。

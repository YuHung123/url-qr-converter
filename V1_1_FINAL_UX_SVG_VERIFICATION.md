# v1.1.0 Final UX + SVG Verification

日期：2026-10-02。基礎 HEAD：`0fde32f`。本輪沒有修改既有 audit 文件、版本、CSP 或 production dependencies；沒有 commit、tag、push、release、deploy。

## 1. Executive Summary

完成最後一輪可見文案精簡，並讓本工具下載的 SVG QR 透過受限靜態幾何 rasterization 回到原有 jsQR、fatal UTF-8 與 URL normalization 流程。最終 gate 結果及狀態見第 9、16 節。

## 2. UI Copy Cleanup

- URL 欄位沒有 placeholder；移除「可省略 https://」提示，保留原 scheme-less 行為。
- 兩個可見欄位 label 均為「網址」；頁面標題維持 `URL ↔ QR Code`。
- 「已產生 QR Code」、「已找到網址」只存在 visually-hidden live region；QR 預覽標題也隱藏但保留 heading 語意。
- 修改草稿顯示「網址已修改，請重新產生。」；既有 85 modules 門檻成立時才顯示「QR Code 較密，建議下載後掃描。」。
- 上傳區只顯示「選擇圖片或拖曳到這裡」；原生檔名占位文字、正常狀態的單檔／20 MiB 說明與結果 placeholder 都不顯示。

## 3. Accessibility Preservation

原生 file input 仍可聚焦、以 Space 開啟選檔器，也可由可見 label 點擊觸發；它以 visually-hidden CSS 保留在 accessibility tree，accessible name 為「QR Code 圖片」。drop zone 是名稱為「QR Code 圖片上傳區」的 group，focus-within 有清楚外框。URL 與結果欄保留 `<label>`，Copy 圖示名稱仍為「複製網址」。成功狀態使用 `role=status`／`aria-atomic` 的 visually-hidden live region；錯誤仍是 alert。下載選單的 menu／menuitem／鍵盤語意沒有修改。隱藏節點只佔 1×1 CSS px 且絕對定位，不留出可見空白。

## 4. Error Messages

| 情境 | 最終可見文字 |
| --- | --- |
| 圖片沒有 QR | 圖片中找不到 QR Code。 |
| 明確不支援格式 | 不支援此檔案格式。 |
| 支援格式損毀、無法讀取 | 無法讀取這張圖片。 |
| 超過 20 MiB | 圖片檔案過大（上限 20 MiB）。 |
| 同時 drop 多檔 | 一次只能選擇一張圖片。 |
| QR payload 不是網址 | 這個 QR Code 不是網址。 |

以上在 browser test 以 exact text 斷言；空的非檔案 drop 仍提示「請選擇一張圖片。」。

## 5. SVG Decode Architecture

`decodeImage()` 先檢查 20 MiB 上限，再讀前 512 bytes：辨識 SVG 起始標記與 PNG／JPEG／WebP／GIF／BMP signature；明確支援的副檔名／MIME 可讓損毀檔進入「無法讀取」分類。內容 signature 優先，所以偽裝為 PNG 的有效 SVG 仍走 SVG 路徑。無法辨識且未宣告支援格式的檔案直接判為 unsupported。

SVG 原文只交給小型、完整錨定的靜態語法驗證器。它只接受 SVG namespace、有限數值尺寸與 viewBox、黑白 `rect`／`path` 以及固定的 `crispEdges` 屬性；其餘標記、屬性、CSS、URL、事件與 script 全部拒絕。原文不進 DOMParser、不進頁面 DOM、不進 `<img>`／`createImageBitmap`／object URL。通過後以 Canvas API／Path2D 畫純幾何，透明背景先補白。SVG 文字最多 1,000,000 字元，幾何與元素數均有上限，宣告尺寸不得超過 2048；實際 canvas 仍只走最長邊 768 → 必要時 2048 的階段。PNG／JPG／WebP 原有 `createImageBitmap` 路徑保留。

兩種輸入最後共用 `getImageData → decodePixels → jsQR → 每段 Byte fatal UTF-8 → normalizeUrl()`，以及原有 generation guard、結果欄、Copy、Open Link policy。沒有第二套 QR parser。

## 6. SVG Security Tests

在正式 dist／原 CSP 下，上傳含 `<script>`、`onload`、外部 `<image href>`、`<style>@import`、`xml-stylesheet`、外部 `<use href>`、`foreignObject`、`data:`／`javascript:` URL、CSS `url()` 的 SVG。全部被拒絕；另測損毀 XML、巢狀 path、極大 viewBox／width。測試同時監聽 request、requestfailed、pageerror、console error、navigation、CSP violation，並核對 page DOM 與 script sentinel。安全性依據是實際路徑在任何瀏覽器文件／影像解析前拒絕非幾何標記，不只依賴瀏覽器剛好不執行 payload。

## 7. SVG Round-trip

短 ASCII、Unicode／IDN normalized URL、中密度 URL 各自執行 Generate → Download `qr-code.svg` → picker decode → drag/drop decode，結果逐字等於同一 normalized URL。另驗證 SVG → Copy、SVG → Open Link 的 explicit popup／`noopener noreferrer`，以及偽裝 PNG MIME／副檔名的 SVG 內容辨識。SVG 與 raster 交錯的 stale decode 不得覆寫較新結果。

## 8. Existing Regression

既有 scheme-less、localhost port、Enter Generate、草稿／已產生 QR 分離、四種下載、PNG／JPG／WebP 解析、獨立 QR fixture、UTF-8、20 MiB、768 → 2048、cleanup、stale export／decode／Copy、dropdown、drag/drop、Copy、Open Link、CSP、無 storage／背景網路均保留原測試覆蓋。只調整兩個舊 race 測試，使其等待新增 header sniff 之後的 bitmap 攔截器就緒；原競態與斷言維持。

## 9. Browser Tests

最終 `npm run test:browser -- --config=/tmp/qr-playwright.config.mjs`：**93/93 PASS**，Chromium **31/31**、Firefox **31/31**、Playwright WebKit **31/31**，歷時約 3.7 分鐘。JSON report：expected 93、skipped 0、unexpected 0、flaky 0、errors 空，93 個 results 的 retry 都是 0。相對 m-3 的 78/78，新增 5 tests／engine（總增 15）；既有 26 tests／engine 保留。`npm test` 對兩個 Node test files PASS，檔內共 **37/37** subtests（22 decode + 15 QR）；`npm run typecheck`、`npm run build`、`npm run test:artifact` **4/4** 皆 PASS。

此 Linux 工作環境原本缺少 Playwright browsers／共享函式庫。瀏覽器及依 lockfile 的 Node 套件已補齊；共享函式庫只解到 `/tmp`，沒有安裝到系統。WebKit bundle wrapper 會覆蓋 `LD_LIBRARY_PATH`，因此暫存 config 只將 WebKit executable 指向 `/tmp` 的等價 launcher，並用 `PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1` 略過依賴「已安裝套件」標記的 host 預檢。三個真實 browser processes 均執行；專案的 testDir、測試、preview server、reporter、timeout、single worker 與 `retries: 0` 保持不變。此環境調整沒有進入 repository。

## 10. Axe / Accessibility

原 suite 對兩模式 initial／error／success 及展開下載選單執行 axe，共 7 scans／engine、**21 scans，0 violations**；沒有 disable rules。新增三引擎 browser assertions 檢查 file input／drop zone／result／Copy 的 accessible name、隱藏成功狀態仍在 accessibility tree、Space 選檔及 focus-visible。實際 screen reader 朗讀仍是人工項目。

## 11. Security / Privacy Runtime Probe

正式 dist 上的既有安全測試涵蓋 Generate、四種下載、raster decode、Copy、storage 與 CSP。新增惡意 SVG probe 驗證操作期間 0 新 external request、0 failed request、0 pageerror、0 console error、0 unexpected navigation、0 DOM injection、0 script execution、0 CSP violation；Open Link 只在明確點擊後導航。

## 12. Dependencies / CSP

`package.json`／`package-lock.json` 仍是 `1.1.0`，production 僅 `jsqr@1.4.0`、`qrcode-generator@2.0.4`。未新增 dependency。`vite.config.ts`、`public/_headers` 均未修改；正式 CSP 仍為 `default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'none'; object-src 'none'`，HTTP header 另有 `frame-ancestors 'none'`。

`npm audit`：**0 vulnerabilities**；`npm ls --omit=dev --all`：僅上述兩個 runtime packages。

## 13. Responsive QA

Browser suite PASS：1440、1280、768、375、320 CSS px 與 640 CSS px／200% 文字放大等效 reflow，覆蓋兩模式、QR、選單、長結果與錯誤狀態，沒有 horizontal overflow 或控制項越界。目視檢查 Chromium 1440／320 的 encode、decode success 截圖及兩模式 200% 文字放大截圖：drop zone、結果欄、Copy、下載選單、提示與錯誤區沒有塌陷或多餘空白。此 Linux 環境缺少中文字型，截圖中文顯示為方框；字形品質與 native 200% browser zoom 留待實機檢查。

## 14. Git State

開始前工作樹 clean；HEAD `0fde32f` 包含前兩輪實作與審查 commit。最後 HEAD 仍為 `0fde32f`，工作樹含本輪 source／tests／README／CHANGELOG／本報告的未提交修改。`v1.0.0`、`v1.0.1` annotated tag objects／targets 與既有 audit 記錄相同，無 `v1.1.0` tag。`package.json`／lockfile root／lockfile package version 均為 `1.1.0`；`git diff --check` PASS。沒有 commit、push、release、deploy。

## 15. Remaining Manual Checks

仍未驗證：real phone scan、real Android、real Safari、printed scan、real camera photo、screen reader、native 200% zoom、hosted HTTPS／response headers、deployed subdirectory。Playwright WebKit 不等同實機 Safari。

## 16. Final Status

**READY_FOR_REVIEW**（本機 v1.1.0 candidate）。必要 automated gates 皆 PASS，無 skipped／retry／flaky、axe 違規、audit 漏洞或未解決的產品 regression。第 15 節項目依要求保留為 NOT VERIFIED；沒有發布或部署。

# M1 工作報告與驗證紀錄

日期：2026-09-29。此次實作僅修改 `url-qr-converter/`，保留 M0 版面與模式切換，未實作 M2 或其他 V1 範圍外功能。

## 1. 實作摘要

完成完整 HTTP(S) URL 的驗證、QR Code 產生、Canvas 預覽與 PNG 下載。修改網址立即清除舊預覽並停用下載；非同步 PNG 匯出期間若輸入或產生結果改變，舊匯出結果不會下載。錯誤顯示於欄位／QR 區域，可修正後重試。

## 2. 主要檔案

| 檔案 | 用途 |
| --- | --- |
| `src/qr.ts`（新增） | 網址正規化／驗證、QR 矩陣繪製、PNG Blob 匯出 |
| `src/main.ts` | 接上產生／下載按鈕，管理結果、錯誤與過期匯出 |
| `index.html` | M1 文案、Canvas 容器、URL alert 與 QR status／alert |
| `src/styles.css` | 啟用按鈕、錯誤樣式、響應式 QR 畫布 |
| `tests/qr.test.mjs`（新增） | Node 內建測試，覆蓋網址規則與匯出錯誤 |
| `package.json`／`package-lock.json` | 唯一新正式依賴與 `npm test` 指令 |
| `public/THIRD_PARTY_NOTICES.txt`（新增） | encoder 的 MIT 授權，隨 build 複製至 dist |
| `README.md` | M1 使用說明、技術決策與里程碑狀態 |

Vite／TypeScript 設定及 M0 歷史驗證紀錄保持原樣。

## 3. Encoder 選擇

使用 `qrcode-generator@2.0.4`。加入前查核 npm registry metadata、官方型別與 API，以及[官方發布紀錄](https://github.com/kazuhikoarase/qrcode-generator/releases/tag/js2.0.4)：這是長期存在、低頻維護的專案，最新版於 2025-08-07 發布修正，具有 ESM 與內建 TypeScript 型別，沒有執行時相依套件。API 可直接取得 QR 矩陣，適合本工具自行繪製 Canvas。

正式依賴只新增此 encoder。它隨 Vite bundle 在本地執行，不呼叫 QR API；未新增 decoder、框架或伺服器套件。原始碼未使用套件提供的 HTML 字串產生方法。

## 4. URL validation

先 JavaScript trim，再以 `new URL()` 解析；僅接受 `http:`／`https:`、明確的 `http://`／`https://` 前綴與非空 hostname。另拒絕 hostname 內的空白或未解碼百分比跳脫，避免不同 parser 寬鬆程度造成差異。路徑及 query 的百分比編碼不受此規則影響。

成功後以 `URL.href` 作為 QR 內容並顯示回輸入欄。根網址的結尾 `/`、主機大小寫、中文網域／路徑等依標準 parser 正規化；不自動替缺少 protocol 的網址補上 HTTPS。格式驗證不代表 DNS 查詢、網站可用性或安全性檢查。

## 5. QR generation

固定自動 QR 版本、M 級錯誤修正、Byte 模式、不透明白底、純黑方塊與四格 quiet zone。以標準化後的 URL ASCII 表示編碼。畫布每格使用整數像素，避免輸出邊界模糊；邊長至少 1024，依模組數略增。介面會顯示實際 PNG 像素尺寸。

正式驗證樣本尺寸為 1025、1036、1056、1060 像素的正方形。預覽使用同一個 Canvas，以 CSS 縮小顯示，不縮小下載來源。

## 6. Download

由 Canvas `toBlob(..., 'image/png')` 匯出，拒絕 null、空檔或非 PNG MIME。透過 Blob URL 與固定檔名 `qr-code.png` 觸發下載，60 秒後 revoke URL。下載不需網路，也不重新編碼 QR。

匯出失敗保留 QR 供重試。瀏覽器是否允許下載、使用者取消或磁碟最終保存結果，不是此 Web API 能可靠回報的狀態；介面不宣稱檔案已成功儲存。

## 7. Accessibility／security／privacy

- 延續原有 tablist、方向鍵／Home／End 與 focus 外框；按 Space 可啟動 Generate，成功後焦點維持原按鈕。
- URL 錯誤透過 aria-invalid、aria-describedby 與 alert 取得；QR 失敗另有 alert。狀態訊息簡短，Canvas 具對應網址的 accessible name。
- 初始及輸入修改後 Download 停用；成功產生才啟用。M2 選圖與複製仍停用。
- 正式 CSP 完全維持 M0，包含 `connect-src 'none'`、`img-src 'self'`。Canvas 預覽不需新增 blob/data 圖像權限。
- 無第三方請求、上傳、儲存輸入、analytics 或 tracking。輸入只用於 URL parser、encoder、欄位值及安全 DOM 屬性／文字設定，沒有 eval 或不安全 HTML 插入。

## 8. 實際驗證結果

環境：Windows Node.js 24.19.0、npm 11.17.0、Vite 8.3.1、TypeScript 5.9.3、Chrome 153.0.8010.53。

| 驗證 | 結果 |
| --- | --- |
| `npm install --save-exact qrcode-generator@2.0.4` | 通過，安裝 audit 回報 0 vulnerabilities |
| `npm ci` | 通過；第一次遇到 M0 遺留 Vite 的檔案鎖，停止本工具的兩個舊伺服器後重跑成功 |
| `npm run typecheck` | 在 `npm run build` 內實際執行 `tsc --noEmit`，通過 |
| `npm test` | 3 個測試群組通過，涵蓋 6 種接受輸入、18 種拒絕輸入，以及 PNG null／空檔／錯誤 MIME／同步例外 |
| `npm run build` | 通過；HTML 5.88 kB、CSS 5.26 kB、JS 24.74 kB（gzip JS 9.23 kB） |
| 正式 bundle／lockfile 檢查 | encoder 已打包，沒有 decoder 或 scanner 依賴；授權檔存在於 dist |
| Vite 開發／正式預覽 | 透過 Vite API 在 5173／4173 啟動並實際載入，完成後關閉 |
| Chrome 操作與畫面 | 下述瀏覽器案例全部通過；另檢視 1280／375px 截圖與實際 PNG |

瀏覽器驗證以暫存 Playwright 操作真實 Chrome headless，未加入專案測試框架。獨立的 jsQR／pngjs 只安裝於系統暫存工具目錄，用於掃描實際下載檔；未加入此專案 package.json、lockfile、原始碼或 bundle。暫存腳本、PNG 與截圖位於 Git 忽略範圍。

開發版與正式版皆驗證：

- 六組有效輸入：HTTPS 根網址、HTTP 根網址、path、query＋fragment、首尾空白、中文網域＋路徑＋query。每組實際下載 PNG，共十二個檔案。
- 檔案存在、PNG signature 正確、可解析、至少 1024 正方形、像素全為不透明黑白且非空白、四格白邊。下載 PNG 與預覽的每個像素一致；十二個檔案皆由獨立 scanner 掃描出正確的標準化 URL。
- 空字串、空白、一般文字、裸網域、JavaScript／data／file URL、缺少 hostname、hostname 含空白／`%20` 均被拒絕，顯示錯誤、無 QR 且無法下載。
- URL A 產生後修改成 B：舊 QR 消失、下載停用；重新 Generate 後預覽對應 B。
- 真正超出容量的 5,000 字元路徑導致產生失敗，介面顯示錯誤；改為正常網址後可恢復。
- 注入 toBlob 回傳 null、同步例外、createObjectURL 例外，皆有使用者可見錯誤，保留 QR 並可成功重試下載。
- 延後匯出 callback 後修改輸入／重新產生：舊匯出不下載，也不破壞新結果的下載按鈕狀態。
- 鍵盤啟動 Generate、可見 3px focus、模式切換與 M2 停用狀態正常。
- 1280、768、375、320px 下兩模式皆無水平溢出，桌面雙欄與手機上下堆疊正常。
- Console warning/error、pageerror、HTTP 失敗、CSP 違規與外部請求皆為零；localStorage 為空。

驗證中曾發現 Chrome 將主機內空白保留為百分比跳脫，已補強 hostname 檢查並重跑上述案例通過。

## 9. 已知限制

未以實體手機相機掃描或實際列印，未驗證 Safari、Firefox、螢幕閱讀器與公開部署。網址超過 encoder 容量會顯示產生錯誤。檢查涵蓋瀏覽器操作、自動掃描與截圖檢視，不宣稱已完成 M3 的完整跨瀏覽器、無障礙或發布驗收。

## 10. M2 readiness

目前架構可直接開始 **M2 — QR Code Image → URL**：保留既有選圖、結果與複製控制項，可在 `src/` 新增圖片解析模組並接入。M1 沒有提前實作圖片解析或加入產品用 decoder。

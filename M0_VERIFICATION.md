# M0 驗證紀錄

驗證日期：2026-09-29。範圍為獨立的 `url-qr-converter/` 子專案，既有 Special Admission Tracker 的原始碼、依賴與設定未修改。

## 環境與指令

使用 Windows Node.js 24.19.0、npm 11.17.0、Vite 8.3.1、TypeScript 5.9.3 與 Chrome 153.0.8010.53。此工作環境透過 WSL 呼叫 Windows Node.js；沒有 Linux Node.js。以下為對應的標準 npm 指令。

| 項目 | 實際結果 |
| --- | --- |
| `npm install` | 通過，產生 lockfile；安裝時 audit 回報 0 vulnerabilities |
| `npm ci` | 通過，依 lockfile 重新安裝 |
| `npm run typecheck` | 在 `npm run build` 內實際執行 `tsc --noEmit`，通過 |
| `npm run build` | 通過，產生 HTML、CSS、JS 與 favicon |
| `npm run dev -- --strictPort` | 通過，127.0.0.1:5173 正常啟動與載入 |
| `npm run preview -- --strictPort` | 通過，127.0.0.1:4173 正常啟動與載入 |

正式輸出大小：HTML 5.44 kB、CSS 4.79 kB、JS 1.27 kB（未壓縮傳輸大小；不含 favicon）。

## 瀏覽器驗證

使用暫存安裝的 Playwright 操作本機 Chrome headless，分別驗證開發頁與正式預覽頁。工具、檢查腳本及截圖未加入專案依賴或 Git；專案未新增測試框架。

- 頁面標題與預設 `URL → QR Code` 模式正確。
- 點擊可切換兩個模式，隱藏面板不顯示。
- 左右方向鍵可循環切換；Home/End 可跳至首尾；Enter/Space 操作不出錯；aria-selected 與焦點同步。
- Tab 可依序到達跳至內容連結、目前 tab、目前面板及可用欄位，略過停用元件與隱藏面板。
- 鍵盤操作 tab 時符合 `:focus-visible`，計算後外框為 3px solid。
- 全部 input 與 textarea 具關聯 label。
- 產生、下載、選圖與複製控制項皆停用；結果初始為空，預覽不含假 QR 圖、canvas 或 SVG。
- 輸入網址後按 Enter 不導覽、不提交；切換模式保留欄位內容。
- 1280、768、375、320px 寬度下，兩模式均無水平溢出；桌面為雙欄，手機為上下堆疊。
- 檢視正式版兩種模式的 1280px 與 375px 完整頁面截圖，內容可讀且沒有遮擋。
- Console warning/error、pageerror、失敗請求及 HTTP 400 以上回應均為零。
- 正式版存在 CSP，開發版不注入正式 CSP；兩者均無 CSP 違規事件。
- 測試過程未出現外部來源請求；localStorage 保持空白。

## 原始碼檢查與範圍

程式碼只處理模式切換，不含 QR encoder/decoder、PNG 匯出、剪貼簿存取、網路上傳或儲存行為。未使用 inline JavaScript、eval、innerHTML 或其他 HTML 字串插入。只有 Vite 與 TypeScript 為直接開發依賴，無執行時套件。`.gitignore` 排除依賴、產物、環境檔與暫存驗證材料。

M1 可直接接入既有網址欄位、產生按鈕、預覽容器與下載按鈕，再加入 encoder 與必要的網址驗證、錯誤狀態、PNG 行為及 CSP 圖像來源設定。

## 驗證限制

尚未驗證實體手機、Safari、Firefox 或螢幕閱讀器；本次手機檢查使用 Chrome 視窗尺寸模擬。尚未部署至公開網站，也未驗證實際主機安全標頭或子路徑部署。M1/M2 的功能尚未實作，故沒有轉換正確性與下載／解析測試。完整跨瀏覽器、無障礙及發布驗收留待 M3。

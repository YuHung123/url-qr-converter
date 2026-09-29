# M1 Review Fixes 驗證紀錄

日期：2026-09-29。專案位置：桌面 `url-qr-converter/`。此次僅處理 M1 審查修正、專案清理與獨立 Git baseline；沒有實作 M2、換 encoder 或新增 dependency。

## 1. Review findings addressed

依本次任務列出的 review findings 對應：

| 項目 | 處理 |
| --- | --- |
| m-1 | 在 `createQrCanvas()` 的 encoder 呼叫前明確檢查 ASCII invariant，並新增 Unicode 正規化與非 ASCII 拒絕測試 |
| m-2 | 匯出期間改用 busy 狀態與 `aria-disabled`，保留 Download PNG 的鍵盤焦點；重複啟動直接返回 |
| m-4 | 抽出 `assertHostnameCharacters()`，直接測試額外 hostname 字元規則，不依賴 Node parser 是否提前丟錯 |
| m-6 | 清除根目錄 `.vite/` 的舊驗證產物，修正 README 的搬移上下文並建立獨立 Git baseline |

## 2. Code changes

- `src/qr.ts`：新增 ASCII guard；將現有 hostname 字元規則抽成小型 pure helper。
- `src/main.ts`：新增單一 busy boolean；以 `aria-disabled` 取代匯出期間的 native disabled，保留既有結果身分比對。
- `src/styles.css`：busy 按鈕沿用停用樣式，保持 focus 外框。
- `tests/qr.test.mjs`：新增三組高價值 regression tests，保留原三組測試。
- `README.md`：獨立專案說明、從專案根目錄執行指令，以及 ASCII／focus／測試說明。
- `.gitignore`：保留原有精準忽略規則，僅補上 `Thumbs.db` 與 `Desktop.ini`。
- `M1_REVIEW_FIXES_VERIFICATION.md`：本次工作、驗證與 baseline 紀錄。

package.json、lockfile、HTML、TypeScript／Vite／CSP 設定、encoder 版本與 QR 參數未修改。M0／M1 驗證紀錄保留歷史時點的資訊，不改寫過去的測試結果。

## 3. ASCII invariant

支援的 HTTP(S) URL 經標準 parser 正規化後，IDN hostname 使用 punycode，Unicode 路徑與 query 使用百分比編碼。因此 encoder 的輸入應為 ASCII。`qrcode-generator` 的預設 Byte 轉換不是完整 UTF-8，不能將任意 Unicode 直接傳入。

`createQrCanvas()` 在建立 QR encoder 及呼叫 `addData()` 前檢查 payload；任何超出 ASCII 的字元都會拋出包含 ASCII 說明的錯誤，不會默默截斷或產生 QR。

新增測試確認 Unicode hostname、path、query／emoji、組合網址的輸出全部為 ASCII，保留 URL 意義且正規化可重複套用；另以 punycode、解碼路徑及 query 值核對內容。直接把非 ASCII payload 傳入真正的 `createQrCanvas()` 時必須明確失敗，無需 DOM mock 或 encoder 替身。

## 4. Focus fix

原先匯出時設定 native disabled，會讓 Chrome 將焦點從 Download PNG 移到 body。採用方案 A：匯出期間按鈕保持原生可聚焦，設定 `aria-disabled="true"` 與 busy 狀態，handler 首先阻擋重複操作。成功或失敗後清除 busy／ARIA 狀態，不主動移動焦點。

無結果及修改輸入後仍使用 native disabled。`clearResult()` 會重設 busy，舊匯出的成功、錯誤與 finally 仍受 `generated === result` 保護；所以舊 callback 不會解除新匯出的 busy 狀態，也不會下載過期 PNG。切換模式或移動焦點不會在 callback 完成時被強制拉回。

## 5. Validation test improvement

Node 的 URL parser 可能在 hostname guard 前就拒絕空白或百分比跳脫，因此原有案例不能單獨證明該 guard 有效。現在由實際的 `normalizeUrl()` 呼叫 `assertHostnameCharacters()`，測試亦直接呼叫同一 helper，覆蓋空格、Tab、換行、不換行空白、`%20` 與 `%09`；正常域名、punycode、localhost、IPv4／IPv6 仍通過此字元規則。

沒有新增 DNS、fetch、HEAD 或網站可用性檢查；格式驗證不表示網站存在或安全。

## 6. Project cleanup

刪除專案根目錄 `.vite/` 中已確認的 24 個 scratch 檔案：`m0-check.cjs`、`m1-check.cjs`、22 個畫面截圖及下載 PNG。它們不是正式 source 或 Vite configuration；`vite.config.ts` 未修改。

本次沿用既有 M1 驗證腳本及已安裝的 scanner，只在系統 Temp 加入焦點／busy regression 操作並執行，產物未放回專案。沒有建立新的測試框架，也沒有新增專案依賴。

README 移除 SAT 父專案描述與多餘的 `cd url-qr-converter`，指令皆從獨立專案根目錄執行。原 `.vite/`、`node_modules/`、`dist/`、`.env*` 等忽略規則足以排除驗證材料；只補上 Windows OS 檔案，沒有全面忽略 PNG 或 JavaScript 正式檔案。

## 7. Git baseline

開始時沒有 `.git` 或既有 Git history，已用 `git init -b main` 初始化桌面專案自己的 repository。

- Baseline commit：`67c8de88d606691f6d069ced7dcfb1c8876e046b`。
- Commit message：`feat: establish M1 url to qr baseline`
- 正式追蹤內容：M0／M1 原始碼、review fixes、tests、README、三份驗證紀錄、授權、lockfile 與設定。
- 不納入：node_modules、dist、舊 `.vite/`、下載 PNG、截圖、scratch scripts、secrets 或 OS 檔案。
- 沒有建立 remote，沒有 push。

baseline 本身包含本報告；後續僅以 `docs: record verified M1 baseline commit` 提交記錄實際 baseline hash。原 baseline 不改寫，正式程式碼不變，工作樹保持乾淨。

## 8. Verification results

環境：Windows Node.js 24.19.0、npm 11.17.0、Chrome 153.0.8010.53；從搬移後的專案根目錄執行。

| 項目 | 結果 |
| --- | --- |
| `npm ci` | 通過，17 個套件安裝完成，audit 回報 0 vulnerabilities |
| `npm test` | 6 組全部通過：原三組＋Unicode 正規化 ASCII、非 ASCII encoder guard、hostname guard 直接測試 |
| `npm run build` | 通過，包含 `tsc --noEmit`；正式 JS 24.97 kB／gzip 9.33 kB |
| 開發與正式頁面 | 以 Vite API 啟動 5173／4173，Chrome 實際載入，測試後伺服器正常關閉 |
| QR／PNG | 各測六種網址（HTTPS、HTTP、path、query、trim、Unicode），共十二個下載 PNG，全部與預覽像素相符且由獨立 scanner 掃描出正確 URL |
| 無效輸入 | 空白、一般文字、裸網域、禁止 scheme、無效 hostname 皆拒絕；Download 停用 |
| Focus | 輸入欄 Tab 到 Generate、Space 產生、Tab 到 Download；連續 Enter／Space 下載後仍為 activeElement，focus-visible 與 3px 外框保留 |
| Busy 與 race | 延後 toBlob callback；重複 Enter／Space／click 僅一次匯出。修改輸入清除舊 QR，新匯出啟動後舊 callback 不解除新 busy 或觸發舊下載；新 PNG 另經 scanner 核對 |
| 錯誤重試 | toBlob null、同步例外、Blob URL 建立失敗皆顯示錯誤，保留焦點且可再次下載；超長網址產生失敗後可恢復 |
| 模式／版面 | M2 仍停用，鍵盤切換正常；1280／768／375／320px 無水平溢出，另檢視桌面／手機截圖 |
| Console／CSP／network | 兩版本均無 warning/error、pageerror、失敗 HTTP、CSP violation 或外部請求；localStorage 保持空白 |

瀏覽器檢查沿用暫存 Playwright 操作真實 Chrome headless 的滑鼠／鍵盤流程，並人工檢視截圖；scanner 沿用系統 Temp 中既有 jsQR／pngjs。沒有把這些工具、PNG 或截圖放進 repository，沒有新增測試框架。不宣稱完成實體裝置或螢幕閱讀器驗收。

## 9. Remaining items for M3

- Very-long-URL 的高密度 QR 在 320 CSS px 預覽下可能不易掃描；保留至 M3 評估提示，未改 UI 尺寸或加入縮網址。
- Firefox／Safari 驗證。
- 實體手機掃描與實際列印掃描。
- 螢幕閱讀器完整驗證。
- 公開部署與實際主機的安全標頭。

## 10. M2 readiness

可以開始 **M2 — QR Code Image → URL**。本次修正與既有 M1 流程已完成上述驗證，沒有已知阻擋事項；M2 仍未實作，也未加入 decoder dependency。

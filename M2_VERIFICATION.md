# M2 — QR Code Image → URL 驗證紀錄

日期：2026-09-29。基礎為獨立 repository 的 M1 review fixes（`fa0687a`）；開始時 working tree 乾淨。已閱讀 README、M0／M1／review fixes 紀錄、全部 src／tests、package／lockfile、HTML、Vite／TypeScript／CSP、gitignore 與授權。範圍只到 M2。

## 1. Implementation summary

完成選擇 QR 圖片、瀏覽器本地解碼、重用既有完整 HTTP(S) URL validation、顯示 normalized URL 與 Copy URL。處理無效圖片、無 QR、非 URL、禁止 scheme、解析例外與 clipboard failure；新選圖清除舊結果，非同步完成不覆蓋較新狀態。沒有新增相機、拖放、paste image、crop、批次、history、auto-open、clickable URL、後端或 analytics。

## 2. Files changed

新增：

- `src/decode.ts`：ImageBitmap／Canvas 管線、縮放、QR pixel 解碼、URL validation 與結果型別。
- `tests/decode.test.mjs`：14 項 decoder／round-trip／尺寸與 cleanup 測試。
- `M2_VERIFICATION.md`：本報告。

修改：

- `src/main.ts`：選圖、結果／錯誤狀態、generation guard、Copy busy／failure。
- `src/qr.ts`：抽出實際共用的 `createQrPixels()`；Canvas 用同一 RGBA buffer，保留 ASCII guard、QR 參數、整數格寬、quiet zone 與 PNG 行為。
- `index.html`：啟用選圖，新增 status／alert 關聯與更新說明。
- `package.json`／`package-lock.json`：固定 jsqr 1.4.0；更新專案描述。
- `tsconfig.json`：允許 `.ts` import，讓 Node type stripping 測試可直接使用相同 validation 模組，仍為 strict／noEmit。
- `README.md`、`public/THIRD_PARTY_NOTICES.txt`：雙向流程、限制、里程碑與完整 decoder 授權。

`src/styles.css`、`tests/qr.test.mjs`、Vite／CSP、gitignore 及歷史驗證紀錄未修改；原有 responsive 與 busy button 樣式足以支援 M2。

## 3. Decoder choice

採用 **jsQR / npm `jsqr@1.4.0`**。查核 [官方 source／API](https://github.com/cozmo/jsQR)、[npm registry metadata](https://registry.npmjs.org/jsqr) 與安裝包的 package.json、型別、LICENSE 和 dist source。

- 最新發布版 1.4.0，發布日期 2021-04-24；發布已久，維護活躍度有限，不宣稱積極維護。官方 repository 有多年使用紀錄及 QR 圖片測試集；固定版本並新增本專案整合測試。
- 純 JavaScript，接受 `Uint8ClampedArray` RGBA、width／height，回傳 QR object 或 null；採用 `inversionAttempts: 'attemptBoth'`。
- Apache-2.0；套件完整 LICENSE 原文保留於 third-party notices（僅移除檔尾多餘空白），由 Vite 複製到正式 dist。
- 無 production transitive dependency；未引入套件開發工具。
- 不用 WASM、Worker、CDN、remote API 或 runtime fetch；**CSP 完全未修改**。

`npm ls --omit=dev --all` 實際輸出：

```text
url-qr-converter@0.0.0
├── jsqr@1.4.0
└── qrcode-generator@2.0.4
```

## 4. Image pipeline

`File → createImageBitmap(file) → temporary Canvas → drawImage → getImageData → jsQR → normalizeUrl`。

`accept="image/*"` 只協助選檔，不相信副檔名或 MIME 作為有效性判斷。20 MiB 檔案上限在讀取前檢查。Canvas 最長邊 2048px，保持 aspect ratio、不放大小圖；最多約 4.2M pixels／16 MiB RGBA buffer，不將超大圖片原尺寸畫入 Canvas。透明背景先合成白底，再讀像素。

ImageBitmap 於 `finally` close，Canvas 尺寸歸零。過期 operation 在建立 Canvas 前返回並關閉 bitmap。File input 取出檔案後清空，釋放其參考且允許重選同檔；完成後不儲存圖片。沒有圖片 object URL 或 `<img src="blob:">`。

限制：初始 `createImageBitmap` 仍由瀏覽器解碼原圖，可能需要原圖記憶體；檔案／Canvas 上限不代表對任意壓縮圖片提供固定記憶體保證。極大、模糊、縮放後 QR 太小的圖片可能無法解析。一般圖片已實測，沒有為此引入 Worker／額外框架。

## 5. URL handling

jsQR 成功後只將 `code.data` 交給既有 `normalizeUrl()`。沿用 trim、明確 HTTP／HTTPS 前綴、URL parser、hostname guard 與 normalized href。IDN／Unicode path 轉成 punycode／百分比編碼；不補 HTTPS、不查 DNS、不開啟連結。

plain text、javascript／data／file scheme、裸網域與 malformed URL 全部拒絕為 unsupported URL。結果欄僅以 textarea.value 顯示有效 href，不顯示原始非 URL payload、不插入 HTML、不建立 clickable link。

## 6. State / race handling

每次 file change 遞增 generation，立即清空目前 URL、錯誤與 Copy 狀態。decode await 後比對 generation；只有最新 operation 能顯示成功或錯誤。ImageBitmap 完成後也先檢查 generation，舊 bitmap 不進入 pixel extraction。

正式 browser 測試攔住 `createImageBitmap` promise，先完成 B，再完成 A。涵蓋 A／B 都成功、A 無效／B 成功、A 成功／B 無效、B 無 QR、B 非 URL。A 的成功或失敗皆不能覆寫 B；新選圖期間結果空白、Copy 停用。八個成功建立的 bitmap（包括 stale）都實際呼叫 close。

## 7. Clipboard

使用 `navigator.clipboard.writeText(currentUrl)`。成功才宣告「網址已複製」；API 不存在、拒絕或其他失敗皆顯示可手動選取複製的錯誤，保留 URL。

busy boolean 阻擋重複操作，等待時使用 `aria-disabled`，不設 native disabled，不移動焦點；完成後恢復標籤。初始或新圖片尚無有效結果時才使用 native disabled。Copy callback 同樣比對選圖 generation，舊 Copy 不覆蓋新狀態或解除新 Copy busy。

Browser 實際讀回 clipboard 核對三種 URL；另外以受控 rejection／API absent 驗證 failure path，不把模擬情境稱為真實權限拒絕。鍵盤 Tab／Enter／Space、busy 重複 click 與 stale completion 均檢查。

## 8. Security / privacy / CSP

全程 client-side only；圖片、payload 與 URL 沒有 upload、外部 decode API、analytics 或儲存行為。套件隨本地 JS bundle 執行。

正式 CSP 維持：

```text
default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'none'; object-src 'none'
```

正式 preview 監聽 request／requestfailed／HTTP status、console、pageerror、securitypolicyviolation。初始載入之後，全部 M2 操作期間 request 數未增加；0 unexpected external request、0 CSP violation、0 page error、0 console warning/error。localStorage、sessionStorage、cookies、IndexedDB、CacheStorage 均空，無 Service Worker registration。源碼檢查 decoder 無 fetch／XHR／WebSocket／WASM／Worker 呼叫。

## 9. Automated tests / commands

環境：Windows Node.js 24.19.0、npm 11.17.0、TypeScript 5.9.3、Vite 8.3.1；由 WSL 呼叫 Windows Node/npm。sandbox 無法直接啟動 Windows Node，使用已獲准的 sandbox escalation 執行。

| 指令／檢查 | 實際結果 |
| --- | --- |
| `npm ci` | 通過；安裝 18 packages，audit 0 vulnerabilities |
| `npm test` | 20 項通過，0 failed／skipped |
| `npm run build` | 通過，確實先執行 `npm run typecheck` → `tsc --noEmit` |
| `npm run preview -- --strictPort` | 正式 127.0.0.1:4173 啟動並完成 browser verification |
| `npm ls --omit=dev --all` | 僅 jsqr 與 qrcode-generator，無傳遞 production dependencies |
| `git diff --check` | 通過 |

正式產物：HTML 6.08 kB、CSS 5.35 kB、JS 158.22 kB（gzip 58.10 kB）。第三方授權檔存在於 dist，內容與 public 版本相同。

原 M1 六項 tests 完整保留並通過：接受／拒絕 URL、PNG failure、Unicode normalization／ASCII invariant、直接非 ASCII encoder 拒絕、hostname guard 直接測試。

新增十四項：四種 URL 的 `normalizeUrl → createQrPixels → jsQR → normalized href` round trip（HTTPS、HTTP path/query、Unicode hostname/path/query、較長正常 URL）；像素不透明黑白；空白 no-result；六種可真實 decode 但產品拒絕的 payload；decoder 例外；aspect ratio／2048 cap／不放大；invalid image／file limit／stale cleanup／canvas failure cleanup。無 DOM 或 browser testing framework 依賴。Race 的 UI 整合檢查在正式 Chrome 執行。

## 10. Browser verification

使用既有系統 Temp 的 Playwright 操作真實 Chrome headless **153.0.8010.53**。本次 scratch scripts、PNG 與 screenshots 在忽略的暫存目錄產生，未加入專案 dependencies 或 Git。

| 情境 | 實際結果 |
| --- | --- |
| M1 下載 PNG 再選入 M2 | HTTPS、path/query/fragment、Unicode hostname/path/query 三組 normalized URL 全部相符 |
| Clipboard | 三組實際 writeText/readText 相符；focus 保留；模擬 rejection／API absent 有可見錯誤 |
| 無 QR／invalid image | 空白 PNG 顯示 no QR；損壞 PNG／text file 顯示 invalid image，結果空白且 Copy 停用 |
| Plain text／forbidden scheme | Hello World、javascript、data、file QR 均拒絕且不顯示 payload |
| 圖片格式與縮放 | 4096×3072 JPEG、WebP、透明 PNG 都成功解析，實際經過縮放 |
| Decode race | 五種 A／B 成功失敗組合，B 先完成後 A 不覆蓋；bitmap cleanup 通過 |
| Copy busy／race | native disabled 保持 false，重複操作僅一次；舊 completion 不解除較新 busy |
| Decode failure recovery | 注入 pixel extraction throw 顯示一般錯誤；恢復後可成功；同檔可再次選取 |
| Accessibility | file／result 有 label，錯誤與 status 有 ARIA 關聯；鍵盤可達 Copy，成功解析不搬移焦點 |
| Responsive | 1280／768／375／320 兩模式無水平溢出；長 URL 與錯誤文字不破版 |
| Security | 0 console／page／CSP errors；無額外 network，無 storage／cookies |

人工檢視 desktop／mobile 截圖，核對結果欄、檔案控制項、Copy 與錯誤訊息可讀。Browser runner 開發過程修正了兩個測試本身的問題：計數器誤用 read-only `window.closed`，以及 Playwright `isDisabled()` 將 aria-disabled 也視為 disabled；改用獨立計數器與原生 `.disabled` 屬性後重跑，不是產品行為修正。

## 11. M1 regression

正式 preview 重跑既有 M1 browser checks（只調整 M2 選圖已啟用的預期）：

- HTTPS、HTTP、path、query、trim、Unicode 六組 Generate／Download 正常。
- 六份 PNG 與 Canvas 像素完全相符、尺寸至少 1024、黑白不透明、四格 quiet zone，scanner payload 正確。
- invalid URL／hostname／forbidden scheme 拒絕；修改 input 清除舊 QR，Download 停用。
- 真正超容量 URL 失敗後可恢復；toBlob null／throw／object URL failure 皆可重試。
- Tab／Space Generate、Tab Download、Enter／Space 下載保留 focus-visible 及 3px 外框。
- 延後 export callback、重複啟動、輸入修改／重新 Generate、新舊 export 交錯均通過，舊操作不下載、不解除新 busy。
- Tabs 鍵盤切換與四種寬度正常；ASCII invariant／hostname guard unit tests 保持通過。

## 12. Git

- M2 feature commit：`79bbd515874e5bb22184878553eeafb5a221984e`。
- Commit message：`feat: add qr image to url decoding`。
- Feature commit 後 `git status --short` 無輸出，working tree 乾淨。
- 本報告隨 feature commit 納入；後續僅以 `docs: record verified M2 commit` 記錄實際 hash，再確認 working tree 乾淨，不改寫 feature commit。
- 沿用 baseline commit 的作者身分，僅透過 per-command Git 設定，不改全域設定。
- 不納入 node_modules、dist、screenshots、下載樣本、暫存圖片或 scratch scripts；本次暫存驗證材料已移至系統 `/tmp`，專案內 `.vite/m2-verification` 已移除。
- 未建立 remote，未 push。

## 13. Remaining M3 items

- Firefox／Safari 與 browser compatibility 驗收。
- 實體裝置、真實照片與手機掃描，實際列印 scan。
- 螢幕閱讀器完整驗收。
- Very-long-URL 的高密度 QR 在小尺寸 preview 的掃描可用性。
- 公開部署、實際主機安全標頭與 release 檢查。

## 14. M3 readiness

可以開始 **M3 — Testing, Security, Accessibility & Release**。M2 本地雙向流程、列出的 automated／正式 Chrome 驗證均通過；M3 尚未實作或宣稱完成。未實測 Firefox／Safari、實體裝置、列印或螢幕閱讀器。

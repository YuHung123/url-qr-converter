# M2 Review Fixes 驗證紀錄

日期：2026-09-29。基礎 commit：`72dfa47`；開始時 working tree 乾淨。已閱讀全部追蹤檔案、既有驗證紀錄、lockfile、授權及 Git history，並檢查安裝後 jsQR 的實際型別與 Byte decoder 原始碼。本次僅為 M2 審查修正，沒有開始 M3。

## 1. Findings addressed

| Finding | 處理 |
| --- | --- |
| I-1 | 在 decoder integration 中逐段嚴格驗證 Byte chunk 的 UTF-8 bytes，拒絕 jsQR 靜默丟棄 segment 後形成的 URL |
| m-1 | 新選圖停用 Copy 前，僅在 Copy 正持有焦點時將焦點移到選圖 input |
| m-2 | 共用 `normalizeUrl()` 在 trim 後、URL parser 前拒絕 raw whitespace 與 ASCII 控制字元 |
| m-5 | 確認並停止本專案遺留 Windows preview，重新 `npm ci` 恢復依賴；本次 preview 亦已關閉 |

README 只更新上述 validation、Byte 完整性、焦點與測試說明。HTTP(S) only、client-side only、本地圖片處理、無 upload 與瀏覽器可讀取圖片的說明仍成立。HTML、CSS、CSP、TypeScript 設定、套件版本、lockfile 及授權未修改。

## 2. Environment repair

Linux sandbox 無法用 netlink 完整查詢 Windows listener，且 Linux process 表查不到 PID 32608；沒有據此假定 port 已空，也沒有直接 kill 該 PID。

以 Windows `Get-NetTCPConnection` 查到 `127.0.0.1:4173` 的 owning PID 為 **32608**。再以 `Get-CimInstance Win32_Process` 確認 executable 為 Windows Node，command line 指向：

```text
C:\Users\yuhun\Desktop\url-qr-converter\node_modules\.bin\..\vite\bin\vite.js
preview --host 127.0.0.1 --strictPort
```

停止前再次核對 command line，確定屬於本專案後才 `Stop-Process`。未停止無關 process。隨後從專案根目錄執行 `npm ci`：成功安裝 18 packages、audit 0 vulnerabilities，恢復可能不完整的 `node_modules`。

修正前的 focus 重現使用本次另啟動的 preview PID 32196；同樣核對歸屬後停止，再執行完成標準要求的第二次 `npm ci`，結果亦為 18 packages、0 vulnerabilities、exit 0。沒有改寫 lockfile。

修正後正式驗證以 `npm run preview -- --strictPort` 啟動 PID 7376。三組 browser runner 結束後，再確認 command line、停止該 preview。停止後立即查詢仍短暫看到 listener；後續獨立 Windows port 查詢 exit 0，確認 **4173 已無 listener**，原 preview command 亦已退出。

## 3. Decoder integrity

jsQR 1.4.0 的 Byte decoder 以 `decodeURIComponent` 嘗試解析 bytes；例外被 catch 後仍回傳 bytes，但 text 為空，之後繼續串接其他 segment。故單看 `code.data` 不足以證明完整性。

實際 runtime 的 Byte chunk 有 `type: 'byte'`、`bytes: number[]` 與 `text`。套件的型別為 `Chunk | ByteChunk | ECIChunk`，其中 `Chunk.type` 並非互斥的 discriminant，因此整合層除了檢查 `type`，亦以 `'bytes' in chunk` 安全縮小型別。

`decodePixels()` 在使用 `code.data` 前建立原生 `TextDecoder('utf-8', { fatal: true })`，對每個 Byte chunk 的 `Uint8Array.from(chunk.bytes)` 單獨呼叫非 streaming `decode()`。不能以其他 segment 的 bytes 補齊不完整 UTF-8；不依賴 `text === ''` 判斷。空 segment 可正常通過。TextDecoder 的輸出只用於驗證，原 payload 仍取自 jsQR，沒有重新拼接或替換 bytes。

任一 Byte chunk 無法嚴格解讀，或缺少可供驗證的 bytes，整個結果為既有 `unsupported-url`。UI 使用既有「已找到 QR Code，但內容不是支援的完整 HTTP / HTTPS 網址。」訊息，結果欄空白、Copy 停用；不顯示 raw bytes、內部錯誤或 stack trace。沒有 fork、更換 decoder、加入 dependency 或重寫 QR parser。

## 4. Regression fixture

新增 `tests/byte-fixture.mjs`，以既有 qrcode-generator 多次 `addData(..., 'Byte')` 建立真實 QR 矩陣，再繪成 RGBA pixels。將指定 bytes 映射成低位元 code units，使用 encoder 原本的 Byte 轉換；沒有修改全域 `stringToBytes`，沒有新增 production dependency 或提交 PNG。

核心 fixture 三段依序為：

1. UTF-8 bytes：`https://example.com/`
2. 單一 byte：`0xE9`
3. UTF-8 bytes：`evil`

測試先直接呼叫 jsQR，確認三個 chunks 仍存在、中間 bytes 保留、text 為空，且 `code.data` 確實是可通過 URL validation 的 `https://example.com/evil`；再呼叫產品 `decodePixels()`，要求 `unsupported-url`。另覆蓋 overlong sequence、UTF-8 surrogate encoding、超出 Unicode 最大值的 sequence。

先新增測試再修正：I-1 測試在舊實作實際失敗，actual 是 `{ kind: 'success', url: 'https://example.com/evil' }`。修正後同一測試通過。正式 preview 亦選入由此 fixture 產生的 PNG，確認沒有成功 URL。

Positive cases 通過：ASCII、真正以 UTF-8 bytes 編碼的 Unicode hostname/path/query/emoji、每段皆合法 UTF-8 的多段 Unicode／ASCII QR，以及原本由 Unicode URL normalization 產生 ASCII payload 的產品 round trip。

## 5. URL validation hardening

在 `trim()` 後、`new URL()` 前檢查 `/[\x00-\x20\x7f\s]/u`：拒絕剩餘 C0 控制字元、空格、DEL，以及 JavaScript `\s` 涵蓋的 Unicode 空白／行分隔符。Tab、CR、LF 不再被 parser 靜默刪除後拼成另一個 URL；path/query 的 raw 空白或控制字元也不交給 parser 改寫。

保留既有首尾 trim 行為；`%20`、`%09` 是文字形式的百分比編碼，path/query 仍接受。Unicode hostname、path/query 仍正常轉為 punycode／percent encoding。HTTP(S) protocol、完整前綴與 hostname guard 保留，未加入 DNS、fetch 或網站可用性檢查。

新增測試逐一覆蓋 ASCII 0–32、DEL，以及 NBSP、em space、line/paragraph separator、BOM，分別置於 hostname、path、query 中；另有多行 URL。接受案例包含首尾空白、percent escapes、Unicode，以及 domain、punycode、localhost、IPv4／IPv6。測試斷言產品的接受／拒絕結果，不依賴 parser 本身必須如何處理非法字元。

舊實作的 Tab／LF／CR QR 與 raw control validation 測試均先實際失敗；修正後通過。

## 6. Focus fix

舊正式產物中，Copy 持有焦點時透過 `setInputFiles()` 觸發新選圖，native disable 後 activeElement 未留在合理控制項，預期移至 `qr-image` 的 regression assertion 實際失敗。

新實作在 native disable 前，只判斷 `document.activeElement === copyButton`；成立時呼叫 `imageInput.focus()`。其他控制項的焦點不變。解碼 success/failure callback 沒有加入任何 focus 呼叫，也不會自動跳至結果欄。

正式 Chrome 驗證：新圖片解析 pending 時 Copy 立即 native disabled、結果清空、焦點為 file input；下一次 Tab 進入結果 textarea。接著完成成功或失敗的 decode，焦點都留在使用者目前的 textarea。正常選圖、Tab 到 Copy、Enter 複製與 busy/failure 流程的 focus 亦通過。此驗證模擬 change event 的邊緣路徑，未新增自訂拖放功能。

## 7. Tests and command verification

環境：Windows Node.js 24.19.0、npm 11.17.0、TypeScript 5.9.3、Vite 8.3.1；由 WSL 呼叫 Windows Node/npm。

| 指令 | 實際結果 |
| --- | --- |
| `npm ci` | 環境修復與修正後各執行一次；均成功、18 packages、0 vulnerabilities |
| `npm test` | **29 tests，29 pass，0 fail／skip／cancelled** |
| `npm run build` | 通過，實際執行 `npm run typecheck` → `tsc --noEmit` 後再 Vite build |
| `npm audit` | exit 0，0 vulnerabilities |
| `npm ls --omit=dev --all` | 僅 jsqr 1.4.0、qrcode-generator 2.0.4，無 production transitive dependency |
| `git diff --check` | 通過 |

正式產物：HTML 6.08 kB、CSS 5.35 kB、JS 158.59 kB（gzip 58.26 kB）。dist 的 third-party notices 與 public 檔案逐 byte 比較一致。

原 M1 六項 tests 保留：URL 接受／拒絕、PNG export failure、Unicode normalization／ASCII invariant、encoder 非 ASCII 拒絕、hostname guard。原 M2 的四種 round trip、黑白不透明 pixels、blank image、六種 unsupported payload、decoder exception、縮放限制、invalid image 與 stale bitmap cleanup 保留。

新增九項：invalid UTF-8 multi-segment、valid UTF-8/multi-segment、Tab/LF/CR QR 各一項、raw character 拒絕、合法 URL 保留，以及 `getContext()` null／`drawImage()` throw cleanup 各一項。原合併 cleanup 測試改進為精確檔案大小邊界與 stale cleanup。

20 MiB 使用小型 `{ size }` stub，確認確實呼叫 image reader；20 MiB + 1 在讀取前被拒絕。沒有建立巨大檔案。Canvas failure 測試提供小型 document/canvas stub，確認失敗分支真的執行、bitmap 關閉一次、canvas width/height 歸零；不再靠 `document is not defined` 偶然命中 catch。測試結束還原全域屬性。

## 8. Browser verification

以既有暫存 Playwright 操作 **Chrome 153.0.8010.53 headless**，載入正式 `npm run preview -- --strictPort`。沿用 M1/M2 runner，另新增此次 review regression runner；三者均 exit 0。Scratch scripts、PNG、screenshots 留在 `/tmp/url-qr-m2-verification`，不加入 repository 或 dependencies。此處不宣稱實體操作、獨立 encoder 或 committed browser E2E 已完成。

| 情境 | 實際結果 |
| --- | --- |
| I-1 PNG | 三段 invalid UTF-8 QR 被拒絕、結果空白、Copy 停用 |
| Control-character QR | hostname Tab、path newline 不被默默改寫成成功 URL；CR 另由 committed integration test 覆蓋 |
| Positive QR | 原生 UTF-8 Unicode、多段合法 UTF-8、percent-encoded whitespace 通過 |
| Normal decode | M1 實際下載的 HTTPS、path/query、Unicode PNG 選入 M2，結果均正確 |
| Invalid/no QR/payload | 空白 PNG、損壞圖片、非圖片、plain text、javascript/data/file scheme 均顯示預期安全錯誤 |
| Copy | 真實 writeText/readText 相符；Tab/Enter 操作保留 focus；注入 rejection、API absent 有手動複製訊息 |
| Focus invalidation | focused Copy → new file → file input；下一次 Tab 到 textarea；decode success/failure 不搶焦點 |
| Stale decode | A/B 成功／失敗、no QR、unsupported 組合中先完成 B，再完成 A，A 不覆蓋 B；8 個建立的 bitmap 都 close |
| Stale Copy/busy | 重複啟動只呼叫一次；舊 completion 不解除新 busy 或更新新結果狀態 |
| Cleanup/recovery | 注入 pixel extraction failure 後可恢復，同檔可重選；JPEG/WebP/透明 PNG 的既有縮放與合成 regression 通過 |
| M1 QR/PNG | HTTPS、HTTP、path、query、trim、Unicode 共六組下載成功；PNG 與 Canvas 像素一致，scan payload 正確，至少 1024px、整數模組、四格白邊 |
| M1 validation/state | invalid URL/hostname/scheme 拒絕；input change 清除舊 QR 並停用 Download；ASCII invariant 與 hostname guard 的 committed tests 通過 |
| M1 focus/export | Tab/Space Generate、Tab Download、Enter/Space 重複下載保留 focus-visible；stale export 不下載、不解除新 busy；失敗可重試 |

既有 runner 的 tab keyboard、1280/768/375/320 寬度檢查亦通過；未擴充成 M3 跨瀏覽器或實機驗收。

## 9. Security / privacy

CSP 設定與正式產物維持：

```text
default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'none'; object-src 'none'
```

正式 preview 監聽 browser request、request failure、HTTP error、console、pageerror 與 securitypolicyviolation：0 unexpected external request、0 CSP violation、0 page error、0 console warning/error。完整 M2 runner 初始頁面載入後 request 數不增加，無 image/URL processing upload。

localStorage、sessionStorage、cookies、IndexedDB、CacheStorage 均空，無 Service Worker registration。檢查產品 source 與 jsQR runtime，未新增 fetch/XHR/WebSocket、Worker、WASM、analytics、storage 或 cookies。仍為純前端本地同步 jsQR 解碼；極端圖片主執行緒阻塞風險留待 M3 評估，未以擴大 CSP 或加入 Worker 處理。

正式 dependencies 與 lockfile 未變，audit 為零；未加入 backend、database、remote QR API、相機或其他新功能。

## 10. Git

本報告隨 review-fixes commit 提交；建立後另以 documentation commit 記錄實際 hash，沿用既有做法。

- Review-fixes commit：待提交後記錄。
- Commit message：`fix: harden qr decoding integrity`。
- Working tree：提交後另行檢查並記錄。
- 沒有建立 remote，沒有 push。
- 提交範圍僅 README、本報告、三個 source 檔、兩個 test 檔與測試用 Byte fixture helper；不含 node_modules、dist、PNG、screenshots、scratch scripts 或 browser artifacts。

## 11. Remaining M3 items

- Firefox／Safari、iOS／Android 與實體裝置。
- 真實手機照片、實際列印 scan、低對比 QR、長 screenshot。
- 困難圖片的同步 decode 效能及 image-bomb 實務評估；本次沒有 Worker、多階段 decode 或複雜 cancel system。
- SVG／HEIC 的瀏覽器支援行為與錯誤文案 UX review；未新增格式支援。
- Screen reader、hidden panel alert 行為與完整 accessibility 驗收。
- Deployment headers、公開部署與 release verification。
- 可重現的 committed browser E2E 策略、independent encoder fixture PNG 與一般 performance profiling。

## 12. M3 readiness

可以開始 **M3 — Testing, Security, Accessibility & Release**。本次 I-1、m-1、m-2、m-5 與要求的 M1/M2 regression 已完成上述實際驗證，沒有發現仍阻擋進入 M3 的 correctness/security 問題。這不代表 M3 的跨瀏覽器、實機、效能、螢幕閱讀器或公開發布驗收已完成。

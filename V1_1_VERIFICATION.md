# URL QR Converter — v1.1.0 Candidate Verification

日期：2026-09-30。基礎：`babe1c2034072d21cbfb7a7b79d8f12a2e226169`（v1.0.1 及其 pre-push audit）。範圍：使用體驗微調與明訂的小型功能；本機 candidate，沒有發布 tag、push 或部署。

## 1. Executive Summary

**PASS WITH NOTE — v1.1.0 本機 candidate 適合交給下一輪獨立 review。** 完整 automated gates 通過：34 Node、4 artifact、75 browser tests，三引擎各 25，21 次 axe 掃描無違規，dependency audit 零漏洞。新 UI 已目視檢查；第 16 節的實機／部署人工項目仍未驗收。

保留 v1.0.1 的 encoder／decoder、M 級錯誤修正、QR quiet zone、HTTP(S) 安全限制、逐 Byte segment fatal UTF-8 驗證、20 MiB／768 → 2048 pipeline、cleanup、非同步 generation guards、CSP 與本地處理模型。

## 2. UI Simplification

- Header 只含 H1 `URL ↔ QR Code`；intro spacing 縮為 desktop 40px／26px、mobile 28px／22px。
- Footer 完全移除，沒有替代文案。移除 slogan、privacy note、milestone badge、兩側介紹段落與重複操作說明。
- 保留 URL／圖片／結果 labels、簡短 validation／operation statuses、alert／status live regions、格式與大小限制、高密度 QR 掃描 guidance。
- 產生按鈕改為「產生 QR Code」；選圖「選擇圖片或拖曳到這裡」；解析錯誤改用「找不到 QR Code」「這個 QR Code 不是網址」「無法讀取這張圖片」等一般用語。

## 3. URL Input Changes

- Trim 與 raw character guard 後，先以 scheme syntax 辨識明確 scheme；禁止 javascript／data／file／blob／mailto／ws 等，不會替其補 HTTPS。
- 一般裸網址補 `https://` 再走原本 `URL` parser、HTTP(S) prefix／protocol、hostname validation、`href` normalization；M1／M2 共用唯一 `normalizeUrl()`。
- `example.com`、`www.example.com`、path／query、`openai.com`、Unicode domain/path 正確補 HTTPS；明確 HTTP／HTTPS 保持原 scheme。相對路徑及一般單詞拒絕；有 scheme 的 malformed URL 不會被重新解釋成裸網域。
- 裸網址的保守辨識接受 dotted host、localhost、括號 IPv6。含 port 的網址建議明確輸入 HTTP(S)，避免將 RFC scheme syntax 誤認為網址；沒有加入 DNS／網站可用性查詢。
- URL input Enter 呼叫同一 Generate handler，IME composition 的 Enter 不會誤觸。Generate 本身仍是原生 button，click／Enter／Space 可用。
- Input draft 與 `{ url, canvas, matrix }` generated result 分開。編輯只清除錯誤並更新短提示，不清 QR；Generate 成功才原子替換結果。失敗保留 QR A 並顯示 draft validation error，提示「網址已修改，重新產生以更新 QR Code。」；canvas accessible name 仍標記 A。
- 下載所有格式都綁定顯示中的 A；draft B 不會進入 export。匯出途中成功 Generate B 才使舊 export 失效；失效的 callback 不會下載、不會修改新 busy 狀態。這是原本「input event 即失效」依 v1.1.0 明訂要求的調整。

## 4. QR Preview

僅 CSS 縮小：desktop 最大 **240 CSS px**、mobile 最大 **200 CSS px**，保持正方形及既有視覺語言。Raster export 仍為 `(modules + 8) × ceil(1024 / (modules + 8))`，至少 1024²，四格白邊、整數 module、不透明白底、黑色 QR。Version 17+ 的高密度提示保留；小預覽不保證長網址能以相機掃描。

密度記錄：30／200 字元樣本在兩種預覽尺寸與三引擎皆可由 jsQR 讀取；1800 字元樣本的兩種小預覽皆無法讀取，1000 字元樣本在 Firefox 240px 預覽無法讀取。這些是縮小預覽的已知限制；原高解析 PNG round-trip 仍通過，不能將 software preview scan 當作實機掃描驗收。

## 5. Download Formats

### PNG

原 `exportPng()` 的 `toBlob('image/png')`、null／empty／MIME guard 原封不動。Pixel renderer 保留原尺寸／繪製迴圈，只把原 `isDark()` matrix 提取為同一 generated result 的 readonly matrix，供 SVG 共用；ASCII guard 保留。下載檔名 `qr-code.png`。

### SVG

直接由同一 matrix 輸出 white rect／black path。`viewBox`、width／height 都是 `modules + 8` 的正方形；每個 dark cell 位移 +4，四格白邊。沒有 raster image、外部資源、script、user URL metadata 或 library。SVG namespace 不會產生網路請求。檔名 `qr-code.svg`、MIME `image/svg+xml`。

Node tests 逐格對照 EC M reference matrix、dark-cell count、邊界及 SVG 結構。Browser tests 以 test-only same-origin route 供應實際下載 SVG，再由 browser rasterize，交給 Node jsQR 精確 round-trip；產品 CSP 不放寬，產品本身不載入該 fixture。這是 jsQR（與 encoder 不同的 decoder），本次未額外使用 ZXing。

### JPG

使用已不透明白底／黑 modules 的原始高解析 canvas，以 `image/jpeg`、quality **0.98** 輸出；不使用透明 canvas，檔名 `qr-code.jpg`。壓縮可能產生少量灰階邊緣；源 module geometry／quiet zone 不變，測試要求實際壓縮檔仍精確 decode。

### WebP

同一高解析白底／黑 QR、`image/webp`、quality **0.98**，檔名 `qr-code.webp`。三引擎驗證真實 WebP bytes（RIFF／WEBP）、MIME 與 round-trip；不把瀏覽器 PNG fallback 偽裝為 WebP。null、empty、wrong MIME 及同步例外都有 failure recovery。

兩個樣本（短 ASCII、較密集 Unicode URL）各驗證四種下載，共八個檔案／引擎；包含修改 draft 後下載仍是 displayed result。檢查 non-empty、extension／signature／MIME、square、至少 1024 的 raster 尺寸、opaque、四格 quiet zone 與 exact URL。Lossy raster 額外檢查整個 quiet zone 沒有 dark contamination，白邊內部接近純白；PNG／SVG 不使用 lossy tolerance。

## 6. Download Dropdown

原生 split button：主按鈕固定 PNG，chevron 有 accessible name「其他下載格式」、`aria-haspopup=menu`／`aria-expanded`／`aria-controls`。小型 menu、三個原生 button menuitems，沒有 framework 或 dependency。

Enter／Space／click 展開或下載；ArrowDown／ArrowUp 循環、Home／End、Escape 回 toggle；Tab／Shift+Tab 關閉並離開，沒有 focus trap；outside click、移出焦點、切換模式都關閉。下載後 focus 回 toggle；busy 以 aria-disabled 加 internal guard 保留焦點。Toggle 加 autocomplete=off，維持 Firefox reload 的初始 disabled 狀態。

開發測試曾抓到 activeElement 在 blur → focus 之間短暫為 body，導致滑鼠點 JPG 提前關閉；改為 focusout.relatedTarget 判斷目的控制項。真實滑鼠下載每種格式及鍵盤 regression 保護此修正。

## 7. Drag & Drop

File input change 與 drop 都呼叫同一 `readImage(files)`，再走未修改的 `decodeImage()`。Dragenter／dragover／dragleave／drop 已處理；nested enter/leave depth 防止子元素造成 highlight 閃爍，細邊框／底色提示，無 animation。Drop／dragend 清除 highlight；preventDefault 避免 native file navigation。

一次只接受一個 File。多檔及非檔案 data 立即清除舊 decode result，顯示「請選擇一張圖片。」；單一非圖片仍由同一 native image-read pipeline 拒絕，不另建 MIME／decoder 路徑。保留 20 MiB、staged 768 → 2048、fatal UTF-8、URL validation、bitmap.close／canvas release、generation guard、同檔可重選與 no upload。

覆蓋有效 drop、no-QR、text file、多檔、非檔案 URI、oversize、恢復、nested highlight、drop → drop、drop → file、file → drop 的交錯完成。

## 8. Decode Result UI

成功 status「已找到網址」、完整 readonly URL textarea、右側 copy icon、下方「開啟連結」。URL 未縮短、未替換漂亮名稱、未省略 host/path/query；長內容換行、可捲動及手動選取，copy icon 固定 44px 不被擠掉。

Copy icon 是原生 button，有 `aria-label="複製網址"`／title、visible focus、success status／failure alert。保留 native clipboard、API absent／rejection、busy guard、stale Copy generation guard。新圖片清除結果；若 Copy 或 Open Link 持有焦點，先移到 file input，async 完成不搶焦點。

Open Link 的 href 只由 decode success 的 normalized HTTP(S) URL 設定，與 textarea 值相同；`target=_blank`、`rel="noopener noreferrer"`。沒有 auto-open 或 `window.open()`。新圖片／錯誤時移除 href 並 hidden。測試涵蓋 Unicode、HTTP、scheme-less、userinfo normalized URL 與危險 scheme；既有 userinfo 接受行為保留，不能把格式驗證當作網站信任檢查。

Popup 只在明確 click 後產生；外部目標在 context route 中以本機 fixture 回應，沒有對公共 Internet request。實際驗證 popup opener 為 null、沒有 Referer。

## 9. Accessibility

保留 H1、main／skip link、tabs 的 selected indicator／ARIA／鍵盤與 hidden-panel semantics。QR preview 為 H2，省略裝飾性 panel headings 後沒有 heading 跳級；result／input labels、alert／status 都保留。Canvas accessible name 對應 generated URL；copy／dropdown／Open Link 可聚焦、accessible names 明確。

Axe 使用原 WCAG 2 A／AA、2.1 AA tags，兩模式 initial／error／success，並新增 expanded download menu；每引擎 7 次、總計 **21 scans**。沒有 disableRules、exclude 或其他規則抑制。最終結果見第 12 節。

Keyboard 檢查 Enter／Space、arrow keys／Home／End、Escape、Tab／Shift+Tab、focus-visible、busy focus、Copy failure／stale focus、hidden status。最小按鈕／link 高度 44px、chevron 寬 48px、copy 寬 44px；file-selector-button 也設 minimum 44px。

320px、其他五種寬度、640px 等效 200% reflow 與 200% 文字放大包含新控制項；不宣稱實際 native zoom／screen reader 已驗收。

## 10. Security / Privacy

`src/decode.ts`、`vite.config.ts`、`public/_headers`、`.gitattributes`、第三方 notices 及歷史 audits 與 base HEAD **byte-identical**。沒有第二套 decoder／URL validation、production dependency 或 CSP 放寬。

```text
default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'none'; object-src 'none'
```

HTTP CSP 額外 `frame-ancestors 'none'`；nosniff、no-referrer、停用 camera／microphone／geolocation 保留。Open Link 是 explicit browser navigation，不需要 connect-src 放寬。

正式 dist security tests 監聽 request／failed request／HTTP error／console／pageerror／CSP violation：Generate、PNG／SVG／JPG／WebP download、Decode、Copy 在未點 Open Link 前完全沒有新增 request。Cookies、localStorage／sessionStorage、IndexedDB、CacheStorage、Service Worker 為空，reload 清空狀態；三引擎皆通過。

README 區分轉換、解析、下載、複製的 local boundary，及 explicit Open Link 的外部 navigation；首頁沒有重新加入 privacy marketing copy。Decoded URL 使用 textarea.value／validated href，SVG 匯出只含 numeric matrix geometry；沒有 raw payload HTML insertion。

## 11. Functional Regression

### M1

共用 URL normalization、HTTP(S)／hostname／raw-character safety、Unicode ASCII invariant、EC M matrix、四格白邊、整數 modules、PNG 高解析與 export failure 保留。原五種長度的 PNG pixel／quiet-zone／decoder tests 保留。Enter／scheme-less、input/result 分離、invalid Generate 保留 A、四格式與 stale generated-result export 新增測試。

### M2

jsQR、逐 Byte segment fatal UTF-8、raw controls、independent Segno fixtures、20 MiB、transparent white composite、768 → 2048 corpus、cleanup、stale decode／Copy 全保留。選檔與 drop 共用 state reset／decode pipeline；只在成功後提供 validated Open Link。Clipboard native write 在三引擎檢查，OS readback 僅 Chromium；rejection／API absent 是受控測試，不冒充真實 OS 權限拒絕。

## 12. Automated Tests

環境：Windows Node **24.19.0**、npm **11.17.0**；WSL 呼叫已安裝的 Windows Node/npm，browsers 在 Windows 執行。由同一工作目錄依序跑 canonical scripts；single worker、retries 0、既有 60s timeout／corpus 120s timeout，沒有 skip／only。

| Gate | Final result |
| --- | --- |
| npm ci | PASS — 23 installed／24 audited |
| npm test | PASS — 34/34，0 fail／skip／cancelled |
| npm run typecheck | PASS |
| npm run build | PASS |
| npm run test:artifact | PASS — 4/4 |
| npm run test:browser | PASS — 75/75，559.719 秒，0 skipped／unexpected／flaky，report errors 為空 |
| Chromium 153.0.8010.12 | PASS — 25/25 |
| Firefox 155.0 | PASS — 25/25 |
| Playwright WebKit 26.6 | PASS — 25/25 |
| axe | PASS — 21 scans，0 violations，沒有抑制規則 |
| npm audit | PASS — 0 vulnerabilities |
| npm ls --omit=dev --all | PASS — 僅 jsqr@1.4.0、qrcode-generator@2.0.4 |
| git diff --check / --cached --check | PASS |

Counts：Node **30 → 34**，新增 M1/M2 scheme-less、SVG matrix、JPG/WebP export guard 四項；裸網域的舊拒絕 expectation 依新規則改為成功 coverage，原 HTTP(S)／安全 cases 保留，原 unsupported parameterized test 改用 blob URL，沒有刪測試。Artifact 維持 **4**。Browser **16 → 25／engine（48 → 75）**：新增八種 workflow tests，download-format 短／密集樣本拆成兩個獨立 tests（共九個）；coverage 不減。Axe **18 → 21** scans，因新增展開 menu state。

開發輪紀錄：第一輪 Chromium **19/24**，兩個測試問題（舊 pending 文案、RGBA array transport），以及一個產品 menu focus 問題造成三項失敗；修正後三引擎 targeted **25/27**，剩餘 Firefox test SVG cache 及 WebKit 合併八個 exports 的整組 timeout。短／密集樣本改用獨立 context（每組四格式）、保留精確 assertions，不提高 timeout。最終完整 run 才作為 PASS 依據。

環境修復：最初 `npm ci` 遇到既有 Vite preview 原生檔鎖；read-only process inventory 確認本專案 preview，該程序在停止嘗試前已退出，重跑 ci 成功，無關程序未停止。最初 .ps1 verification wrapper 被 Windows execution policy 擋下，改以直接 command 呼叫相同 npm gates；沒有修改 execution policy／系統設定。這些初次失敗不算通過。

最終 logs／JSON／screenshots 位於 ignored outputs；結果由工具 exit code 及 Playwright JSON stats 核對。最終測試後只更新報告／checklist，不修改 source、tests、manifest、lockfile 或 build config，因此 gate evidence 可沿用。

## 13. Responsive QA

正式 browser suite 檢查 **1440、1280、768、375、320** CSS px，兩模式皆測長 URL、密集 preview、download menu bounds、result textarea／copy／Open Link 與 error states；scrollWidth ≤ innerWidth，控制項不超出 viewport，QR 正方形。另檢查 640×450 viewport 及 200% root text enlargement（含 decode success／Open Link）。

1440／320px 的 encode、展開 menu、decode success／error，以及兩模式 text-200 screenshots 已設為可重跑輸出。已目視檢查 Chromium 的 desktop／320px menu、320px decode success、decode text-200；Firefox 的 320px menu、desktop decode success；WebKit 的 320px menu／decode success、encode text-200。沒有 horizontal overflow、clipped menu、copy icon 被擠掉或 URL 遮蓋控制項。這不是實體手機或 native browser zoom 驗收。

## 14. Dependencies / Artifact

Production 仍只有 **qrcode-generator 2.0.4／jsqr 1.4.0**，無 transitive runtime dependencies。沒有 UI／icon／image conversion／drag-drop library。Lockfile 的語意比較確認只有 root 與 packages[""] 的 project version 更新，其餘 versions／integrity／resolved URLs 不變。

Dist 只含 index.html、單一 JS／CSS、favicon.svg、THIRD_PARTY_NOTICES.txt、_headers。沒有 tests、fixtures、reports、screenshots、source maps、scratch 或新外部資源。`_headers` tracked／checkout／dist LF、notices bytes、CSP／security headers 由四項 artifact tests 核對。

Final build：`assets/index-Un4EjKft.js`（161.82 kB／gzip 59.21）、`assets/index-DCVimks5.css`（5.70 kB／gzip 1.92）、HTML 5.93 kB。

## 15. Version / Git

- package.json／lockfile root／packages[""] 均 **1.1.0**。
- 開始 working tree clean，基礎 HEAD `babe1c2`；沒有未知修改。
- Candidate implementation commit message：`feat: refine url and qr workflows`。本報告隨該 commit；自身 hash 由交付訊息／`git log -1 --format=%H` 提供。
- `v1.0.0` tag object：`0c41a74fb7c853f2f4f4ee65b5362a6bcfa71310`；target：`47600c5c3741a86a74537e46eeb10f0bf774f64a`。
- `v1.0.1` tag object：`1e5f113430adb830862d586e76a6eb42c1d79589`；target：`214cea38bea3ca43ecb0dc0c0b0f7f3a18a51dd9`。
- 未 amend／rebase／rewrite history，兩個舊 annotated tags 保留。沒有 v1.1.0 tag、push、遠端 release 或 deployment，原有 remote 不變。
- 單一 local implementation commit；commit 後核對 working tree clean、父 commit 仍為 base HEAD、兩個舊 tag objects／targets 不變且沒有新 tag。交付訊息提供 commit hash。
- Final gates 後 read-only process／listener 檢查：4173／5173 listeners **0**、本專案 Node processes **0**。沒有遺留 test server。

## 16. Remaining Manual Checks

全部 **NOT VERIFIED**，保留給實機／部署驗收：

- real phone scan（畫面與四種下載，短／中／長 URL）
- real Android
- real Safari on macOS/iOS（Playwright WebKit 不等於 Safari）
- real printed scan（最終 Word／PDF／紙本）
- real camera photo
- screen reader（NVDA／Narrator／VoiceOver）
- native 200% browser zoom
- hosted HTTPS / response headers
- deployed subdirectory

依本次 candidate acceptance，這些明訂保留項目不阻擋下一輪獨立 code review，也不表示適用的公開部署／實機驗收已完成。其他既有 Future（main-thread jsQR／專案 LICENSE）未擴充處理。高密度小預覽、低對比、原始 bitmap 記憶體、Clipboard 權限等限制仍見 README。

## 17. v1.1.0 Candidate Status

**PASS WITH NOTE — v1.1.0 candidate 適合交給下一輪獨立 review。**

Handoff state：**READY_FOR_REVIEW（本機 candidate 範圍）**。所有本次必要 automated gates 與 UI 目視檢查通過；沒有必要 gate 被略過、失敗或留下未解決的 regression。第 16 節是使用者明訂保留的實機／部署驗收，不將它們宣稱為 PASS。高密度小預覽限制已記錄，完整下載品質與安全 baseline 保留。

完成後停止；沒有自行擴充功能、發布 v1.1.0 tag、push 或 deployment。

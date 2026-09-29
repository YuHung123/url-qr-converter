# M3 — Final Testing, Security, Accessibility & Release

日期：2026-09-29。起點 `4232016756cb9d52459f1bd4492c58c30fc169ae`，working tree 乾淨，無 remote。已閱讀所有追蹤原始碼、tests、設定、lockfile、授權、M0/M1/M2 與 review-fixes 紀錄及完整 Git history。

## 1. Executive summary

URL QR Converter v1.0.0 是可靜態部署的 **local verified release-ready baseline（PASS WITH NOTE）**。四個既有功能正常，沒有新增核心功能。自動化測試通過；真實 Safari／手機／列印／螢幕閱讀器等平台項目仍為 NOT VERIFIED，依任務 acceptance philosophy 不阻擋本機 release。

## 2. Changes

- `src/decode.ts`：依實測加入 768 px 第一輪；只有 `no-qr` 才以原本最多 2048 px 重試，不放大、不換 decoder。
- `src/qr.ts`、`src/main.ts`：保留實際 module count；version 17+ 顯示簡短密度提示；改善無法讀取圖片的訊息。
- `index.html`：WebKit skip link 明確 `tabindex="0"`；Firefox 結果欄與 Download/Copy 使用 `autocomplete="off"`，避免 reload 還原舊結果／按鈕狀態；保留 `image/*` 並說明 raster 格式。
- `src/styles.css`：輸入／結果欄與 file button 邊框由約 2.17:1 改為 3.31:1；未重新設計版面。
- `playwright.config.mjs`、`tests/preview-server.mjs`、`tests/browser/`：單一可重跑的正式 build 瀏覽器測試。
- `tests/fixtures/`：兩張獨立 encoder PNG、產生程式與來源／授權說明；`tests/qr.test.mjs` 增加 PNG module／quiet-zone／高密度 decode regression，原有 29 項保留。
- `tests/release/artifact.test.mjs`、`public/_headers`：正式產物、依賴、CSP 與部署標頭驗證。
- package／lockfile、gitignore、README、CHANGELOG、RELEASE_CHECKLIST 與本報告完成 release 整理。

## 3. Browser test strategy

加入固定版 `@playwright/test@1.63.0` 與 `@axe-core/playwright@4.13.0`，皆為 **devDependencies**。單一 Playwright framework 同時跑 Chromium、Firefox、WebKit；Node 原生 tests 保留。axe 透過既有 Playwright 執行，不另建框架或 CI 服務。

`npm run test:browser` 先 build，再以 Vite preview API 服務真實 `dist/`。小型 wrapper 載入 `dist/_headers`，讓測試真正收到 HTTP CSP。Playwright 自行管理 server、使用 `strictPort`／`reuseExistingServer: false`，不依賴舊 Temp scripts。單 worker、零 retries；JSON、截圖、失敗 trace 留在忽略的 `test-results/`，不發布。

環境為 Windows Node.js 24.19.0、npm 11.17.0；透過 WSL 呼叫 Windows 執行檔。三種 Playwright browser 均已實際下載並啟動。Chrome for Testing 的 Chromium 不等於使用者安裝的 Google Chrome；本次未另測 installed Chrome。**Playwright WebKit is not the same as testing real Safari on macOS/iOS.** [Playwright browsers](https://playwright.dev/docs/browsers)

初期主機可用實體 RAM 約 238–316 MiB／7.7 GiB，出現一般 click／context teardown 延遲。停用 trace 的 screenshot／DOM snapshot 錄製，仍保留 API trace 與失敗 screenshot；未放寬功能 assertions 或加入重試掩蓋失敗。大圖的 helper 由預設 5 秒 content assertion 改為先等 terminal state（30 秒），再核對相同精確 URL；效能測量仍記錄真實等待時間。一次 Firefox corpus 第三次 photo-JPEG 等待逾時，當時全主機約 318 MiB 可用；不改產品／timeout 的 Firefox 單獨重跑通過全部 51 筆，最終完整 suite 再確認。

第一輪 1.0.0 全套 44/45 通過，WebKit corpus 在第二次小 QR 長截圖成功後用完整組 120 秒；trace 證實下一次選圖時已超過整組期限。因此把原 17 種／51 次單一 context 分為 ordinary（12 種）與 large（5 種）兩個 tests，維持各三次、所有精確結果／Canvas assertions 及原 timeout，不把總圖片生成與自動化開銷當成單次 decode 失敗。最終重跑 **48/48 通過（12.9 分鐘）**，零 skipped／flaky。

初次 corpus 把低對比樣本預設為成功，實測三引擎皆無法讀取，改為按任務的「assessment」要求驗證明確 no-QR 與恢復能力，並列為限制。

## 4. Cross-browser results

| Browser | Result | Notes |
| --- | --- | --- |
| Chromium / Chrome for Testing 153.0.8010.12 | PASS | 正式 build，原生 clipboard write/read 均核對 |
| Playwright Firefox 155.0 | PASS | 正式 build；修正 reload 還原；原生 Copy promise 成功，未讀回 OS clipboard |
| Playwright WebKit 26.6 | PASS WITH NOTE | 正式 build；明確 tabindex 後鍵盤通過；原生 Copy 成功；不是 macOS/iOS Safari |
| Installed Google Chrome | NOT VERIFIED | M1/M2 歷史紀錄曾測 153.0.8010.53，本次不沿用為 M3 實測 |
| Real Safari on macOS/iOS | NOT VERIFIED | 無 Apple 硬體／Safari 環境 |

## 5. QR real-world / fixture testing

`independent-ascii.png`（450 B）與 `independent-unicode.png`（387 B）由 **Segno 1.6.6** 生成，與正式 encoder qrcode-generator 獨立。Byte／UTF-8、M、不自動 boost、四格白邊、8 px/module；內容只有保留用途的 example URL。原始 PNG、可選再生成程式及來源／使用授權已提交，測試不需安裝 Python／Segno。

一般 PNG、185 px resize、1200×900 screenshot、JPEG quality 0.65、桌面照片風格的合成 JPEG、15° rotation、inversion、0.6px blur、affine skew、透明 PNG、大 JPEG、高壓縮大 PNG 與長截圖均實測。桌面照片是自行繪製的模擬，**不是真實相機照片**；skew 是 affine，未宣稱一般透視照片全部可辨識。140/220 灰階低對比樣本回傳 no-QR，屬 PASS WITH NOTE。

螢幕尺寸評估把實際 M1 Canvas 以 nearest-neighbor 縮小後交給 jsQR 軟體掃描；不是手機對著螢幕掃描。三引擎結果一致：

| ASCII URL 字元數 | Version / modules | PNG 邊長 | 320 px | 246 px |
| --- | --- | --- | --- | --- |
| 30 | 3 / 29 | 1036 | 可讀 | 可讀 |
| 200 | 10 / 57 | 1040 | 可讀 | 可讀 |
| 500 | 17 / 85 | 1116 | 可讀 | 不可讀 |
| 1000 | 26 / 121 | 1032 | 不可讀 | 不可讀 |
| 1800 | 35 / 157 | 1155 | 不可讀 | 不可讀 |

原尺寸像素於 Node integration 仍能完整 decode 五種 URL，並驗證四格白邊、黑白整數模組與至少 1024 px。由此選擇 **version >=17（85 modules）** 才顯示密度提示：此時窄手機約 2.65 px/module。沒有 size control、shortener 或 editor。

README 提供 PNG／Word／PDF 用法，保留白邊、正方形與避免 JPEG 重壓縮。建議短網址先用約 3 cm；保守排版起點約每格 0.5 mm，含白邊寬度 `(modules + 8) × 0.5 mm`。這是 guidance，沒有宣稱實際印表機／手機已通過；real printed scan 留在 manual checklist。

## 6. Performance / image size review

使用真實 UI 選檔流程，每個案例連續三次；下表為最終 1.0.0 run 的中位數 **總 elapsed / 同步階段，毫秒**。elapsed 從 change event 到結果 DOM 更新，含 browser bitmap 解碼；同步階段從第一次 getImageData 到結果更新，近似像素讀取＋jsQR＋必要重試，不包含第一次 drawImage。資料生成／PNG encode 不計入解碼時間。各引擎共 51 筆、合計 153 筆，完整值可重跑後讀 `test-results/*/performance.json`。主機負載與原生 decoder 差異很大，這不是硬體 benchmark 或速度保證。

| 測試圖片 | Chromium ms | Firefox ms | WebKit ms |
| --- | --- | --- | --- |
| M1 PNG（≥1024²） | 150 / 128 | 156 / 122 | 1921 / 1335 |
| 獨立 PNG（328²） | 26 / 17 | 39 / 26 | 389 / 301 |
| 縮圖（185²） | 20 / 15 | 32 / 24 | 294 / 207 |
| Screenshot（1200×900） | 101 / 78 | 129 / 103 | 698 / 459 |
| JPEG 0.65（480²） | 44 / 37 | 84 / 66 | 450 / 336 |
| Photo-like JPEG（1200×900） | 128 / 84 | 150 / 122 | 746 / 515 |
| 旋轉 15°（480²） | 56 / 40 | 97 / 84 | 356 / 273 |
| 反相（480²） | 69 / 57 | 115 / 106 | 541 / 425 |
| 輕微 blur（480²） | 58 / 42 | 129 / 104 | 112 / 65 |
| Affine skew（480²） | 51 / 40 | 117 / 107 | 91 / 44 |
| 透明 PNG（480²） | 48 / 39 | 74 / 64 | 85 / 54 |
| 低對比（480²；no QR） | 58 / 50 | 89 / 77 | 83 / 54 |
| 大 JPEG（4000×3000） | 203 / 79 | 312 / 89 | 1176 / 501 |
| 高壓縮 PNG（6000×4000） | 506 / 90 | 454 / 89 | 2489 / 963 |
| 長截圖（1200×6000，QR 800²） | 133 / 38 | 201 / 69 | 563 / 183 |
| 長截圖小 QR（同上，QR 256²） | 234 / 129 | 383 / 276 | 2191 / 854 |
| 無 QR（1200×900） | 320 / 297 | 568 / 542 | 511 / 434 |

### Decision / scaling

修改前同機大 JPEG 的同步階段中位數約 Chromium **624 ms**、Firefox **1046 ms**；一般 screenshot 約 154／512 ms，足以出現可察覺的短暫介面阻塞。因此加入小型 **768 → 2048** staged decode。只在 no-QR 時重試；unsupported URL／錯誤不再掃第二次，沒有新 decoder、Worker、WASM、cancellation 架構或大型 polyfill。

大 JPEG 由原 2048×1536 的約 315 萬像素降為 768×576 的約 44 萬像素即可成功；最終各引擎都只走一次。24MP 原圖也在 768×512 成功，browser 初始 bitmap 解碼仍可能主導時間。長截圖大 QR 在 154×768 就可讀；256 px 小 QR 第一輪找不到、第二輪 **410×2048** 成功，三引擎各三次均驗證，避免只為速度犧牲細節。

Chromium／Firefox 的一般圖片多為幾十至一百多毫秒，但本輪 Windows WebKit 的普通 M1 PNG 中位數約 **1.92 秒（同步 1.34 秒）**，可明顯感到停頓，不能宣稱所有引擎都流暢。同期連一般鍵盤／axe 操作也大幅延遲；這與資源壓力一致，不能單憑本機數字推論真實 Safari 的速度。表中的同步時間表示主執行緒不能處理互動的近似區間。no-QR 要做兩輪，可能比舊路徑更慢，且複雜圖仍可能明顯停頓；這是保留高解析 fallback 的取捨，未聲稱消除 UI freeze。額外診斷的 WebKit 24MP PNG 曾約 2.94 秒完成、同步約 0.85 秒；取樣與主機記憶體壓力會使尾端延遲變大。小 QR 長截圖的 WebKit 單次最慢約 4.36 秒、同步 1.87 秒。最終效能判定為 **PASS WITH NOTE**：保留已改善 Chromium／Firefox 正常大圖的 staged decode，記錄 Windows WebKit 的實際停頓與資源限制；真實 Safari／裝置效能仍須人工驗證。沒有證據支持再為此主機負載或 synthetic high-frequency 極端圖片加入 Worker／新 decoder。

### Image limits / recovery

PASS WITH NOTE：12MP JPEG、24MP 高壓縮 PNG、7.2MP 長截圖均實測，三引擎成功且實際處理 Canvas 最長邊不超過 2048。下表是最終 runtime 生成檔案的大小；編碼器會隨 browser 不同而變動，並未把大原始 bitmap 當成小記憶體使用量。

| Input | Chromium bytes | Firefox bytes | WebKit bytes |
| --- | --- | --- | --- |
| large-jpeg | 132655 | 260817 | 131927 |
| compressed-large | 515258 | 185991 | 150027 |
| long-screenshot | 197572 | 82582 | 70605 |
| long-screenshot-small | 184559 | 60116 | 55327 |

20 MiB+1 檔案在 native image processing 前被拒絕，createImageBitmap **呼叫零次**；Node tests 另驗證精確 boundary。5 MiB corrupt JPEG、invalid PNG、blank SVG、invalid HEIC 皆能回報錯誤並再選有效 fixture 恢復，沒有觀察到 browser crash。Bitmap close／Canvas release、context／draw failure 與 stale bitmap cleanup 由既有 Node tests 核對。

20 MiB 限制在 native image processing 前生效，但 browser 解壓原始圖片的配置發生在 Canvas cap 之前；**不保證抵禦所有 image bombs，也不是原始 bitmap 記憶體上限**。現行小型防護與文件符合本工具範圍，未加入格式 parser／HEIC dependency。

## 7. Accessibility

- PASS：`h1 → h2 → h3`、main／header／footer、tablist／tab／tabpanel、labels／describedby、唯讀結果 textarea、Canvas accessible name。
- PASS：第一個 Tab 進入 skip link；Enter、Tab／Shift+Tab、方向鍵／Home／End、Space Generate、Enter／Space Download/Copy 與可見焦點。無結果使用 native disabled，busy 使用 aria-disabled＋internal guard 保留焦點。
- PASS：錯誤關聯 aria-invalid／alert，成功透過 status；隱藏 panel 不參與 accessibility tree／焦點順序。實際延後 decode，切換 tab 後才完成，隱藏 status 不出現在當前 accessibility snapshot；callback 不搶焦點。沒有證據需要修改原本 hidden/live-region 設計；真正的朗讀行為仍待 screen reader。
- PASS：axe WCAG 2 A／AA、2.1 AA 規則，兩模式各 initial／error／success，三引擎共 18 scans，0 violations。這不是完整 WCAG 認證或 screen-reader proof。[axe integration](https://playwright.dev/docs/accessibility-testing)
- PASS：一般 muted text／頁面背景約 5.53:1，error／白底約 7.52:1，focus outline／白底約 5.71:1。欄位邊框修正前 2.17:1 的 regression 實際失敗，改色後 3.31:1 通過。
- PASS WITH NOTE：1440／1280／768／375／320 CSS px，長 URL、密集 QR、較長錯誤、檔案控制項；無水平溢出、控制項在 viewport 內、QR 正方形。另測 640×450 CSS viewport（1280×900 在 200% zoom 的 reflow 等效）及 200% 文字放大，檢視正式 screenshots。沒有將 headless viewport 模擬宣稱為操作了真實瀏覽器 zoom UI。
- NOT VERIFIED：NVDA、Narrator、VoiceOver 實際朗讀與真實 Safari／OS 鍵盤設定；操作 checklist 已附。

WebKit 的 skip link 在 Tab、Alt+Tab、移除隱藏 transform 三種診斷中都被略過；加入明確 tabindex=0 才獲得焦點。Firefox reload 會還原 textarea 舊值與 Download/Copy 的動態 disabled 狀態；使用 autocomplete=off 後，原 reload regression 的空欄與 disabled assertions 通過。[Firefox autocomplete behavior](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/autocomplete)

## 8. Security

正式 meta CSP 完全維持原值：

```text
default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'none'; object-src 'none'
```

HTTP CSP 只額外加 `frame-ancestors 'none'`；`_headers` 另含 `X-Content-Type-Options: nosniff`、`Referrer-Policy: no-referrer`、`Permissions-Policy: camera=(), microphone=(), geolocation=()`。Browser 實際 response 與 artifact tests 核對一致。沒有 wildcard、unsafe-inline、blob/data 圖片例外或 tooling 專用 production CSP 放寬。Meta 無法提供 frame-ancestors；README 明確說明 hosting-specific 配置、dev HMR、一般 preview 與套用 HTTP headers 的 test preview 的差別。

完整 application source review 未發現使用者輸入進入 innerHTML／HTML 字串、unsafe href、eval、Function constructor、remote scripts、fetch／XHR／WebSocket／sendBeacon、analytics、cookies、storage、SW、backend 或 QR API。唯一動態 anchor 是固定 PNG 檔名的本地 Blob URL，已延後 revoke；decoded URL 僅放入 textarea.value。

正式 bundle 的靜態檢查另找到一處 Vite 內建 modulepreload fallback 的 `fetch(link.href)`；目前 dist 沒有 modulepreload links，這不是使用者資料傳輸程式，runtime 轉換期間也沒有新增請求。未為了移除標準 build helper 而更動既有 Vite 設定。

正式 runtime 監聽 request／failed request／HTTP error、page error、console 與 CSP violation；轉換、下載、選圖、Copy 期間請求數未增加，沒有外部請求或 application errors。API automation 與 axe 的測試注入分開執行，不藉此繞過產品 CSP。

## 9. Privacy

URL、圖片、decoded payload 都在頁面內處理，無 upload／tracking／application persistence。乾淨 context 中 localStorage、sessionStorage、cookies、IndexedDB databases、CacheStorage、Service Worker registrations 均空。reload 後兩種結果清空，Download／Copy 停用。

下載檔案和 OS clipboard 是使用者主動輸出，可在頁面外保留；瀏覽器 cache／history／host access logs 不屬於應用程式的儲存能力保證。README 的簡短 privacy statement 已區分這些範圍。

## 10. M1 regression

PASS：HTTP、HTTPS、path/query/fragment、Unicode normalization；鍵盤 Generate；Canvas accessible name；真實 PNG download 與檔名／signature／至少 1024 正方形；下載後選入 M2 還原同一 URL。空字串、裸網域、非法 hostname／scheme、超 QR 容量失敗可恢復。Input change 清除 QR／停用 Download；延後 toBlob 後修改輸入不產生舊下載；匯出 null 失敗保留 QR、focus 並可重試。高版本原尺寸仍正確，密度提示只影響說明文字。

## 11. M2 regression

PASS：M1 PNG、兩張 Segno fixture、原生 UTF-8 Unicode、正常與各種變體圖片；no QR、invalid/corrupt image、plain text、javascript/data/file scheme。Byte 多段無效 UTF-8、Tab／LF／CR QR 不被默默省略或改寫為成功 URL；Node tests 另覆蓋 overlong／surrogate／out-of-range UTF-8 與更多控制字元。

PASS：Copy 的真實 API 成功；Chromium 實際 readback 相符，Firefox／WebKit 只驗證 native write promise 與 UI 成功。注入 rejection／API absent 驗證 failure path，保留 URL 可手動複製，不宣稱是真實 OS 權限拒絕測試。Copy busy 重複操作只呼叫一次；延後 decode A/B 與 Copy completion 不覆寫較新結果或解除新的 busy。新圖立即清空結果並停用 Copy，focused Copy 轉到 file input，完成後不搶焦點；可重選同一 fixture。

## 12. Automated tests

| 種類 | 數量／內容 |
| --- | --- |
| Node unit/integration | 30 tests；原有 29 全保留，加 1 個跨五種 QR version 的 PNG／quiet-zone／原尺寸 decode regression |
| Release artifact | 2 tests；CSP／headers／notices、精簡 dist／runtime dependencies／package-lock 版本一致 |
| Browser E2E | 16 tests × 3 engines = 48；含功能、race、鍵盤、responsive、corpus／效能、密度、安全與 accessibility |
| axe（包含於 E2E） | 2 stateful tests × 3 engines = 6 tests；每個 3 狀態，共 18 scans |
| 其他 accessibility（包含於 E2E） | 每引擎 keyboard／hidden panel 及 contrast regression；不與 E2E 加總成另一組通過數 |

最終命令（1.0.0、同一 worktree）結果：

| Command | Result |
| --- | --- |
| `npm ci` | PASS；23 packages installed，24 audited |
| `npm test` | PASS；30/30，無 skipped |
| `npm run typecheck` | PASS；透過 build 的同名 script 執行 |
| `npm run build` | PASS；透過 browser script 執行，正式 dist |
| `npm run test:browser` | PASS；48/48，三引擎 |
| `npm run test:artifact` | PASS；2/2 |
| `npm audit` | PASS；0 vulnerabilities（含 dev dependencies） |
| `npm ls --omit=dev --all` | PASS；僅 jsqr@1.4.0、qrcode-generator@2.0.4 |
| `git diff --check`／`git diff --cached --check` | PASS |

Artifact test 初次錯把 Vite serialize 的 `&#39;` 當成 literal apostrophe；已修正 test 比對的 HTML escaping，policy 本身未變，browser 另核對解析後的 meta 與 response header。

Node tests／audit 的結果仍適用：之後只有 browser test 分組與文件修改，production source／unit tests／manifest／lockfile 未再變動；最終 browser run 重新 typecheck／build，artifact gate 亦重跑。

所有正式 tests 均無 skip／only／retry；診斷用暫存 spec 已刪除，不算正式案例。效能紀錄按案例重複三次，非三個獨立 tests。

## 13. Manual / hardware verification

| 項目 | Result | Notes |
| --- | --- | --- |
| Real phone screen scan | NOT VERIFIED | 軟體縮圖掃描不等於手機相機 |
| Real Safari macOS/iOS | NOT VERIFIED | WebKit proxy 不取代 Safari |
| Real Android | NOT VERIFIED | 僅 desktop browser viewport 模擬 |
| Real printed scan | NOT VERIFIED | 無印表機與實體文件掃描 |
| Screen reader | NOT VERIFIED | 未實際操作 NVDA／Narrator／VoiceOver |
| Real camera photo | NOT VERIFIED | 只做可重現的 photo-like 合成 |
| Native 200% zoom UI | NOT VERIFIED | 另有 CSS viewport／文字放大與截圖檢視 |
| Hosted HTTPS/headers/subpath | NOT VERIFIED | 本次無部署；test server 已驗證 header bytes |

`RELEASE_CHECKLIST.md` 提供具體雙向 screen-reader walkthrough、print／phone 與部署後驗證。

## 14. Remaining limitations

高密度 QR 在小畫面難掃；低對比、嚴重模糊／透視或縮放後過小的 QR 可能失敗。GIF/BMP/WebP 依 browser raster support，沒有 SVG／HEIC decoder；本次的 HEIC negative 是無效 HEIC 檔案，不冒充有效 HEIC 實測。只解析一個 QR、HTTP(S)、完整 UTF-8 Byte segments。剪貼簿受 secure context／權限限制，失敗可手動複製。

圖片原始解碼記憶體未被 Canvas cap 限制；同步 jsQR 在困難 no-QR、大圖或資源吃緊的裝置仍可能暫時阻塞主執行緒；本輪 Windows WebKit 的普通 PNG 也觀察到秒級停頓（第 6 節），未宣稱真實 Safari 效能已驗收。沒有聲稱抵抗所有 image bombs。jsQR 1.4.0 發布已久、維護有限；版本固定並有 regression 保護。沒有把已修正的 Firefox restore、WebKit skip link 或邊框對比列為未解問題。

## 15. Release files

README、CHANGELOG、RELEASE_CHECKLIST、M3_VERIFICATION 與完整 `public/THIRD_PARTY_NOTICES.txt` 均存在。`dist/` 包含 index.html、單一 JS／CSS、favicon.svg、THIRD_PARTY_NOTICES.txt、_headers；notice/header 與 public 逐 byte 相同。沒有 source maps、測試、fixtures 或 scratch files。dist 約 180 KiB，保持 Git ignored，依 lockfile 可重建。

Production dependencies 仍僅 **qrcode-generator 2.0.4（MIT）／jsqr 1.4.0（Apache-2.0）**，無 transitive runtime dependencies；已核對安裝套件的 license、encoder source notice 與 decoder LICENSE，decoder package 無另附 NOTICE。Playwright（Apache-2.0）、axe wrapper/core（MPL-2.0）只用於開發，不進 dist。Segno（BSD-3-Clause）僅用來離線產生 fixture，不提交其程式碼，也不加入 npm。正式發佈必須保留 third-party notices。

## 16. Version / Git

- package.json 與 lockfile：`1.0.0`，在 release acceptance 基本通過後設定。
- Final release commit：`v1.0.0^{commit}`；commit message `chore: finalize v1 release`。
- 本報告與 release 一同提交，不能把該 commit 自身 hash 寫進自己；`git rev-parse 'v1.0.0^{commit}'` 提供精確完整 hash，交付訊息亦記錄實際 hash。
- 本機 annotated tag：`v1.0.0`，message `URL QR Converter v1.0.0`，保留明確 release 訊息與 tagger 資訊。
- Working tree：commit 後 clean，確認後才建立 tag；tag 後再次確認。
- Remote：無；push：未執行；GitHub Release／網站／hosting：未操作。
- 所有本次 preview／test servers 已停止，最終確認 4173／5173 沒有本專案 listener。

## 17. Final V1 status

**PASS WITH NOTE — URL QR Converter v1.0.0 是可發布的本機 V1 baseline。** 必要自動化、產物、依賴／授權與本機 release 步驟通過，沒有真正 release blocker；本機 v1.0.0 tag 已建立。

Handoff state：**AUTOMATED_PASSED_HUMAN_ACCEPTANCE_REQUIRED**，人工／硬體項目見第 13 節，仍為 NOT VERIFIED。依使用者明訂的 acceptance philosophy，這些限制不阻擋 M3 的 local release-ready baseline；不代表公開部署或實機驗收已完成。

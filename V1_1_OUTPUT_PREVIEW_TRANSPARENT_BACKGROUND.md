# URL QR Converter v1.1.0 — Output Preview + Compact Geometry + Transparent Background

$model-routing

請先盤點目前實際安裝的 skills，並主動使用真正適合本任務的 skills。

優先考慮：

- `$model-routing`
- receiving-code-review
- verification-before-handoff
- systematic-debugging（只有發生非預期問題時）
- browser / Playwright / accessibility / UI regression / security 類 skill（若目前實際存在）

只使用實際存在的 skill。
不要宣稱使用不存在的 skill。
不要為了使用 skill 擴大任務。

---

# 任務目標

URL QR Converter v1.1.0 目前再次標記為：

`FUNCTIONALLY_FROZEN`

但人工驗收又發現三個實際 usability / output 問題：

1. 使用者可以輸入 QR raster 輸出尺寸，但目前 preview 並不反映該尺寸。
2. 為了維持固定整數 px/module，目前 renderer 會把除不盡的剩餘 pixels 全部變成額外外圍 padding；高密度 QR 在較大 requested size 下會出現過多留白。
3. PNG / WebP / SVG 尚未提供透明背景，對非白色網站／文件背景不方便。

因此：

**暫時解除 FUNCTIONALLY_FROZEN。**

本輪完成：

- output-size-aware preview
- compact raster geometry
- transparent background

並通過 required verification 後，再重新標記：

`FUNCTIONALLY_FROZEN`

本輪仍不是完整 UI/UX redesign。

---

# 1. 開始前完整閱讀

至少完整閱讀：

- `V1_1_CUSTOM_OUTPUT_SIZE_VERIFICATION.md`
- `V1_1_FUNCTIONAL_FREEZE_VERIFICATION.md`
- `V1_1_FINAL_SVG_AUDIT.md`
- `V1_1_PRE_TAG_CLEANUP_VERIFICATION.md`
- `README.md`
- `CHANGELOG.md`
- `RELEASE_CHECKLIST.md`
- `index.html`
- `src/main.ts`
- `src/qr.ts`
- `src/svg.ts`
- `src/decode.ts`
- `src/styles.css`
- `tests/`
- `package.json`
- `playwright.config.mjs`

以及所有與：

- preview
- raster rendering
- PNG/JPG/WebP export
- SVG export
- size validation
- download split menu
- accessibility
- SVG security

直接相關的程式。

開始前執行：

git status
git log --oneline --decorate -8
git tag -n
git diff --check
git diff --cached --check

確認目前 working tree。

不要：

- reset
- checkout 丟棄修改
- amend
- rebase
- stash
- clean
- 覆蓋未知修改

如果出現無法解釋的 unrelated changes：

停止並報告。

---

# 2. Baseline 必須保留

上一輪 Custom Output Size 已經建立：

- raster size 64–2048
- default 256
- arbitrary integer values
- exact requested raster dimensions
- dynamic QR minimum
- minimum 2 px/module
- PNG/JPG/WebP same dimensions
- SVG independent from raster-size validation
- EC M
- Byte mode
- 4-module quiet zone
- existing dense guidance
- existing URL stale protections
- accessibility behavior

這些功能不能回退。

上一輪 automated baseline：

- Node 48/48
- artifact 4/4
- browser 129/129
- Chromium 43/43
- Firefox 43/43
- WebKit 43/43
- axe 24 scans / 0 violations
- npm audit 0 vulnerabilities

本輪新功能可以讓 test count 增加。

不得刪除既有 tests 來維持數字。

---

# 3. Scope

本輪只處理：

## A. Output-size-aware QR preview

使用者改變輸出尺寸後，preview 必須立即反映目前 requested raster size。

## B. Compact raster geometry

移除目前因：

`fixed pixelsPerModule + centering padding`

造成的大量額外留白。

保留真正 QR quiet zone。

## C. Transparent background

新增：

`透明背景`

讓支援 alpha 的格式輸出真正透明背景。

## D. 必要 tests / docs / verification

不要做完整網站 redesign。

---

# 4. 不要處理

不要修改：

- URL normalization
- scheme-less behavior
- localhost handling
- QR EC M
- Byte encoding
- QR payload
- QR version selection
- QR logical matrix
- 4-module quiet zone requirement
- Copy
- Open Link
- CSP，除非現有 CSP test 自然需驗證但不應修改 policy
- production dependencies
- file upload limit
- current output-size validation copy
- download filenames
- unrelated decoder behavior
- tabs architecture
- header
- overall page layout
- typography system
- global colors
- animations
- personal-site integration

不要加入：

- QR foreground color picker
- background color picker
- custom margin control
- error-correction selector
- rounded modules
- logo insertion
- URL shortener
- presets
- new image formats

---

# 5. Existing Output Size Copy

保持上一輪 EXACT：

Visible label：

`輸出尺寸`

Unit：

`px`

Default：

`256`

No placeholder。

No normal helper text。

Existing validation messages保持：

`請輸入輸出尺寸。`

`請輸入有效的輸出尺寸。`

`請輸入整數尺寸。`

`輸出尺寸不得小於 64 px。`

`輸出尺寸不得大於 2048 px。`

Dynamic：

`此 QR Code 至少需要 {minimum} px。`

Existing upload error保持：

`圖片檔案過大(上限20MB)`

不要修改上述 copy。

---

# 6. 新 Background Control

新增一個簡單的 boolean control。

Visible label EXACT：

`透明背景`

預設：

OFF

正常狀態：

不要顯示任何 helper text。

特別禁止加入以下文案：

`透明背景請搭配淺色、單純的背景。`

也不要自行新增等價 warning，例如：

- 建議使用淺色背景
- 深色背景可能影響掃描
- 請注意背景對比
- 透明 QR 使用提醒

使用者已明確決定：

**不要顯示這類提示。**

---

# 7. Transparent Background Supported Formats

Transparent background：

## Supported

- PNG
- WebP
- SVG

## Not supported

- JPG

原因：

JPG 沒有 alpha channel。

不要假裝 JPG 支援透明。

不要在 transparent mode 下偷偷：

- compositing white
- 關閉 transparency 後下載
- 下載與使用者設定不一致的 JPG

---

# 8. JPG Behavior in Transparent Mode

當：

`透明背景 = ON`

JPG download item：

保留在 menu 中，但必須 disabled。

要求：

- 使用正確 disabled semantics
- keyboard navigation 不可觸發 JPG download
- screen reader 能知道 JPG 目前不可用
- 不移除 JPG item
- 不改 dropdown format order

不要額外新增正常狀態警告。

不要新增：

`JPG 不支援透明背景。`

作為常駐 helper text。

如果現有 menu architecture 無法安全 disable item：

可以做最小必要改動，使該 item具有可靠的 disabled semantics。

但不要 redesign 整個 download component。

---

# 9. Download Menu Order

保持目前既有：

Main action：

PNG

Dropdown：

1. SVG
2. JPG
3. WebP

本輪不要重新排序。

格式順序留給後續 Claude UI/UX redesign 再決定。

---

# 10. Transparent Raster Output

當 transparent OFF：

保持：

- opaque white background
- black QR modules

當 transparent ON：

PNG / WebP：

- background alpha = 0
- QR dark modules維持 opaque black
- quiet zone也是 transparent
- 額外任何未繪製 pixels全部 transparent

不得：

- checkerboard寫入實際輸出
- 使用半透明黑色 modules
- 加白底
- 混入 matte color

---

# 11. Transparent SVG

當 transparent OFF：

保持目前 SVG：

- white background
- black modules
- existing viewBox
- existing quiet zone
- existing geometry

當 transparent ON：

SVG background 必須真正透明。

優先作法：

在不改安全 parser 的前提下，讓 generator輸出：

- 不含 white background rect
- black QR module geometry unchanged

但：

先讀現有 `createQrSvg()` 與 `src/svg.ts` parser，確認現有 parser是否已安全接受這個 generated transparent variant。

---

# 12. SVG Security Boundary

如果：

透明 SVG 可以在不改 `src/svg.ts` parser 的情況下 round-trip：

優先保持 parser byte-identical。

如果：

現有 parser 必須修改才能接受本工具自己產生的 transparent SVG：

允許做**極小、精確、generator-specific** 的 parser extension。

要求：

- 不新增任意 SVG elements
- 不新增 script
- 不新增 style
- 不新增 image
- 不新增 use
- 不新增 foreignObject
- 不新增 external href
- 不新增 data URL
- 不新增 event attributes
- 不新增 arbitrary CSS
- 不放寬 namespace規則
- 不放寬 URL-bearing attributes
- 不放寬 geometry bounds
- 不接受與透明背景無關的新語法

只允許：

**讓本工具的安全透明 SVG variant 能被自己 decode。**

如果 parser有修改：

必須：

- 明確記錄 security-sensitive delta
- 跑完整既有 malicious SVG regression
- 新增 targeted transparent-SVG security tests
- 確認 no DOM execution
- no script
- no network
- no navigation
- no resource load
- no CSP violation

本輪仍不是 Final Security Audit。

Final Security Audit留到 UI/UX redesign 完成後。

---

# 13. Current Raster Geometry Problem

上一輪使用：

`totalModules = qrModules + 8`

`pixelsPerModule = floor(selectedSize / totalModules)`

`qrPixelSize = totalModules * pixelsPerModule`

剩餘 pixels：

`selectedSize - qrPixelSize`

全部變成額外 white padding。

這會導致高密度 QR 在某些尺寸產生大量額外外框。

例如：

totalModules = 185
selectedSize = 512

目前：

pixelsPerModule = 2

QR area：

370 px

剩餘：

142 px

約：

71 px 額外 padding / side

這不是我們要的效果。

---

# 14. New Compact Raster Geometry

本輪改成：

**整個 requested canvas 都用來表示 QR 的 totalModules grid。**

不要再要求：

所有 modules 都完全相同 pixel width。

改成：

每條 module boundary 都落在整數 pixel coordinate。

---

# 15. Boundary Mapping

定義：

`totalModules = qrModules + 8`

對任意 grid boundary：

`boundary(i) = floor(i * selectedSize / totalModules)`

其中：

`i = 0 ... totalModules`

因此：

- boundary(0) = 0
- boundary(totalModules) = selectedSize

對一個 module cell：

`start = boundary(i)`

`end = boundary(i + 1)`

width：

`end - start`

---

# 16. Black Module Mapping

QR matrix 的 logical module `(x, y)`：

因為 quiet zone = 4：

grid coordinates：

`gx = x + 4`
`gy = y + 4`

draw rectangle：

x0：

`floor(gx * selectedSize / totalModules)`

x1：

`floor((gx + 1) * selectedSize / totalModules)`

y0：

`floor(gy * selectedSize / totalModules)`

y1：

`floor((gy + 1) * selectedSize / totalModules)`

draw exact integer rectangle：

`[x0, x1) × [y0, y1)`

不要：

- interpolation
- drawImage scaling
- bilinear resize
- post-render resize
- CSS screenshot

---

# 17. Consequence of New Geometry

例如：

selectedSize = 512
totalModules = 185

平均：

512 / 185 ≈ 2.77 px/module

所以：

- 某些 cells = 2 px
- 某些 cells = 3 px

這是刻意設計。

要求：

- 每個 edge仍為 integer pixel coordinate
- cell width差距最多 1 px
- 不產生 gray edges
- 不 interpolation
- 不產生額外 71 px white padding

整個：

512 × 512

canvas 都是正常的 QR grid，包括真正的 quiet zone。

---

# 18. Quiet Zone

保留 logical：

4 modules / side

不要改成：

- 1
- 2
- 3
- custom margin

quiet zone仍是 QR grid 的前後各 4 cells。

由 boundary mapping自然得到其 pixel width。

例如：

left quiet zone：

`boundary(4) - boundary(0)`

right quiet zone：

`boundary(totalModules) - boundary(totalModules - 4)`

因 rounding可能差 1 px。

這是可接受的。

不要再額外加入 centering padding。

---

# 19. Minimum Output Size

保持上一輪：

`MIN_PIXELS_PER_MODULE = 2`

以及：

`minimumSize = totalModules * 2`

保持既有 dynamic error：

`此 QR Code 至少需要 {minimum} px。`

因此合法尺寸必須確保：

平均與最小 grid cell均至少 2 px。

當：

`selectedSize >= totalModules * 2`

使用 floor-based boundary mapping 時：

所有 module cell width / height 必須 >= 2。

新增 test直接驗證。

---

# 20. Exact Requested Size

保持：

使用者輸入：

64
128
256
300
512
1024
2048

如果該尺寸對目前 QR合法：

final raster canvas 必須 EXACT：

requested × requested

例如：

300

→ PNG 300 × 300
→ JPG 300 × 300
→ WebP 300 × 300

不再存在：

requested 512
→ QR只使用370
→ 額外142 padding

整個 final canvas 都按 totalModules distribution使用。

---

# 21. Preview Goal

目前 preview 使用獨立 renderer，沒有真正反映 raster export size。

本輪要改成：

> Preview 必須代表目前已生成 QR 在目前輸出尺寸與背景設定下的實際 raster 結果。

也就是：

Generate URL A

output size：

256

transparent：

OFF

preview應代表：

256 × 256 white-background raster A。

改 size：

128

preview立即變成：

128 × 128 raster A。

切 transparent：

ON

preview立即顯示：

128 × 128 transparent raster A。

不需要重新 Generate。

---

# 22. Preview Uses Generated QR, Not Draft URL

保持現有核心規則。

例如：

Generate A

然後 URL input 改成 B，但未重新 Generate。

此時：

- preview仍是 A
- size edits只改 A 的 preview rendering
- transparency只改 A 的 background
- download仍是 A

只有成功 Generate B：

preview payload才切到 B。

不要因 size/background設定重新 normalize或重新 encode draft URL。

---

# 23. Preview Update Timing

當已有 generated QR：

## Output size

使用者輸入一個目前合法的新尺寸時：

preview應在不需要按 Download 的情況下更新。

不要等：

- blur
- Download
- Generate

才看得到尺寸差異。

如果輸入暫時變成：

- empty
- malformed
- decimal
- too small
- too large

不要 destroy QR preview。

保留最後一個有效 preview。

Existing validation UX仍可在：

- blur
- raster download
- Enter

顯示正式錯誤。

Typing新合法值時：

更新 preview。

---

# 24. Preview Transparency Timing

透明背景 toggle：

立即更新 preview。

不需要：

- Generate
- Download
- blur

如果 size field暫時 invalid：

toggle可以套用到：

最後一個有效 preview size。

不要清除 QR。

---

# 25. Preview Visual Size

使用者要求：

在下載以前，就能從 preview看出輸出尺寸有多大。

因此：

在 desktop 且空間足夠時：

對合理的小尺寸應盡可能使用：

**1 output pixel ≈ 1 CSS pixel**

例如：

- 64 px output → preview約64 CSS px
- 128 → 約128 CSS px
- 256 → 約256 CSS px
- 300 → 約300 CSS px
- 512 → 最多約512 CSS px，若 layout可容納

---

# 26. Preview Maximum / Responsive Behavior

不能讓：

1024 / 2048 px output

把整個頁面撐到：

1024 / 2048 CSS px。

preview必須受：

- preview container
- viewport width
- responsive layout

限制。

規則：

`displayedPreviewSize = min(requestedSize, availablePreviewSize)`

保持正方形。

因此：

- 小尺寸可以看出實際大小差異
- 大尺寸會縮放到 container內
- 不造成 horizontal overflow

---

# 27. Preview Dimension Text

在 preview附近新增非常簡單的 dynamic dimension display：

EXACT pattern：

`{size} × {size} px`

例如：

`128 × 128 px`

`256 × 256 px`

`2048 × 2048 px`

不要額外寫：

- 實際輸出尺寸
- 預覽已縮放
- 高解析度
- 原始大小
- download size

只顯示尺寸本身。

若尚未生成 QR：

沿用既有 empty preview behavior。

不要顯示虛假的 output dimensions。

---

# 28. Preview Scaling Copy

不要新增：

`縮放預覽`

或其他 helper text。

Preview若因 container限制被縮小：

由 dimension text：

`2048 × 2048 px`

提供真實尺寸資訊即可。

保持 UI 簡潔。

---

# 29. Preview Rendering Source

優先讓 preview與 raster export共用同一套：

- matrix
- geometry
- background

rendering implementation。

不要建立：

- 一個 preview renderer
- 一個 PNG renderer
- 一個 JPG renderer
- 一個 WebP renderer

造成 drift。

理想：

pure geometry/render helper
→ preview
→ PNG
→ JPG
→ WebP

共用。

---

# 30. Preview Checkerboard

透明背景模式下：

Preview image本身透明。

為了讓使用者肉眼看得出 transparency：

可以在 preview presentation layer後方使用標準 checkerboard。

要求：

- checkerboard只存在 CSS / preview stage
- 不進入 canvas pixels
- 不進 PNG
- 不進 WebP
- 不進 SVG
- 不進 JPG
- 不作為 QR logical background

透明 OFF：

preview應看到實際 white background。

---

# 31. Preview Accessibility

不要讓：

checkerboard
dimension decoration
background styling

污染 screen-reader內容。

Dimension text可以正常閱讀。

Transparent control：

visible label / accessible name：

`透明背景`

使用 native semantics。

如果使用 checkbox：

label正確關聯。

如果使用 switch：

必須有正確 role / checked state。

不要只用可點 div。

---

# 32. Background Setting Persistence

使用者設定：

透明背景 ON/OFF

在：

- tab switching
- URL draft editing
- Generate new QR

期間保持。

不要每次 Generate 都偷偷 reset。

重新整理頁面後是否保存：

沿用目前產品「no persistence」原則。

不要新增：

localStorage
sessionStorage
cookie
IndexedDB

Page reload後回 default OFF。

---

# 33. PNG

透明 OFF：

- opaque white background

透明 ON：

- alpha background 0
- black QR alpha 255

Actual PNG dimensions：

exact requested size。

Pixel-level test：

- transparent quiet/background pixels alpha 0
- black modules alpha 255
- RGB deterministic
- no partial alpha edges

---

# 34. WebP

透明 OFF：

保持 existing white opaque output。

透明 ON：

WebP必須保留 alpha。

Browser test實際下載 WebP並 decode：

確認：

- dimensions exact
- alpha存在
- transparent background有效
- QR仍可 decode

不要假設 browser encoder支援。

以三引擎實際 evidence為準。

如果某 Playwright engine的 WebP encoder有 platform-specific limitation：

不要自行回退成 white background。

先調查並報告。

---

# 35. JPG

透明 OFF：

保持 existing JPG。

透明 ON：

JPG menu item disabled。

不下載。

不要：

- silent fallback
- compositing white
- background toggle auto-OFF
- format auto-change

---

# 36. SVG

透明 OFF：

existing white-background SVG。

透明 ON：

transparent SVG。

保持：

- black vector modules
- logical 4-module quiet zone
- same viewBox geometry
- no rasterization

Output size field：

仍不改 SVG intrinsic vector geometry。

現有規則保持：

invalid raster size不能阻擋 SVG download。

Transparent setting則必須影響 SVG background。

---

# 37. SVG + Invalid Raster Size

例如：

size input = `abc`

transparent = ON

Download SVG：

必須：

- 成功
- transparent
- 不受 invalid raster size阻擋

同理：

32
empty
decimal

SVG仍獨立於 raster size validation。

---

# 38. Existing Size Error Interaction

保持：

size error只屬於 raster sizing。

不要把 transparency放進：

- URL error
- decode error
- size error

Transparent checkbox本身沒有 validation error。

---

# 39. No Background Warning

再次確認：

本輪不要新增任何：

transparent usage advice。

尤其不要加入：

`透明背景請搭配淺色、單純的背景。`

也不要同義改寫。

---

# 40. Preview + Invalid Size Cases

至少測：

Generated A
→ size 256
→ preview 256

改 128
→ preview 128

改 300
→ preview 300

改 abc
→ preview保留最後有效300

改 64，但目前 QR minimum 82
→ preview保留最後有效300
→ blur / raster action 顯示 dynamic minimum

改 128
→ error清除
→ preview更新128

---

# 41. Preview + Transparency Cases

Generated A
→ 256 white

toggle transparent ON
→ same A
→ same 256
→ transparent preview

toggle OFF
→ same A
→ white preview

不得：

- change payload
- regenerate draft
- alter QR matrix
- clear preview

---

# 42. Preview + Draft URL

Generate A
→ preview A

edit URL to B
→ preview still A

change size 300
→ preview A at 300

transparent ON
→ preview A transparent

Download PNG
→ A / 300 / transparent

successful Generate B
→ preview B / 300 / transparent

---

# 43. Dense QR Geometry Regression

對：

- short
- medium
- dense
- near-capacity

實際測：

- minimum size
- arbitrary valid size
- 256 / 300 / 512 where valid

驗證：

- no extra centering padding
- full canvas mapped to totalModules
- every module boundary integer
- every cell width >=2
- max cell width - min cell width <=1
- 4 logical quiet-zone cells preserved
- exact dimensions
- decode exact payload

---

# 44. Specific Regression for Previous 512 / 185 Problem

加入明確 regression。

Near-capacity：

totalModules = 185

selectedSize = 512

舊 renderer：

- QR grid used 370 px
- extra 142 px padding

新 renderer：

- entire 512 px width used by the 185 grid cells
- cell widths 2或3 px
- no separate 71 px outer centering padding
- 4 logical quiet-zone cells preserved
- exact 512 × 512
- jsQR / production decoder round-trip PASS

這個 regression要能真的辨識舊算法與新算法差異。

---

# 45. Pixel Geometry Verification

不要只驗證：

dimension。

至少用 independent reference calculation逐 pixel / boundary驗證：

- black module rectangle
- background pixels
- quiet zone
- alpha
- no interpolation
- no gray edges from renderer

JPG / lossy WebP可以保留合理 codec tolerance。

但 production renderer本身應先以 lossless pixel buffer驗證。

---

# 46. Preview Raster Quality

Preview source canvas如果因 CSS縮小：

可以使用 presentation-only scaling。

但不要把 CSS-scaled preview重新拿來做 download。

Download一定使用原始 requested-size raster data。

Preview scaling不應污染 output。

---

# 47. Existing Dense Guidance

保持 EXACT：

`QR Code 較密，建議下載後掃描。`

保持：

- threshold
- live region
- duplicate prevention

不要因新 geometry / transparency改動。

---

# 48. Responsive

新 transparent control與可變 preview必須在：

- desktop
- 768
- 375
- 320 CSS px
- 200% text enlargement equivalent

正常。

要求：

- 64px preview不被強制撐大成既有240px
- 128與256能看出明顯尺寸差異
- 大 preview不造成 horizontal overflow
- dimension text不重疊
- transparent control不擠壓下載 controls
- checkerboard不溢出
- size error仍正常

不要藉此做完整 responsive redesign。

---

# 49. Accessibility

新增 targeted tests：

## Transparent control

- visible label
- accessible name
- keyboard
- checked state
- focus-visible

## JPG disabled

transparent ON：

- disabled semantics
- keyboard不能下載
- direct UI activation不能下載

transparent OFF：

- 恢復可下載

## Preview

- dimension text可讀
- checkerboard aria-hidden / purely decorative
- no duplicate live announcement

## Axe

existing scans保持，

新增 relevant state：

- transparent ON
- disabled JPG
- size error + transparent
- mobile/reflow state

仍要求：

0 violations

不要 disable axe rules。

---

# 50. Browser Test Matrix

至少三引擎測：

- Chromium
- Firefox
- WebKit

包含：

## Preview size

- 64（若 current QR允許）
- 128
- 256
- 300
- 512
- 2048 scaled-to-fit

## Transparent raster

- PNG
- WebP

## White raster

- PNG
- JPG
- WebP

## JPG disabled

transparent ON

## Transparent SVG

picker + drag/drop round-trip

## Invalid size + SVG

transparent ON/OFF

---

# 51. Production Decoder Round-trip

對 transparent：

- PNG
- WebP
- SVG

至少測：

- short
- medium
- dense

確保：

actual downloaded file
→ application decode
→ exact URL

不要只測 jsQR helper。

---

# 52. Real Phone Scan

仍然：

NOT VERIFIED

Automated decoder不是 real phone。

不可以在 report聲稱：

transparent QR real-world scan已驗證。

---

# 53. Documentation

最小更新：

## README

增加：

- preview跟隨 raster output size
- raster compact grid rendering
- PNG / WebP / SVG transparent background
- JPG不支援 transparency

保持簡潔。

不要加入透明背景使用建議。

---

## CHANGELOG

在 unreleased 1.1.0 entry補：

- output-size-aware preview
- compact raster geometry
- transparent background

不要建立1.1.1。

---

## RELEASE_CHECKLIST

加入人工驗收：

- 64 / 128 / 256 / 300 / 512 preview尺寸感
- large output scaled preview
- white PNG/JPG/WebP
- transparent PNG/WebP/SVG
- transparent preview checkerboard
- JPG unavailable when transparent
- Word / PDF / browser placement
- real phone scan

---

# 54. Historical Reports

不要修改：

- `V1_1_CUSTOM_OUTPUT_SIZE_VERIFICATION.md`
- `V1_1_FUNCTIONAL_FREEZE_VERIFICATION.md`
- `V1_1_FINAL_SVG_AUDIT.md`
- `V1_1_PRE_TAG_CLEANUP_VERIFICATION.md`
- 其他歷史 audit / verification

它們保留當時狀態。

---

# 55. Security Regression

不需要做 Final Security Audit。

但本輪一定要跑：

- existing CSP tests
- existing malicious SVG tests
- no-network tests
- no-storage tests
- active payload tests
- download safety regressions

如果 `src/svg.ts` parser有改：

額外建立 targeted security tests，證明只放行自家透明 SVG variant。

---

# 56. Production Dependencies

不要增加 production dependency。

此功能不需要新 library。

package / lockfile依賴集合應保持。

---

# 57. Required Gates

完成後，在 clean Windows native repository環境執行：

npm.cmd ci
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
npm.cmd run test:artifact
npm.cmd run test:browser
npm.cmd audit
npm.cmd ls --omit=dev --all
git diff --check
git diff --cached --check

要求：

- existing Node tests全部保留並 PASS
- new Node tests PASS
- artifact全部 PASS
- Chromium全部 PASS
- Firefox全部 PASS
- WebKit全部 PASS
- skipped 0
- retry 0
- flaky 0
- unexpected 0
- axe 0 violations
- npm audit 0 vulnerabilities

不要修改：

- retries
- timeouts
- browser projects
- skips
- axe rules

來掩蓋問題。

---

# 58. Manual Visual Inspection

使用 browser automation實際 capture至少：

## White

- 64 preview
- 128 preview
- 256 preview
- 512 preview

## Transparent

- 128
- 256
- dense QR

## Large

- 2048 preview constrained in layout

人工目視確認：

- size hierarchy看得出來
- checkerboard只在 transparent preview
- no huge extra whitespace
- no clipping
- no overflow
- QR居中／呈現合理
- mobile正常

這仍不等於使用者最終人工驗收。

---

# 59. Version

保持：

`1.1.0`

不要建立：

`1.1.1`

不要建立：

`v1.1.0` tag

---

# 60. Git

完成後保持：

未 commit。

不要：

- commit
- tag
- push
- release
- deploy

---

# 61. Verification Report

建立：

`V1_1_OUTPUT_PREVIEW_TRANSPARENT_VERIFICATION.md`

至少包含：

## 1. Executive Summary

## 2. Scope

## 3. Previous Geometry Problem

用實際例子說明：

185 total modules / 512 requested / old 370 grid + 142 padding。

## 4. New Boundary Mapping

列公式：

`boundary(i) = floor(i * size / totalModules)`

以及：

- integer edges
- 2/3 px variable modules
- no interpolation
- 4 logical quiet zone

## 5. Preview Behavior

記錄：

- 64
- 128
- 256
- 300
- 512
- 2048

以及實際 CSS displayed size / constraints。

## 6. Background Control

列：

- label
- default
- persistence
- no warning copy

## 7. Format Matrix

表格：

| Format | White | Transparent | Size applies |
| --- | --- | --- | --- |
| PNG | PASS | PASS | yes |
| JPG | PASS | disabled | yes when white |
| WebP | PASS | PASS | yes |
| SVG | PASS | PASS | no raster-size dependency |

## 8. Transparent Pixel Evidence

PNG / WebP：

- background alpha
- module alpha

SVG：

- background semantics

## 9. SVG Security

明確說明：

- parser是否修改
- 如果有，exact delta
- malicious regressions

## 10. Preview / Draft / Size State

## 11. Accessibility

## 12. Responsive

## 13. Required Gates

## 14. Scope Integrity

確認：

- EC M unchanged
- Byte unchanged
- payload unchanged
- normalization unchanged
- CSP unchanged
- production deps unchanged
- no full UI redesign

## 15. Git State

## 16. Remaining Manual Acceptance

至少：

- real phone scan
- real camera
- actual external browser/document placement
- Word/PDF
- real Android
- real Safari
- print
- Narrator/NVDA/VoiceOver
- native 200% zoom
- deployment

## 17. Functional Freeze Decision

只能：

- FUNCTIONALLY_FROZEN
- BLOCKED_OR_INCOMPLETE

---

# 62. Completion Criteria

只有以下全部成立才能重新標記：

`FUNCTIONALLY_FROZEN`

要求：

- output size existing behavior preserved
- default 256 preserved
- 64–2048 preserved
- arbitrary integer sizes preserved
- exact output dimensions preserved
- dynamic minimum preserved
- min 2 px/module preserved
- 4-module logical quiet zone preserved
- no extra centering padding
- boundary mapping implemented
- every boundary integer
- cell width difference max 1 px
- no interpolation
- previous near-capacity 512 whitespace problem resolved
- preview reflects current valid raster size
- preview updates before download
- size changes do not regenerate payload
- preview always represents generated QR, not ungenerated draft
- dimension text `{size} × {size} px`
- large previews constrained responsively
- transparent control EXACT `透明背景`
- transparent default OFF
- no transparent-background warning/helper text
- PNG transparent PASS
- WebP transparent PASS
- SVG transparent PASS
- JPG disabled while transparent
- white-background outputs unchanged in principle
- checkerboard preview only, never output
- invalid raster size still does not block SVG
- transparent SVG round-trip PASS
- existing malicious SVG regressions PASS
- SVG parser unchanged if possible
- if parser changed, change narrowly security-tested
- EC M unchanged
- Byte mode unchanged
- payload unchanged
- URL normalization unchanged
- dense guidance unchanged
- oversize upload copy unchanged
- CSP unchanged
- production dependencies unchanged
- version 1.1.0
- all Node tests PASS
- typecheck PASS
- build PASS
- artifact PASS
- Chromium PASS
- Firefox PASS
- WebKit PASS
- skipped 0
- retry 0
- flaky 0
- unexpected 0
- axe 0 violations
- npm audit 0 vulnerabilities
- git diff check PASS
- no commit
- no tag
- no push
- no release
- no deploy

完成後停止。

不要開始完整 UI/UX redesign。
不要開始 Final Security Audit。
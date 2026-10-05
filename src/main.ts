import { decodeDimensions, decodeImage } from './decode';
import { createQrCanvas, createQrMatrix, exportQr, MIN_PIXELS_PER_MODULE, normalizeUrl, parseOutputSize, rasterGeometry } from './qr';
import type { DownloadFormat, QrMatrix } from './qr';
import { parseSafeSvg } from './svg';

const tabs = Array.from(document.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
const panels = Array.from(document.querySelectorAll<HTMLElement>('[role="tabpanel"]'));

function activateTab(activeTab: HTMLButtonElement): void {
  closeDownloadMenu();
  for (const tab of tabs) {
    const selected = tab === activeTab;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
  }

  for (const panel of panels) {
    panel.hidden = panel.id !== activeTab.getAttribute('aria-controls');
  }
}

for (const [index, tab] of tabs.entries()) {
  tab.addEventListener('click', () => activateTab(tab));
  tab.addEventListener('keydown', (event: KeyboardEvent) => {
    let nextIndex: number;

    switch (event.key) {
      case 'ArrowRight':
        nextIndex = (index + 1) % tabs.length;
        break;
      case 'ArrowLeft':
        nextIndex = (index - 1 + tabs.length) % tabs.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = tabs.length - 1;
        break;
      default:
        return;
    }

    const nextTab = tabs[nextIndex];
    if (nextTab) {
      event.preventDefault();
      activateTab(nextTab);
      nextTab.focus();
    }
  });
}

const urlInput = document.querySelector<HTMLInputElement>('#url-input')!;
const generateButton = document.querySelector<HTMLButtonElement>('#generate-button')!;
const downloadButton = document.querySelector<HTMLButtonElement>('#download-button')!;
const placeholder = document.querySelector<HTMLElement>('#qr-placeholder')!;
const imageContainer = document.querySelector<HTMLElement>('#qr-image-container')!;
const urlError = document.querySelector<HTMLElement>('#url-error')!;
const qrError = document.querySelector<HTMLElement>('#qr-error')!;
const status = document.querySelector<HTMLElement>('#qr-status')!;
const notice = document.querySelector<HTMLElement>('#qr-notice')!;
const outputSize = document.querySelector<HTMLInputElement>('#output-size')!;
const outputSizeError = document.querySelector<HTMLElement>('#output-size-error')!;
const transparentBackground = document.querySelector<HTMLInputElement>('#transparent-background')!;
const previewDimensions = document.querySelector<HTMLElement>('#preview-dimensions')!;

const downloadControl = document.querySelector<HTMLElement>('#download-control')!;
const downloadToggle = document.querySelector<HTMLButtonElement>('#download-toggle')!;
const downloadMenu = document.querySelector<HTMLElement>('#download-menu')!;
const menuItems = Array.from(downloadMenu.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'));

let generated: { url: string; canvas: HTMLCanvasElement; matrix: QrMatrix } | null = null;
let downloadBusy = false;
let outputSizeRevision = 0;
let backgroundRevision = 0;

function requestedSize(matrix?: QrMatrix): number {
  const size = parseOutputSize(outputSize.value);
  if (matrix) rasterGeometry(matrix.length, size);
  return size;
}

function showPreview(canvas: HTMLCanvasElement, url: string): void {
  canvas.className = 'qr-canvas';
  canvas.dataset.transparent = String(transparentBackground.checked);
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', `網址 ${url} 的 QR Code`);
  imageContainer.replaceChildren(canvas);
  previewDimensions.textContent = `實際尺寸：${canvas.width} × ${canvas.height} px`;
  placeholder.hidden = true;
}

function updatePreview(size: number): void {
  if (!generated) return;
  const canvas = createQrCanvas(generated.url, generated.matrix, size, transparentBackground.checked);
  generated.canvas = canvas;
  showPreview(canvas, generated.url);
}

function clearSizeError(): void {
  outputSizeError.textContent = '';
  outputSize.removeAttribute('aria-invalid');
}

function validatedOutputSize(): number | null {
  clearSizeError();
  try {
    return requestedSize(generated?.matrix);
  } catch (error) {
    outputSize.setAttribute('aria-invalid', 'true');
    outputSizeError.textContent = (error as Error).message;
    return null;
  }
}

outputSize.addEventListener('input', () => {
  outputSizeRevision++;
  clearSizeError();
  if (!generated) return;
  let size: number;
  try { size = requestedSize(generated.matrix); }
  catch { return; } // Keep the last valid preview while the field is incomplete.
  updatePreview(size);
});
outputSize.addEventListener('blur', () => { validatedOutputSize(); });
outputSize.addEventListener('keydown', event => {
  if (event.key === 'Enter' && !event.isComposing) {
    event.preventDefault();
    void download('png');
  }
});

transparentBackground.addEventListener('change', () => {
  backgroundRevision++;
  for (const item of menuItems) item.disabled = item.dataset.format === 'jpg' && transparentBackground.checked;
  // A valid target of 64 can snap to a 58px actual canvas. Re-enter the target
  // range while retaining that same uniform grid when changing only alpha.
  if (generated) updatePreview(Math.max(64, generated.canvas.width));
});

function closeDownloadMenu(restoreFocus = false): void {
  if (downloadMenu.hidden) return;
  downloadMenu.hidden = true;
  downloadToggle.setAttribute('aria-expanded', 'false');
  if (restoreFocus) downloadToggle.focus();
}

function openDownloadMenu(last = false): void {
  if (!generated || downloadBusy) return;
  downloadMenu.hidden = false;
  downloadToggle.setAttribute('aria-expanded', 'true');
  const enabledItems = menuItems.filter(item => !item.disabled);
  enabledItems[last ? enabledItems.length - 1 : 0]?.focus();
}

downloadToggle.addEventListener('click', () => {
  if (downloadMenu.hidden) openDownloadMenu();
  else closeDownloadMenu(true);
});
downloadToggle.addEventListener('keydown', event => {
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    openDownloadMenu(event.key === 'ArrowUp');
  }
});
downloadMenu.addEventListener('keydown', event => {
  const enabledItems = menuItems.filter(item => !item.disabled);
  const index = enabledItems.indexOf(document.activeElement as HTMLButtonElement);
  let next: number;
  switch (event.key) {
    case 'Escape': event.preventDefault(); closeDownloadMenu(true); return;
    case 'Tab': closeDownloadMenu(true); return;
    case 'ArrowDown': next = (index + 1) % enabledItems.length; break;
    case 'ArrowUp': next = (index - 1 + enabledItems.length) % enabledItems.length; break;
    case 'Home': next = 0; break;
    case 'End': next = enabledItems.length - 1; break;
    default: return;
  }
  event.preventDefault();
  enabledItems[next]?.focus();
});
document.addEventListener('pointerdown', event => {
  if (!downloadControl.contains(event.target as Node)) {
    closeDownloadMenu(downloadMenu.contains(document.activeElement));
  }
});
downloadControl.addEventListener('focusout', event => {
  // relatedTarget identifies the destination even while activeElement is <body>
  // between blur and focus; keep the menu open when moving between its items.
  if (!downloadControl.contains(event.relatedTarget as Node | null)) closeDownloadMenu();
});

function clearErrors(): void {
  qrError.textContent = urlError.textContent = '';
  urlInput.removeAttribute('aria-invalid');
}

function resultStatus(): void {
  if (!generated) return;
  const modified = urlInput.value !== generated.url;
  const modifiedMessage = modified ? '網址已修改，請重新產生。' : '';
  // Smaller previews make dense codes harder to scan; preserve safety guidance.
  const denseMessage = generated.matrix.length >= 85 ? 'QR Code 較密，建議下載後掃描。' : '';
  notice.textContent = [modifiedMessage, denseMessage].filter(Boolean).join(' ');
  // Presentation only: the notice glyph is a warning while the draft differs.
  notice.dataset.tone = modifiedMessage ? 'warning' : 'info';
  status.textContent = [modifiedMessage || '已產生 QR Code。', denseMessage].filter(Boolean).join(' ');
}

urlInput.addEventListener('input', () => { clearErrors(); resultStatus(); });
urlInput.addEventListener('keydown', event => {
  if (event.key === 'Enter' && !event.isComposing) {
    event.preventDefault();
    generateButton.click();
  }
});

generateButton.disabled = false;
generateButton.addEventListener('click', () => {
  clearErrors();
  let url: string;
  try {
    url = normalizeUrl(urlInput.value);
  } catch (error) {
    urlInput.setAttribute('aria-invalid', 'true');
    urlError.textContent = error instanceof Error ? error.message : '請檢查網址格式。';
    resultStatus();
    return;
  }

  try {
    const matrix = createQrMatrix(url);
    let size: number;
    try { size = requestedSize(matrix); }
    catch {
      // A new QR must still generate when raster sizing is invalid. Reuse the
      // last preview size (or 256), raised only for this matrix's minimum.
      // The input preference and its download validation remain unchanged.
      size = Math.max(64, generated?.canvas.width ?? 256, (matrix.length + 8) * MIN_PIXELS_PER_MODULE);
    }
    const canvas = createQrCanvas(url, matrix, size, transparentBackground.checked);
    showPreview(canvas, url);
    urlInput.value = url;
    generated = { url, canvas, matrix };
    clearSizeError();
    downloadBusy = false;
    downloadButton.removeAttribute('aria-disabled');
    downloadToggle.removeAttribute('aria-disabled');
    downloadButton.textContent = 'Download PNG';
    downloadButton.disabled = downloadToggle.disabled = false;
    closeDownloadMenu();
    resultStatus();
  } catch {
    qrError.textContent = '無法產生 QR Code，請縮短網址或重試。';
    resultStatus();
  }
});

async function download(format: DownloadFormat): Promise<void> {
  if (downloadBusy || (format === 'jpg' && transparentBackground.checked)) return;
  const result = generated;
  if (!result) return;
  const revision = outputSizeRevision;
  const background = backgroundRevision;
  const transparent = transparentBackground.checked;
  const sizeValue = outputSize.value;
  const selectedSize = format === 'svg' ? null : validatedOutputSize();
  if (format !== 'svg' && selectedSize === null) return;
  if (format === 'svg') clearSizeError();
  // Export belongs to the displayed result, independently of the input draft.
  downloadBusy = true;
  downloadButton.setAttribute('aria-disabled', 'true');
  downloadToggle.setAttribute('aria-disabled', 'true');
  qrError.textContent = '';
  try {
    const canvas = format === 'svg' ? result.canvas : createQrCanvas(result.url, result.matrix, selectedSize!, transparent);
    const blob = await exportQr(canvas, result.matrix, format, transparent);
    if (generated !== result) return;
    if (background !== backgroundRevision || transparent !== transparentBackground.checked) return;
    if (format !== 'svg' && (revision !== outputSizeRevision || sizeValue !== outputSize.value)) return;
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    try {
      link.href = objectUrl;
      link.download = `qr-code.${format}`;
      document.body.append(link);
      link.click();
    } finally {
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    }
  } catch {
    if (generated === result) qrError.textContent = '無法下載圖片，請再試一次。';
  } finally {
    if (generated === result) {
      downloadBusy = false;
      downloadButton.removeAttribute('aria-disabled');
      downloadToggle.removeAttribute('aria-disabled');
    }
  }
}

downloadButton.addEventListener('click', () => { void download('png'); });
for (const item of menuItems) {
  item.addEventListener('click', () => {
    if (item.disabled) return;
    closeDownloadMenu(true);
    void download(item.dataset.format as DownloadFormat);
  });
}

const imageInput = document.querySelector<HTMLInputElement>('#qr-image')!;
const dropZone = document.querySelector<HTMLElement>('#image-drop-zone')!;
const decodedUrl = document.querySelector<HTMLTextAreaElement>('#decoded-url')!;
const copyButton = document.querySelector<HTMLButtonElement>('#copy-button')!;
const openLink = document.querySelector<HTMLAnchorElement>('#open-link')!;
const decodeStatus = document.querySelector<HTMLElement>('#result-hint')!;
const decodeError = document.querySelector<HTMLElement>('#decode-error')!;
const uploadPreview = document.querySelector<HTMLElement>('#upload-preview')!;
let decodeGeneration = 0;
let currentUrl = '';
let copyBusy = false;

function setUploadState(state: 'empty' | 'processing' | 'preview'): void {
  dropZone.dataset.state = state;
}

function clearUploadPreview(): void {
  for (const canvas of uploadPreview.querySelectorAll('canvas')) canvas.width = canvas.height = 0;
  uploadPreview.replaceChildren();
}

// The preview shows only files the decoder has already turned into pixels, and
// draws them from the same two sources: the browser bitmap decoder for raster
// signatures, and the restricted SVG parser for everything else. Raw SVG never
// reaches the DOM or a browser image loader.
async function renderUploadPreview(file: File, header: Promise<ArrayBuffer>, isCurrent: () => boolean): Promise<HTMLCanvasElement | null> {
  const bytes = new Uint8Array(await header);
  const ascii = String.fromCharCode(...bytes);
  const raster = (bytes[0] === 0x89 && ascii.slice(1, 4) === 'PNG') || (bytes[0] === 0xff && bytes[1] === 0xd8)
    || (ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WEBP') || ascii.startsWith('GIF8') || ascii.startsWith('BM');
  if (!isCurrent()) return null;
  let bitmap: ImageBitmap | undefined;
  let draw: (context: CanvasRenderingContext2D, width: number, height: number) => void;
  let width: number;
  let height: number;
  let limit: number;
  if (raster) {
    bitmap = await createImageBitmap(file);
    ({ width, height } = bitmap);
    draw = (context, w, h) => context.drawImage(bitmap!, 0, 0, w, h);
    limit = 1024;
  } else {
    const safe = parseSafeSvg(await file.text());
    ({ width, height, draw } = safe);
    limit = 512;
  }
  try {
    if (!isCurrent()) return null;
    const longest = Math.max(width, height);
    // Fit large images; enlarge small ones only by whole steps (raster at most
    // 4x) so a tiny QR stays crisp without being blown up beyond recognition.
    const scale = longest > limit ? 0 : Math.max(1, Math.min(raster ? 4 : Infinity, Math.floor((raster ? 192 : limit) / longest)));
    const size = scale ? { width: width * scale, height: height * scale } : decodeDimensions(width, height, limit);
    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    canvas.className = 'upload-image';
    canvas.dataset.source = raster ? 'raster' : 'svg';
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.imageSmoothingEnabled = scale <= 1;
    draw(context, size.width, size.height);
    return canvas;
  } finally {
    bitmap?.close();
  }
}

async function showUploadPreview(file: File, header: Promise<ArrayBuffer>, generation: number): Promise<void> {
  const isCurrent = () => generation === decodeGeneration;
  let canvas: HTMLCanvasElement | null = null;
  try { canvas = await renderUploadPreview(file, header, isCurrent); }
  catch { canvas = null; }
  if (!isCurrent()) {
    if (canvas) canvas.width = canvas.height = 0;
    return;
  }
  if (canvas) uploadPreview.replaceChildren(canvas);
  setUploadState(canvas ? 'preview' : 'empty');
}

async function readImage(files: readonly File[]): Promise<void> {
  const generation = ++decodeGeneration;
  clearUploadPreview();
  setUploadState('empty');
  currentUrl = decodedUrl.value = '';
  copyBusy = false;
  if (document.activeElement === copyButton || document.activeElement === openLink) imageInput.focus();
  copyButton.disabled = true;
  copyButton.removeAttribute('aria-disabled');
  openLink.hidden = true;
  openLink.removeAttribute('href');
  decodeError.textContent = decodeStatus.textContent = '';
  imageInput.removeAttribute('aria-invalid');
  if (files.length !== 1) {
    imageInput.setAttribute('aria-invalid', 'true');
    decodeError.textContent = files.length > 1 ? '一次只能選擇一張圖片。' : '請選擇一張圖片。';
    return;
  }
  const file = files[0]!;
  decodeStatus.textContent = '正在讀取圖片…';
  setUploadState('processing');
  // Read the signature now so the preview starts as soon as the decoder settles.
  const header = file.slice(0, 12).arrayBuffer();
  header.catch(() => {});
  const result = await decodeImage(file, () => generation === decodeGeneration);
  if (generation !== decodeGeneration || result.kind === 'stale') return;
  decodeStatus.textContent = '';
  // Only results that prove the image was rasterized get a visual preview.
  if (result.kind === 'success' || result.kind === 'no-qr' || result.kind === 'unsupported-url') void showUploadPreview(file, header, generation);
  else setUploadState('empty');
  if (result.kind === 'success') {
    currentUrl = decodedUrl.value = result.url;
    copyButton.disabled = false;
    openLink.href = result.url;
    openLink.hidden = false;
    decodeStatus.textContent = '已找到網址';
  } else {
    const messages = {
      'unsupported-format': '不支援此檔案格式。',
      'invalid-image': '無法讀取這張圖片。',
      'no-qr': '圖片中找不到 QR Code。',
      'unsupported-url': '這個 QR Code 不是網址。',
      'decode-failure': '無法讀取這張圖片。',
      'too-large': '圖片檔案過大(上限20MB)',
    };
    imageInput.setAttribute('aria-invalid', 'true');
    decodeError.textContent = messages[result.kind];
  }
}

imageInput.addEventListener('change', () => {
  const files = Array.from(imageInput.files ?? []);
  imageInput.value = '';
  void readImage(files);
});
let dragDepth = 0;
function resetDrag(): void {
  dragDepth = 0;
  dropZone.classList.remove('drag-active');
}
dropZone.addEventListener('dragenter', event => {
  event.preventDefault();
  dragDepth++;
  dropZone.classList.add('drag-active');
});
dropZone.addEventListener('dragover', event => {
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
});
dropZone.addEventListener('dragleave', event => {
  event.preventDefault();
  if (--dragDepth <= 0) resetDrag();
});
dropZone.addEventListener('drop', event => {
  event.preventDefault();
  resetDrag();
  void readImage(Array.from(event.dataTransfer?.files ?? []));
});
// Prevent dropping outside the zone from navigating away to a local file.
for (const type of ['dragover', 'drop']) {
  document.addEventListener(type, event => event.preventDefault());
}
document.addEventListener('dragend', resetDrag);

copyButton.addEventListener('click', async () => {
  if (!currentUrl || copyBusy) return;
  const generation = decodeGeneration;
  const url = currentUrl;
  copyBusy = true;
  copyButton.setAttribute('aria-disabled', 'true');
  decodeError.textContent = '';
  decodeStatus.textContent = '';
  try {
    await navigator.clipboard.writeText(url);
    if (generation === decodeGeneration) decodeStatus.textContent = '網址已複製。';
  } catch {
    if (generation === decodeGeneration) decodeError.textContent = '無法複製網址，請在結果欄位手動選取並複製。';
  } finally {
    if (generation === decodeGeneration) {
      copyBusy = false;
      copyButton.removeAttribute('aria-disabled');
    }
  }
});

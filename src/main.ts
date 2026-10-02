import { decodeImage } from './decode';
import { createQrCanvas, createQrMatrix, exportQr, normalizeUrl } from './qr';
import type { DownloadFormat, QrMatrix } from './qr';

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

const downloadControl = document.querySelector<HTMLElement>('#download-control')!;
const downloadToggle = document.querySelector<HTMLButtonElement>('#download-toggle')!;
const downloadMenu = document.querySelector<HTMLElement>('#download-menu')!;
const menuItems = Array.from(downloadMenu.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'));

let generated: { url: string; canvas: HTMLCanvasElement; matrix: QrMatrix } | null = null;
let downloadBusy = false;

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
  menuItems[last ? menuItems.length - 1 : 0]?.focus();
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
  const index = menuItems.indexOf(document.activeElement as HTMLButtonElement);
  let next: number;
  switch (event.key) {
    case 'Escape': event.preventDefault(); closeDownloadMenu(true); return;
    case 'Tab': closeDownloadMenu(true); return;
    case 'ArrowDown': next = (index + 1) % menuItems.length; break;
    case 'ArrowUp': next = (index - 1 + menuItems.length) % menuItems.length; break;
    case 'Home': next = 0; break;
    case 'End': next = menuItems.length - 1; break;
    default: return;
  }
  event.preventDefault();
  menuItems[next]?.focus();
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
    const canvas = createQrCanvas(url, matrix);
    canvas.className = 'qr-canvas';
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', `網址 ${url} 的 QR Code`);
    imageContainer.replaceChildren(canvas);
    placeholder.hidden = true;
    urlInput.value = url;
    generated = { url, canvas, matrix };
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
  if (downloadBusy) return;
  const result = generated;
  if (!result) return;
  // Export belongs to the displayed result, independently of the input draft.
  downloadBusy = true;
  downloadButton.setAttribute('aria-disabled', 'true');
  downloadToggle.setAttribute('aria-disabled', 'true');
  qrError.textContent = '';
  try {
    const blob = await exportQr(result.canvas, result.matrix, format);
    if (generated !== result) return;
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
let decodeGeneration = 0;
let currentUrl = '';
let copyBusy = false;

async function readImage(files: readonly File[]): Promise<void> {
  const generation = ++decodeGeneration;
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
  const result = await decodeImage(file, () => generation === decodeGeneration);
  if (generation !== decodeGeneration || result.kind === 'stale') return;
  decodeStatus.textContent = '';
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
      'too-large': '圖片檔案過大（上限 20 MiB）。',
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

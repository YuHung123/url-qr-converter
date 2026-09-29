import { decodeImage } from './decode';
import { createQrCanvas, exportPng, normalizeUrl } from './qr';

const tabs = Array.from(document.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
const panels = Array.from(document.querySelectorAll<HTMLElement>('[role="tabpanel"]'));

function activateTab(activeTab: HTMLButtonElement): void {
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

let generated: { url: string; canvas: HTMLCanvasElement } | null = null;
let downloadBusy = false;

function clearResult(): void {
  generated = null;
  downloadBusy = false;
  downloadButton.removeAttribute('aria-disabled');
  imageContainer.replaceChildren();
  placeholder.hidden = false;
  downloadButton.disabled = true;
  downloadButton.textContent = 'Download PNG';
  status.textContent = '';
  qrError.textContent = '';
  urlError.textContent = '';
  urlInput.removeAttribute('aria-invalid');
}

urlInput.addEventListener('input', () => {
  const hadResult = generated !== null;
  clearResult();
  if (hadResult) status.textContent = '網址已修改，請重新產生 QR Code。';
});

generateButton.disabled = false;
generateButton.addEventListener('click', () => {
  clearResult();
  let url: string;
  try {
    url = normalizeUrl(urlInput.value);
  } catch (error) {
    urlInput.setAttribute('aria-invalid', 'true');
    urlError.textContent = error instanceof Error ? error.message : '請檢查網址格式。';
    return;
  }

  try {
    const canvas = createQrCanvas(url);
    canvas.className = 'qr-canvas';
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', `網址 ${url} 的 QR Code`);
    imageContainer.replaceChildren(canvas);
    placeholder.hidden = true;
    urlInput.value = url;
    generated = { url, canvas };
    downloadButton.disabled = false;
    status.textContent = `已產生 QR Code，可下載 ${canvas.width} × ${canvas.height} 像素的 PNG。`;
    // Version 17+ drops below 3 CSS pixels/module in a narrow phone preview.
    if (Number(canvas.dataset.modules) >= 85) {
      status.textContent += ' 網址較長，QR Code 較密集；掃描或列印時請使用下載圖片，並保留足夠尺寸與白邊。';
    }
  } catch {
    qrError.textContent = '無法產生 QR Code。網址可能過長，請縮短網址或重新嘗試。';
  }
});

downloadButton.addEventListener('click', async () => {
  if (downloadBusy) return;
  const result = generated;
  if (!result || urlInput.value !== result.url) {
    clearResult();
    return;
  }

  downloadBusy = true;
  downloadButton.setAttribute('aria-disabled', 'true');
  downloadButton.textContent = '正在準備 PNG…';
  qrError.textContent = '';
  try {
    const blob = await exportPng(result.canvas);
    // 匯出期間修改輸入或重新產生時，捨棄舊結果。
    if (generated !== result || urlInput.value !== result.url) return;
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    try {
      link.href = objectUrl;
      link.download = 'qr-code.png';
      document.body.append(link);
      link.click();
    } finally {
      link.remove();
      // 保留瀏覽器開始下載所需的時間，再釋放暫存 URL。
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    }
  } catch {
    if (generated === result) {
      qrError.textContent = '無法匯出或下載 PNG，請再試一次。';
    }
  } finally {
    if (generated === result) {
      downloadBusy = false;
      downloadButton.removeAttribute('aria-disabled');
      downloadButton.textContent = 'Download PNG';
    }
  }
});

const imageInput = document.querySelector<HTMLInputElement>('#qr-image')!;
const decodedUrl = document.querySelector<HTMLTextAreaElement>('#decoded-url')!;
const copyButton = document.querySelector<HTMLButtonElement>('#copy-button')!;
const decodeStatus = document.querySelector<HTMLElement>('#result-hint')!;
const decodeError = document.querySelector<HTMLElement>('#decode-error')!;
let decodeGeneration = 0;
let currentUrl = '';
let copyBusy = false;

imageInput.addEventListener('change', async () => {
  const generation = ++decodeGeneration;
  const file = imageInput.files?.[0];
  // Release the input's reference, and allow choosing the same file again.
  imageInput.value = '';
  currentUrl = decodedUrl.value = '';
  copyBusy = false;
  // Native disabling a focused button can send keyboard focus to <body>.
  if (document.activeElement === copyButton) imageInput.focus();
  copyButton.disabled = true;
  copyButton.removeAttribute('aria-disabled');
  copyButton.textContent = 'Copy URL';
  decodeError.textContent = '';
  imageInput.removeAttribute('aria-invalid');
  decodeStatus.textContent = file ? '正在解析圖片…' : '目前尚未解析圖片。';
  if (!file) return;

  const result = await decodeImage(file, () => generation === decodeGeneration);
  if (generation !== decodeGeneration || result.kind === 'stale') return;
  decodeStatus.textContent = '';
  if (result.kind === 'success') {
    currentUrl = decodedUrl.value = result.url;
    copyButton.disabled = false;
    decodeStatus.textContent = '已解析網址，可複製或手動選取。';
  } else {
    const messages = {
      'invalid-image': '無法讀取此圖片格式或檔案已損壞。請改用 PNG、JPEG 或其他瀏覽器支援的點陣圖片。',
      'no-qr': '圖片中找不到可讀取的 QR Code。請選擇清晰的 QR Code 圖片。',
      'unsupported-url': '已找到 QR Code，但內容不是支援的完整 HTTP / HTTPS 網址。',
      'decode-failure': '無法解析此圖片，請重試或選擇另一張圖片。',
      'too-large': '圖片檔案過大，請選擇 20 MiB 以下的圖片。',
    };
    imageInput.setAttribute('aria-invalid', 'true');
    decodeError.textContent = messages[result.kind];
  }
});

copyButton.addEventListener('click', async () => {
  if (!currentUrl || copyBusy) return;
  const generation = decodeGeneration;
  const url = currentUrl;
  copyBusy = true;
  copyButton.setAttribute('aria-disabled', 'true');
  copyButton.textContent = '正在複製…';
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
      copyButton.textContent = 'Copy URL';
    }
  }
});

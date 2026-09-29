import qrcode from 'qrcode-generator';

export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) throw new Error('請輸入網址。');
  // Reject raw characters before URL parsing can remove or encode them.
  if (/[\x00-\x20\x7f\s]/u.test(trimmed)) {
    throw new Error('網址中不可包含空白或控制字元，請使用百分比編碼。');
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error('請輸入有效的完整網址，例如 https://example.com。');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('只接受 http:// 或 https:// 網址。');
  }
  if (!/^https?:\/\//i.test(trimmed) || !url.hostname) {
    throw new Error('請輸入含 http:// 或 https:// 與主機名稱的完整網址。');
  }
  assertHostnameCharacters(url.hostname);
  return url.href;
}

// 只檢查 parser 後的主機字元，不查詢 DNS 或驗證網站可用性。
export function assertHostnameCharacters(hostname: string): void {
  if (/[\s%]/u.test(hostname)) {
    throw new Error('網址的主機名稱無效，請檢查是否含空白或錯字。');
  }
}

export function createQrPixels(url: string): { data: Uint8ClampedArray<ArrayBuffer>; width: number; height: number } {
  // 此 encoder 的 Byte 模式不是 UTF-8；只接受已正規化的 ASCII URL。
  if (/[^\x00-\x7f]/u.test(url)) {
    throw new Error('QR Code 內容必須是已正規化的 ASCII 網址。');
  }
  const qr = qrcode(0, 'M');
  qr.addData(url, 'Byte');
  qr.make();

  const quietZone = 4;
  const modules = qr.getModuleCount();
  const scale = Math.ceil(1024 / (modules + quietZone * 2));
  const size = (modules + quietZone * 2) * scale;
  const data = new Uint8ClampedArray(size * size * 4).fill(255);
  for (let row = 0; row < modules; row++) {
    for (let column = 0; column < modules; column++) {
      if (!qr.isDark(row, column)) continue;
      for (let y = (row + quietZone) * scale; y < (row + quietZone + 1) * scale; y++) {
        for (let x = (column + quietZone) * scale; x < (column + quietZone + 1) * scale; x++) {
          const offset = (y * size + x) * 4;
          data[offset] = data[offset + 1] = data[offset + 2] = 0;
        }
      }
    }
  }
  return { data, width: size, height: size };
}

export function createQrCanvas(url: string): HTMLCanvasElement {
  const pixels = createQrPixels(url);
  const canvas = document.createElement('canvas');
  canvas.width = pixels.width;
  canvas.height = pixels.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('無法建立 QR Code 畫布。');
  context.putImageData(new ImageData(pixels.data, pixels.width, pixels.height), 0, 0);
  return canvas;
}

export function exportPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob || blob.size === 0 || blob.type !== 'image/png') {
        reject(new Error('無法匯出 PNG。'));
      } else {
        resolve(blob);
      }
    }, 'image/png');
  });
}

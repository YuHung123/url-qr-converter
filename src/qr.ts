import qrcode from 'qrcode-generator';

export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) throw new Error('請輸入網址。');
  // Reject raw characters before URL parsing can remove or encode them.
  if (/[\x00-\x20\x7f\s]/u.test(trimmed)) {
    throw new Error('網址格式有誤，請移除空白或換行。');
  }

  // Recognize localhost with an optional numeric port before scheme detection;
  // the URL parser below still validates the port range and the full URL.
  const isLocalhost = /^localhost(?::\d+)?(?:[/?#]|$)/i.test(trimmed);
  const hasScheme = !isLocalhost && /^[a-z][a-z\d+.-]*:/i.test(trimmed);
  if (hasScheme && !/^https?:/i.test(trimmed)) {
    throw new Error('只接受 http:// 或 https:// 網址。');
  }
  const candidate = hasScheme ? trimmed : `https://${trimmed}`;
  // Do not reinterpret relative paths or arbitrary single words as websites.
  if (!hasScheme && (/^[\/\\?#]/u.test(trimmed) || (!isLocalhost && !/^(?:[^/?#]+\.[^/?#]+|\[)/u.test(trimmed)))) {
    throw new Error('請輸入有效網址，例如 example.com。');
  }

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error('請輸入有效網址，例如 example.com。');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('只接受 http:// 或 https:// 網址。');
  }
  if (!/^https?:\/\//i.test(candidate) || !url.hostname) {
    throw new Error('請檢查網址的格式與主機名稱。');
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

export type QrMatrix = readonly (readonly boolean[])[];

export function createQrMatrix(url: string): QrMatrix {
  // 此 encoder 的 Byte 模式不是 UTF-8；只接受已正規化的 ASCII URL。
  if (/[^\x00-\x7f]/u.test(url)) {
    throw new Error('QR Code 內容必須是已正規化的 ASCII 網址。');
  }
  const qr = qrcode(0, 'M');
  qr.addData(url, 'Byte');
  qr.make();
  return Array.from({ length: qr.getModuleCount() }, (_, row) =>
    Array.from({ length: qr.getModuleCount() }, (_, column) => qr.isDark(row, column)));
}

export const MIN_PIXELS_PER_MODULE = 2;

export function parseOutputSize(value: string): number {
  if (!value.trim()) throw new Error('請輸入目標尺寸。');
  // Keep the raw spelling: Number() alone also accepts exponents and expressions.
  if (!/^-?(?:\d+(?:\.\d+)?|\.\d+)$/.test(value)) throw new Error('請輸入有效的目標尺寸。');
  if (value.includes('.')) throw new Error('請輸入整數尺寸。');
  const size = Number(value);
  if (size < 64) throw new Error('目標尺寸不得小於 64 px。');
  if (size > 2048) throw new Error('目標尺寸不得大於 2048 px。');
  return size;
}

export function resolveRasterSize(targetSize: number, totalModules: number): {
  scale: number; actualSize: number; minimumSize: number;
} {
  // Apply the product range before the QR-specific minimum, including callers outside the UI.
  parseOutputSize(String(targetSize));
  const minimumSize = totalModules * MIN_PIXELS_PER_MODULE;
  if (targetSize < minimumSize) throw new Error(`此 QR Code 至少需要 ${minimumSize} px。`);
  const lowerScale = Math.floor(targetSize / totalModules);
  const upperScale = Math.ceil(targetSize / totalModules);
  // Prefer the larger scale on ties, but never exceed the raster resource cap.
  const scale = upperScale * totalModules <= 2048
    && upperScale * totalModules - targetSize <= targetSize - lowerScale * totalModules
    ? upperScale : lowerScale;
  return { scale, actualSize: totalModules * scale, minimumSize };
}

export function rasterGeometry(modules: number, targetSize: number): {
  totalModules: number; scale: number; actualSize: number; minimumSize: number;
} {
  const totalModules = modules + 8;
  return { totalModules, ...resolveRasterSize(targetSize, totalModules) };
}

export function createQrPixels(url: string, matrix = createQrMatrix(url), targetSize?: number, transparent = false): { data: Uint8ClampedArray<ArrayBuffer>; width: number; height: number; modules: number } {
  if (/[^\x00-\x7f]/u.test(url)) throw new Error('QR Code 內容必須是已正規化的 ASCII 網址。');
  const quietZone = 4;
  const modules = matrix.length;
  const totalModules = modules + quietZone * 2;
  const target = targetSize ?? Math.max(256, totalModules * MIN_PIXELS_PER_MODULE);
  const { scale, actualSize: size } = rasterGeometry(modules, target);
  const data = new Uint8ClampedArray(size * size * 4);
  if (!transparent) data.fill(255);
  for (let row = 0; row < modules; row++) {
    for (let column = 0; column < modules; column++) {
      if (!matrix[row]?.[column]) continue;
      for (let y = (row + quietZone) * scale; y < (row + quietZone + 1) * scale; y++) {
        for (let x = (column + quietZone) * scale; x < (column + quietZone + 1) * scale; x++) {
          const offset = (y * size + x) * 4;
          data[offset] = data[offset + 1] = data[offset + 2] = 0;
          data[offset + 3] = 255;
        }
      }
    }
  }
  return { data, width: size, height: size, modules };
}

export function createQrCanvas(url: string, matrix = createQrMatrix(url), targetSize?: number, transparent = false): HTMLCanvasElement {
  const pixels = createQrPixels(url, matrix, targetSize, transparent);
  const canvas = document.createElement('canvas');
  canvas.width = pixels.width;
  canvas.height = pixels.height;
  canvas.dataset.modules = String(pixels.modules);
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

export function createQrSvg(matrix: QrMatrix, transparent = false): string {
  const size = matrix.length + 8;
  const modules: string[] = [];
  for (const [row, cells] of matrix.entries()) {
    for (const [column, dark] of cells.entries()) {
      if (dark) modules.push(`M${column + 4} ${row + 4}h1v1h-1z`);
    }
  }
  const background = transparent ? '' : `<rect width="${size}" height="${size}" fill="#fff"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" shape-rendering="crispEdges">${background}<path d="${modules.join('')}" fill="#000"/></svg>`;
}

export type DownloadFormat = 'png' | 'svg' | 'jpg' | 'webp';

export function exportQr(canvas: HTMLCanvasElement, matrix: QrMatrix, format: DownloadFormat, transparent = false): Promise<Blob> {
  if (format === 'jpg' && transparent) return Promise.reject(new Error('JPG does not support transparency'));
  if (format === 'png') return exportPng(canvas);
  if (format === 'svg') return Promise.resolve(new Blob([createQrSvg(matrix, transparent)], { type: 'image/svg+xml' }));
  const mime = format === 'jpg' ? 'image/jpeg' : 'image/webp';
  // Encode the original raster directly, preserving WebP alpha when enabled.
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob || !blob.size || blob.type !== mime) reject(new Error('無法匯出圖片。'));
      else resolve(blob);
    }, mime, 0.98);
  });
}

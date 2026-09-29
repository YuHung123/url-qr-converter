import jsQR from 'jsqr';
import { normalizeUrl } from './qr.ts';

export type DecodeResult =
  | { kind: 'success'; url: string }
  | { kind: 'invalid-image' | 'no-qr' | 'unsupported-url' | 'decode-failure' | 'too-large' | 'stale' };

export function decodePixels(pixels: { data: Uint8ClampedArray; width: number; height: number }): DecodeResult {
  let payload: string;
  try {
    const code = jsQR(pixels.data, pixels.width, pixels.height, { inversionAttempts: 'attemptBoth' });
    if (!code) return { kind: 'no-qr' };
    payload = code.data;
  } catch {
    return { kind: 'decode-failure' };
  }
  try {
    return { kind: 'success', url: normalizeUrl(payload) };
  } catch {
    return { kind: 'unsupported-url' };
  }
}

export function decodeDimensions(width: number, height: number): { width: number; height: number } {
  const ratio = Math.min(1, 2048 / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * ratio)), height: Math.max(1, Math.round(height * ratio)) };
}

export async function decodeImage(file: File, isCurrent: () => boolean): Promise<DecodeResult> {
  if (file.size > 20 * 1024 * 1024) return { kind: 'too-large' };
  let bitmap: ImageBitmap;
  try {
    // No object URL or <img>: keeps the existing img-src CSP intact.
    bitmap = await createImageBitmap(file);
  } catch {
    return { kind: 'invalid-image' };
  }
  let canvas: HTMLCanvasElement | undefined;
  try {
    if (!isCurrent()) return { kind: 'stale' };
    canvas = document.createElement('canvas');
    const size = decodeDimensions(bitmap.width, bitmap.height);
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return { kind: 'decode-failure' };
    // Composite transparent backgrounds onto white before extracting RGB.
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, size.width, size.height);
    context.drawImage(bitmap, 0, 0, size.width, size.height);
    return decodePixels(context.getImageData(0, 0, size.width, size.height));
  } catch {
    return { kind: 'decode-failure' };
  } finally {
    bitmap.close();
    if (canvas) canvas.width = canvas.height = 0;
  }
}

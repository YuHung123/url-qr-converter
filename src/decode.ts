import jsQR from 'jsqr';
import { normalizeUrl } from './qr.ts';
import { parseSafeSvg } from './svg.ts';

export type DecodeResult =
  | { kind: 'success'; url: string }
  | { kind: 'unsupported-format' | 'invalid-image' | 'no-qr' | 'unsupported-url' | 'decode-failure' | 'too-large' | 'stale' };

export function decodePixels(pixels: { data: Uint8ClampedArray; width: number; height: number }): DecodeResult {
  let payload: string;
  try {
    const code = jsQR(pixels.data, pixels.width, pixels.height, { inversionAttempts: 'attemptBoth' });
    if (!code) return { kind: 'no-qr' };
    // jsQR keeps invalid Byte bytes but silently omits their text from data.
    // Validate each segment independently; never accept that partial payload.
    try {
      const utf8 = new TextDecoder('utf-8', { fatal: true });
      for (const chunk of code.chunks) {
        if (chunk.type !== 'byte') continue;
        if (!('bytes' in chunk)) return { kind: 'unsupported-url' };
        utf8.decode(Uint8Array.from(chunk.bytes));
      }
    } catch {
      return { kind: 'unsupported-url' };
    }
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

export function decodeDimensions(width: number, height: number, maxDimension = 2048): { width: number; height: number } {
  const ratio = Math.min(1, maxDimension / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * ratio)), height: Math.max(1, Math.round(height * ratio)) };
}

export async function decodeImage(file: File, isCurrent: () => boolean): Promise<DecodeResult> {
  if (file.size > 20 * 1024 * 1024) return { kind: 'too-large' };
  let header: Uint8Array;
  try {
    header = new Uint8Array(await file.slice(0, 512).arrayBuffer());
  } catch {
    return { kind: 'invalid-image' };
  }
  if (!isCurrent()) return { kind: 'stale' };
  const prefix = new TextDecoder().decode(header);
  const svg = /^\s*(?:<\?xml[^>]*>\s*)?<svg(?:\s|>)/i.test(prefix);
  const png = header[0] === 0x89 && prefix.slice(1, 4) === 'PNG';
  const jpeg = header[0] === 0xff && header[1] === 0xd8;
  const webp = prefix.slice(0, 4) === 'RIFF' && prefix.slice(8, 12) === 'WEBP';
  const gif = prefix.startsWith('GIF8');
  const bmp = prefix.startsWith('BM');
  const declared = `${file.type.toLowerCase()} ${file.name.toLowerCase().split('.').pop() ?? ''}`;
  const known = /image\/(?:svg\+xml|png|jpeg|webp|gif|bmp)\b|\b(?:svg|png|jpe?g|webp|gif|bmp)$/.test(declared);
  if (!svg && !png && !jpeg && !webp && !gif && !bmp && !known) return { kind: 'unsupported-format' };
  let bitmap: ImageBitmap | undefined;
  let draw: (context: CanvasRenderingContext2D, width: number, height: number) => void;
  let sourceWidth: number;
  let sourceHeight: number;
  if (svg || (!png && !jpeg && !webp && !gif && !bmp && /image\/svg\+xml\b|\bsvg$/.test(declared))) {
    try {
      const safe = parseSafeSvg(await file.text());
      // SVG units are geometry, not pixels. Give small vector QR codes enough
      // pixels for jsQR while retaining the same 768 -> 2048 canvas caps.
      const scale = 2048 / Math.max(safe.width, safe.height);
      sourceWidth = Math.max(1, Math.round(safe.width * scale));
      sourceHeight = Math.max(1, Math.round(safe.height * scale));
      draw = safe.draw;
    } catch {
      return { kind: 'invalid-image' };
    }
  } else {
    try {
      // Raster files retain the existing browser bitmap path and CSP boundary.
      bitmap = await createImageBitmap(file);
    } catch {
      return { kind: 'invalid-image' };
    }
    sourceWidth = bitmap.width;
    sourceHeight = bitmap.height;
    draw = (context, width, height) => context.drawImage(bitmap!, 0, 0, width, height);
  }
  let canvas: HTMLCanvasElement | undefined;
  try {
    if (!isCurrent()) return { kind: 'stale' };
    canvas = document.createElement('canvas');
    // Most ordinary images decode at 768px. Retry at the original cap only
    // when no QR was found, preserving small QR details in large screenshots.
    const limits = Math.max(sourceWidth, sourceHeight) > 768 ? [768, 2048] : [768];
    for (const limit of limits) {
      const size = decodeDimensions(sourceWidth, sourceHeight, limit);
      canvas.width = size.width;
      canvas.height = size.height;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) return { kind: 'decode-failure' };
      // Composite transparent backgrounds onto white before extracting RGB.
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, size.width, size.height);
      draw(context, size.width, size.height);
      const result = decodePixels(context.getImageData(0, 0, size.width, size.height));
      if (result.kind !== 'no-qr') return result;
    }
    return { kind: 'no-qr' };
  } catch {
    return { kind: 'decode-failure' };
  } finally {
    bitmap?.close();
    if (canvas) canvas.width = canvas.height = 0;
  }
}

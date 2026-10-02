// SVG is parsed as untrusted XML and reduced to static geometry. Nothing from
// the input document is attached to the page or handed to an image loader.
type Shape = { kind: 'rect'; x: number; y: number; width: number; height: number; fill: string }
  | { kind: 'path'; d: string; fill: string };

export type SafeSvg = { width: number; height: number; draw: (context: CanvasRenderingContext2D, width: number, height: number) => void };

const number = /^(?:\d+(?:\.\d+)?|\.\d+)$/;
const safePath = /^[MmLlHhVvZz0-9.,+\-\s]+$/;

function dimension(value: string | null): number {
  if (!value || !number.test(value)) throw new Error('Invalid SVG geometry');
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 2048) throw new Error('Invalid SVG geometry');
  return parsed;
}

function coordinate(value: string | null, fallback = 0): number {
  if (value === null) return fallback;
  if (!number.test(value)) throw new Error('Invalid SVG geometry');
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed > 2048) throw new Error('Invalid SVG geometry');
  return parsed;
}

function color(value: string | null): string {
  const normalized = value?.toLowerCase();
  if (normalized === '#000' || normalized === '#000000' || normalized === 'black') return '#000';
  if (normalized === '#fff' || normalized === '#ffffff' || normalized === 'white') return '#fff';
  throw new Error('Unsupported SVG color');
}

export function parseSafeSvg(source: string): SafeSvg {
  // Match only a small static geometry grammar. The untrusted string never
  // reaches DOMParser, an image loader, or the page document.
  if (source.length > 1_000_000) throw new Error('SVG too complex');
  const xml = source.replace(/^\s*<\?xml\b[^>]*\?>/i, '').trim();
  const root = /^<svg\s+xmlns="http:\/\/www\.w3\.org\/2000\/svg"\s+viewBox="0 0 ([^"\s]+) ([^"\s]+)"\s+width="([^"\s]+)"\s+height="([^"\s]+)"(?:\s+shape-rendering="crispEdges")?\s*>([\s\S]*)<\/svg>$/u.exec(xml);
  if (!root) throw new Error('Unsafe SVG document');
  const width = dimension(root[1] ?? null);
  const height = dimension(root[2] ?? null);
  if (dimension(root[3] ?? null) !== width || dimension(root[4] ?? null) !== height) throw new Error('Invalid SVG size');

  const shapes: Shape[] = [];
  let body = root[5] ?? '';
  while (body.trim()) {
    body = body.trimStart();
    const rect = /^<rect(?:\s+x="([^"]+)")?(?:\s+y="([^"]+)")?\s+width="([^"]+)"\s+height="([^"]+)"\s+fill="([^"]+)"\s*\/>/u.exec(body);
    if (rect) {
      shapes.push({ kind: 'rect', x: coordinate(rect[1] ?? null), y: coordinate(rect[2] ?? null),
        width: dimension(rect[3] ?? null), height: dimension(rect[4] ?? null), fill: color(rect[5] ?? null) });
      body = body.slice(rect[0].length);
    } else {
      const path = /^<path\s+d="([^"]+)"\s+fill="([^"]+)"\s*\/>/u.exec(body);
      if (!path || !safePath.test(path[1]!) || path[1]!.length > 1_000_000) throw new Error('Unsafe SVG element');
      shapes.push({ kind: 'path', d: path[1]!, fill: color(path[2] ?? null) });
      body = body.slice(path[0].length);
    }
    if (shapes.length > 10_000) throw new Error('SVG too complex');
  }
  if (!shapes.length) throw new Error('Empty SVG');
  return {
    width, height,
    draw(context, rasterWidth, rasterHeight) {
      context.save();
      context.scale(rasterWidth / width, rasterHeight / height);
      for (const shape of shapes) {
        context.fillStyle = shape.fill;
        if (shape.kind === 'rect') context.fillRect(shape.x, shape.y, shape.width, shape.height);
        else context.fill(new Path2D(shape.d));
      }
      context.restore();
    },
  };
}

// Serve the real dist with the deployment headers, using Vite's own preview.
// Playwright owns this process and kills it on success or failure (also Windows).
import { readFile } from 'node:fs/promises';
import { preview } from 'vite';

const lines = (await readFile(new URL('../dist/_headers', import.meta.url), 'utf8')).trim().split('\n');
if (lines.shift() !== '/*') throw new Error('Expected one global _headers rule');
const headers = Object.fromEntries(lines.map(line => {
  const colon = line.indexOf(':');
  if (colon < 1) throw new Error('Invalid deployment header');
  return [line.slice(0, colon).trim(), line.slice(colon + 1).trim()];
}));
const server = await preview({ preview: { host: '127.0.0.1', port: 4173, strictPort: true, headers } });
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => server.httpServer.close(() => process.exit(0)));
}
server.printUrls();

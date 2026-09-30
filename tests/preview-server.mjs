// Serve the real dist with the deployment headers, using Vite's own preview.
// Playwright owns this process and kills it on success or failure (also Windows).
import { readFile } from 'node:fs/promises';
import { preview } from 'vite';
import { parseDeploymentHeaders } from './deployment-headers.mjs';

const headers = parseDeploymentHeaders(await readFile(new URL('../dist/_headers', import.meta.url), 'utf8'));
const server = await preview({ preview: { host: '127.0.0.1', port: 4173, strictPort: true, headers } });
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => server.httpServer.close(() => process.exit(0)));
}
server.printUrls();

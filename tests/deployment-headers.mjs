// Only the single global rule used by this project's deployment policy is supported.
export function parseDeploymentHeaders(text) {
  const lines = text.trimEnd().split(/\r?\n/);
  if (lines.shift() !== '/*' || !lines.length) throw new Error('Expected one global _headers rule');
  const names = new Set();
  return Object.fromEntries(lines.map(line => {
    const match = /^[ \t]+([A-Za-z0-9-]+):[ \t]+([^\r\n]+)$/.exec(line);
    if (!match || !match[2].trim() || names.has(match[1].toLowerCase())) throw new Error('Invalid deployment header');
    names.add(match[1].toLowerCase());
    return [match[1], match[2].trim()];
  }));
}

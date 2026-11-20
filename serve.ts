// Tiny local preview server for development only: `node serve.ts [--port 8091]`
// serves app/ on 127.0.0.1. The entry itself needs no server of ours — any static
// host will do — and nothing inside app/ references this file. Responses are
// no-store so an edited file is never hidden behind a stale cache, and any path
// that tries to escape app/ is refused.

import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('./app', import.meta.url)));
const args = process.argv.slice(2);
const flagAt = args.indexOf('--port');
const asked = flagAt >= 0 ? Number(args[flagAt + 1]) : 8080;
const port = Number.isInteger(asked) && asked > 0 && asked < 65536 ? asked : 8080;

const mime: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

createServer((req, res) => {
  let path = '/';
  try {
    path = decodeURIComponent(new URL(req.url ?? '/', 'http://127.0.0.1').pathname);
  } catch {
    res.writeHead(400).end('bad request');
    return;
  }
  if (path.endsWith('/')) path += 'index.html';
  const file = resolve(join(root, '.' + path));
  if (file !== root && !file.startsWith(root + sep)) {
    res.writeHead(403).end('forbidden');
    return;
  }
  try {
    const info = statSync(file);
    if (!info.isFile()) throw new Error('not a file');
    res.writeHead(200, {
      'content-type': mime[extname(file).toLowerCase()] ?? 'application/octet-stream',
      'content-length': info.size,
      'cache-control': 'no-store',
    });
    createReadStream(file).pipe(res);
  } catch {
    res.writeHead(404).end('not found');
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`Bayshore Heat preview at http://localhost:${port}`);
});

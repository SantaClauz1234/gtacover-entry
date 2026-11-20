// A pocket static server for trying the app locally: `node serve.ts [--port 8090]`
// serves the app/ folder next to this file on 127.0.0.1. It exists only for development
// on our own machine — the entry itself needs no server beyond any static file host,
// and nothing in app/ knows this file exists. Paths that try to climb out of app/ are
// refused, and every response is sent no-store so a rebuilt file is never masked by a
// stale browser cache while we iterate on the cover art.

import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = resolve(fileURLToPath(new URL('./app', import.meta.url)));
const argv = process.argv.slice(2);
const portFlagAt = argv.indexOf('--port');
const wantedPort = portFlagAt === -1 ? 8080 : Number(argv[portFlagAt + 1]);
const listenPort = Number.isInteger(wantedPort) && wantedPort > 0 && wantedPort < 65536 ? wantedPort : 8080;

const contentTypes: Record<string, string> = {
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
  '.woff2': 'font/woff2',
};

const server = createServer((request, response) => {
  let pathname = '/';
  try {
    pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://127.0.0.1').pathname);
  } catch {
    response.writeHead(400).end('bad request');
    return;
  }
  if (pathname.endsWith('/')) pathname += 'index.html';
  const target = resolve(join(appRoot, '.' + pathname));
  if (target !== appRoot && !target.startsWith(appRoot + sep)) {
    response.writeHead(403).end('forbidden');
    return;
  }
  let length = 0;
  try {
    const info = statSync(target);
    if (!info.isFile()) throw new Error('directory');
    length = info.size;
  } catch {
    response.writeHead(404).end('not found');
    return;
  }
  response.writeHead(200, {
    'content-type': contentTypes[extname(target).toLowerCase()] ?? 'application/octet-stream',
    'content-length': length,
    'cache-control': 'no-store',
  });
  createReadStream(target).pipe(response);
});

server.listen(listenPort, '127.0.0.1', () => {
  console.log(`Bayshore Heat app is live at http://localhost:${listenPort}`);
});

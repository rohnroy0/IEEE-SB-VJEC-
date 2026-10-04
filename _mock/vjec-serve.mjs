// Serves the chapter site and backs the badge-profile app in one process.
// The badge app fetches GET /api/profiles/:slug, which a plain static host has no
// answer for, so requests are proxied to the local mock API.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Serve the site given as the first argument; defaults to the vjec clone next door.
const SITE = process.argv[2] || path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'vjec');
const ROOT = path.resolve(SITE);
const PORT = Number(process.argv[3] || 8900);
const API_PORT = 3001;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
};

function resolveFile(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0]);
  // Block traversal out of the repo root.
  const target = path.normalize(path.join(ROOT, clean));
  if (!target.startsWith(ROOT)) return null;
  if (fs.existsSync(target) && fs.statSync(target).isFile()) return target;
  // Client-side route or directory: fall back to index.html in that folder.
  const asIndex = path.join(target, 'index.html');
  if (fs.existsSync(asIndex)) return asIndex;
  return null;
}

http.createServer((req, res) => {
  if (req.url.startsWith('/api')) {
    const proxy = http.request(
      { host: '127.0.0.1', port: API_PORT, path: req.url, method: req.method },
      upstream => {
        res.writeHead(upstream.statusCode, upstream.headers);
        upstream.pipe(res);
      },
    );
    proxy.on('error', () => {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Mock API is not running on :' + API_PORT }));
    });
    req.pipe(proxy);
    return;
  }

  let file = resolveFile(req.url);
  let status = 200;
  if (!file) {
    file = path.join(ROOT, 'index.html');
    status = 404;
  }
  const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
  res.writeHead(status, { 'Content-Type': type });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => {
  console.log(`IEEE SB VJEC site  ->  http://localhost:${PORT}`);
  console.log(`badge profiles    ->  http://localhost:${PORT}/badge-profiles/index.html#/profile/alan-antony`);
  console.log(`(expects the mock API on :${API_PORT})`);
});

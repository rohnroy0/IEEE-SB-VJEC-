// Serves the production build with /api forwarded to the mock API, so the tunnel
// exposes a real static site without touching the repo's Vite config.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const PORT = 4173;
const ROOT = 'D:/CSE/Projects/Group/ppt_faultx/public-site/dist';
// The bare tunnel link opens straight onto this member; every other member is
// still reachable at /profile/<slug>. One tunnel does both jobs — running a
// second quick tunnel alongside this one made both connectors drop (HTTP 530).
const DEFAULT_SLUG = 'alan-antony';
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.json': 'application/json', '.ico': 'image/x-icon',
};

http.createServer((req, res) => {
  if (req.url === '/' || req.url === '') {
    res.writeHead(302, { Location: `/profile/${DEFAULT_SLUG}` });
    res.end();
    return;
  }
  if (req.url.startsWith('/api')) {
    const proxy = http.request({ host: 'localhost', port: 3001, path: req.url, method: req.method }, upstream => {
      res.writeHead(upstream.statusCode, upstream.headers);
      upstream.pipe(res);
    });
    proxy.on('error', () => { res.writeHead(502); res.end('{"error":"api unavailable"}'); });
    req.pipe(proxy);
    return;
  }
  const requested = req.url.split('?')[0];
  // Client-side routes like /profile/:slug fall back to index.html.
  const asFile = path.join(ROOT, requested);
  const file = fs.existsSync(asFile) && fs.statSync(asFile).isFile()
    ? asFile
    : path.join(ROOT, 'index.html');
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`Static build on http://localhost:${PORT}`));

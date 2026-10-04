// Standalone preview for one member: serves the built site but sends the bare
// URL straight to that member's profile, so a shared tunnel link opens on them.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const PORT = 4174;
const SLUG = 'alan-antony';
const ROOT = 'D:/CSE/Projects/Group/ppt_faultx/public-site/dist';
const API = 'http://localhost:3001';

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.json': 'application/json', '.ico': 'image/x-icon',
};

http.createServer((req, res) => {
  if (req.url === '/' || req.url === '') {
    res.writeHead(302, { Location: `/profile/${SLUG}` });
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
  const asFile = path.join(ROOT, requested);
  const file = fs.existsSync(asFile) && fs.statSync(asFile).isFile() ? asFile : path.join(ROOT, 'index.html');
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`Alan's page on http://localhost:${PORT} -> /profile/${SLUG}`));
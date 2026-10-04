// Builds the badge site for the /badge-profiles/ subfolder and stages it.
//
// The build MUST run with the subfolder base, otherwise index.html points at
// /assets/... and every asset 404s on the chapter site. This wrapper exists so
// the base and the copy step cannot drift apart again.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE = process.argv[2] || path.resolve(HERE, '..', '_mock', 'vjec');
const BASE = '/badge-profiles/';
const SOURCE = path.resolve(HERE, '..', 'public-site');
const DIST = path.join(SOURCE, 'dist');

process.platform === 'win32' && process.env.MSYS_NO_PATHCONV;
const env = { ...process.env, BASE_PATH: BASE };

// Call Vite's entry directly: npx is not resolvable from a spawned process here.
const VITE = path.join(SOURCE, 'node_modules', 'vite', 'bin', 'vite.js');

console.log('building with base', BASE);
execFileSync(process.execPath, [VITE, 'build'], { cwd: SOURCE, env, stdio: 'inherit' });

// Fail loudly rather than shipping a folder whose assets cannot resolve.
const html = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
const jsMatch = html.match(/src="([^"]*assets\/[^"]*\.js)"/);
if (!jsMatch) {
  console.error('FAIL: built index.html references no JS asset');
  process.exit(1);
}
if (!jsMatch[1].startsWith(BASE)) {
  console.error(`FAIL: asset path "${jsMatch[1]}" is not prefixed with ${BASE}`);
  process.exit(1);
}

const target = path.join(SITE, 'badge-profiles');
fs.rmSync(target, { recursive: true, force: true });
fs.mkdirSync(target, { recursive: true });
fs.cpSync(DIST, target, { recursive: true });
// Client-side routes have no file behind them; this is the fallback a static
// host serves when it cannot find the requested path.
fs.copyFileSync(path.join(target, 'index.html'), path.join(target, '404.html'));

const count = fs.readdirSync(path.join(target, 'cutouts')).length;
console.log(`staged ${path.relative(process.cwd(), target)}`);
console.log(`  assets ok: ${jsMatch[1]}`);
console.log(`  cutouts: ${count}   404.html: yes`);

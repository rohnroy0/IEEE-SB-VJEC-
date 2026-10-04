// Throwaway mock of the admin API, used only to preview the public site locally.
// Serves exactly the 16 members from the spreadsheet.
import http from 'node:http';
import fs from 'node:fs';

const PORT = 3001;

const members = JSON.parse(
  fs.readFileSync('D:/CSE/Projects/Group/ppt_faultx/local-dev/data/members.clean.json', 'utf8'),
).map((m, i) => ({ ...m, id: i + 1 }));

const profiles = Object.fromEntries(members.map(m => [m.slug, m]));

http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const match = url.pathname.match(/^\/api\/profiles\/([^/]+)$/);
  if (match) {
    const profile = profiles[decodeURIComponent(match[1])];
    if (!profile || profile.status !== 'active') {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Profile not found.' }));
      return;
    }
    const { _source, ...rest } = profile;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ profile: rest, url: `http://localhost:5174/profile/${profile.slug}` }));
    return;
  }
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
}).listen(PORT, () => console.log(`Mock API on http://localhost:${PORT} (${Object.keys(profiles).length} profiles)`));

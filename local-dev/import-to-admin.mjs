// Imports the 16 cleaned members into a real admin API.
//
//   node import-to-admin.mjs <ADMIN_ORIGIN> <ADMIN_EMAIL> <ADMIN_PASSWORD>
//
// Signs in to get a session cookie, then POSTs each record. Photos are left as
// placeholders (photo is null) — re-run with --photos once cutouts exist.
import fs from 'node:fs';

const [origin, email, password] = process.argv.slice(2);
if (!origin || !email || !password) {
  console.error('usage: node import-to-admin.mjs <ADMIN_ORIGIN> <ADMIN_EMAIL> <ADMIN_PASSWORD>');
  process.exit(1);
}

const members = JSON.parse(
  fs.readFileSync('D:/CSE/Projects/Group/ppt_faultx/local-dev/data/members.clean.json', 'utf8'),
);

let cookie = '';
async function api(path, options = {}) {
  const res = await fetch(`${origin.replace(/\/$/, '')}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}), ...options.headers },
  });
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';')[0];
  const text = await res.text();
  let data = {};
  try { data = JSON.parse(text); } catch { /* non-JSON error page */ }
  if (!res.ok) throw new Error(`${res.status} ${data.error || text.slice(0, 120)}`);
  return data;
}

await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
console.log(`signed in as ${email}`);

const { items: existing } = await api('/api/admin/profiles?page=1');
const bySlug = new Map(existing.map(p => [p.slug, p]));
console.log(`database already has ${existing.length} profiles\n`);

let created = 0;
let updated = 0;
const failures = [];

for (const m of members) {
  // The API rejects any fields it does not accept; send only profile fields.
  const body = {
    name: m.name,
    slug: m.slug,
    designation: m.designation,
    department: m.department,
    team_role: m.team_role,
    society: m.society,
    bio: m.bio,
    organization: m.organization,
    event: m.event,
    email: m.email,
    phone: m.phone,
    instagram: m.instagram,
    linkedin: m.linkedin,
    links: m.links,
    status: m.status,
  };
  try {
    const current = bySlug.get(m.slug);
    if (current) {
      await api(`/api/admin/profiles/${current.id}`, { method: 'PUT', body: JSON.stringify(body) });
      updated++;
      console.log(`  updated  ${m.slug}`);
    } else {
      await api('/api/admin/profiles', { method: 'POST', body: JSON.stringify(body) });
      created++;
      console.log(`  created  ${m.slug}`);
    }
  } catch (error) {
    failures.push(`${m.slug}: ${error.message}`);
    console.log(`  FAILED   ${m.slug} -> ${error.message}`);
  }
}

console.log(`\ncreated ${created}, updated ${updated}, failed ${failures.length}`);
if (failures.length) {
  console.log('\nfailures:');
  failures.forEach(f => console.log('  ' + f));
}
console.log('\nPhotos are still placeholders. Upload real cutouts via the admin dashboard.');

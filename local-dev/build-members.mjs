// Builds the 16 member records straight from the Google Form Excel export.
//
//   node build-members.mjs
//
// Handles Excel scientific notation, column-shifted rows, bare Instagram
// handles and protocol-less / whitespace-broken LinkedIn URLs.
// Writes data/members.clean.json and data/members-report.csv.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const XLSX = path.join(ROOT, 'Untitled form (Responses)1.xlsx');
const DATA = path.join(HERE, 'data');

// ---------------------------------------------------------------- xlsx reader
// The export is a zip of XML parts; only what is needed to read sheet1 is parsed.
const decode = s => s
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
  .replace(/&amp;/g, '&');

const unzip = buffer => {
  const files = {};
  // Locate the central directory to find each entry's offset.
  let eocd = buffer.length - 22;
  while (eocd >= 0 && buffer.readUInt32LE(eocd) !== 0x06054b50) eocd--;
  if (eocd < 0) throw new Error('not a zip archive');
  const count = buffer.readUInt16LE(eocd + 10);
  let p = buffer.readUInt32LE(eocd + 16);
  for (let i = 0; i < count; i++) {
    if (buffer.readUInt32LE(p) !== 0x02014b50) break;
    const method = buffer.readUInt16LE(p + 10);
    const compressedSize = buffer.readUInt32LE(p + 20);
    const nameLen = buffer.readUInt16LE(p + 28);
    const extraLen = buffer.readUInt16LE(p + 30);
    const commentLen = buffer.readUInt16LE(p + 32);
    const localOffset = buffer.readUInt32LE(p + 42);
    const name = buffer.toString('utf8', p + 46, p + 46 + nameLen);
    if (name.endsWith('.xml')) {
      const lhNameLen = buffer.readUInt16LE(localOffset + 26);
      const lhExtraLen = buffer.readUInt16LE(localOffset + 28);
      const dataStart = localOffset + 30 + lhNameLen + lhExtraLen;
      const raw = buffer.subarray(dataStart, dataStart + compressedSize);
      files[name] = method === 0 ? raw.toString('utf8') : inflateRaw(raw);
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  return files;
};

// Minimal DEFLATE via zlib.
const { inflateRawSync } = await import('node:zlib');
const inflateRaw = raw => inflateRawSync(raw).toString('utf8');

const parts = unzip(fs.readFileSync(XLSX));
const read = name => parts[name] ?? '';

const shared = [];
for (const si of read('xl/sharedStrings.xml').match(/<si>[\s\S]*?<\/si>/g) ?? []) {
  shared.push(decode([...si.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(m => m[1]).join('')));
}

const colNum = ref => {
  let n = 0;
  for (const ch of ref.match(/^[A-Z]+/)[0]) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
};

const rows = [];
for (const row of read('xl/worksheets/sheet1.xml').match(/<row[^>]*>[\s\S]*?<\/row>/g) ?? []) {
  const cells = [];
  for (const c of row.match(/<c[^>]*>[\s\S]*?<\/c>|<c[^>]*\/>/g) ?? []) {
    const ref = c.match(/r="([A-Z]+\d+)"/)?.[1];
    const type = c.match(/t="([^"]+)"/)?.[1];
    let value = '';
    if (type === 'inlineStr') {
      value = decode([...c.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(m => m[1]).join(''));
    } else {
      const v = c.match(/<v>([\s\S]*?)<\/v>/)?.[1];
      value = v === undefined ? '' : (type === 's' ? shared[+v] : decode(v));
    }
    if (ref) cells[colNum(ref) - 1] = value;
  }
  rows.push(cells);
}

const header = rows.shift();
console.log(`columns: ${header.map(h => h.trim()).filter(Boolean).join(' | ')}`);
console.log(`rows:    ${rows.length}`);

// Columns are looked up by name so a reordered export cannot silently shift data.
const col = name => header.findIndex(h => h.trim().toLowerCase() === name);
const COL = {
  timestamp: col('timestamp'),
  name: col('name'),
  position: col('sb position'),
  memberId: col('ieee member id'),
  email: col('email id'),
  insta: col('insta id'),
  linkedin: col('linkedin url'),
  phone: col('phone no'),
  photo: col('photo for id card'),
};

// ------------------------------------------------------------------ cleaning
const digits = value => {
  const s = String(value ?? '').trim();
  if (!s) return '';
  if (/^\d+(\.\d+)?e\d+$/i.test(s)) return String(Math.round(Number(s)));
  return s.replace(/[^0-9]/g, '');
};

// A cell in an insta/linkedin column holding a phone number means the form
// export shifted that row one column left.
const looksLikePhone = value => {
  const s = String(value ?? '').trim();
  if (!s || s.includes('@')) return false;
  if (/^\d+(\.\d+)?e\d+$/i.test(s)) return true;
  return /^\d{9,13}$/.test(s);
};

const instagramUrl = value => {
  let s = String(value ?? '').trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s;
  return `https://www.instagram.com/${s.replace(/^@/, '').replace(/\/+$/, '')}`;
};

const linkedinUrl = value => {
  let s = String(value ?? '').replace(/\s+/g, '').trim();
  if (!s) return '';
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
};

const slugify = name => name.toLowerCase().normalize('NFKD')
  .replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const tidy = s => String(s ?? '').replace(/\s+/g, ' ').trim();

const used = new Set();
const members = rows.map((row, index) => {
  let name = row[COL.name];
  const position = row[COL.position];
  const memberId = row[COL.memberId];
  const email = row[COL.email];
  let insta = row[COL.insta];
  let linkedin = row[COL.linkedin];
  let phone = row[COL.phone];
  if (!phone && looksLikePhone(linkedin)) { phone = linkedin; linkedin = ''; }
  else if (!phone && looksLikePhone(insta)) { phone = insta; insta = ''; }

  name = tidy(name).toUpperCase();
  let slug = slugify(name) || `member-${index + 1}`;
  while (used.has(slug)) slug = `${slug}-${index + 1}`;
  used.add(slug);

  const idDigits = digits(memberId);
  return {
    slug,
    name,
    designation: tidy(position),
    team_role: '', department: '', society: '',
    organization: 'IEEE SB VJEC',
    event: '',
    // The profile schema has no member-id field, so it rides along in the bio.
    bio: idDigits ? `IEEE Member ID: ${idDigits}` : '',
    email: tidy(email),
    phone: digits(phone),
    instagram: instagramUrl(insta),
    linkedin: linkedinUrl(linkedin),
    links: [],
    status: 'active',
    photo: null,
    // Provenance: where the photo was submitted from, per the form export.
    _source: { photoLink: row[COL.photo] || '', timestamp: row[COL.timestamp] || '' },
  };
});

fs.mkdirSync(DATA, { recursive: true });
fs.writeFileSync(path.join(DATA, 'members.clean.json'), JSON.stringify(members, null, 1));
// Kept so verify-members.mjs can diff the cleaned records against the source
// rows without needing its own copy of the xlsx reader.
fs.writeFileSync(path.join(DATA, 'source-raw.json'), JSON.stringify(rows, null, 1));

const report = members.map(m => ({
  Name: m.name, Position: m.designation, Phone: m.phone,
  Instagram: m.instagram.replace(/\?.*$/, ''), LinkedIn: m.linkedin.replace(/\?.*$/, ''),
  Email: m.email, Slug: `/profile/${m.slug}`,
}));
const cols = Object.keys(report[0]);
fs.writeFileSync(path.join(DATA, 'members-report.csv'),
  cols.map(c => `"${c}"`).join(',') + '\n' +
  report.map(r => cols.map(c => `"${String(r[c]).replace(/"/g, '""')}"`).join(',')).join('\n'));

console.log(`\nwrote ${members.length} records to data/members.clean.json`);
console.log('wrote data/members-report.csv');

// Cross-checks the cleaned records against the raw spreadsheet rows.
// Reports any field that is not an exact, explainable transform of its source.
import fs from 'node:fs';

const HERE = new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const raw = JSON.parse(fs.readFileSync(HERE + 'data/source-raw.json', 'utf8'));
const clean = JSON.parse(fs.readFileSync(HERE + 'data/members.clean.json', 'utf8'));

const tidy = s => String(s ?? '').replace(/\s+/g, ' ').trim();
const digits = v => {
  const s = String(v ?? '').trim();
  if (!s) return '';
  if (/^\d+(\.\d+)?e\d+$/i.test(s)) return String(Math.round(Number(s)));
  return s.replace(/[^0-9]/g, '');
};
const looksPhone = v => {
  const s = String(v ?? '').trim();
  if (!s || s.includes('@')) return false;
  if (/^\d+(\.\d+)?e\d+$/i.test(s)) return true;
  return /^\d{9,13}$/.test(s);
};

const problems = [];
const notes = [];

if (raw.length !== clean.length) problems.push(`row count: raw=${raw.length} clean=${clean.length}`);

const seenSlugs = new Set();

raw.forEach((r, i) => {
  const m = clean[i];
  const tag = `#${i + 1} ${(r[2] || '').trim()}`;

  // --- name: only trim + upper ---
  const srcName = tidy(r[2]).toUpperCase();
  if (m.name !== srcName) problems.push(`${tag} name "${m.name}" != source "${srcName}"`);
  if (/\s{2,}/.test(m.name)) problems.push(`${tag} name has double spaces`);

  // --- designation: trim only, no case change ---
  const srcPos = tidy(r[3]);
  if (m.designation !== srcPos) problems.push(`${tag} designation "${m.designation}" != source "${srcPos}"`);

  // --- email: we used the "email id" column, not the form sign-in address ---
  const srcEmail = tidy(r[5]);
  if (m.email !== srcEmail) problems.push(`${tag} email "${m.email}" != "email id" column "${srcEmail}"`);
  if (tidy(r[1]) !== srcEmail) notes.push(`${tag} email-id differs from form address: "${srcEmail}" vs "${tidy(r[1])}"`);

  // --- phone: must equal the digits of the raw phone, or of the shifted cell ---
  let srcPhone = r[8];
  let srcPhoneFrom = 'phone column';
  if (looksPhone(r[7])) { srcPhone = r[7]; srcPhoneFrom = 'LINKEDIN column (shifted)'; }
  else if (looksPhone(r[6])) { srcPhone = r[6]; srcPhoneFrom = 'INSTA column (shifted)'; }
  const expectPhone = digits(srcPhone);
  if (m.phone !== expectPhone) problems.push(`${tag} phone "${m.phone}" != digits of "${srcPhone}" = "${expectPhone}"`);
  if (m.phone && !/^\d{10}$/.test(m.phone)) problems.push(`${tag} phone "${m.phone}" is not 10 digits`);
  if (srcPhoneFrom !== 'phone column') notes.push(`${tag} phone recovered from ${srcPhoneFrom}: ${m.phone}`);

  // --- instagram: the handle must survive normalisation ---
  const srcInsta = tidy(r[6]);
  if (m.instagram) {
    if (/^https?:\/\//i.test(srcInsta)) {
      if (m.instagram !== srcInsta) problems.push(`${tag} insta URL altered: "${srcInsta}" -> "${m.instagram}"`);
    } else {
      const handle = srcInsta.replace(/^@/, '').replace(/\/+$/, '');
      if (!m.instagram.endsWith('/' + handle)) problems.push(`${tag} insta lost handle: "${srcInsta}" -> "${m.instagram}"`);
      if (!/^https:\/\/www\.instagram\.com\//.test(m.instagram)) problems.push(`${tag} insta not a URL: ${m.instagram}`);
    }
  } else if (srcInsta && !looksPhone(srcInsta)) {
    problems.push(`${tag} insta "${srcInsta}" was dropped entirely`);
  }

  // --- linkedin: path must survive normalisation ---
  const srcLinkedin = tidy(r[7]);
  if (m.linkedin) {
    const path = srcLinkedin.replace(/\s+/g, '').replace(/^https?:\/\/(www\.)?/i, '');
    if (!m.linkedin.endsWith(path)) problems.push(`${tag} linkedin lost path: "${srcLinkedin}" -> "${m.linkedin}"`);
    if (/[\r\n\t]/.test(m.linkedin)) problems.push(`${tag} linkedin still contains whitespace`);
    if (!/^https:\/\//.test(m.linkedin)) problems.push(`${tag} linkedin not https: ${m.linkedin}`);
  } else if (srcLinkedin && !looksPhone(srcLinkedin)) {
    problems.push(`${tag} linkedin "${srcLinkedin}" was dropped entirely`);
  }

  // --- member id ---
  const expectId = digits(r[4]);
  if (expectId && !m.bio.includes(expectId)) problems.push(`${tag} member id "${expectId}" missing from bio "${m.bio}"`);

  // --- slug ---
  if (!m.slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(m.slug)) problems.push(`${tag} bad slug "${m.slug}"`);
  if (seenSlugs.has(m.slug)) problems.push(`${tag} duplicate slug "${m.slug}"`);
  seenSlugs.add(m.slug);

  if (m.status !== 'active') problems.push(`${tag} status "${m.status}"`);
  if (m.photo !== null) problems.push(`${tag} photo should be null placeholder, got "${m.photo}"`);
});

console.log(`rows checked: ${raw.length}`);
console.log(`PROBLEMS: ${problems.length}`);
problems.forEach(p => console.log('  ✗ ' + p));
console.log(`\nNOTES: ${notes.length}`);
notes.forEach(n => console.log('  · ' + n));

import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowDown, ArrowDownToLine, ArrowUpRight, Check, Copy, Instagram, Linkedin, Link as LinkIcon, Mail, Phone, QrCode, Share2, X, Youtube } from 'lucide-react';
import { FALLBACK_BY_SLUG } from './profiles.generated';
import './minimal.css';
import './spotlight.css';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
// The app ships inside a subfolder (badge-profiles/), but Vite's base only
// rewrites bundled URLs - string literals in JSX would still resolve at the site
// root and 404. Resolve every asset path against the configured base instead.
const assetUrl = filePath => `${import.meta.env.BASE_URL || '/'}${String(filePath).replace(/^\/+/, '')}`;

async function api(path) {
  const response = await fetch(`${API_BASE}${path}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}
function Logo() {
  return <a className="brand" href="/" aria-label="IEEE VJEC home"><span className="brand-mark"><img src={assetUrl('/ieee-vjec-logo.png')} alt="" /></span><span className="brand-text">IEEE <strong>VJEC</strong><small>Student Branch</small></span></a>;
}
// Slugs with a background-removed silhouette render as a cutout. Everyone else
// uses their uploaded photo, styled to sit inside the same composition.
const CUTOUTS = {
  'abdul-basith-p-v': '/cutouts/member-01.webp',
  'aswin': '/cutouts/member-02.webp',
  'adarsh-k-biju': '/cutouts/member-03.webp',
  'sandra-nambiar': '/cutouts/member-04.webp',
  'milan-biju': '/cutouts/member-05.webp',
  'tessa-mariya': '/cutouts/member-06.webp',
  'ajith-mathew': '/cutouts/member-07.webp',
  'shiva-keshav-v': '/cutouts/member-08.webp',
  'abhin-k-shibu-james': '/cutouts/member-09.webp',
  'elsitta-binu': '/cutouts/member-10.webp',
  'samanway-t-k': '/cutouts/member-11.webp',
  'leo-mathew-roy': '/cutouts/member-12.webp',
  'sanju-santy': '/cutouts/member-13.webp',
  'abhiram-m-s': '/cutouts/member-14.webp',
  'simon-joseph': '/cutouts/member-15.webp',
  'alan-antony': '/cutouts/member-16.webp',
  'vaishnavi-sasi': '/cutouts/member-17.webp',
  'rohn-roy': '/cutouts/member-18.webp',
  'abhinav-r': '/cutouts/member-19.webp',
};
function Portrait({ profile }) {
  const cutout = CUTOUTS[profile.slug];
  const src = cutout || (profile.photo?.startsWith('/') && API_BASE ? `${API_BASE}${profile.photo}` : profile.photo);
  if (!src) return null;
  const resolved = cutout ? assetUrl(src) : src;
  return <img className={`hero-person ${cutout ? 'cutout' : 'profile-photo'}`} src={resolved} alt={profile.name} />;
}
function PublicProfile({ slug }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [qrOpen, setQrOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const aboutRef = useRef(null);
  const heroRef = useRef(null);
  useEffect(() => {
    let current = true;
    // With no API origin configured this build is a static site, so it serves the
    // profiles bundled at build time. Once VITE_API_BASE_URL points at the admin
    // project the live API takes over and edits show without a rebuild.
    if (!API_BASE) {
      const profile = FALLBACK_BY_SLUG[slug];
      if (current) setData(profile ? { profile, url: window.location.href } : null);
      if (current && !profile) setError('Profile not found.');
      return () => { current = false; };
    }
    api(`/api/profiles/${encodeURIComponent(slug)}`).then(result => { if (current) setData(result); }).catch(err => { if (current) setError(err.message); });
    return () => { current = false; };
  }, [slug]);
  useEffect(() => {
    if (!data?.profile) return;
    document.title = `${data.profile.name} | IEEE SB VJEC`;
  }, [data]);
  useEffect(() => {
    const section = aboutRef.current;
    if (!section || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { section.classList.add('in-view'); observer.disconnect(); }
    }, { threshold: 0.12 });
    observer.observe(section);
    return () => observer.disconnect();
  }, [data]);
  useEffect(() => {
    if (!qrOpen) return;
    const onEscape = event => { if (event.key === 'Escape') setQrOpen(false); };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [qrOpen]);
  // Cache layout and bind straight to scroll position. The original eased with a
  // lerp that kept a rAF loop alive long after scrolling stopped (the banner
  // visibly trailed the finger), and re-read clientHeight on every scroll event,
  // forcing a reflow each time — which is what made this stutter on phones.
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const inner = hero.querySelector('.hero-inner');
    let top = 0, viewport = 1, range = 1;
    const measure = () => {
      top = hero.offsetTop;
      viewport = inner.clientHeight;
      range = Math.max(1, hero.offsetHeight - viewport);
    };
    measure();
    let ticking = false;
    let last = -1;
    let revealed = false;
    const paint = () => {
      ticking = false;
      const progress = Math.min(1, Math.max(0, (window.scrollY - top) / range));
      if (progress === last) return;
      last = progress;
      hero.style.setProperty('--type-y', `${Math.round(-95 * progress)}px`);
      hero.style.setProperty('--person-y', `${Math.round(-42 * progress)}px`);
      hero.style.setProperty('--panel-rise', `${Math.round(viewport * .84 * progress)}px`);
      hero.style.setProperty('--content-offset', `${Math.round(viewport * .1 * progress)}px`);
      // Only the name shows at rest; the facts and socials fade in as the banner rises.
      const reveal = Math.min(1, Math.max(0, (progress - .12) / .33));
      const eased = reveal * reveal * (3 - 2 * reveal);
      hero.style.setProperty('--banner-reveal', eased.toFixed(3));
      const shown = reveal > 0;
      if (shown !== revealed) { revealed = shown; hero.classList.toggle('banner-open', shown); }
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(paint); } };
    const onResize = () => { measure(); onScroll(); };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, [error]);
  const profile = data?.profile;
  const url = data?.url;
  const copyUrl = async () => {
    try { await navigator.clipboard.writeText(url); setNotice('Profile link copied'); }
    catch { setNotice('Copy unavailable in this browser'); }
    setTimeout(() => setNotice(''), 2800);
  };
  const share = async () => {
    if (navigator.share) { try { await navigator.share({ title: `${profile.name} | IEEE SB VJEC`, url }); } catch { /* User cancelled. */ } }
    else copyUrl();
  };
  const downloadVcard = () => {
    const escape = value => String(value || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
    const vcard = `BEGIN:VCARD\r\nVERSION:3.0\r\nFN:${escape(profile.name)}\r\nTITLE:${escape(profile.designation)}\r\nORG:${escape(profile.organization)}\r\nEMAIL:${escape(profile.email)}\r\nTEL:${escape(profile.phone)}\r\nURL:${url}\r\nEND:VCARD\r\n`;
    const blobUrl = URL.createObjectURL(new Blob([vcard], { type: 'text/vcard' }));
    const anchor = document.createElement('a'); anchor.href = blobUrl; anchor.download = `${profile.slug}.vcf`; anchor.click();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  };
  // These come from editable admin profile fields. Missing URLs never render as links.
  const accounts = profile ? [
    profile.instagram && { label: 'Instagram', href: profile.instagram, icon: Instagram },
    profile.linkedin && { label: 'LinkedIn', href: profile.linkedin, icon: Linkedin },
    ...(profile.links || []).filter(link => link?.label && link?.url).map(link => ({ label: link.label, href: link.url, icon: /youtube/i.test(link.label) ? Youtube : LinkIcon })),
  ].filter(Boolean) : [];
  const contactLinks = profile ? [
    profile.email && { label: 'Email', href: `mailto:${profile.email}`, icon: Mail },
    profile.phone && { label: 'Call', href: `tel:${profile.phone.replace(/[^+\d]/g, '')}`, icon: Phone },
  ].filter(Boolean) : [];

  return <div className="site">
    <header className="site-header"><div className="shell header-inner"><Logo /><span className="header-label">COORDINATOR PROFILE <span className="header-dot" /></span></div></header>
    {error ? <main className="state-page shell"><span className="eyebrow">PROFILE UNAVAILABLE</span><h1>Profile not found.</h1><p>This profile may be inactive or the link may have changed.</p></main>
      : <main>
          <section className="hero-stage" ref={heroRef} aria-label="IEEE coordinator profile introduction">
            <div className="hero-beams" aria-hidden="true" />
            <div className="hero-inner">
              <p className="eyebrow hero-caption">IEEE STUDENT BRANCH · VJEC</p>
              <div className="hero-type-motion"><div className="hero-word" aria-hidden="true"><span>I</span><span>E</span><span>E</span><span>E</span></div></div>
              <div className="portrait-motion">{profile && <Portrait profile={profile} />}</div>
              <div className="rising-panel">
              <div className="banner-content">
                <div className="banner-identity"><span className="banner-kicker">COORDINATOR PROFILE{profile ? ` / ${String(profile.id).padStart(4, '0')}` : ''}</span><h1>{profile?.name || 'Coordinator'}</h1>{profile && <span className="banner-role">{profile.designation}{profile.team_role ? ` · ${profile.team_role}` : ''}</span>}
                  {profile && <dl className="banner-facts">
                    <div><dt>ORGANIZATION</dt><dd>{profile.organization || 'IEEE SB VJEC'}</dd></div>
                    {profile.society && <div><dt>SOCIETY</dt><dd>{profile.society}</dd></div>}
                    {profile.department && <div><dt>DEPARTMENT</dt><dd>{profile.department}</dd></div>}
                    {profile.bio && <div><dt>MEMBER ID</dt><dd>{profile.bio.replace(/^IEEE Member ID:\s*/, '')}</dd></div>}
                  </dl>}
                </div>
                                {profile && <div className="banner-connect"><h2>Let’s connect.</h2>
                  <div className="account-list">{accounts.map(({ label, href, icon: Icon }, index) => <a className="account-link" key={`${label}-${index}`} href={href} target="_blank" rel="noreferrer"><span className="account-icon"><Icon size={22} /></span><span>{label}</span><ArrowUpRight className="account-arrow" size={20} /></a>)}</div>
                  {!accounts.length && <p className="banner-empty">Account links will appear here when added.</p>}
                  <div className="profile-actions"><button onClick={downloadVcard}><ArrowDownToLine size={18} /> Save contact</button><button onClick={share}><Share2 size={18} /> Share profile</button><button onClick={() => setQrOpen(true)}><QrCode size={18} /> Show QR code</button><button onClick={copyUrl}><Copy size={18} /> Copy profile link</button>{contactLinks.map(({ label, href, icon: Icon }) => <a key={label} href={href}><Icon size={18} /> {label}</a>)}</div>
                </div>}
              </div>
              </div>
            </div>
          </section>

          {profile ? null : <section className="loading-profile shell" aria-live="polite">Loading coordinator details…</section>}
        </main>}
    <footer className="site-footer"><div className="shell footer-inner"><Logo /><span>IEEE SB VJEC · {new Date().getFullYear()}</span></div></footer>
    {notice && <div className="toast" role="status"><Check size={17} />{notice}</div>}
    {qrOpen && profile && <div className="modal-overlay" onMouseDown={() => setQrOpen(false)}><div className="qr-dialog" role="dialog" aria-modal="true" aria-label={`QR code for ${profile.name}`} onMouseDown={event => event.stopPropagation()}><button className="dialog-close" onClick={() => setQrOpen(false)} aria-label="Close"><X size={20} /></button><span className="eyebrow">SCAN TO CONNECT / {profile.name}</span><h2>{profile.name}</h2><div className="qr-frame"><img src={`${API_BASE}/api/profiles/${encodeURIComponent(profile.slug)}/qr`} alt={`QR code for ${profile.name}`} /></div><p>Scan this code to open the coordinator profile.</p><button className="modal-copy" onClick={copyUrl}><Copy size={18} /> Copy profile link</button></div></div>}
  </div>;
}
// This app is published as static files inside a subfolder of another site, so a
// path like /badge-profiles/profile/alan-antony has no file behind it and the host
// answers with its own 404. Hash routes (#/profile/:slug) work on any static host
// with no rewrite rules, so accept both: hash first, then path, then the default.
function routeSlug() {
  const hash = window.location.hash.replace(/^#/, '');
  if (hash.startsWith('/profile/')) {
    const fromHash = decodeURIComponent(hash.slice('/profile/'.length).replace(/\/$/, ''));
    if (fromHash) return fromHash;
  }
  const match = window.location.pathname.match(/\/profile\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : 'alan-antony';
}
function Router() {
  const [slug, setSlug] = useState(routeSlug);
  useEffect(() => {
    const sync = () => setSlug(routeSlug());
    window.addEventListener('hashchange', sync);
    window.addEventListener('popstate', sync);
    return () => {
      window.removeEventListener('hashchange', sync);
      window.removeEventListener('popstate', sync);
    };
  }, []);
  return <PublicProfile slug={slug} />;
}
createRoot(document.getElementById('root')).render(<Router />);

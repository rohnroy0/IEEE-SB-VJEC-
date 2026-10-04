# Local development tooling

Scripts for turning the Google Form export into live profile pages. Nothing here
is deployed — the public site itself lives in `../public-site`.

## Layout

| Path | What it is |
| --- | --- |
| `../Untitled form (Responses).xlsx` | Source of truth: 16 members, as submitted |
| `../images/` | The 16 original photos |
| `../cutouts/` | Full-resolution PNG masters, background removed with a white outline |
| `../public-site/public/cutouts/` | The WebP files the site actually serves (~2 MB total) |

## Pipeline

Run in order; each step reads the previous one's output.

```bash
node build-members.mjs        # Excel -> data/members.clean.json + members-report.csv
node verify-members.mjs       # QA: every field vs its source row (expect 0 problems)
python3 finalize-cutouts.py   # images/ -> cutouts/*.png   (background removed, NO outline)
python3 normalize-cutouts.py  # cutouts/ -> same-size canvases + the single white outline
```

The two image steps must run in that order and together. `finalize` removes the
background but deliberately adds **no** outline, because `normalize` adds the one
and only outline — running an outline in both steps produced a doubled border.
`normalize` rewrites `cutouts/*.png` in place, so always re-run `finalize` first
(it refuses to re-normalise a canvas it already sized).

`normalize-cutouts.py` puts every face on one 900x1200 canvas at the same size and
the same height, all standing on a common baseline, which is what makes the CSS
sizing behave identically for everyone. Scale is the geometric mean of a
face-matched and a body-matched scale: matching face size alone leaves people whose
photo was a tight headshot rendering as a tiny figure, and matching body height
alone makes a full-length shot enormous. Faces the detector cannot find — Aswin in
sunglasses, side-on — are pinned by hand in `OVERRIDES`.

Requires once: `pip install "rembg[cpu]" "opencv-python-headless<5"`.

## Loading the records into the real database

The preview uses `server.mjs`, which is only a stand-in. To put the members into
your actual Postgres:

```bash
node import-to-admin.mjs <ADMIN_ORIGIN> <ADMIN_EMAIL> <ADMIN_PASSWORD>
```

It signs in, then creates or updates each profile by slug, so it is safe to re-run.

## Previewing the site

```bash
node server.mjs            # mock API on :3001, serves all 16 members
cd ../public-site && npm run dev   # site on :5174, proxies /api to :3001
```

To share it over the internet, serve the production build instead of the dev
server — Vite rejects unknown `Host` headers, so the tunnel needs a plain static
server:

```bash
cd ../public-site && npm run build
node serve-dist.mjs        # static build on :4173, /api forwarded to :3001
cloudflared tunnel --url http://localhost:4173
```

## Notes on the data

Two rows in the spreadsheet are shifted one column left (Shiva Keshav V and Alan
Antony have their phone number sitting in a social column). `build-members.mjs`
detects and repairs this; `verify-members.mjs` reports it. `_source` on each
record keeps the original photo link and timestamp for provenance.

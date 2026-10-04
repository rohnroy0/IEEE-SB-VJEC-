# IEEE QR badge site

Public profile pages for the IEEE SB VJEC committee. Scanning a badge's QR code
opens `/profile/<slug>`, which renders the member's photo, role and social links.

## What is here

| Path | What it is |
| --- | --- |
| `Untitled form (Responses).xlsx` | Source of truth — 16 members, as submitted |
| `images/` | The 16 original photos |
| `cutouts/` | Full-resolution PNG masters, background removed with a white outline |
| `local-dev/` | Tooling: data pipeline, image pipeline, mock API, import script |
| `public-site/` | **The deployable site** (a clone of the `IEEE-QR` repo) |

`public-site/` is the only thing that ships. Everything else is build input or
tooling. See `local-dev/README.md` for how the pipeline fits together.

## Two repositories, one database

This project works alongside a separate admin dashboard that owns the API and the
database. The public site here only ever reads:

```
GET /api/profiles/:slug
```

so editing a profile in the admin dashboard changes what this site shows, with no
rebuild. Set `VITE_API_BASE_URL` to the admin project's HTTPS origin.

## Running it locally

```bash
cd public-site && npm install && npm run dev     # site on :5174
cd ../local-dev && node server.mjs               # mock API on :3001
```

Visit `http://localhost:5174/profile/alan-antony`. There is no index page — the
site only serves `/profile/<slug>`, which is what the QR codes point at.

## Deployment

`public-site/` deploys to Vercel as a static Vite project. `vercel.json` rewrites
`/profile/:slug` to `index.html` so deep links resolve on refresh.

The member photos ship with the site as WebP files in `public/cutouts/`, listed in
the `CUTOUTS` map in `src/main.jsx`. They are static assets rather than database
rows, because the admin dashboard's image pipeline flattens uploads to opaque
WebP and would destroy the transparency the cutouts depend on.

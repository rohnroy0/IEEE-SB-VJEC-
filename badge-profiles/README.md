# Badge profiles

Self-contained build of the coordinator badge-profile app. Each member has a page
at `#/profile/<slug>` — reached from the committee section on the homepage.

## Why the routes are hashes

`/badge-profiles/profile/<slug>` is a client-side route with no file behind it, so
a plain static host answers 404. Hash routes work anywhere with no rewrite rules,
and `404.html` is kept as a fallback for hosts that prefer path routing.

## Rebuilding

The build **must** run with the subfolder base. Without it `index.html` points at
`/assets/...` instead of `/badge-profiles/assets/...` and every image 404s:

```bash
cd ../public-site
BASE_PATH=/badge-profiles/ npx vite build
cp -r dist/. ../_mock/vjec/badge-profiles/
cp ../_mock/vjec/badge-profiles/index.html ../_mock/vjec/badge-profiles/404.html
```

`../local-dev/build-badge-folder.mjs` does all of that in one step and fails
loudly if the asset paths come out unprefixed.

Source lives in https://github.com/jisjohnsajan/ieee-sb

## Data

The app calls `GET /api/profiles/:slug` on the admin project's origin, set at
build time via `VITE_API_BASE_URL`. Until that is deployed and the variable is
set, pages render the "Profile not found" state.

Portrait files are named `member-01.webp` … `member-16.webp`; the slug-to-file
mapping is in the source repo at `local-dev/portrait-map.json`.

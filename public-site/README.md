# IEEE QR — public coordinator profiles

This repository contains only the public profile frontend. The separate admin repository owns the API and database.

Set `VITE_API_BASE_URL` to the HTTPS URL of the admin project. It is baked into the Vite build. Public pages load active profiles from `GET /api/profiles/:slug` on that origin.

Run `npm install && npm run dev` locally, or import this repo into Vercel as a Vite project. Point the admin project's `PUBLIC_BASE_URL` at this project's production URL so QR codes target the public site.

The landing page uses the coordinator record at `/profile/:slug`. Instagram and LinkedIn come from editable profile fields in the admin dashboard. Add YouTube or another account using the dashboard's custom links; links without saved URLs are hidden. The supplied outlined portrait is used for the `arjun` profile, while other coordinators use their uploaded profile photo.

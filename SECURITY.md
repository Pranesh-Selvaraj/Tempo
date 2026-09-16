# Security Policy

Tempo is a self-hostable web app: a React client, an Express + tRPC API and a
PostgreSQL (or embedded PGlite) database. This document describes how to report
issues and what the project already does to protect your data.

## Reporting a vulnerability

Please **do not open a public issue** for security problems.

- Email **praneshs281@gmail.com** with a description, reproduction steps and the
  impact you believe the issue has.
- Or use GitHub's private reporting flow: repository → **Security** → **Report a
  vulnerability**.
- You can expect an acknowledgement within a few days. Please give us a chance
  to ship a fix before disclosing publicly.

## Supported versions

Only the latest commit on `main` is supported. There are no maintained release
branches; fixes land on `main` and are deployed from there.

## What the app does to stay safe

- **No secrets in the repository.** Credentials live in environment variables
  (see `.env.example`). `.env` files, the local PGlite database, uploaded
  recordings and licensed `.glb` player models are all gitignored.
- **Password storage** uses `bcrypt` hashes; plaintext passwords are never
  stored or logged.
- **Authentication** is a signed JWT (`JWT_SECRET`) accepted as a Bearer token.
  Rotate the secret to invalidate every session.
- **Authorization**: every play, keyframe, trajectory, phase, annotation,
  camera path and recording query checks that the row belongs to the
  authenticated user (`assertPlayOwnership`). Public share links are read-only
  projections (`play.getPublic`).
- **Input validation**: all API input is validated with Zod schemas shared
  between the client and the server (`packages/shared-types`).
- **Uploads**: `POST /api/upload` requires a valid JWT, writes to
  `apps/backend/uploads/` (or Cloudflare R2 when configured) and returns a
  public URL. Treat anything you upload as public if you share the link.
- **Browser isolation**: the API and the SPA send
  `Cross-Origin-Opener-Policy: same-origin` and
  `Cross-Origin-Embedder-Policy: require-corp` (required by ffmpeg.wasm's
  `SharedArrayBuffer`) and the API enables CORS only for `FRONTEND_URL`.

## Static preview build

The browser-only preview (`VITE_DEMO_MODE=1`) gates the app behind a master
username and password. That gate is **access control for a private link, not a
security boundary**: the credentials are compiled into the public JavaScript
bundle, and all data lives in the visitor's own browser. Do not put sensitive
data into the static preview, and only share its URL with people you trust. For
confidential work, use the self-hosted full version, which has real accounts and
a database.

## Deployment checklist

1. Set a long, random `JWT_SECRET` — never reuse the example value.
2. Set `DATABASE_URL` to a Postgres instance with a dedicated, least-privilege
   role rather than the embedded PGlite database.
3. Serve both the API and the SPA over HTTPS.
4. Configure `FRONTEND_URL` for production CORS.
5. If you enable Cloudflare R2, use a bucket-scoped token and keep
   `R2_SECRET_ACCESS_KEY` out of source control.
6. Back up the database and the uploads directory; an operator with database
   access can read all stored plays.

## Third-party content

The **FIVB Volleyball Rules 2025–2028** PDF bundled in
`apps/frontend/public/rules/` is the property of the FIVB and is included only
as a reference copy for users of this app. Court diagrams in the same folder are
original illustrations published with this project under its source-available license.

## Out of scope

- Vulnerabilities in dependencies that do not affect Tempo's usage — report
  those upstream and let us know if a bump is needed.
- Issues that require an already-compromised browser, machine or database.
- Denial of service from intentionally huge uploads on a self-hosted instance
  you control.

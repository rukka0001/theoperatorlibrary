# TheOperatorLibrary — Session Handoff

_Last updated: 2026-06-28_

A no-database Astro + Vercel + Tailwind v4 storefront selling digital trading
ebooks. `src/config/products.ts` is the single source of truth (catalog +
deliverable file list). First product: **El Trader Que Perdía Ganando**
(launch $14.990 CLP, regular $29.990), author "Chris Ruzicka".

## Purchase loop (code-complete, builds clean)

1. `/api/checkout/flow` → creates a Flow payment, redirects to Flow's hosted page.
2. `/api/webhooks/flow` → Flow's server-to-server confirmation. Re-verifies via
   signed Flow `getStatus` (never trusts the callback body), mints a `jose`
   download token, emails per-file download buttons via Resend.
3. `/api/download?token=&file=` → verifies the token, streams the file from
   Vercel Blob (private store).

Libs: `src/lib/{flow,email,download-token,env}.ts`. `env.ts` prefers
`process.env`, falls back to `import.meta.env` for local `astro dev`.

`astro.config.mjs` sets `security.checkOrigin: false` — required so Flow's
no-Origin webhook isn't 403'd; the webhook is secured by signed `getStatus`.

## Done this session (committed + pushed, `main` @ `3fc38b1`)

### Email (Resend) — verified & wired
- Reusable `sendEmail({ to, subject, html, text?, from?, replyTo? })` in
  `src/lib/email.ts`. Default sender = `RESEND_FROM_EMAIL`. Returns Resend id.
- `sendDownloadEmail` now sits on top of `sendEmail`.
- `GET /api/test-email?key=<secret>&to=<addr>` — manual smoke test.
  - **Disabled by default**: returns 404 unless `TEST_EMAIL_KEY` is set, so it
    can never be an open relay. Requires `?key=` to match `TEST_EMAIL_KEY`.
  - `to` defaults to `RESEND_FROM_EMAIL`. Never echoes secrets.
- `RESEND_API_KEY` + `RESEND_FROM_EMAIL` are set on Vercel and in local `.env`.

### Vercel Blob — PRIVATE store, files uploaded
- Store is **private**. Both sides use private access — keep them that way:
  - Upload: `scripts/upload-files.ts` → `put(..., { access: 'private' })`.
  - Download: `/api/download` → `get(blobKey, { access: 'private', token })`
    streams the bytes. (Do NOT revert to `list()` + `fetch()` — that only works
    for public blobs and the URL would leak.)
- All 4 deliverables uploaded; pathnames match `products.ts` `blobKey`s exactly:
  ```
  books/el-trader-que-perdia-ganando/es/el-trader-que-perdia-ganando.pdf    (543,112 B)
  books/el-trader-que-perdia-ganando/es/el-trader-que-perdia-ganando.epub   (1,987,393 B)
  books/el-trader-que-perdia-ganando/es/el-trader-que-perdia-ganando.azw3   (458,701 B)
  books/el-trader-que-perdia-ganando/es/hojas-de-referencia.pdf             (240,397 B)
  ```
- `BLOB_READ_WRITE_TOKEN` is set on Vercel and in local `.env`.
- Note: it's **4** deliverables (an older note said 7).

## Environment variables

| Var | Set on Vercel | In local `.env` | Notes |
|-----|---------------|-----------------|-------|
| `RESEND_API_KEY` | ✅ | ✅ | |
| `RESEND_FROM_EMAIL` | ✅ | ✅ | Verified sender |
| `BLOB_READ_WRITE_TOKEN` | ✅ | ✅ | Private store R/W token |
| `TEST_EMAIL_KEY` | ⬜ optional | ⬜ optional | Enables `/api/test-email` |
| `FLOW_API_KEY` | ❌ pending | ❌ | |
| `FLOW_SECRET_KEY` | ❌ pending | ❌ | |
| `FLOW_API_URL` | ❌ pending | ❌ | sandbox vs prod |
| `DOWNLOAD_TOKEN_SECRET` | ❌ pending | ❌ | `openssl rand -base64 32` |
| `PUBLIC_SITE_URL` | ❌ pending | ❌ | absolute links in emails |

Also present on Vercel but **unused by this project**: `BLOB_STORE_ID`,
`BLOB_WEBHOOK_PUBLIC_KEY`. See `.env.example` for the full template.

## Pending before it works live

1. Add Flow keys + `DOWNLOAD_TOKEN_SECRET` + `PUBLIC_SITE_URL` to Vercel env.
2. **Live download test**: the `/api/download` private-Blob path can only be
   exercised against a real deploy with Blob env vars present. Builds clean, but
   not yet verified end-to-end against the private store.
3. Full Flow/webhook testing needs a deployed/preview URL — Flow can't reach
   localhost.

## How to test

### Email (safe, no purchase needed)
1. Add `TEST_EMAIL_KEY` (e.g. `openssl rand -hex 16`) to the target Vercel env; redeploy.
2. `curl "https://<deploy-url>/api/test-email?key=<key>&to=you@example.com"`
   → `{"ok":true,"id":"...","to":"..."}` and an email arrives.
   Omitting `to` sends to `RESEND_FROM_EMAIL`.
3. Remove `TEST_EMAIL_KEY` afterward to keep the surface minimal (route still
   requires the secret regardless).

### Blob upload (re-run / new files)
- Source files live at the TOP level of `blob-uploads/` with human names; the
  script reads from `blob-uploads/<blobKey>` (mirror path). Stage copies into
  `blob-uploads/books/el-trader-que-perdia-ganando/es/` with the `blobKey`
  filenames before running.
- `npm run upload-files -- --dry-run` to preview; `npm run upload-files` to push.
  Reads `.env` automatically via `node --env-file-if-exists=.env`.

### Build
- `npm run build` (passes clean as of this commit).
- Dev server: `astro dev --background` (per AGENTS.md/CLAUDE.md, a symlink).

## Key files
- `src/config/products.ts` — catalog + `blobKey`s (single source of truth).
- `src/lib/email.ts` — `sendEmail`, `sendDownloadEmail`.
- `src/lib/{flow,download-token,env}.ts`.
- `src/pages/api/{checkout/flow,webhooks/flow,download,test-email}.ts`.
- `scripts/upload-files.ts` — Blob uploader.

## Git
- Branch `main`, pushed to `origin` (`github.com/rukka0001/theoperatorlibrary`).
- Latest: `3fc38b1` "Wire Resend email helper and private Blob delivery".
- ⚠ Commits use auto-detected identity
  (`chrisruzicka@Chriss-MacBook-Pro.local`). To fix: set
  `git config --global user.email "..."` then `git commit --amend --reset-author`.

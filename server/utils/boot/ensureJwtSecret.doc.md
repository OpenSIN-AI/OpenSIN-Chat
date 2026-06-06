# Purpose: Companion docs for `ensureJwtSecret.js`
# Docs: this file

`ensureJwtSecret.js` makes the server bootable out-of-the-box by auto-generating a `JWT_SECRET` when the user has not configured one.

## Why this exists

Without a `JWT_SECRET` env var, any call to `makeJWT()` (login, multi-user session creation, etc.) throws `Cannot create JWT as JWT_SECRET is unset.` and the user sees an opaque `Internal Server Error`. New users following the upstream quickstart would hit this immediately on first login.

The upstream codebase documents `JWT_SECRET` in `.env.example` but the canonical `yarn setup` does not generate one — it only copies the example. So a fresh install is broken.

## What it does

1. If `process.env.JWT_SECRET` is already set and is at least 32 chars, no-op.
2. Otherwise:
   - Generates a cryptographically secure 32-byte hex string via `crypto.randomBytes(32).toString("hex")`.
   - Resolves the active `.env` file (`.env.${NODE_ENV}` in dev, otherwise `.env`).
   - Strips any pre-existing `JWT_SECRET=...` line, appends the new value, writes the file back.
   - Sets `process.env.JWT_SECRET` so the rest of the server picks it up.

## Where it's loaded

`server/index.js` requires this module immediately after `patchSlowBuffer` and `patchSdkTimeouts` and before `express`, so the secret is in place before any auth code runs.

## Idempotency

Calling this multiple times in the same process is safe: once a secret is set, subsequent calls are no-ops.

## Security notes

- The generated secret is 64 hex chars (32 bytes of entropy). Well above the upstream-recommended 12 char minimum.
- Persisted to the local `.env` file only. The `.env` file is git-ignored (`server/.gitignore` line 2), so the secret does not leak into the repo.
- For production deployments, users should still set a stable `JWT_SECRET` manually so that JWTs survive restarts. This auto-gen is for dev / first-boot convenience.

## Related files

- `server/utils/boot/ensureJwtSecret.js` — the function itself.
- `server/index.js` — boot order (line ~7).
- `server/utils/http/index.js` — `makeJWT()` that consumes `JWT_SECRET`.

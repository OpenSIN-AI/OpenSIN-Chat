# `system.js` — System HTTP endpoints

Companion to `server/endpoints/system.js`.

## What it does

Defines Express routes for anything that isn't chat/workspace-specific:

- Health/utility: `GET /ping`, `GET /migrate`, `GET /env-dump`
- Onboarding: `GET /onboarding`, `POST /onboarding`
- System settings: `GET /settings`, `POST /settings`, `GET /canary`, `GET /footer-data`
- Appearance: logos, profile pictures, custom app name, welcome messages
- Multi-user: users, roles, SSO, password recovery, API keys, browser extension keys
- Maintenance: vector DB stats, backup/restore, telemetry, event logs, chat export

## Dependencies

- Imported by `server/index.js` (or the main Express router) to mount routes.
- Uses `SystemSettings`, `User`, `Telemetry`, `ApiKey`, and other models.
- Uses `validatedRequest` middleware for most admin-only endpoints.

## Important behavior

- `POST /onboarding` allows unauthenticated callers **only while onboarding is incomplete**.
  This lets single-user no-password setups finish. Once onboarding is complete, auth is required.
- `GET /env-dump` is rate-limited and only logs in production for debugging.
- Logo and profile-picture uploads use Multer and are sanitized to a fixed filename.

## Known caveats

- This file is large (~1650 lines). Future refactors should split by domain (users, appearance, onboarding, etc.).
- Several endpoints share the same catch-block error pattern (`console.error` + `sendStatus(500)`).

# systemSettings.doc.md (server/models)

## What

Central data-access layer for application-wide system settings stored in the
`system_settings` table. Exposes getters, bulk updaters, and typed helpers for
features such as onboarding, logo, telemetry, embeddings, and agent configuration.

## Dependencies

- `server/utils/prisma` — Prisma client used for all DB access.
- `server/utils/http` — URL / JSON helpers.
- `server/utils/paths` — Storage path resolution.
- `server/utils/boot/MetaGenerator` — Meta-tag generation.
- `server/utils/vectorDbProviders/pgvector` — Vector DB checks.
- `server/utils/EmbeddingEngines/native` — Native embedding model info.
- `server/utils/helpers` — LLM provider helpers.
- `server/models/telemetry` — Telemetry events (loaded lazily).

## Key settings

- `onboarding_complete` — String (`"true"` / `"false"`). Controls whether the
  first-run onboarding wizard is shown. Managed by `isOnboardingComplete()` and
  `markOnboardingComplete()`. It is a **protected field** and is never returned in
  public settings endpoints.
- `multi_user_mode` — Boolean flag for multi-tenant operation.
- `hub_api_key` — Protected API key for the skill hub.
- `publicFields` / `supportedFields` — Whitelists used by `updateSettings()` and
  `_updateSettings()` to reject unknown or unsafe keys.

## Onboarding API

- `isOnboardingComplete()` — Reads `label = "onboarding_complete"`. Returns
  `true` only when the stored value is exactly `"true"`. Any other value (missing,
  `"false"`, empty) is treated as incomplete.
- `markOnboardingComplete()` — Writes `onboarding_complete = true` via
  `_updateSettings()` and fires a telemetry event.
- `server/utils/boot/markOnboarded.js` — Boot-time patch that detects legacy
  instances and automatically marks onboarding as complete.

## Updating settings

- `updateSettings(updates)` — Validates keys against `supportedFields` before
  persisting. Use for user-facing settings forms.
- `_updateSettings(updates)` — Internal bypass that writes arbitrary keys
  without validation. Used for protected/internal values such as
  `onboarding_complete`.
- `get(clause)` — Finds the first `system_settings` row matching the clause
  (commonly `{ label: "..." }`).

## Caveats

- All persisted values are **strings** in the DB. Callers must compare against
  `"true"` / `"false"` explicitly.
- `onboarding_complete` is in `protectedFields`; it is filtered out of public
  settings responses.
- `markOnboardingComplete()` sends a telemetry event; consider privacy settings
  if telemetry is undesirable.
- Onboarding state is read at runtime; the frontend caches it on first load but
  does not poll.

# syncFallback.doc.md

## Purpose

Pure, side-effect-free utilities for the politician sync job: retry/back-off scheduling and cross-source fallback.

Docs: syncFallback.js

## What

- `SYNC_PHASES` — stable keys for every sync phase (members, abgeordnetenwatch, speeches, mandates, votes, committees).
- `RETRY_SCHEDULE_MS` / `MAX_RETRIES` — exponential back-off schedule (15 min → 1 h → 4 h → 12 h → 24 h).
- `computeBackoffMs`, `shouldRetry`, `nextRetryAt` — back-off helpers.
- `withFallback` — run a primary source and fall back to an alternative when it throws or returns empty.
- `defaultIsEmpty` — null/undefined/empty-array check.

## Why

Keeping retry/fallback logic free of DB/network access makes it unit-testable and reusable across the sync job and the status endpoint.

## API

- `SYNC_PHASES.members` — Bundestag member sync
- `SYNC_PHASES.abgeordnetenwatch` — Abgeordnetenwatch base politician sync
- `SYNC_PHASES.speeches` — Plenarprotokolle speech sync
- `SYNC_PHASES.mandates` — Abgeordnetenwatch mandate sync (Issue #255)
- `SYNC_PHASES.votes` — Abgeordnetenwatch voting-record sync (Issue #255)
- `SYNC_PHASES.committees` — Abgeordnetenwatch committee-membership sync (Issue #255)

## Caveats

- `SYNC_PHASES` values are public API; do not rename them without a major bump.
- A phase is considered empty when it returns `null`, `undefined`, or an empty array.

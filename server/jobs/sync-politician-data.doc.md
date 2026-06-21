# sync-politician-data.doc.md

## What

Bree background job that keeps the local politician database current by fetching data from the Bundestag API, Abgeordnetenwatch API, and Bundestag Plenarprotokolle.

## Why

Politician data changes over time (new members, party switches, committee assignments). The job runs unattended, falls back across sources when one is unavailable, and retries failed phases so a single outage does not abort the whole run.

## How it works

1. **Phase 1 — Bundestag members**: fetches via `BundestagApi.fetchAllMembers()` and upserts into `politicians`. Falls back to Abgeordnetenwatch base data normalized to the Bundestag shape.
2. **Phase 2 — Abgeordnetenwatch**: fetches via `AbgeordnetenwatchApi.fetchAllPoliticians()` and creates records only when not already present. Falls back to Bundestag members.
3. **Phase 3 — Plenarprotokolle speeches**: fetches the next batch of sittings via `PlenarScraper`, matches speakers to politicians, and upserts into `politician_speeches`.

Each phase runs independently and writes its own `politician_sync_log` entry. Failures are enqueued in `politician_sync_retry` with exponential back-off.

## Schedule

Every 6 hours via Bree (configured in the worker setup).

## Config values & limits

- `BUNDESTAG_WAHLPERIODE` — default `21`
- `AW_ENRICH_POLITICIANS` — default `false`; enables per-politician enrichment (one extra request per politician)
- `POLITICIAN_SYNC_SITTINGS_PER_RUN` — default `5` sittings per Phase 3 run
- `MAX_RECORD_RETRIES = 3`, `RECORD_RETRY_DELAY_MS = 500` — individual upsert retry
- Retry queue back-off: 15 min → 1 h → 4 h → 12 h → 24 h (max 5 attempts)

## Dependencies

- `server/utils/politician/bundestagApi.js` — Bundestag API client
- `server/utils/politician/abgeordnetenwatchApi.js` — Abgeordnetenwatch API client
- `server/utils/politician/plenarScraper.js` — Plenarprotokolle parser
- `server/utils/politician/syncFallback.js` — retry/fallback helpers
- `server/utils/politician/extractors.js` — shared `state`/`party`/`profileUrl` extractors

## Caveats

- Large initial syncs can take several minutes; increase the Bree timeout for first runs.
- Phase 3 only persists speeches with a speaker match confidence >= 0.5.
- The retry queue table may not exist until the Prisma migration is applied; the job degrades gracefully.

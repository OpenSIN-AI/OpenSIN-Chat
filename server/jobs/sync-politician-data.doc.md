# sync-politician-data.doc.md

## What

Bree background job that periodically syncs politician data from external APIs into the local SQLite database.

## Why

Politician data changes over time (new members, party switches, committee assignments). This job keeps the local database current without manual intervention.

## How it works

1. Fetches Bundestag members via `BundestagApi.fetchAllMembers()` (WP 21 default)
   - Falls back to Abgeordnetenwatch base data (`parliament_period=132`) if the
     Bundestag endpoints are empty/down.
2. Upserts each member into the `politicians` table.
3. Fetches Abgeordnetenwatch data via `AbgeordnetenwatchApi.fetchAllPoliticians()`
   - Falls back to Bundestag member data if AW is empty/down.
4. Creates new entries for AW politicians not already in DB (by `externalId`).
5. Fetches Plenarprotokolle speeches via `PlenarScraper.fetchProtocol()` and
   matches speakers to politicians, upserting into `politician_speeches`.
6. Logs all sync results to `politician_sync_log` and maintains the retry queue
   in `politician_sync_retry`.

## Schedule

Every 6 hours (configurable via `BackgroundWorkers`).

## Dependencies

- `server/utils/politician/bundestagApi.js` — Bundestag API client
- `server/utils/politician/abgeordnetenwatchApi.js` — Abgeordnetenwatch API client
- `server/utils/politician/plenarScraper.js` — Plenarprotokolle parser used in Phase 3

## Caveats

- Bundestag URL/Wahlperiode is parameterized via `BUNDESTAG_WAHLPERIODE` (default `21`).
- Abgeordnetenwatch uses `AW_PARLIAMENT_PERIOD=132` for the current Bundestag (~733 mandates).
- Large sync operations may take several minutes; Bree timeout should be generous.
- Enable `AW_ENRICH_POLITICIANS=true` to populate `year_of_birth`, gender, and party from the AW politician entity (slower, one extra request per politician).

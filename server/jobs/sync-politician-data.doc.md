# sync-politician-data.doc.md

## What

Bree background job that periodically syncs politician data from external APIs into the local SQLite database.

## Why

Politician data changes over time (new members, party switches, committee assignments). This job keeps the local database current without manual intervention.

## How it works

1. Fetches all Bundestag members via `BundestagApi.fetchAllMembers()`
2. Upserts each member into the `politicians` table
3. Fetches Abgeordnetenwatch data via `AbgeordnetenwatchApi.fetchAllPoliticians()`
4. Creates new entries for AW politicians not already in DB (by `externalId`)
5. Logs all sync results to `politician_sync_log`

## Schedule

Every 6 hours (configurable via `BackgroundWorkers`).

## Dependencies

- `server/utils/politician/bundestagApi.js` — Bundestag API client
- `server/utils/politician/abgeordnetenwatchApi.js` — Abgeordnetenwatch API client
- `server/utils/politician/plenarScraper.js` — Plenarprotokolle parser (available but not yet used in this job)

## Caveats

- Bundestag API URL may change between Wahlperioden (currently 20. WP hardcoded)
- Abgeordnetenwatch parliament ID 111 = Bundestag 20. WP, will change for 21. WP
- Large sync operations may take several minutes; Bree timeout should be generous

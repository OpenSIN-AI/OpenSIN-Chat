# index.doc.md (server/utils/politician)

## What

Unified `PoliticianDB` entry point for searching, retrieving, and aggregating politician data from Bundestag API, Abgeordnetenwatch API, and Plenarprotokolle.

## Dependencies

- `bundestagApi.js` — Bundestag Open Data API client
- `abgeordnetenwatchApi.js` — Abgeordnetenwatch API client
- `plenarScraper.js` — Bundestag Plenarprotokolle XML parser
- `vectorStore.js` — PGVector semantic search for speeches
- `../prisma` — database access

## Public API

- `searchPoliticians(query, filters)` — search by name/party/state/faction/source
- `getPolitician(id)` — full profile with mandates and committee memberships
- `getVotingRecord(id, options)` — stored voting record
- `getSpeeches(id, options)` — plenary speeches with optional source filter
- `getMandates(id)` — mandate history
- `fetchLiveVotes(id)` — live Abgeordnetenwatch voting record
- `semanticSearchSpeeches(query, filters)` — vector similarity search
- `getParties()` / `getStates()` — distinct filter values
- `getSources()` — data source counts
- `getSyncStatus()` — last sync run and per-source health
- `getRetryQueue()` — pending retry queue entries
- `count()` — total politician count

## Config values & limits

- `searchPoliticians` returns up to 50 rows.
- `getVotingRecord` and `getSpeeches` default to 50 rows, max 200 via the endpoint.
- `semanticSearchSpeeches` uses `similarityThreshold: 0.25`.

## Why

The module hides the complexity of merging multiple external sources and provides a single database-backed interface for the REST API and agents.

## Caveats

- `semanticSearchSpeeches` requires a configured vector DB (PGVector); it is not available with SQLite.
- `externalId` is the primary cross-reference between Bundestag and Abgeordnetenwatch records.
- All methods return empty arrays or `null` on failure rather than throwing, so callers must handle missing data gracefully.

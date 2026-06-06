# index.doc.md (server/utils/politician)

## What

Unified entry point for the Politician Database module. Aggregates data from Bundestag API, Abgeordnetenwatch API, and Plenarprotokolle.

## Dependencies

- `bundestagApi.js` — Bundestag Open Data API client
- `abgeordnetenwatchApi.js` — Abgeordnetenwatch API client
- `plenarScraper.js` — Plenarprotokolle XML parser
- `vectorStore.js` — PGVector semantic search for speeches
- `../../models/prisma` — Database access

## Public API

- `searchPoliticians(query, filters)` — search by name/party/state
- `getPolitician(id)` — full profile with mandates + committees
- `getVotingRecord(id)` — Abgeordnetenwatch voting history
- `getSpeeches(id)` — plenary protocol speeches
- `getMandates(id)` — mandate history
- `semanticSearchSpeeches(query)` — vector similarity search over speeches
- `fetchLiveVotes(id)` — live Abgeordnetenwatch votes
- `getParties()` / `getStates()` — distinct values for filters

## Caveats

- `semanticSearchSpeeches` requires a configured vector DB (PGVector), not available with SQLite
- `externalId` is the primary cross-reference between Bundestag and Abgeordnetenwatch data

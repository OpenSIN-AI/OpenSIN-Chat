# index.doc.md (server/endpoints/api/politician)

## What

REST API endpoints for politician search, profiles, voting records, speeches, mandates, database stats, sync status, and manual sync trigger.

## Endpoints

All require `Authorization: Bearer <api-key>` header.

- `GET /api/politician/search?q=&party=&state=&faction=&source=` — search politicians
- `GET /api/politician/speech-search?q=&party=&topN=&source=` — semantic search over speeches
- `GET /api/politician/parties` — distinct parties
- `GET /api/politician/states` — distinct states
- `GET /api/politician/stats` — politician, speech, and vote counts
- `GET /api/politician/sources` — available data sources with counts
- `GET /api/politician/sync/status` — last sync run, per-source status, and retry queue
- `POST /api/politician/sync/trigger` — spawn the sync job detached and return 202
- `GET /api/politician/:id` — full profile
- `GET /api/politician/:id/votes?limit=&offset=` — voting record
- `GET /api/politician/:id/speeches?limit=&offset=&source=` — speeches
- `GET /api/politician/:id/mandates` — mandate history
- `POST /api/politician/:id/add-to-workspace` — embed politician profile + speeches as a document in the current workspace (body: `{ workspaceSlug }`). Idempotent: any existing document with `chunkSource: politician-<id>` is replaced so repeated clicks do not create duplicates.

## Config values & limits

- `MAX_LIMIT = 200` — maximum pagination limit for votes and speeches
- `MAX_TOP_N = 100` — maximum semantic search results

## Dependencies

- `server/utils/politician/index.js` — `PoliticianDB` (loaded lazily per request)

## Why

`PoliticianDB` is instantiated per-request via lazy `require` to avoid loading the Prisma/jsonwebtoken chain at module startup time.

## Caveats

- The manual sync endpoint spawns `node server/jobs/sync-politician-data.js` detached; it does not wait for completion.
- The sync trigger endpoint returns 202 immediately; actual success depends on the spawned job.
- Semantic search requires a configured PGVector vector store.

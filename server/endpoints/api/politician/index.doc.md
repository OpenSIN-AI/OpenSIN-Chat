# index.doc.md (server/endpoints/api/politician)

## What

REST API endpoints for politician search, detail, votes, speeches, and mandates.

## Endpoints

All require `Authorization: Bearer <api-key>` header.

- `GET /api/politician/search?q=&party=&state=&faction=` — search
- `GET /api/politician/speech-search?q=&party=&topN=` — semantic search
- `GET /api/politician/parties` — distinct parties
- `GET /api/politician/states` — distinct states
- `GET /api/politician/stats` — DB stats + vector stats
- `GET /api/politician/:id` — full profile
- `GET /api/politician/:id/votes?limit=&offset=` — voting record
- `GET /api/politician/:id/speeches?limit=&offset=` — speeches
- `GET /api/politician/:id/mandates` — mandate history

## Dependencies

- `server/utils/politician/index.js` — PoliticianDB (loaded lazily to avoid SlowBuffer import chain)

## Caveats

- PoliticianDB is instantiated per-request (lazy require) to avoid top-level import of prisma → jsonwebtoken → SlowBuffer

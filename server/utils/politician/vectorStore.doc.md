# vectorStore.doc.md

## What

Vector store operations for politician speeches. Uses the existing PGVector provider for semantic search.

## Dependencies

- `server/utils/vectorDbProviders/pgvector.js` — PGVector provider
- `server/utils/politician/embedder.js` — PoliticianEmbedder
- Namespace: `opensin_politician_speeches`

## API

- `indexSpeech({speechId, politicianId, politicianName, party, text, date, title})` — index speech chunks
- `searchSpeeches({query, topN, similarityThreshold, politicianId, party})` — semantic search
- `deleteSpeech(speechId)` — remove vectors for a speech
- `stats()` — namespace existence + vector count

## Caveats

- **Requires PostgreSQL + pgvector extension** — not available with SQLite storage
- When SQLite is the DB provider, `searchSpeeches` will throw; the `PoliticianDB.semanticSearchSpeeches` catches this gracefully and returns []
- Post-search filtering by `politicianId` or `party` is done in JS (PGVector doesn't support metadata-filtered search)

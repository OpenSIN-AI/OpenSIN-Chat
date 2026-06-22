# politician.doc.md (server/models)

## What

Thin data-access wrapper around Prisma queries for politician-related tables. Follows existing OpenSIN model patterns (e.g. vectors.js).

## Dependencies

- `server/utils/prisma` — Prisma client

## API

- `Politician`
  - `massUpsert(politicians)` — bulk upsert by `externalId` + source
  - `get(clause)` — find first match
  - `where(clause, limit)` — flexible query
  - `count(clause)` — total politician count
- `PoliticianVote`
  - `bulkInsert(votes)` — batch insert (non-idempotent)
  - `bulkUpsert(votes)` — batch upsert by stable `aw-vote-<id>` keys (Issue #255)
  - `where(clause, limit)` — flexible query
- `PoliticianSpeech`
  - `bulkInsert(speeches)` — batch insert
  - `markVectorized(speechId)` — vector index tracking
  - `whereNotVectorized(limit)` — pending semantic-index rows
  - `where(clause, limit)` — flexible query
- `PoliticianMandate`
  - `bulkUpsert(mandates)` — batch upsert by stable `aw-mandate-<id>` keys
  - `where(clause, limit)` — flexible query
- `PoliticianCommittee` (Issue #255)
  - `bulkUpsert(committees)` — batch upsert by stable `aw-committee-<id>` keys
- `PoliticianCommitteeMembership` (Issue #255)
  - `bulkUpsert(memberships)` — batch upsert by stable `aw-cm-<id>` keys

## Caveats

- `massUpsert` and `bulkInsert` use `prisma.$transaction` for batch operations.
- `bulkUpsert` helpers assume upstream IDs are prefixed (`aw-*`) to stay stable across runs.
- Follows the same pattern as other OpenSIN models (static object with methods, not a class).

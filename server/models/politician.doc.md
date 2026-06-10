# politician.doc.md (server/models)

## What

Thin data-access wrapper around Prisma queries for politician-related tables. Follows existing OpenSIN model patterns (e.g. vectors.js).

## Dependencies

- `server/utils/prisma` — Prisma client

## API

- `massInsert(politicians)` — bulk upsert by externalId + source
- `get(params)` — find by id, externalId, or where clause
- `where(clause)` — flexible query
- `count()` — total politician count

## Caveats

- `massInsert` uses `prisma.$transaction` for batch operations
- Follows the same pattern as other OpenSIN models (static object with methods, not a class)

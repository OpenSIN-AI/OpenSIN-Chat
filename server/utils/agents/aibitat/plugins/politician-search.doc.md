# politician-search.doc.md

## What

Aibitat agent plugin that exposes politician search, detail lookup, voting records, and speech search as AI agent functions.

## Functions

- `search_politician(query, party, state)` — search politician database
- `get_politician(politicianId)` — full profile with mandates + committees
- `get_politician_votes(politicianId, limit)` — voting record
- `get_politician_speeches(politicianId, limit)` — plenary speeches (500-char excerpt)
- `search_politician_speeches(query, party, topN)` — semantic speech search
- `list_politician_parties()` — available party filters

## Dependencies

- `server/utils/politician/index.js` — PoliticianDB class

## Caveats

- `search_politician_speeches` requires vector DB (not available with SQLite storage)
- Speech text is truncated to 500 chars in `get_politician_speeches` to avoid token overflow

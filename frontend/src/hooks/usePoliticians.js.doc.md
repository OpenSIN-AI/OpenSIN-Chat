# usePoliticians.js

## Purpose

React hook for searching and filtering the local politician database via the
`/api/politician/search` endpoint.

## Returns

- `politicians` — array of politician records mapped to the sidebar shape.
- `loading` — SWR loading state.
- `error` — network or body-level error string.
- `refresh` — SWR mutate function to re-fetch.
- `filters` — current filter state and setters:
  - `query` / `setQuery` — name search.
  - `party` / `setParty` — party filter (default: `"AfD"`).
  - `state` / `setState` — state filter.

## Default behavior

Defaults to `party=AfD` so the panel is immediately useful for the primary
target audience. Users can clear the filter to see all parties.

## Notes

The legacy `/utils/bundestag/politicians` endpoint was replaced with the richer
`/api/politician/search` endpoint which supports free-text search, party, and
state filters.

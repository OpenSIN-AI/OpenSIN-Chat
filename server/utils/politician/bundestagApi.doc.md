# bundestagApi.doc.md

## What

Client for Bundestag Open Data. Fetches politician (MdB) data for the current
electoral term with caching, retry, and rate-limiting.

## Dependencies

- None external (uses native `fetch`)

## API

- `fetchAllMembers()` — fetch all members for the configured Wahlperiode
- `searchMembers(query)` — search by name
- `getMember(externalId)` — single member lookup
- `fetchFullBio(profileUrl)` — HTML biography page
- `clearCache()` — reset in-memory cache

## Source strategy (21. WP, #84)

`fetchAllMembers()` tries the following in order, returning the first non-empty
result:

1. **`Abgeordnete{WP}_WP.formular`** — official term endpoint (WP from
   `BUNDESTAG_WAHLPERIODE`, default `21`). Currently dead (HTTP 404).
2. **DIP API** (`search.dip.bundestag.de/api/v1/person?f.wahlperiode={WP}`) —
   used only when `BUNDESTAG_DIP_API_KEY` is configured. Cursor-paginated.
3. **`[]`** — when no Bundestag source yields data, the sync job's cross-source
   fallback uses Abgeordnetenwatch (`parliament_period=132`, 733 Mandate),
   keyed by the official `ext_id_bundestagsverwaltung`.

## Caveats

- The `.formular` endpoint is not currently published for WP 20 or 21; AW is the
  authoritative source for 21. WP member data.
- Cache TTL: 6 hours
- Rate limit: 500ms between requests

## Config

- `BUNDESTAG_WAHLPERIODE` (default `21`) — current electoral term.
- `BUNDESTAG_DIP_API_KEY` (optional) — enables the DIP API fallback.

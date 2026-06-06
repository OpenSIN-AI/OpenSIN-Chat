# bundestagApi.doc.md

## What

Client for the Bundestag Open Data API. Fetches politician (MDB) data with caching, retry, and rate-limiting.

## Dependencies

- None external (uses native `fetch`)

## API

- `fetchAllMembers()` — fetch all Bundestag members for current electoral term
- `searchMembers(query)` — search by name
- `getMember(externalId)` — single member lookup
- `fetchFullBio(profileUrl)` — HTML biography page
- `clearCache()` — reset in-memory cache

## Caveats

- API URL is hardcoded for 20. WP (`/Abgeordnete20_WP.formular`)
- Cache TTL: 6 hours
- Rate limit: 500ms between requests
- The Bundestag API format is not well-documented; field names may change between WPs

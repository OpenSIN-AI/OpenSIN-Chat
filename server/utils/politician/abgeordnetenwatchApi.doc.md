# abgeordnetenwatchApi.doc.md

## What

Client for the Abgeordnetenwatch.de API v2. Fetches voting records, mandates, and politician profiles.

## API

- `fetchAllPoliticians()` — all Bundestag 20. WP politicians
- `searchPoliticians(query)` — name search
- `getPolitician(id)` — single politician by AW ID
- `getVotingRecord(politicianId)` — paginated votes
- `getCommittees(politicianId)` — committee memberships
- `getMandates(politicianId)` — mandate history
- `fetchAllVotes()` — all votes (paginated)
- `getVoteDetail(voteId)` — single vote with full details

## Caveats

- Parliament ID 111 = Bundestag 20. WP; will change for 21. WP
- Pagination uses `meta.next` link from API response
- Cache TTL: 6 hours
- Rate limit: 500ms between requests

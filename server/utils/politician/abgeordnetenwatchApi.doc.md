# abgeordnetenwatchApi.doc.md

## What

Client for the Abgeordnetenwatch.de API v2 (v2.9.0). Fetches voting records,
mandates, and politician profiles for the **21. Wahlperiode** (Bundestag
2021–2025, `parliament_period=132`, ~733 Mandate).

## API

- `fetchAllPoliticians({ enrich })` — all current-period politicians, resolved
  from the `candidacies-mandates` collection (one record per politician). Pass
  `enrich: true` to also fetch each politician entity for `year_of_birth`,
  `gender`, `party`, and `ext_id_bundestagsverwaltung` (one extra request each).
- `fetchPoliticianDetails(id)` — normalized politician entity with the verified
  new fields.
- `searchPoliticians(query)` — name search
- `getPolitician(id)` — single politician by AW ID
- `getVotingRecord(politicianId)` — paginated votes per politician (legacy)
- `getCommittees(politicianId)` — committee memberships (legacy)
- `getMandates(politicianId)` — mandate history per politician
- `fetchAllMandates()` — all candidacy/mandate records for the parliament period (Issue #255)
- `getVotesByMandate(mandateId)` — votes for a single mandate (Issue #255)
- `fetchAllVotes()` — all votes for the parliament period (paginated)
- `getVoteDetail(voteId)` — single vote with full details
- `fetchAllCommittees()` — all committees for the parliament period (Issue #255)
- `getCommitteeMembershipsByCommittee(committeeId)` — committee memberships for a committee (Issue #255)

## Verified fields (21. WP, #84)

| AW field | Notes |
|----------|-------|
| `first_name` | replaces parsing from a combined name |
| `last_name` | |
| `year_of_birth` | **replaces `birthDate`** (only year is exposed) |
| `ext_id_bundestagsverwaltung` | official mdbID, cross-source join key |

## Caveats

- The 20. WP parliament filter (parliament ID 111) is dead — the client uses
  `parliament_period=${AW_PARLIAMENT_PERIOD}` (default `132`).
- Pagination is **range-based** via `meta.result` (`range_start` / `range_end` /
  `total`), not a `meta.next` link.
- `year_of_birth` is mapped to the existing `birthDate` column as `YYYY-01-01`.
- Cache TTL: 6 hours
- Rate limit: 500ms between requests

## Config

- `AW_PARLIAMENT_PERIOD` (default `132`) — current Bundestag parliament period.

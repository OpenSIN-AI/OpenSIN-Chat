# sync-politician-data.js

## Purpose

Scheduled job that synchronizes the local politician database from upstream
sources (Bundestag API and Abgeordnetenwatch API) and politician speeches
from Plenarprotokolle.

## Phases

1. **Bundestag members** (`syncBundestagMembers`) — fetches current Bundestag
   members and upserts them into `politicians`. Falls back to Abgeordnetenwatch
   if the Bundestag API is unavailable.
2. **Abgeordnetenwatch politicians** (`syncAbgeordnetenwatch`) — creates any
   politician records that do not yet exist.
3. **Plenarprotokolle speeches** (`syncBundestagSpeeches`) — fetches speeches
   from the DIP API and indexes them into the vector store.
4. **Abgeordnetenwatch mandates** (`syncMandates`) — fetches all
   `candidacies-mandates` for the period and upserts into `politician_mandates`
   (Issue #255).
5. **Abgeordnetenwatch votes** (`syncVotes`) — fetches votes per mandate and
   upserts into `politician_votes` (Issue #255).
6. **Abgeordnetenwatch committees** (`syncCommittees`) — fetches committees and
   memberships and upserts into `politician_committees` +
   `politician_committee_memberships` (Issue #255).

## Recent changes

- State (Bundesland) is now extracted from the Abgeordnetenwatch raw mandate
  JSON: preferring the `Landesliste <state>` label, falling back to the
  official Wahlkreis number → state mapping.
- The public Abgeordnetenwatch profile URL is now stored in `profileUrl`
  instead of the API URL.
- Existing records can be repaired with `server/jobs/backfill-politician-state.js`.

## Environment variables

- `BUNDESTAG_DIP_API_KEY` — API key for the Bundestag DIP API.
- `AW_ENRICH_POLITICIANS` — when `true`, fetches detailed politician entities
  from Abgeordnetenwatch.
- `PARLIAMENT_PERIOD` — Abgeordnetenwatch parliament period (default: 132).

## Usage

```bash
node server/jobs/sync-politician-data.js
```

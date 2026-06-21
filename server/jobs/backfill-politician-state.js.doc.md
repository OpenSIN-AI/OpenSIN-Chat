# backfill-politician-state.js

## Purpose

One-time repair script for the `politicians` table. Extracts two pieces of
information that the Abgeordnetenwatch sync historically failed to store:

1. The human-readable Abgeordnetenwatch profile URL (`profileUrl`).
2. The German state (Bundesland) derived from the raw mandate JSON.

## When to run

- After deploying the sync fix in `server/jobs/sync-politician-data.js` to
  repair existing records.
- Safe to run repeatedly: it only updates rows where the extracted value
  differs from the current value.

## Usage

```bash
node server/jobs/backfill-politician-state.js
node server/jobs/backfill-politician-state.js --dry-run
node server/jobs/backfill-politician-state.js --limit=100
node server/jobs/backfill-politician-state.js --no-aw  # skip Abgeordnetenwatch cross-reference
```

## Algorithm

1. Load all current Abgeordnetenwatch politicians into a lookup table keyed by
   normalized `fullName|party`. This is used to cross-reference Bundestag (DIP)
   records, which do not carry state or a public profile URL.
2. Iterate over all `politicians` rows in batches of 100.
3. For `abgeordnetenwatch` records:
   - Parse the top-level `rawData` JSON (normalized Abgeordnetenwatch object).
   - Extract the original candidacy-mandate JSON from `normalized.rawData`.
   - Derive `state`:
     - Prefer the `Landesliste <state>` label from `electoral_data.electoral_list.label`.
     - Fall back to the official 2021 Wahlkreis number → state mapping from
       `electoral_data.constituency.label`.
   - Extract `profileUrl` from `politician.abgeordnetenwatch_url`.
4. For `bundestag` records:
   - Find the matching Abgeordnetenwatch record by `fullName|party`.
   - Extract `state` and `profileUrl` from the matched Abgeordnetenwatch raw
     mandate using the same logic.
5. Update the row only if a value changed.

## State mapping source

The constituency-number-to-state mapping follows the official
Bundeswahlleiterin 2021 Wahlkreiseinteilung (Schleswig-Holstein 1–11,
Mecklenburg-Vorpommern 12–17, Hamburg 18–23, Niedersachsen 24–53, etc.).

## Output

Prints progress and a final summary: processed, updated, failed counts.

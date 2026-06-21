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
```

## Algorithm

1. Iterate over all `politicians` rows in batches of 100.
2. Parse the top-level `rawData` JSON (normalized Abgeordnetenwatch object).
3. Extract the original candidacy-mandate JSON from `normalized.rawData`.
4. Derive `state`:
   - Prefer the `Landesliste <state>` label from `electoral_data.electoral_list.label`.
   - Fall back to the official 2021 Wahlkreis number → state mapping from
     `electoral_data.constituency.label`.
5. Extract `profileUrl` from `politician.abgeordnetenwatch_url`.
6. Update the row only if a value changed and the source is `abgeordnetenwatch`.

## State mapping source

The constituency-number-to-state mapping follows the official
Bundeswahlleiterin 2021 Wahlkreiseinteilung (Schleswig-Holstein 1–11,
Mecklenburg-Vorpommern 12–17, Hamburg 18–23, Niedersachsen 24–53, etc.).

## Output

Prints progress and a final summary: processed, updated, failed counts.

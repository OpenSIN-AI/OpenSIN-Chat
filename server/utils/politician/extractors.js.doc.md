<!-- SPDX-License-Identifier: MIT -->

# `extractors.js` — Companion

## Purpose

Shared, dependency-free helpers that parse raw Abgeordnetenwatch and Bundestag
(DIP) records to derive `state`, `party`, and `profileUrl`. Used by both the
ongoing `sync-politician-data` job and the one-time
`backfill-politician-state.js` repair script.

## Public API

| Function | Source | Returns |
|---|---|---|
| `constituencyNumberToState(number)` | — | German state for a 2021 Wahlkreis number |
| `extractStateFromAwRawData(rawData)` | Abgeordnetenwatch | `state` from `electoral_data` |
| `extractProfileUrlFromAwRawData(rawData)` | Abgeordnetenwatch | Public profile URL |
| `extractStateFromBundestagRawData(rawData)` | Bundestag DIP | `state` from `person_roles[].bundesland` |
| `extractPartyFromBundestagRawData(rawData)` | Bundestag DIP | `party` from `person_roles[].fraktion` |

## Rules

- All functions are pure and dependency-free (no Prisma, no HTTP).
- Inputs may be JSON strings or already-parsed objects.
- Return `null` on any parse error or missing field.
- The 2021 Wahlkreis number → state mapping is the official
  Bundeswahlleiterin ranges and must only change if Germany redraws districts.

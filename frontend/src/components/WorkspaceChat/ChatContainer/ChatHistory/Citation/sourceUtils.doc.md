<!-- SPDX-License-Identifier: MIT -->

# Citation Source Utilities

## Purpose

Normalize raw chat citation source payloads into stable UI models before they
reach React components.

## Docs

- `combineLikeSources` accepts both legacy top-level citation fields and
  already grouped `chunks` arrays. It groups by display title plus the primary
  `chunkSource`, so unrelated URLs with the same page title stay separate.
- `parseChunkSource` maps known connector URI schemes such as `link://`,
  `github://`, and `gmail-thread://` to a display URL and icon key. It also
  tolerates older payloads that only carry a top-level `chunkSource`.
- Unknown or malformed sources intentionally degrade to the generic file icon
  instead of logging noisy warnings during chat rendering.

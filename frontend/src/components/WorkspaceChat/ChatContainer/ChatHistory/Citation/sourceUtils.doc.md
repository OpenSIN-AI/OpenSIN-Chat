<!-- SPDX-License-Identifier: MIT -->

# Citation Source Utilities

## Purpose

Normalize raw chat citation source payloads into stable UI models before they
reach React components.

## Docs

- `combineLikeSources` groups repeated chunks by display title and preserves
  per-chunk text, score, ID, and `chunkSource`.
- `parseChunkSource` maps known connector URI schemes such as `link://`,
  `github://`, and `gmail-thread://` to a display URL and icon key.
- Unknown or malformed sources intentionally degrade to the generic file icon
  instead of logging noisy warnings during chat rendering.

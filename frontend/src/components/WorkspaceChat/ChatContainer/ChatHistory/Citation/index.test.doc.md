<!-- SPDX-License-Identifier: MIT -->

# Chat Citation Tests

## Purpose

Protect the citation UI against regressions in source grouping, source parsing,
modal rendering, and privacy-sensitive icon behavior.

## Docs

- Covers legacy top-level citation payloads and already grouped `chunks`
  payloads because both shapes can appear in persisted chats and agent events.
- Ensures same-title sources with different `chunkSource` values are not merged
  into one misleading citation.
- Ensures generic web citations render with local icons only, avoiding hidden
  third-party favicon requests.

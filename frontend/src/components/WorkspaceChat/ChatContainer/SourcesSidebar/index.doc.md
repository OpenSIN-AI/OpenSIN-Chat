<!-- SPDX-License-Identifier: MIT -->

# Sources Sidebar

## Purpose

Render the right-sidebar source list for chat citations, falling back to
workspace documents only when a chat has no citation payload.

## Docs

- Chat citations are normalized with `combineLikeSources` before rendering so
  repeated chunks appear as one source with a reference count.
- Active source filters are applied only within the current mode. A chat with
  citations never falls through to workspace documents just because a filter has
  zero matching citations.
- Workspace document cards use snippets and metadata as secondary context, while
  chat citation details open the shared citation detail modal.

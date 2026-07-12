<!-- SPDX-License-Identifier: MIT -->

# Chat Sidebar Context

## Purpose

Own the right-sidebar panel state used by workspace chat: active panel,
associated panel data, source filters, preview state, and persistent console
logs.

## Docs

- `ChatSidebarProvider` coordinates opening, closing, and toggling right-side
  panels without forcing unrelated consumers to own this state.
- `useSourcesSidebar`, `usePreviewSidebar`, and related hooks expose focused
  panel APIs while sharing the same underlying context.
- Source classifier helpers treat local chunk sources without a URI scheme as
  documents, while web and media schemes stay out of the document filter.

<!-- SPDX-License-Identifier: MIT -->

# Sources Sidebar Tests

## Purpose

Protect the sidebar source-mode logic from mixing chat citations with workspace
documents under filtered views.

## Docs

- Tests mock the sidebar context and network snippet fetch so rendering stays
  isolated from the full workspace shell.
- Regression coverage verifies that empty filtered chat results show the
  no-sources message instead of switching to workspace documents.
- Grouped citations are filtered against every chunk, not only the first one.

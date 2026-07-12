<!-- SPDX-License-Identifier: MIT -->

# Chat Sidebar Context Tests

## Purpose

Verify the right-sidebar context hooks, preview state, console log buffering,
and source classification helpers.

## Docs

- Tests render the provider through React Testing Library hooks so state updates
  exercise the same context path as the app.
- Source classifier coverage protects local document citations from disappearing
  under the document filter.

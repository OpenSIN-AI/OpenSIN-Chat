<!-- SPDX-License-Identifier: MIT -->

# Chat Citations

## Purpose

Render the compact sources button and source-detail modal for grounded chat
answers.

## Docs

- Source parsing and grouping live in `sourceUtils.ts`; this component should
  stay focused on layout, icon rendering, and sidebar/modal interaction.
- The button opens the shared sources sidebar with the original source payload
  so downstream views continue to receive the same data shape from the server.
- The detail modal sanitizes chunk text before rendering and strips embedded
  `<document_metadata>` headers from displayed snippets.

# Chat history

## Purpose

Virtualizes the active conversation and keeps streamed messages visible in a centred reading column.

## Design notes

- A compact estimated row height prevents one-line messages from creating artificial gaps.
- The message column is intentionally narrower than the workspace so longer responses remain easy to scan.
- Bottom padding reserves space for the persistent prompt composer.

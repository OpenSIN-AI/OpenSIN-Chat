# Applications

This directory contains deployable product applications only.

- `web` — browser client
- `api` — application API and persistence
- `worker` — document-processing worker

Each application owns its package manifest, source, unit tests and application-specific configuration. Shared contracts belong in `packages/`; deployment configuration belongs in `platform/`.

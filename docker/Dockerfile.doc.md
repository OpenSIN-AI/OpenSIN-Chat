<!-- SPDX-License-Identifier: MIT -->

# Purpose

Multi-stage Dockerfile for the OpenSIN-Chat monorepo. Builds the frontend,
server, and collector into a single production image. The frontend build
stage copies the repository's `docs/` folder so the `sync:docs` prebuild hook
can keep the in-app documentation (`/docs`) in sync with the canonical
`docs/*.md` source files.

# Docs:

- `docker-compose.yml` — local development compose stack
- `docker-compose.production.yml` — OCI VM production override
- `docs/OPENSIN-CHAT-DEPLOYMENT.md` — full deployment guide
- `frontend/scripts/sync-docs.js` — curated docs sync logic

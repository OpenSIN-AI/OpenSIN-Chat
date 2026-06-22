<!-- SPDX-License-Identifier: MIT -->

# Purpose

Docker Compose stack for the OpenSIN-Chat standalone deployment. Defaults to
local Mac/OrbStack development settings (port 43939, container `opensin-chat`).
Production overrides live in `docker-compose.production.yml` (port 38471,
container `opensin-app`).

# Docs:

- `docs/OPENSIN-CHAT-DEPLOYMENT.md` — full deployment guide
- `docs/AUTO-DEPLOY.md` — local auto-deploy polling cron
- `docker-compose.production.yml` — OCI VM production override

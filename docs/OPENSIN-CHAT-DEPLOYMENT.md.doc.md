<!-- SPDX-License-Identifier: MIT -->

# Purpose

Authoritative deployment guide for `sinchat.delqhi.com`. Covers both the local
Mac development stack (port 43939) and the production OCI VM `sin-supabase`
(port 38471, container `opensin-app`, Cloudflare tunnel connector on the VM).

# Docs:

- `scripts/deploy-production.sh` — one-shot production deploy script
- `docker-opensin/docker-compose.yml` — base Compose stack
- `docker-opensin/docker-compose.production.yml` — production override
- `docs/AUTO-DEPLOY.md` — auto-deploy polling cron (legacy Mac; production equivalent TBD)

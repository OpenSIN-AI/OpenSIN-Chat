<!-- SPDX-License-Identifier: MIT -->

# Purpose

Production Compose override for the OCI VM (`sin-supabase`). Applies the
production port (38471), container name (`opensin-app`), and higher resource
limits on top of the base `docker-compose.yml`.

# Docs:

- `docker-compose.yml` — base stack
- `scripts/deploy-production.sh` — one-shot production deploy script
- `docs/OPENSIN-CHAT-DEPLOYMENT.md` — full deployment guide

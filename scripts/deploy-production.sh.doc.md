<!-- SPDX-License-Identifier: MIT -->

# Purpose

One-shot production deployment script for the OCI VM (`sin-supabase`). It pulls
the latest `main` branch, builds a fresh Docker image (`--no-cache` to avoid
stale frontend bundles), and restarts the production container. The script is
meant to be run by the operator on the VM, not by the agent environment.

# Usage

```bash
ssh sin-supabase 'bash -s' < scripts/deploy-production.sh
```

# Docs:

- `docs/OPENSIN-CHAT-DEPLOYMENT.md` — full deployment guide
- `docker-opensin/docker-compose.production.yml` — production override

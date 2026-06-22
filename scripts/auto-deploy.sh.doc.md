<!-- SPDX-License-Identifier: MIT -->

# Purpose

Local polling auto-deploy script for OpenSIN-Chat on the Mac. It checks
`origin/main` every few minutes, and if new commits exist, rebuilds the Docker
image with `--no-cache` (to avoid stale frontend bundles) and restarts the
container. Includes a rollback path if the health check fails.

# Docs:

- `docs/AUTO-DEPLOY.md` — setup guide (cron / launchd)
- `docker-opensin/docker-compose.yml` — stack used by this script

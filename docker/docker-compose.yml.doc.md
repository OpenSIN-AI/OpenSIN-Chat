# `docker-compose.yml` — OpenSIN Chat runtime

Companion to `docker/docker-compose.yml`.

## What it does

Defines the production Docker stack for OpenSIN Chat:

- `opensin-chat` — the main application container (image `opensin-app:v*`).
- `vane` — the cited answer-engine sidecar (`itzcrazykns1337/vane:latest`).

Both services share a bridge network so the app can reach Vane at `http://vane:8300`.

## Networking & ports

| Host | Container | Service | Reason |
|------|-----------|---------|--------|
| 38471 | 3001 | opensin-chat | Rare high port avoids conflict with legacy deployments on host port 3001 |
| 8310 | 8300 | vane | Avoids clashing with default 3000 and keeps ports isolated |

## Volumes

- `../server/storage` → `/app/server/storage` (persistent data)
- `../collector/hotdir/` and `../collector/outputs/` (document ingestion)
- `./.env` → `/app/server/.env` (configuration)
- `vane-data` volume (Vane configuration + data)

## Important notes

- The `opensin-chat` service specifies both `image` (deployed tag) and `build` (for local development). For deployment, use `docker compose up -d --no-build` to run the pre-built image.
- `STORAGE_DIR` is set explicitly to `/app/server/storage` to match the mounted volume.
- `extra_hosts` maps `host.docker.internal` for host-network access if needed.

## Typical commands

```bash
# Build image locally
docker compose -f docker/docker-compose.yml build

# Deploy pre-built image
docker compose -f docker/docker-compose.yml up -d --no-build

# View logs
docker compose -f docker/docker-compose.yml logs -f opensin-chat
```

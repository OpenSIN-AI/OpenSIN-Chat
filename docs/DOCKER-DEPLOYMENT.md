# OpenAfD Chat — Docker Deployment Guide

> **Purpose:** Production-ready Docker deployment for OpenAfD Chat with all known issues, health-checks, and the politician-DB sync pre-flight documented.
>
> **Docs:** `DOCKER-DEPLOYMENT.doc.md` (this file)
> **Related:** `docker/HOW_TO_USE_DOCKER.md`, `docs/architecture.md`, `docs/DATA-SOURCES.md`

---

## Overview

This guide covers:

1. **Pre-flight:** Disk, RAM, and architecture requirements
2. **Quick start:** `docker run` (single-container, no compose)
3. **docker-compose:** Multi-container with persistent storage
4. **Build from source:** Custom image with current `main` branch
5. **Health checks:** Verifying the container is fully running (server + collector)
6. **Politician DB sync:** Pre-flight for the 21. Wahlperiode
7. **Common pitfalls:** STORAGE_DIR, /api/ping vs /ping, .env file vs directory
8. **Troubleshooting:** Logs, port conflicts, permission issues
9. **Rollback strategy:** How to revert to a previous image

---

## 1. Pre-flight

### Hardware
- **RAM:** 2 GB minimum, 4 GB recommended (LLM-embedding engine loads models on startup)
- **Disk:** 10 GB minimum (storage grows with documents/vectors/embeddings)
- **CPU:** arm64 or amd64 supported (multi-arch images built)

### Software
- **Docker Engine 20.10+** (Linux) or **Docker Desktop 4.0+** (Mac/Win)
  - macOS: Prefer **OrbStack** over Docker Desktop (less resource-heavy)
  - Required feature: `host.docker.internal` resolution
- **Optional:** `docker-compose` v2 (bundled with Docker Desktop)

### LLM Backend
- Either local (Ollama, LMStudio, LocalAI) on host
- Or cloud API keys (OpenAI, Anthropic, Gemini, etc.)
- See `docker/.env.example` for full list of providers

---

## 2. Quick start: `docker run`

Simplest deployment — single container, storage in a bind mount.

```bash
# 1. Create storage directory on host
export STORAGE_LOCATION=$HOME/openafd
mkdir -p $STORAGE_LOCATION

# 2. Generate encryption keys (REQUIRED)
# SIG_KEY: 64 hex chars (32 bytes)
# SIG_SALT: 32 hex chars (16 bytes)
export SIG_KEY=$(openssl rand -hex 32)
export SIG_SALT=$(openssl rand -hex 16)

# 3. Create .env file in storage dir
cat > $STORAGE_LOCATION/.env <<EOF
SIG_KEY='${SIG_KEY}'
SIG_SALT='${SIG_SALT}'
STORAGE_DIR="/app/server/storage"
SERVER_PORT=3001
DISABLE_TELEMETRY=true
ANYTHING_LLM_RUNTIME=docker
EOF

# 4. Run container
docker run -d --name openafd \
  -p 3001:3001 \
  --cap-add SYS_ADMIN \
  -v $STORAGE_LOCATION:/app/server/storage \
  -v $STORAGE_LOCATION/.env:/app/server/.env \
  -e STORAGE_DIR=/app/server/storage \
  -e SIG_KEY=${SIG_KEY} \
  -e SIG_SALT=${SIG_SALT} \
  openafd/openafd:latest

# 5. Verify
sleep 30
docker ps  # Status: healthy
curl http://localhost:3001/ping  # {"online":true}
```

### Windows (PowerShell)

```powershell
$env:STORAGE_LOCATION="$env:USERPROFILE\openafd"
New-Item -ItemType Directory -Path $env:STORAGE_LOCATION -Force

$env:SIG_KEY = -join ((1..64) | ForEach-Object { '{0:x}' -f (Get-Random -Max 16) })
$env:SIG_SALT = -join ((1..32) | ForEach-Object { '{0:x}' -f (Get-Random -Max 16) })

@"
SIG_KEY='$env:SIG_KEY'
SIG_SALT='$env:SIG_SALT'
STORAGE_DIR='/app/server/storage'
"@ | Out-File "$env:STORAGE_LOCATION\.env" -Encoding utf8

docker run -d --name openafd -p 3001:3001 --cap-add SYS_ADMIN `
  -v "$env:STORAGE_LOCATION`:/app/server/storage" `
  -v "$env:STORAGE_LOCATION\.env:/app/server/.env" `
  -e STORAGE_DIR=/app/server/storage `
  openafd/openafd:latest
```

---

## 3. docker-compose (recommended for production)

`docker/docker-compose.yml`:

```yaml
name: openafd

networks:
  openafd-chat:
    driver: bridge

services:
  openafd-chat:
    container_name: openafd
    build:
      context: ../.
      dockerfile: ./docker/Dockerfile
      args:
        ARG_UID: ${UID:-1000}
        ARG_GID: ${GID:-1000}
    cap_add:
      - SYS_ADMIN
    volumes:
      - "./.env:/app/server/.env"            # ← CRITICAL: must be a FILE, not a directory
      - "../server/storage:/app/server/storage"
      - "../collector/hotdir/:/app/collector/hotdir"
      - "../collector/outputs/:/app/collector/outputs"
    user: "${UID:-1000}:${GID:-1000}"
    ports:
      - "3001:3001"
    environment:                              # ← CRITICAL: these are required
      - STORAGE_DIR=/app/server/storage
      - SERVER_PORT=3001
      - ANYTHING_LLM_RUNTIME=docker
      - DISABLE_TELEMETRY=true
    env_file:
      - .env
    networks:
      - openafd-chat
    extra_hosts:
      - "host.docker.internal:host-gateway"
    healthcheck:
      test: ["CMD", "/bin/bash", "/usr/local/bin/docker-healthcheck.sh"]
      interval: 1m
      timeout: 10s
      start_period: 1m
      retries: 3
```

### .env file (in `docker/.env`)

This file **MUST be a file, not a directory** (see Common Pitfall #1 below).

```bash
# Generate keys
SIG_KEY=$(openssl rand -hex 32)  # 64 hex chars
SIG_SALT=$(openssl rand -hex 16)  # 32 hex chars
JWT_SECRET=$(openssl rand -hex 24)  # 48 hex chars (auto-extended to 64 on boot)

cat > docker/.env <<EOF
SERVER_PORT=3001
STORAGE_DIR="/app/server/storage"
UID='1000'
GID='1000'

# Required encryption keys (generated)
SIG_KEY='${SIG_KEY}'
SIG_SALT='${SIG_SALT}'
JWT_SECRET="${JWT_SECRET}"
JWT_EXPIRY="30d"

# Telemetry
DISABLE_TELEMETRY=true
ANYTHING_LLM_RUNTIME=docker

# LLM (uncomment one provider)
# LLM_PROVIDER='openai'
# OPEN_AI_KEY='sk-...'
# OPEN_MODEL_PREF='gpt-4o'
EOF

chmod 600 docker/.env
```

### Start

```bash
cd docker
docker compose up -d --build
# Wait ~5-10 min for build (first time)
docker ps
# Status: healthy
docker compose logs -f openafd-chat  # Ctrl-C to exit
```

---

## 4. Build from source

For development or custom modifications.

```bash
# 1. Clone repo
git clone https://github.com/Family-Team-Projects/OpenAfD-Chat.git
cd OpenAfD-Chat

# 2. Checkout version
git checkout main  # or a tagged version like v1.2.3

# 3. Create storage and .env (see Quick Start above)
mkdir -p server/storage
cd docker
cp .env.example .env
# Edit docker/.env to add SIG_KEY, SIG_SALT, etc.
cd ..

# 4. Build image (multi-arch: arm64 + amd64)
cd docker
docker build -f Dockerfile -t openafd-chat:custom ../
# Build takes 5-15 min depending on cache

# 5. Run with custom image
docker run -d --name openafd-dev -p 3001:3001 \
  --cap-add SYS_ADMIN \
  -v $(pwd)/../server/storage:/app/server/storage \
  -v $(pwd)/.env:/app/server/.env \
  -e STORAGE_DIR=/app/server/storage \
  openafd-chat:custom
```

### Build cache tips
- **First build:** 15-20 min (downloads node, yarn, deps)
- **Subsequent builds:** 1-3 min (uses Docker layer cache)
- **Clean rebuild:** `docker build --no-cache -f docker/Dockerfile -t openafd-chat:custom ./`

---

## 5. Health checks

The container has **two processes** that must both stay alive:
1. **Server** (Node.js Express on port 3001)
2. **Collector** (Node.js for document processing)

### Container health
```bash
docker ps
# STATUS column shows: "Up X minutes (healthy)" or "Up X minutes (unhealthy)"
```

### Healthcheck endpoint
```bash
# Code registers: app.get("/ping", ...) — under root, NOT /api/
curl http://localhost:3001/ping
# Returns: {"online":true} (HTTP 200)
```

⚠️ **Common mistake:** Documentation and the original healthcheck script both reference `/api/ping` — but the actual endpoint is `/ping`. See `docs/architecture.md` for the fix.

### Manual checks
```bash
# Is the server running?
docker exec openafd ps aux | grep "node /app/server/index.js"

# Is the collector running?
docker exec openafd ps aux | grep "node /app/collector/index.js"

# Check logs for errors
docker logs openafd 2>&1 | grep -iE "error|crash|throw" | tail -20

# Verify both processes
docker exec openafd bash -c "
  if pgrep -f 'node /app/server/index.js' > /dev/null; then
    echo 'Server: RUNNING'
  else
    echo 'Server: DOWN'
  fi
  if pgrep -f 'node /app/collector/index.js' > /dev/null; then
    echo 'Collector: RUNNING'
  else
    echo 'Collector: DOWN'
  fi
"
```

---

## 6. Politician DB sync (21. WP pre-flight)

The Politician-DB starts empty. The sync job populates it from external APIs.

### Requirements
- Internet access from container to:
  - `https://www.abgeordnetenwatch.de/api/v2/...`
  - `https://www.bundestag.de/...` (or DIP API fallback)
- Prisma migrations applied (auto on first start)
- 2-10 minutes for first sync

### Trigger manual sync
```bash
# Inside container
docker exec openafd node /app/server/jobs/sync-politician-data.js

# Expected output:
# [BundestagApi] Fetching members from formular endpoint (WP 21)...
# [AbgeordnetenwatchApi] Fetching all politicians...
# [sync-politician-data] Phase 1: 730 members processed
# [sync-politician-data] Phase 2: 612 politicians created
# [sync-politician-data] Phase 3: 124 speeches synced
```

### Verify
```bash
# Count politicians
docker exec openafd sqlite3 /app/server/storage/openafd.db \
  "SELECT COUNT(*) FROM politicians"
# Expected: 700+

# Search for a known AfD politician
curl "http://localhost:3001/api/politician/search?q=Weidel"
# Expected: 1+ results (Alice Weidel is AfD co-chair)

# Stats endpoint
curl "http://localhost:3001/api/politician/stats"
# Expected: non-zero counts for bundestag + abgeordnetenwatch
```

### Automatic sync
- Bree scheduler runs sync every 6 hours (configured in `BackgroundWorkers/index.js`)
- See `docs/PLAN-DATA-SYNC.md` for the architecture

### Env vars
- `BUNDESTAG_WAHLPERIODE=21` (default)
- `AW_PARLIAMENT_PERIOD=132` (21. WP)
- `POLITICIAN_SYNC_SITTINGS_PER_RUN=5` (Plenarprotokolle)

---

## 7. Common pitfalls

### Pitfall 1: `docker/.env` is a directory

**Symptom:**
```
docker run ... -v ./docker/.env:/app/server/.env
docker: Error response from daemon: invalid mount config for type "bind": invalid mount path: ./docker/.env
```
**Cause:** Someone (or a script) accidentally created a directory at `docker/.env` instead of a file.
**Fix:**
```bash
rm -rf docker/.env
cp docker/.env.example docker/.env
# Edit docker/.env with valid keys
chmod 600 docker/.env
```

### Pitfall 2: `STORAGE_DIR` not set in container

**Symptom:**
```
================================================================
⚠️  WARNING: STORAGE_DIR environment variable is not set! ⚠️
================================================================
TypeError [ERR_INVALID_ARG_TYPE]: The "paths[0]" argument must be of type string. Received undefined
    at Object.resolve (node:path:1272:7)
    at /app/collector/utils/files/index.js:13:12
```
**Cause:** `STORAGE_DIR` not passed via `-e` or `env_file`.
**Fix:** Add to docker-compose.yml `environment:` section or `docker run -e`.

### Pitfall 3: Healthcheck URL is `/api/ping` but endpoint is `/ping`

**Symptom:** `docker ps` shows `unhealthy` despite server running.
**Cause:** `docker/docker-healthcheck.sh` checks `/api/ping` but `app.get("/ping", ...)` is registered under root.
**Fix:** Healthcheck script uses `http://localhost:3001/ping` (not `/api/ping`).

### Pitfall 4: `SIG_KEY='passphrase'` in .env.example is too short

**Symptom:** EncryptionManager logs `Self-assigning key & salt` and dumps a new key to .env on every restart — but data encrypted with old key is lost.
**Fix:** Generate a 32+ char random key:
```bash
SIG_KEY=$(openssl rand -hex 32)  # 64 hex chars
```

### Pitfall 5: Volume mount permissions

**Symptom:**
```
Error: EACCES: permission denied, open '/app/server/storage/openafd.db'
```
**Cause:** UID mismatch between host and container.
**Fix:** Match `UID` and `GID` in `.env` to your host user:
```bash
# Get host UID:GID
id -u  # e.g. 1000
id -g  # e.g. 1000
# Set in docker/.env
UID='1000'
GID='1000'
```

### Pitfall 6: `host.docker.internal` not resolving on Linux

**Symptom:** Container can't reach services on host (e.g. local Ollama).
**Fix:** Add `--add-host=host.docker.internal:host-gateway` to `docker run`, or `extra_hosts:` to compose.

---

## 8. Troubleshooting

### Container won't start
```bash
docker logs openafd 2>&1 | tail -50
# Look for: TypeError, Error: EACCES, ENOENT, ECONNREFUSED
```

### Healthcheck fails but server runs
```bash
# Manually test endpoint
docker exec openafd curl http://localhost:3001/ping
# Should return: {"online":true}

# If works manually but healthcheck fails:
docker exec openafd bash /usr/local/bin/docker-healthcheck.sh
# See the error output
```

### Database locked
```bash
docker stop openafd
docker start openafd
# If persists, check for zombie processes
docker exec openafd ps aux | grep -E "node|prisma"
```

### Sync job crashes
```bash
docker exec openafd tail -f /app/server/storage/logs/politician-sync.log
# Look for HTTP 404, 429, 500
# See docs/DATA-SOURCES.md for API limits
```

### Out of disk space
```bash
docker system df
# Clean up old images
docker image prune -a
# Clean up unused volumes (CAREFUL)
docker volume prune
```

### Reset everything (DANGER: data loss)
```bash
docker stop openafd
docker rm openafd
docker volume rm openafd-storage  # DELETES ALL DATA
docker run ...  # Recreate
```

---

## 9. Rollback strategy

### Rollback to previous image
```bash
# List available images
docker images | grep openafd-chat

# Stop current container
docker stop openafd && docker rm openafd

# Run previous version
docker run -d --name openafd -p 3001:3001 \
  --cap-add SYS_ADMIN \
  -v $STORAGE_LOCATION:/app/server/storage \
  -v $STORAGE_LOCATION/.env:/app/server/.env \
  -e STORAGE_DIR=/app/server/storage \
  openafd-chat:local-v7  # previous tag
```

### Rollback code
```bash
cd /path/to/repo
git log --oneline -10  # Find last good commit
git checkout <commit-hash>
cd docker
docker compose up -d --build
```

### Data migration between versions
Most updates preserve database schema. For major migrations:
```bash
# Before upgrade: backup
cp $STORAGE_LOCATION/openafd.db $STORAGE_LOCATION/openafd.db.bak.$(date +%Y%m%d)

# After upgrade: check logs
docker logs openafd 2>&1 | grep -iE "migration|schema"
```

---

## 10. CI/CD integration

For production deployments via GitHub Actions, see:
- `.github/workflows/release.yml` — Release pipeline
- `.github/workflows/ceo-audit.yml` — Pre-release quality check
- `.github/workflows/sbom.yml` — SBOM generation

### Recommended pre-deploy checks
1. ✅ `npm audit` shows 0 vulnerabilities
2. ✅ `npm test` all suites passing
3. ✅ `ceokit audit` grade B+ or better
4. ✅ SBOM generated
5. ✅ Database migrations tested on staging

---

## Quick reference

| Task | Command |
|------|---------|
| Build image | `docker build -f docker/Dockerfile -t openafd-chat:custom ./` |
| Run container | `docker run -d --name openafd -p 3001:3001 --cap-add SYS_ADMIN -e STORAGE_DIR=/app/server/storage -v $STORAGE_LOCATION:/app/server/storage openafd/openafd:latest` |
| View logs | `docker logs -f openafd` |
| Restart | `docker restart openafd` |
| Health check | `curl http://localhost:3001/ping` |
| Trigger sync | `docker exec openafd node /app/server/jobs/sync-politician-data.js` |
| Backup DB | `cp $STORAGE_LOCATION/openafd.db backup.db` |
| Restore DB | `cp backup.db $STORAGE_LOCATION/openafd.db && docker restart openafd` |
| Stop | `docker stop openafd` |
| Remove | `docker rm openafd` |

---

**Last updated:** 2026-06-08
**Version:** 1.0
**Status:** Production-ready (after Issue #86 fix)

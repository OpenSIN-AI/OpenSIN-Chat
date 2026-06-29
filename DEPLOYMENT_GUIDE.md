# OpenSIN-Chat — Production Deployment Guide

> **Production URL:** `https://sinchat.delqhi.com`
> **VM:** Oracle Cloud, `92.5.60.87`, ARM A1.Flex 24GB
> **Status:** Live — Fireworks AI via SINator Pool Router, Cloudflare Tunnel, nginx WS proxy

---

## Architecture Overview

```
Internet → Cloudflare Tunnel (cloudflared) → nginx :38481 (WS upgrade) → Docker :38471 (127.0.0.1)
                                                                      ↓
                                                        opensin-app container (SERVER_PORT=3001)
                                                                      ↓
                                                        Fireworks AI ← SINator Pool Router
                                                        SQLite: /app/server/storage/openafd.db
```

| Component | Binding | Purpose |
|---|---|---|
| Docker container | `127.0.0.1:38471` → container `3001` | App server (binds localhost only, not public) |
| nginx reverse proxy | `:38481` | WebSocket Upgrade header injection |
| Cloudflare Tunnel | systemd `cloudflared-opensin-chat.service` | Public HTTPS endpoint → nginx |
| SINator Pool Router | `sinatorpool-router.delqhi.com` | Fireworks AI key rotation + load balancing |
| Uptime Kuma | `status.delqhi.com` | External uptime monitoring |

---

## 1. LLM Provider — Fireworks AI via SINator Pool Router

### Configuration

The primary LLM provider is **Fireworks AI**, routed through the SINator Pool Router for API key rotation and load balancing.

| Env Var | Value |
|---|---|
| `LLM_PROVIDER` | `fireworksAi` (hardcoded in `server/utils/agents/aibitat/providers/fireworksai.js`) |
| `FIREWORKS_AI_LLM_BASE_PATH` | `https://sinatorpool-router.delqhi.com/inference/v1` |
| `FIREWORKS_AI_LLM_API_KEY` | `<your-pool-key>` |
| `FIREWORKS_AI_LLM_MODEL_PREF` | `accounts/fireworks/models/minimax-m3` |
| `FIREWORKS_AI_LLM_MODEL_TOKEN_LIMIT` | `256000` |

### Custom User-Agent Header

The SINator Pool Router **blocks requests with the default OpenAI SDK User-Agent**. The `fireworksai.js` provider sets a custom header to bypass this:

```js
// server/utils/agents/aibitat/providers/fireworksai.js:26-28
defaultHeaders: {
  "User-Agent": "OpenSIN-Chat/1.0",
},
```

If you fork or replace this provider, you **must** preserve this header or the router will reject all requests.

---

## 2. Environment Configuration (`.env`)

The production `.env` lives at `docker/.env` on the VM and is mounted read-only into the container (`docker/.env:/app/server/.env:ro`).

### Critical Variables

```bash
# --- Auth ---
AUTH_TOKEN=Simone123
JWT_SECRET=<generate-with: openssl rand -hex 24>
SIG_KEY=<generate-with: openssl rand -hex 32>
SIG_SALT=<generate-with: openssl rand -hex 16>

# --- LLM (Fireworks AI via SINator Pool Router) ---
LLM_PROVIDER=fireworksAi
FIREWORKS_AI_LLM_BASE_PATH=https://sinatorpool-router.delqhi.com/inference/v1
FIREWORKS_AI_LLM_API_KEY=<your-key>
FIREWORKS_AI_LLM_MODEL_PREF=accounts/fireworks/models/minimax-m3
FIREWORKS_AI_LLM_MODEL_TOKEN_LIMIT=256000

# --- Server ---
SERVER_PORT=3001
STORAGE_DIR=/app/server/storage

# --- Container port binding (host side) ---
# The compose file maps host 38471 → container 3001.
# PORT env var is NOT used by the app directly; SERVER_PORT controls the
# in-container listener. 38471 is the host-facing port bound to 127.0.0.1.
```

### Full Template

See `docker/.env.example` for the complete list of all supported providers, embedding engines, vector databases, TTS/STT, agent search keys, and PDF analysis tuning parameters.

---

## 3. Docker Deployment

### Docker Compose Files

| File | Purpose |
|---|---|
| `docker/docker-compose.yml` | Base compose (app + Vane sidecar) |
| `docker-opensin/docker-compose.yml` | OCI VM stack |
| `docker-opensin/docker-compose.production.yml` | Production override (container name, resource limits) |

### Port Binding

The container binds to `127.0.0.1:38471` on the host, mapping to port `3001` inside the container (`SERVER_PORT=3001`). Port `38471` is a high port chosen to avoid clashing with legacy deployments on `3001`.

```yaml
# docker/docker-compose.yml
ports:
  - "38471:3001"  # Host 38471 → Container 3001 (SERVER_PORT)
```

On the OCI VM, the production override ensures the container is named `opensin-app` and gets 4GB / 4 CPU limits.

### Storage Permissions

Storage directories **must** be owned by UID/GID `1000:1000` for the container to write:

```bash
chown -R 1000:1000 server/storage/
chown -R 1000:1000 collector/hotdir/
chown -R 1000:1000 collector/outputs/
```

### Restarting After `.env` Changes

**`docker restart` does NOT reload `.env` files.** You must do a full compose cycle:

```bash
# On the VM (use 'docker' on Linux, 'orb' on macOS)
docker compose down && docker compose up -d
```

> **macOS development:** use OrbStack (`orb` CLI), never Docker Desktop.

---

## 4. Cloudflare Tunnel Setup

### systemd Services

| Service | Interval | Purpose |
|---|---|---|
| `cloudflared-opensin-chat.service` | — | Main tunnel daemon |
| `cloudflared-watchdog.timer` | 60s | Restarts tunnel if it dies |
| `sinchat-healthcheck.timer` | 120s | Local health probe (`127.0.0.1:38471`) |
| `sinchat-external-monitor.timer` | 300s | External probe (`sinchat.delqhi.com`) |

### Tunnel Configuration

Config file: `/home/ubuntu/.cloudflared/config-opensin.yml`

The tunnel routes `sinchat.delqhi.com` → `http://localhost:38481` (nginx), which then proxies to `127.0.0.1:38471` (Docker).

### nginx WebSocket Proxy

Cloudflare Tunnel strips WebSocket `Upgrade` headers by default. nginx on port `38481` re-injects them before forwarding to the Docker container.

Config files:
- `/etc/nginx/sites-available/opensin-ws-proxy`
- `/etc/nginx/conf.d/ws-upgrade.conf`

Key nginx directives:
```nginx
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
proxy_set_header Host $host;
proxy_read_timeout 3600s;
```

> **Known issue:** `@agent` WebSocket connections are broken through Cloudflare Tunnel even with nginx. Cloudflare strips Upgrade headers at the tunnel layer. This affects agent live-status only; chat and document features work normally.

### Recovery

If `sinchat.delqhi.com` returns Cloudflare errors (1033, 521, 522, 523), see the `skill-cloudflared-recovery` skill for the one-shot recovery procedure.

---

## 5. VM Details

| Property | Value |
|---|---|
| Provider | Oracle Cloud Infrastructure (OCI) |
| IP | `92.5.60.87` |
| Instance | ARM A1.Flex, 24GB RAM |
| Container name | `opensin-app` |
| App path | `/home/ubuntu/OpenSIN-Chat/` |
| DB path | `/home/ubuntu/OpenSIN-Chat/server/storage/openafd.db` |
| DB backups | `/home/ubuntu/backups/` (cron daily at 03:00) |
| Monitoring | Uptime Kuma at `status.delqhi.com` |

### SSH Access

```bash
ssh ubuntu@92.5.60.87
```

---

## 6. Frontend Deploy Process

Frontend changes are built locally and rsync'd to the VM, then copied into the running container.

```bash
# 1. Build frontend locally
cd frontend && yarn build

# 2. rsync to VM
rsync -avz --delete frontend/dist/ ubuntu@92.5.60.87:/tmp/opensin-dist/

# 3. Copy into container
ssh ubuntu@92.5.60.87 "docker cp /tmp/opensin-dist/. opensin-app:/app/frontend/dist/"

# 4. Restore index.html (docker cp overwrites it with the built version;
#    the container ships a templated _index.html that must be restored)
ssh ubuntu@92.5.60.87 "docker exec opensin-app cp /app/frontend/dist/_index.html /app/frontend/dist/index.html"
```

> **Note:** `chown` errors for root-owned image files during `docker cp` are ignorable — they don't affect functionality.

---

## 7. Known Issues & Workarounds

### `docker restart` does not reload `.env`
**Symptom:** Changed env vars don't take effect after `docker restart opensin-app`.
**Fix:** Use `docker compose down && docker compose up -d` (full recreate picks up new `.env`).

### Prisma CLI version mismatch
**Symptom:** `prisma migrate` fails inside the container.
**Cause:** Container has Prisma CLI `7.8.0`; project schema uses `5.3.1`.
**Workaround:** Run migrations on the host (not in container), or apply schema changes via raw SQL. The `workspace_notes` table was created this way.

### `@agent` WebSocket broken via Cloudflare Tunnel
**Symptom:** Agent live-status WebSocket fails to connect through the tunnel.
**Cause:** Cloudflare strips `Upgrade` headers at the tunnel layer, even with nginx re-injecting them.
**Impact:** Agent status indicators don't update live. Chat, RAG, and document features are unaffected.
**Workaround:** Access the app directly via `http://92.5.60.87:38471` for agent debugging (temporary, not for production use).

---

## 8. Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| Frontend shows spinner | Backend not running | `docker compose up -d` on VM |
| LLM returns 403 | SINator Pool Router blocking User-Agent | Verify `fireworksai.js` has `User-Agent: OpenSIN-Chat/1.0` header |
| LLM returns 429 | Pool key exhausted | Check SINator Pool Router dashboard; keys auto-rotate |
| `sinchat.delqhi.com` 1033/521/522 | Cloudflare Tunnel down | `systemctl restart cloudflared-opensin-chat` |
| Container can't write to storage | Wrong UID/GID | `chown -R 1000:1000 server/storage/` |
| `.env` changes not applied | Used `docker restart` | `docker compose down && docker compose up -d` |
| Port 38471 in use | Another process | `ss -tlnp | grep 38471` |

---

## 9. Quick Reference Commands

```bash
# --- On the VM ---

# Check container status
docker ps | grep opensin-app

# View logs
docker logs -f --tail 100 opensin-app

# Restart after .env change (NOT 'docker restart')
cd /home/ubuntu/OpenSIN-Chat/docker-opensin
docker compose down && docker compose up -d

# Check tunnel
systemctl status cloudflared-opensin-chat

# Check all timers
systemctl list-timers | grep -E 'cloudflared|sinchat'

# DB backup (manual)
cp /home/ubuntu/OpenSIN-Chat/server/storage/openafd.db /home/ubuntu/backups/openafd-$(date +%Y%m%d).db

# --- Locally (macOS) ---

# Build frontend
cd frontend && yarn build

# Deploy frontend
rsync -avz --delete frontend/dist/ ubuntu@92.5.60.87:/tmp/opensin-dist/
ssh ubuntu@92.5.60.87 "docker cp /tmp/opensin-dist/. opensin-app:/app/frontend/dist/"
ssh ubuntu@92.5.60.87 "docker exec opensin-app cp /app/frontend/dist/_index.html /app/frontend/dist/index.html"
```

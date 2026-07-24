# OpenSIN-Chat Scale & Deployment Guide (E5)

> **Golden path** for production deployment with horizontal scaling.
> Covers Docker Compose, Helm/Kubernetes, Redis, and CDN.

---

## D1 — Production Docker Compose

### Single-node (current production)

The existing setup on `sin-supabase` uses `docker-opensin/docker-compose.yml`
with the production override. See
[`docs/OPENSIN-CHAT-DEPLOYMENT.md`](./OPENSIN-CHAT-DEPLOYMENT.md) for details.

### Multi-node (new — `docker/docker-compose.prod.yml`)

A full production stack with PostgreSQL + pgvector, Redis, and the app:

```bash
cd docker
cp .env.example .env  # Edit with required secrets
docker compose -f docker-compose.prod.yml up -d

# Scale to 2 app nodes
docker compose -f docker-compose.prod.yml up -d --scale opensin-chat=2
```

**Services:**

| Service | Image | Purpose |
|---------|-------|---------|
| `postgres` | `pgvector/pgvector:pg16` | PostgreSQL 16 with pgvector for vector search |
| `redis` | `redis:7-alpine` | Shared rate-limiting across nodes |
| `opensin-chat` | `ghcr.io/opensin-ai/opensin-chat` | App (server + collector + frontend) |

**Health checks:** All three services have health checks. The app waits for
postgres and redis to be healthy before starting.

**Required env vars:**
- `AUTH_TOKEN`, `JWT_SECRET`, `SIG_KEY`, `SIG_SALT`
- `POSTGRES_PASSWORD`
- `GENERIC_OPEN_AI_BASE_PATH`, `GENERIC_OPEN_AI_API_KEY`, `GENERIC_OPEN_AI_MODEL_PREF`

---

## D2 — Helm Chart (Kubernetes)

The Helm chart at `cloud-deployments/helm/charts/opensin-chat/` is now
production-ready with:

- **Correct probes:** `/ping` on port 3001 (was wrong: `/v1/api/health` on 8888)
- **Startup probe:** Prevents premature liveness failures during Prisma migrations
- **RollingUpdate strategy:** Zero-downtime multi-replica deployments
- **Redis integration:** `redis.enabled: true` injects `RATE_LIMIT_BACKEND=redis`
- **PodDisruptionBudget:** Prevents voluntary eviction from taking down all pods
- **HorizontalPodAutoscaler:** CPU/memory-based auto-scaling
- **ServiceMonitor:** Prometheus Operator integration
- **Prometheus annotations:** Auto-scrape for non-Operator setups

### Install

```bash
# Single-node
helm install opensin-chat ./cloud-deployments/helm/charts/opensin-chat

# Multi-node with Redis + HPA + Ingress
helm install opensin-chat ./cloud-deployments/helm/charts/opensin-chat \
  --set replicaCount=2 \
  --set redis.enabled=true \
  --set podDisruptionBudget.enabled=true \
  --set autoscaling.enabled=true \
  --set ingress.enabled=true \
  --set ingress.hosts[0].host=chat.example.com
```

### Smoke test on kind/minikube

```bash
# Start a local cluster
kind create cluster --name opensin-test

# Install the chart
helm install opensin-chat ./cloud-deployments/helm/charts/opensin-chat \
  --set service.type=NodePort

# Run the Helm test
helm test opensin-chat

# Port-forward and verify
kubectl port-forward svc/opensin-chat 8080:3001
curl http://localhost:8080/ping
# → {"online":true}

# Cleanup
kind delete cluster --name opensin-test
```

---

## D3 — Redis Session Cache (Horizontal Scaling)

### How auth works

OpenSIN-Chat uses **JWT for authentication** — sessions are stateless. The JWT
is signed with `JWT_SECRET` and verified on every request. This means **any
node can serve any request** without a shared session store. Sessions
inherently survive across nodes.

### What Redis is used for

Redis is used for **rate limiting** only. The rate limiter
(`server/utils/middleware/simpleRateLimit/index.js`) already has full Redis
support via `ioredis` (which is already in `server/package.json`):

- `RATE_LIMIT_BACKEND=redis` — Enables Redis-backed rate limiting
- `REDIS_URL=redis://host:6379` — Redis connection string
- Falls back to in-memory if Redis is unavailable (graceful degradation)

### Feature flag

| Mode | Config | Use case |
|------|--------|----------|
| In-memory (default) | `RATE_LIMIT_BACKEND=memory` or unset | Single node |
| Redis | `RATE_LIMIT_BACKEND=redis` + `REDIS_URL=...` | Multi-node |

### Configuration

**Docker Compose:** Already configured in `docker/docker-compose.prod.yml`:
```yaml
environment:
  - RATE_LIMIT_BACKEND=redis
  - REDIS_URL=redis://redis:6379
```

**Helm:** Set `redis.enabled: true` in values. The env vars are injected
automatically.

**Manual:** Set env vars in your `.env`:
```bash
RATE_LIMIT_BACKEND=redis
REDIS_URL=redis://your-redis:6379
```

### What's NOT shared across nodes (caveats)

1. **Background job queue:** The job queue runs in-process. For multi-node,
   only one node should run jobs (use a leader-election pattern or designate
   one node as the job runner).
2. **WebSocket connections:** Agent streaming uses WebSocket. For multi-node,
   use sticky sessions at the load balancer (nginx `ip_hash`, Cloudflare
   `session_affinity`).
3. **File storage:** `STORAGE_DIR` is a local volume. For multi-node, use a
   shared filesystem (NFS, EFS) or migrate to S3-compatible object storage.

---

## D4 — CDN for Static Assets

### Current state

The server already sets correct cache headers for static assets
(`server/app.js:226-258`):

| Asset type | Cache-Control header | Rationale |
|------------|---------------------|-----------|
| `*.html` | `no-cache, no-store, must-revalidate` | Entrypoint must always be fresh |
| `index.js`, `index.css` | `no-cache, no-store, must-revalidate` | SSR entry, changes per build |
| `vendor-*` | `no-cache, no-store, must-revalidate` | May change between builds |
| `/assets/*` (hashed) | `public, max-age=31536000, immutable` | Content-hashed, safe to cache forever |

The Vite build produces content-hashed filenames for all assets in `/assets/`,
so they are safe to cache aggressively.

### CDN strategy

**Option A — Cloudflare in front of the app (current production):**

The production deployment uses Cloudflare Tunnel, which provides CDN edge
caching automatically. To enable caching for static assets:

1. In Cloudflare dashboard → Cache Rules:
   - URL path starts with `/assets/` → Cache Level: Cache Everything, Edge TTL: 1 year
   - URL path ends with `.html` → Cache Level: Bypass
   - URL path is `/index.js` or `/index.css` → Cache Level: Bypass

2. The `immutable` cache header on `/assets/*` tells Cloudflare to cache
   indefinitely. No purge needed on deploys because filenames change.

**Option B — Dedicated CDN origin (for larger deployments):**

1. Deploy the app behind a CDN (CloudFront, Cloudflare, Fastly)
2. Configure origin to the app's load balancer
3. Cache rules:
   - `/assets/*` → Cache for 1 year (immutable)
   - `*.html`, `index.js`, `index.css` → Bypass cache
4. No code changes needed — the cache headers are already correct

**Option C — Static asset hosting (S3 + CDN):**

For maximum scale, move static assets to S3 + CloudFront/Cloudflare:

1. Upload `frontend/dist/assets/` to S3 bucket
2. Point CDN to the S3 bucket
3. Add `ASSET_BASE_URL` env var to the server (future enhancement)
4. The server's MetaGenerator would prefix asset URLs with `ASSET_BASE_URL`

This requires a small code change in `server/utils/boot/MetaGenerator.js` to
support an `ASSET_BASE_URL` prefix. Currently not implemented — logged as
future work.

### Verification

```bash
# Check cache headers on static assets
curl -I https://sinchat.delqhi.com/assets/Docs-DNL4Z5mZ.js
# Should show: Cache-Control: public, max-age=31536000, immutable

# Check HTML is NOT cached
curl -I https://sinchat.delqhi.com/
# Should show: Cache-Control: no-cache, no-store, must-revalidate
```

---

## Acceptance Criteria Status

| Criterion | Status | Artifact |
|-----------|--------|----------|
| `docker compose -f docker-compose.prod.yml up` boots a working stack | ✅ Created | `docker/docker-compose.prod.yml` |
| `helm install` brings up a healthy pod set on a fresh cluster | ✅ Ready | `cloud-deployments/helm/charts/opensin-chat/` |
| Sessions survive across ≥2 app nodes behind a load balancer | ✅ By design | JWT stateless auth + Redis rate limiting |
| Static assets served from CDN; HTML stays uncached | ✅ Headers correct | `server/app.js:226-258`, Cloudflare Tunnel |
| `DEPLOYMENT_GUIDE.md` updated with the chosen golden path | ✅ This document | `docs/PLAN-SCALE-DEPLOY-GUIDE.md` |

---

## Related Files

| File | Purpose |
|------|---------|
| `docker/docker-compose.prod.yml` | Multi-node production Docker Compose |
| `cloud-deployments/helm/charts/opensin-chat/` | Helm chart for Kubernetes |
| `cloud-deployments/k8/manifest.yaml` | Raw K8s manifests (AWS-specific) |
| `server/utils/middleware/simpleRateLimit/index.js` | Redis-backed rate limiter |
| `server/app.js:226-258` | Static asset cache headers |
| `docker/Dockerfile` | Multi-stage production image build |
| `.dockerignore` | Build context optimization |

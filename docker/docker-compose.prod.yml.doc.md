# docker-compose.prod.yml — Documentation

**Purpose:** Production Docker Compose for OpenSIN Chat with PostgreSQL + Redis,
enabling horizontal scaling beyond a single node.

**Docs:** E5-D1 in `docs/PLAN-SCALE-DEPLOY.md`

## Architecture

```
                    ┌──────────────┐
                    │  Load Balancer│
                    │  (Cloudflare) │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │opensin-  │ │opensin-  │ │opensin-  │
        │chat  1   │ │chat  2   │ │chat  N   │
        └────┬─────┘ └────┬─────┘ └────┬─────┘
             │            │            │
      ┌──────┴────────────┴────────────┘
      │           │
      ▼           ▼
┌──────────┐ ┌──────────┐
│PostgreSQL│ │  Redis   │
│ +pgvector│ │ (rate-   │
│          │ │  limit)  │
└──────────┘ └──────────┘
```

## Usage

```bash
# Copy and edit .env with required secrets
cp docker/.env.example docker/.env
# Edit: AUTH_TOKEN, JWT_SECRET, SIG_KEY, SIG_SALT, POSTGRES_PASSWORD,
#        GENERIC_OPEN_AI_BASE_PATH, GENERIC_OPEN_AI_API_KEY, GENERIC_OPEN_AI_MODEL_PREF

# Start the full stack
docker compose -f docker/docker-compose.prod.yml up -d

# Scale app nodes (horizontal scaling)
docker compose -f docker/docker-compose.prod.yml up -d --scale opensin-chat=2
```

## Services

| Service | Image | Purpose |
|---------|-------|---------|
| `postgres` | `pgvector/pgvector:pg16` | PostgreSQL 16 with pgvector extension for vector search |
| `redis` | `redis:7-alpine` | Shared rate-limiting across app nodes (E5-D3) |
| `opensin-chat` | `ghcr.io/opensin-ai/opensin-chat:latest` | OpenSIN Chat app (server + collector + frontend) |

## Health Checks

All three services have health checks. The app `depends_on` postgres and redis
with `condition: service_healthy`, so the app only starts after dependencies are
ready.

## Environment Variables

### Required
- `AUTH_TOKEN` — Multi-user auth token
- `JWT_SECRET` — JWT signing secret
- `POSTGRES_PASSWORD` — PostgreSQL password

### Optional (with defaults)
- `POSTGRES_DB` (default: `opensin`)
- `POSTGRES_USER` (default: `opensin`)
- `COMPOSE_PORT` (default: `3001`) — Host port mapping
- `SKIP_CHROMIUM` (default: `1`) — Skip Chromium download for ARM64

### Redis (auto-configured)
- `RATE_LIMIT_BACKEND=redis` — Enables Redis-backed rate limiting
- `REDIS_URL=redis://redis:6379` — Redis connection string

## Notes

- The app uses **JWT for authentication** (stateless), so sessions work across
  nodes without a shared session store. Redis is used for **rate limiting** only.
- For WebSocket (agent streaming) to work across multiple nodes, use sticky
  sessions at the load balancer (Cloudflare `session_affinity` or nginx
  `ip_hash`).
- Storage (`server/storage`) is mounted as a host volume. For multi-node, use a
  shared filesystem (NFS, EFS) or migrate to S3-compatible object storage.

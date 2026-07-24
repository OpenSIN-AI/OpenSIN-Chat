# Supabase Self-Hosted Setup

OpenSIN-Chat uses a minimal self-hosted Supabase stack for three things:

| Service | Purpose |
|---|---|
| PostgreSQL 15 + pgvector | Primary database + vector store for RAG |
| Supabase Storage | Persistent file storage (documents, reports, avatars) |
| Kong API Gateway | Single HTTPS endpoint for the Storage API |

Auth, Realtime, Edge Functions and the Supabase Studio are intentionally excluded to keep the stack lean.

---

## Prerequisites

- Docker + Docker Compose v2
- A server or VPS with at least 2 GB RAM (1 GB usable for Postgres)
- Ports 5432, 8000, 5433 available (or override in the env file)

---

## 1. Generate secrets

```bash
# JWT Secret (min 32 chars)
openssl rand -base64 32

# Postgres password
openssl rand -base64 24
```

For the `ANON_KEY` and `SERVICE_ROLE_KEY` you need two JWTs signed with your `JWT_SECRET`. The easiest way is to use the official Supabase key generator:
https://supabase.com/docs/guides/self-hosting#api-keys

Or generate them locally:

```bash
node -e "
const jwt = require('jsonwebtoken');
const secret = 'YOUR_JWT_SECRET_HERE';
console.log('ANON_KEY:');
console.log(jwt.sign({ role: 'anon', iat: 1613531985, exp: 1929107985 }, secret));
console.log('SERVICE_ROLE_KEY:');
console.log(jwt.sign({ role: 'service_role', iat: 1613531985, exp: 1929107985 }, secret));
"
```

---

## 2. Configure the environment

```bash
cp docker/.env.supabase.example docker/.env.supabase
# Edit docker/.env.supabase — fill in POSTGRES_PASSWORD, JWT_SECRET, ANON_KEY, SERVICE_ROLE_KEY
```

---

## 3. Start the Supabase stack

```bash
docker compose \
  -f docker/docker-compose.supabase.yml \
  --env-file docker/.env.supabase \
  up -d
```

Wait for the healthcheck to pass:

```bash
docker compose -f docker/docker-compose.supabase.yml ps
# All services should show "healthy" or "running"
```

---

## 4. Configure OpenSIN-Chat server

Add the following to `server/.env` (copy from `server/.env.example`):

```dotenv
# Database
DATABASE_URL="postgresql://postgres:<POSTGRES_PASSWORD>@localhost:5432/postgres"

# Vector store (pgvector — same Postgres instance)
VECTOR_DB="pgvector"
PGVECTOR_CONNECTION_STRING="postgresql://postgres:<POSTGRES_PASSWORD>@localhost:5432/postgres"
PGVECTOR_TABLE_NAME="opensin_vectors"

# Supabase Storage
SUPABASE_STORAGE_ENABLED="true"
SUPABASE_STORAGE_URL="http://localhost:8000/storage/v1"
SUPABASE_SERVICE_KEY="<SERVICE_ROLE_KEY from docker/.env.supabase>"
```

---

## 5. Run Prisma migrations

```bash
# From the repository root:
cd server
npx prisma db push
# or for production with migration history:
npx prisma migrate deploy
```

The `db push` command will:
- Create all tables defined in `schema.prisma`
- The `memories.embedding` column uses the `vector(1536)` type from the pgvector extension which was enabled in the DB init script.

---

## 6. Verify

```bash
# Check the database is reachable
psql "postgresql://postgres:<password>@localhost:5432/postgres" -c "SELECT version();"

# Check pgvector is installed
psql "postgresql://postgres:<password>@localhost:5432/postgres" -c "SELECT * FROM pg_extension WHERE extname = 'vector';"

# Check Storage API is reachable
curl http://localhost:8000/storage/v1/health
# Expected: {"status":"ok","version":"..."}
```

---

## Storage buckets

Buckets are created automatically on first upload by the Storage adapter (`server/utils/storage/supabase.js`). No manual setup required.

Default bucket names (override with env vars):

| Env Var | Default | Contents |
|---|---|---|
| `SUPABASE_STORAGE_BUCKET_DOCUMENTS` | `documents` | Uploaded PDFs, DOCX, etc. |
| `SUPABASE_STORAGE_BUCKET_REPORTS` | `reports` | Generated PDF reports |
| `SUPABASE_STORAGE_BUCKET_AVATARS` | `avatars` | User + workspace profile pictures |
| `SUPABASE_STORAGE_BUCKET_ASSETS` | `assets` | System logos |

---

## Updating the stack

```bash
docker compose -f docker/docker-compose.supabase.yml pull
docker compose -f docker/docker-compose.supabase.yml --env-file docker/.env.supabase up -d
```

---

## Stopping / removing

```bash
# Stop (keep data):
docker compose -f docker/docker-compose.supabase.yml down

# Stop + remove volumes (WARNING: deletes all data):
docker compose -f docker/docker-compose.supabase.yml down -v
```

---

## Vercel / Cloud deployment

When deploying OpenSIN-Chat to Vercel (stateless), the Supabase stack must be hosted separately (e.g. on a Hetzner VPS, Fly.io, Railway, or any always-on server). Set the public host/IP in `DATABASE_URL` and `SUPABASE_STORAGE_URL` in the Vercel project environment variables.

The local filesystem fallback (when `SUPABASE_STORAGE_ENABLED` is not set) is only suitable for local development and single-server Docker deployments where the storage volume is mounted.

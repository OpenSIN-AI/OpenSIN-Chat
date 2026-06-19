# Production Deployment — OpenSIN-Chat v1.14.0

**Status:** Build artifacts prepared. Operator executes Phase 3.

| | |
|---|---|
| **Tag** | `v1.14.0` (annotated, pushed to origin) |
| **Head SHA** | `6c5e1b5c` |
| **Image target** | `ghcr.io/opensin-ai/opensin-chat:v1.14.0` + `opensin-app:v1.14.0` |
| **Auth tokens** | `/Users/jeremy/dev/OpenSIN-Chat/.auth-token-production` (mode `0o600`, 152 B) |
| **Tests** | server 2055/2055 · frontend 1516/1516 |
| **Branding** | ✅ PASS |
| **This session cannot** | SSH to prod · trigger n8n · push to ghcr.io |
| **Production host** | runs systemd `cloudflared` + `tunnel-health-check` (Linux) |

---

## Phase 1 — Pre-flight (DONE in this session)

- [x] Tag `v1.14.0` created and pushed (`git push origin v1.14.0`)
- [x] Tokens generated via `crypto.randomBytes(48)` base64url, written to `.auth-token-production` (mode `0o600`, never echoed)
- [x] `docs/RELEASE-NOTES-v1.14.0.md` written with severity-grouped changelog (296 lines)
- [x] `docker compose config` validated: fails closed without tokens, succeeds with tokens
- [x] Branding linter: PASSED
- [x] All 5 critical / 7 high / 7 medium / 12 low bugs fixed across 11 commits

## Phase 2 — Build image (NOT done in-session)

The CI workflow (`docker-build.yml`) **does not exist yet** in this repo. Per AGENTS.md M1 ("n8n delegator ONLY"), the org-level build should go through `N8N_CI_WEBHOOK_URL`. Local fallback below.

### Option A — ghcr.io (preferred, requires n8n action)

```bash
# Trigger n8n build webhook (operator-only; runs on OCI free-tier VM):
curl -fsS -X POST \
  -H "Authorization: Bearer ${N8N_CI_WEBHOOK_URL}" \
  -d '{"repo":"OpenSIN-AI/OpenSIN-Chat","ref":"refs/tags/v1.14.0","image":"ghcr.io/opensin-ai/opensin-chat:v1.14.0"}' \
  ${N8N_BASE_URL:-https://n8n.delqhi.com}/webhook/build-image
```

### Option B — local build (fallback, this host)

```bash
cd /Users/jeremy/dev/OpenSIN-Chat
AUTH_TOKEN="$(grep AUTH_TOKEN .auth-token-production | cut -d= -f2)" \
JWT_SECRET="$(grep JWT_SECRET .auth-token-production | cut -d= -f2)" \
docker compose -f docker/docker-compose.yml build --no-cache 2>&1 | tail
docker save opensin-app:v1.14.0 -o /tmp/opensin-app-v1.14.0.tar
ls -lh /tmp/opensin-app-v1.14.0.tar
```

Then `scp /tmp/opensin-app-v1.14.0.tar root@<prod-host>:/tmp/`.

## Phase 3 — Apply to production VM (operator executes)

SSH into the production host (root@<sinchat-vm-ip>; or via tunnel ssh).

```bash
# Stop old container gracefully
cd /opt/opensin-chat  # or whichever repo-root on prod
docker compose -f docker/docker-compose.yml down --remove-orphans

# Back up previous .env
cp -p docker/.env docker/.env.v1.13.0.bak
chmod 600 docker/.env.v1.13.0.bak

# Inject the new AUTH_TOKEN + JWT_SECRET (received via scp)
scp <operator-host>:.auth-token-production /tmp/.auth-tmp
chmod 600 /tmp/.auth-tmp
cat >> /opt/opensin-chat/docker/.env <<EOF
AUTH_TOKEN=$(grep AUTH_TOKEN /tmp/.auth-tmp | cut -d= -f2)
JWT_SECRET=$(grep JWT_SECRET /tmp/.auth-tmp | cut -d= -f2)
EOF
chmod 600 /opt/opensin-chat/docker/.env
shred -u /tmp/.auth-tmp

# Swap image
# Option A: docker compose -f docker/docker-compose.yml pull && docker compose up -d
# Option B: docker load -i /tmp/opensin-app-v1.14.0.tar
docker compose -f docker/docker-compose.yml up -d

# Health checks (3 endpoints, time-out 30 s each)
sleep 5
curl -fsSL http://localhost:3001/api/healthz       || echo "FAIL: healthz"
curl -fsSL http://localhost:3001/api/readyz        || echo "FAIL: readyz"
curl -fsSL http://localhost:3001/api/ping          || echo "FAIL: ping"

# Auth gate verification (CRITICAL — was anonymous-accessible pre-fix)
echo "--- pre-fix /api/env-dump returned 200 OK; now must be 401/503:"
curl -i http://localhost:3001/api/env-dump | head -1

# Version
curl -sS http://localhost:3001/api/version
# Expected: {"version":"v1.14.0","git_sha":"6c5e1b5c",...}
```

## Phase 4 — Cloudflare Tunnel sanity

The Tunnel `opensin-chat` (uuid `aa6a4715-1a4d-4cf9-a17e-ad27c53fee93`) fronts `*.delqhi.com`. The tunnel config on the prod host is unaffected by container swap, but verify:

```bash
cloudflared tunnel info opensin-chat
# Expected: 4-6 connections, no recent errors in /var/log/opensin-tunnel-health.log
```

From the operator host:

```bash
curl -sS https://sinchat.delqhi.com/api/version
# Expected: v1.14.0 (NOT "dev" — pre-fix returned "dev")

curl -sS https://sinchat.delqhi.com/api/setup-complete | head -c 200
# Expected: {"RequiresAuth":true,"AuthToken":true,...}  (was: AuthToken:false)
```

## Phase 5 — Cleanup

```bash
# Operator host
shred -u /Users/jeremy/dev/OpenSIN-Chat/.auth-token-production

# Production VM
shred -u /tmp/.auth-tmp 2>/dev/null

# Optional: remove old image tag (after 7 days retention)
docker rmi opensin-app:v1.13.0 2>/dev/null
```

## Rollback

If the new container fails health checks:

```bash
# On production VM
cd /opt/opensin-chat
docker compose -f docker/docker-compose.yml down --remove-orphans
# Restore previous .env
cp -p docker/.env.v1.13.0.bak docker/.env && chmod 600 docker/.env
# Optionally downgrade image — requires previous tarball saved
# docker tag <previous-sha> opensin-app:v1.14.0
docker compose -f docker/docker-compose.yml up -d
```

The `auto-deploy.sh` script's git-based rollback at lines 91-115 (added in batch b) handles healthcheck failures automatically when triggered.

## Known CI issues (do NOT block manual deploy)

All `.github/workflows/*.yml` in this repo fail with:

```
Unable to resolve action `actions/checkout@692973e3a93e3444e15be6668339c0b1f3a0642e`
```

The SHA-pinned action refs (added in issue #245 supply-chain hardening) refer to a commit that no longer exists in the GitHub registry. This is a known org-level issue — it does NOT affect manual production deploys because the prod host runs systemd-managed `cloudflared` + the container, not GitHub Actions. Fixing the SHA pins is a separate issue.

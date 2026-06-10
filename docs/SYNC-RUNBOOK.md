# OpenSIN Chat — Sync Runbook (Politician DB)

> **Purpose:** Step-by-step operational guide for triggering, monitoring, and troubleshooting the politician data sync.
>
> **Docs:** `SYNC-RUNBOOK.doc.md` (this file)
> **Related:** `docs/DATA-SOURCES.md` (API reference), `docs/PLAN-DATA-SYNC.md` (architecture), `server/jobs/sync-politician-data.js` (script), Issue #66 (closed), Issue #84 (B4 migration), Issue #86 (container)

---

## Overview

The politician DB is populated by a **Bree background job** that runs every 6 hours. This runbook covers:

1. **Pre-flight** — what to check before first sync
2. **Manual trigger** — start sync via CLI or HTTP
3. **Monitoring** — verify success via logs + DB
4. **Troubleshooting** — common failures + fixes
5. **Health endpoints** — REST API for sync status
6. **Disaster recovery** — clean DB, re-sync, history

---

## 1. Pre-flight

### Server must be running
```bash
docker ps
# Status: healthy (or check manually)
curl http://localhost:3001/api/ping
# {"online":true}
```

### Database must be initialized
```bash
docker exec openafd ls -la /app/server/storage/openafd.db
# Should exist (auto-created on first start)

# Check Prisma migrations are applied
docker exec openafd npx prisma migrate status
# Expected: "All migrations have been successfully applied"
```

### API keys (if using cloud LLM)
```bash
docker exec openafd env | grep -E "LLM_PROVIDER|OPEN_AI_KEY|ANTHROPIC_API_KEY"
```

### Network access from container
```bash
docker exec openafd curl -s -o /dev/null -w "%{http_code}" https://www.abgeordnetenwatch.de/api/v2/candidacies-mandates?parliament_period=132
# Expected: 200

docker exec openafd curl -s -o /dev/null -w "%{http_code}" https://www.bundestag.de/SiteGlobals/Functions/Abgeordnetensuche/Abgeordnete21_WP.formular
# Expected: 404 (21. WP not yet published as formular, DIP fallback used)
```

---

## 2. Manual trigger

### Option A: Inside container
```bash
docker exec openafd node /app/server/jobs/sync-politician-data.js
```

### Option B: From host (direct)
```bash
cd /Users/jeremy/dev/OpenSIN-Chat/server
STORAGE_DIR=./storage node jobs/sync-politician-data.js
```

### Option C: Scheduled via Bree (default)
- Bree runs sync every 6 hours automatically
- No manual action needed
- Configured in `server/BackgroundWorkers/index.js`

### Expected output (success)
```
[BundestagApi] Fetching members from formular endpoint (WP 21)...
[BundestagApi] Fetched 0 members (formular not yet available, using DIP fallback)
[AbgeordnetenwatchApi] Fetching all politicians...
[AbgeordnetenwatchApi] Fetched 733 mandates
[sync-politician-data] Phase 1: 0 bundestag members (using fallback)
[sync-politician-data] Phase 2: 612 abgeordnetenwatch politicians created
[sync-politician-data] Phase 3: 124 speeches synced (5 sittings)
[sync-politician-data] Completed in 8m 23s
```

### Expected output (partial failure)
```
[AbgeordnetenwatchApi] Fetching all politicians...
[AbgeordnetenwatchApi] HTTP 429 (rate limit)
[syncFallback] abgeordnetenwatch-politicians: primary failed, trying fallback...
[BundestagApi] Fetched 50 members
[sync-politician-data] Phase 2: 50 politicians created (fallback)
[SyncHealth] Phase 2: 50/733 (incomplete)
[SyncHealth] Phase 'abgeordnetenwatch' enqueued for retry (attempt 1/5, will retry)
```

---

## 3. Monitoring

### Database counts

```bash
# Total politicians
docker exec openafd sqlite3 /app/server/storage/openafd.db "SELECT COUNT(*) FROM politicians;"
# Expected: 700+ on first run, 700+ on subsequent (idempotent upserts)

# By source
docker exec openafd sqlite3 /app/server/storage/openafd.db \
  "SELECT source, COUNT(*) FROM politicians GROUP BY source;"
# Expected:
#   bundestag|N
#   abgeordnetenwatch|M

# Speeches
docker exec openafd sqlite3 /app/server/storage/openafd.db \
  "SELECT COUNT(*) FROM politician_speech;"
# Expected: 100+ (5 sittings × ~20 speeches each)

# Sync log history
docker exec openafd sqlite3 /app/server/storage/openafd.db \
  "SELECT id, source, status, itemsTotal, itemsProcessed, itemsFailed, createdAt FROM politician_sync_log ORDER BY id DESC LIMIT 10;"
```

### Sync log via API

```bash
# Get latest sync status
curl http://localhost:3001/api/politician/sync/status \
  -H "Authorization: Bearer $ANYTHING_LLM_API_KEY"
# Returns: { lastRun, lastSuccess, sources, retryQueue }

# Detailed sync history
curl http://localhost:3001/api/politician/sync/log \
  -H "Authorization: Bearer $ANYTHING_LLM_API_KEY"
```

### Retry queue

```bash
# View pending retries
docker exec openafd sqlite3 /app/server/storage/openafd.db \
  "SELECT phase, attempts, lastError, nextRetryAt, status FROM politician_sync_retry;"
# Expected: 0 rows on healthy sync, < 5 rows on flaky sync
```

---

## 4. Troubleshooting

### Problem: Sync job crashes immediately

**Check logs:**
```bash
docker exec openafd tail -50 /app/server/storage/logs/server.log
docker logs openafd 2>&1 | grep -i "sync\|politician" | tail -20
```

**Common causes:**

#### 4.1 `STORAGE_DIR` not set
```
TypeError [ERR_INVALID_ARG_TYPE]: The "paths[0]" argument must be of type string
```
**Fix:** See `docs/DOCKER-DEPLOYMENT.md` Pitfall #2. Add to docker-compose.yml `environment:`.

#### 4.2 Database file not writable
```
Error: EACCES: permission denied, open '/app/server/storage/openafd.db'
```
**Fix:** Match UID/GID between host and container:
```bash
# In docker/.env
UID='1000'
GID='1000'
```

#### 4.3 Network unreachable
```
Error: getaddrinfo ENOTFOUND www.abgeordnetenwatch.de
```
**Fix:** Check DNS, network policy, firewall.

---

### Problem: HTTP 404 from APIs

**Symptom:**
```
[BundestagApi] HTTP 404 for https://www.bundestag.de/.../Abgeordnete20_WP.formular
[AbgeordnetenwatchApi] HTTP 404 for .../parliament-period/?parliament=111
```

**Cause:** APIs changed for new Wahlperiode (21. WP).

**Fix:** Verify Issue #84 was merged. Check that `server/utils/politician/abgeordnetenwatchApi.js` uses `parliament_period=132`:
```bash
grep "parliament_period\|parliament=111" server/utils/politician/abgeordnetenwatchApi.js
# Should show: parliament_period=132 (NOT parliament=111)
```

---

### Problem: HTTP 429 (rate limit)

**Symptom:**
```
[AbgeordnetenwatchApi] HTTP 429
[syncFallback] primary failed, trying fallback...
```

**Fix:** 
1. Wait 5-10 minutes (AW rate limit is 1 req/2s)
2. The fallback will use Bundestag data
3. Failed phase enqueues for retry via `politician_sync_retry` table
4. Next Bree run (within 6h) will retry

If persistent, increase `POLITICIAN_SYNC_RATE_LIMIT_MS` in `.env`:
```bash
POLITICIAN_SYNC_RATE_LIMIT_MS=2000  # Default 500ms
```

---

### Problem: Sync succeeds but DB count is 0

**Symptom:**
```
[sync-politician-data] Phase 1: 0 bundestag members
[sync-politician-data] Phase 2: 0 abgeordnetenwatch politicians
```

**Cause:** All phases failed silently. Check:
```bash
docker exec openafd sqlite3 /app/server/storage/openafd.db \
  "SELECT status, itemsFailed, lastError FROM politician_sync_log ORDER BY id DESC LIMIT 5;"
```

**Fix:** Common culprits:
1. Empty source data (e.g. WP20 already over, no mandates returned)
2. Field mapping bug (Agent 5 fix may not be on main)

---

### Problem: Sync takes too long (> 30 min)

**Cause:** Default `Bree` job timeout is 30 min. Large first run + many Plenarprotokolle can exceed.

**Fix:** Reduce `POLITICIAN_SYNC_SITTINGS_PER_RUN`:
```bash
# In docker/.env
POLITICIAN_SYNC_SITTINGS_PER_RUN=3  # Default 5
```

For first run only, run manually and let it complete (Bree job has its own timeout):
```bash
docker exec openafd node /app/server/jobs/sync-politician-data.js
# Don't wait — let it run in background
```

---

### Problem: DB corrupted

**Symptom:**
```
Error: database disk image is malformed
```

**Fix:**
```bash
# 1. Stop container
docker stop openafd

# 2. Backup current DB (just in case)
cp $STORAGE_LOCATION/openafd.db openafd.db.corrupt.$(date +%Y%m%d)

# 3. Re-init from scratch
rm $STORAGE_LOCATION/openafd.db

# 4. Restart container (auto-creates fresh DB)
docker start openafd

# 5. Run sync
docker exec openafd node /app/server/jobs/sync-politician-data.js
```

---

## 5. Health endpoints

### `GET /api/politician/sync/status`

Returns latest sync status (one of `ok`, `failed`, `running`, `never`).

```bash
curl -H "Authorization: Bearer $API_KEY" \
  http://localhost:3001/api/politician/sync/status
```

**Response shape:**
```json
{
  "lastRun": "2026-06-08T12:34:56Z",
  "lastSuccess": "2026-06-08T12:42:18Z",
  "isHealthy": true,
  "sources": {
    "bundestag": {
      "status": "ok",
      "count": 730,
      "lastSuccess": "2026-06-08T12:34:56Z",
      "lastAttempt": "2026-06-08T12:34:56Z"
    },
    "abgeordnetenwatch": {
      "status": "ok",
      "count": 612,
      "lastSuccess": "2026-06-08T12:38:12Z"
    },
    "plenarprotokolle": {
      "status": "ok",
      "count": 124
    }
  },
  "retryQueue": []
}
```

### `GET /api/politician/stats`

```bash
curl -H "Authorization: Bearer $API_KEY" \
  http://localhost:3001/api/politician/stats
```

**Response:**
```json
{
  "total": 1342,
  "bySource": {
    "bundestag": 730,
    "abgeordnetenwatch": 612
  },
  "byParty": {
    "AfD": 152,
    "CDU/CSU": 256,
    "SPD": 207,
    "Grüne": 118,
    "FDP": 91,
    "Linke": 39
  },
  "speeches": 124
}
```

### `GET /api/politician/search`

```bash
curl -H "Authorization: Bearer $API_KEY" \
  "http://localhost:3001/api/politician/search?q=Weidel&party=AfD"
```

---

## 6. Disaster recovery

### Wipe and re-sync (clean slate)

```bash
# Stop container
docker stop openafd

# Backup current DB
cp $STORAGE_LOCATION/openafd.db $STORAGE_LOCATION/openafd.db.bak.$(date +%s)

# Wipe politician tables only (preserves other data)
docker exec openafd sqlite3 /app/server/storage/openafd.db <<SQL
DELETE FROM politician_speech;
DELETE FROM politician_sync_log;
DELETE FROM politician_sync_retry;
DELETE FROM politicians;
SQL

# Restart + sync
docker start openafd
sleep 10
docker exec openafd node /app/server/jobs/sync-politician-data.js
```

### Full reset (nuclear option)

```bash
docker stop openafd && docker rm openafd
docker volume rm openafd-storage  # DELETES ALL DATA
# Recreate container
docker run -d --name openafd -p 3001:3001 --cap-add SYS_ADMIN \
  -v $STORAGE_LOCATION:/app/server/storage \
  -v $STORAGE_LOCATION/.env:/app/server/.env \
  -e STORAGE_DIR=/app/server/storage \
  openafd/openafd:latest
# Wait for migrations + initial sync
sleep 60
```

---

## 7. Common queries (operational)

### Find AfD politicians missing photos
```sql
SELECT id, firstName, lastName, party
FROM politicians
WHERE party = 'AfD' AND (photoUrl IS NULL OR photoUrl = '')
ORDER BY lastName;
```

### Find speeches without speaker match
```sql
SELECT s.id, s.speakerName, s.text, s.date
FROM politician_speech s
LEFT JOIN politicians p ON s.politicianId = p.id
WHERE s.politicianId IS NULL AND s.matchConfidence < 0.5
LIMIT 20;
```

### Sync runs per day
```sql
SELECT DATE(createdAt) as day, COUNT(*) as runs, AVG(itemsProcessed) as avg_processed
FROM politician_sync_log
WHERE createdAt > DATE('now', '-7 days')
GROUP BY day
ORDER BY day DESC;
```

### Failed phases
```sql
SELECT phase, attempts, lastError, nextRetryAt, status
FROM politician_sync_retry
WHERE status = 'pending'
ORDER BY nextRetryAt;
```

---

## 8. Schedule (Bree)

Sync runs every 6 hours. Configured in `server/BackgroundWorkers/index.js`:

```js
{
  name: "sync-politician-data",
  interval: "6h",  // 4x daily
  timeout: 30 * 60 * 1000,  // 30 min hard limit
}
```

For more frequent sync (e.g. during election weeks):
```js
interval: "1h",  // Every hour
```

For less frequent (after initial population):
```js
interval: "24h",  // Daily
```

---

## 9. Acceptance criteria

Sync job is considered **production-ready** when:

- [ ] `GET /api/politician/stats` returns non-zero counts
- [ ] `GET /api/politician/search?q=Weidel` returns 1+ results
- [ ] `GET /api/politician/sync/status` shows all sources as `ok`
- [ ] `politician_sync_retry` has 0 pending entries
- [ ] Last successful sync was within 24 hours
- [ ] All 3 phases (bundestag, abgeordnetenwatch, plenarprotokolle) succeeded
- [ ] No "STORAGE_DIR" warnings in container logs

---

**Last updated:** 2026-06-08
**Version:** 1.0

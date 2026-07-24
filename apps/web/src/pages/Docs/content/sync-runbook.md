# Politician Sync Runbook

Docs: SYNC-RUNBOOK.md
Purpose: Operational guide for politician data synchronization

## Overview

The politician sync system fetches data from three sources:
1. **Bundestag API** — Bundestag members (WP 21)
2. **Abgeordnetenwatch** — Politician profiles and mandates
3. **Plenarprotokolle** — Parliamentary speeches

## Current Status

- **Politicians in DB**: 733 (from Abgeordnetenwatch fallback)
- **Speeches**: 0 (plenar-speeches sync failing)
- **Votes**: 0
- **Mandates**: 0

## Manual Operations

### Trigger Sync Manually

```bash
cd /Users/jeremy/dev/OpenSIN-Chat/server
node jobs/sync-politician-data.js
```

Or via API:
```bash
curl -X POST http://localhost:3001/api/politician/sync/trigger \
  -H "Authorization: Bearer <admin_api_key>"
```

### Check Sync Status

```bash
# API
curl http://localhost:3001/api/politician/sync/status

# Direct DB
cd /Users/jeremy/dev/OpenSIN-Chat/server
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function stats() {
  const counts = await Promise.all([
    prisma.politicians.count(),
    prisma.politician_speeches.count(),
    prisma.politician_votes.count(),
  ]);
  console.log('Politicians:', counts[0]);
  console.log('Speeches:', counts[1]);
  console.log('Votes:', counts[2]);
  await prisma.\$disconnect();
}
stats();
"
```

### Check Logs

```bash
# Sync logs (if storage/logs/ exists)
cat /Users/jeremy/dev/OpenSIN-Chat/server/storage/logs/politician-sync.log

# Or via DB
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function logs() {
  const logs = await prisma.politician_sync_log.findMany({
    orderBy: { startedAt: 'desc' },
    take: 10,
  });
  console.table(logs.map(l => ({
    source: l.source,
    status: l.status,
    processed: l.itemsProcessed,
    failed: l.itemsFailed,
    error: l.error ? l.error.substring(0, 50) : null,
  })));
  await prisma.\$disconnect();
}
logs();
"
```

### Retry Queue

```bash
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function queue() {
  const entries = await prisma.politician_sync_retry.findMany({
    orderBy: { nextRetryAt: 'asc' },
  });
  console.table(entries);
  await prisma.\$disconnect();
}
queue();
"
```

## Troubleshooting

### "Cannot read properties of undefined (reading 'findFirst')"

**Cause**: PlenarScraper expects a Prisma model that may not exist.
**Fix**: Check `prisma/schema.prisma` for `politician_speeches` table.

### 404 from Bundestag API

**Cause**: Bundestag formular endpoint changed or WP changed.
**Fix**: Check `server/utils/politician/bundestagApi.js` for endpoint URL.
Fallback: Abgeordnetenwatch is used automatically.

### No data after sync

**Cause**: Prisma migrations not applied.
**Fix**: 
```bash
cd /Users/jeremy/dev/OpenSIN-Chat/server
npx prisma migrate deploy
```

## Alerting

Health check runs automatically via cron/scheduler.
Set `SYNC_ALERT_WEBHOOK` env var for webhook notifications.

```bash
SYNC_ALERT_WEBHOOK=https://hooks.slack.com/services/... node server/utils/politician/syncHealthCheck.js
```

## Admin Dashboard

Navigate to `/settings/politician-sync` in the frontend to view:
- Live sync status per source
- Health indicators
- Retry queue
- Manual sync trigger

## API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/politician/stats` | GET | Total counts |
| `/api/politician/sync/status` | GET | Sync status + health |
| `/api/politician/sync/trigger` | POST | Trigger manual sync |
| `/api/politician/search` | GET | Search politicians |
| `/api/politician/:id` | GET | Politician detail |
| `/api/politician/:id/votes` | GET | Voting record |
| `/api/politician/:id/speeches` | GET | Speeches |

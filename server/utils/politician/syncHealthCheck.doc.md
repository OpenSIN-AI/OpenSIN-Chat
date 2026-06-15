# syncHealthCheck.doc.md

## What

Background health checker that flags politician sync sources as stale when they have not succeeded in the last 24 hours and optionally sends a webhook alert.

## Dependencies

- `server/utils/prisma` — reads `politician_sync_log`
- `server/utils/logger` — warning/error logging
- `server/__tests__/utils/politician/syncHealthCheck.test.js` — unit tests
- `docs/SYNC-RUNBOOK.md` — operational runbook

## Config values & limits

- `HOURS_24 = 24 * 60 * 60 * 1000` — staleness threshold
- Reads the most recent `200` sync log entries to build per-source status
- `SYNC_ALERT_WEBHOOK` — optional alert URL; ignored if unset

## Why

The sync status endpoint shows current state, but an operator needs to know when a source silently stops succeeding. This check runs independently and can be wired to a cron job or monitoring probe.

## Usage

```js
const { checkSyncHealth } = require("./utils/politician/syncHealthCheck");
const { healthy, staleSources } = await checkSyncHealth();
```

Or run standalone:

```bash
node server/utils/politician/syncHealthCheck.js
```

## Caveats

- When executed directly, the process exits with code `1` if any source is stale.
- Webhook failures are logged but do not mark the check as unhealthy.
- A source with no successful runs ever is reported as stale (`hoursSince: Infinity`).

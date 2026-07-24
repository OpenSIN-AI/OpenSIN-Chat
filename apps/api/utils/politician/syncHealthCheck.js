// SPDX-License-Identifier: MIT
// Purpose: Background health check for politician sync status
// Docs: syncHealthCheck.doc.md
const consoleLogger = require("../logger/console.js");

const prisma = require("../prisma");
const logger = require("../logger")();

async function fetchWithRetry(url, opts, maxRetries = 3) {
  for (let i = 0; i <= maxRetries; i++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    try {
      const res = await fetch(url, { ...opts, signal: ctrl.signal });
      clearTimeout(t);
      if (res.ok) return res;
      if (res.status < 500) return res;
    } catch (e) {
      clearTimeout(t);
      if (i === maxRetries) {
        consoleLogger.error(
          `[syncHealthCheck] Webhook ${url} failed after ${maxRetries} retries: ${e.message}`,
        );
        return null;
      }
    }
    const delay = 1000 * Math.pow(2, i) + Math.random() * 500;
    await new Promise((r) => setTimeout(r, delay));
  }
  return null;
}

/**
 * Check if any politician sync source is stale (>24h since last success).
 * Logs warnings and optionally sends alerts via webhook.
 * @param {import("@prisma/client").PrismaClient} [client] - optional Prisma client for testing
 */
async function checkSyncHealth(client = prisma) {
  try {
    const logs = await client.politician_sync_log.findMany({
      orderBy: { startedAt: "desc" },
      take: 200,
    });

    const bySource = new Map();
    for (const log of logs) {
      const key = log.source || "unknown";
      if (!bySource.has(key)) {
        bySource.set(key, {
          source: key,
          lastSuccess: null,
          status: log.status,
        });
      }
      const entry = bySource.get(key);
      if (
        !entry.lastSuccess &&
        (log.status === "completed" || log.status === "ok")
      ) {
        entry.lastSuccess = log.completedAt || log.startedAt;
      }
    }

    const now = Date.now();
    const HOURS_24 = 24 * 60 * 60 * 1000;
    const staleSources = [];

    for (const [, source] of bySource) {
      const lastSuccessTime = source.lastSuccess
        ? new Date(source.lastSuccess).getTime()
        : 0;
      const isStale = !lastSuccessTime || now - lastSuccessTime > HOURS_24;
      if (isStale) {
        staleSources.push({
          source: source.source,
          hoursSince: lastSuccessTime
            ? Math.floor((now - lastSuccessTime) / (60 * 60 * 1000))
            : Infinity,
          lastSuccess: source.lastSuccess,
        });
      }
    }

    if (staleSources.length > 0) {
      logger.warn(
        `[SyncHealth] ${staleSources.length} stale politician sync sources detected`,
      );
      for (const s of staleSources) {
        logger.warn(
          `[SyncHealth] ${s.source} is stale (${s.hoursSince}h since last success)`,
        );
      }

      // Optional webhook alert
      if (process.env.SYNC_ALERT_WEBHOOK) {
        await fetchWithRetry(process.env.SYNC_ALERT_WEBHOOK, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "politician_sync_stale",
            sources: staleSources,
            timestamp: new Date().toISOString(),
          }),
        });
      }
    }

    return { healthy: staleSources.length === 0, staleSources };
  } catch (err) {
    logger.error(`[SyncHealth] Check failed: ${err.message}`);
    return { healthy: false, staleSources: [], error: err.message };
  }
}

module.exports = { checkSyncHealth };

// Run directly if executed as script
if (require.main === module) {
  checkSyncHealth()
    .then(async (result) => {
      await prisma.$disconnect();
      consoleLogger.log(JSON.stringify(result, null, 2));
      process.exit(result.healthy ? 0 : 1);
    })
    .catch(async (err) => {
      await prisma.$disconnect();
      consoleLogger.error(err);
      process.exit(1);
    });
}

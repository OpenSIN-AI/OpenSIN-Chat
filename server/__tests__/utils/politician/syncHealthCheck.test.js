// SPDX-License-Identifier: MIT
/**
 * Tests for syncHealthCheck.js (Issue #173).
 *
 * Covers:
 *   - healthy result when all sources have recent success
 *   - stale source detection (>24h)
 *   - webhook alert dispatch
 *   - error handling when DB query fails
 */

"use strict";

const mockPrisma = {
  politician_sync_log: { findMany: jest.fn() },
};

jest.mock("../../../utils/prisma", () => mockPrisma);
jest.mock("../../../utils/logger", () => () => ({
  warn: jest.fn(),
  error: jest.fn(),
}));

const { checkSyncHealth } = require("../../../utils/politician/syncHealthCheck");

describe("syncHealthCheck", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.SYNC_ALERT_WEBHOOK;
  });

  function completedLog(source, startedAt, completedAt) {
    return {
      source,
      status: "completed",
      startedAt,
      completedAt,
      itemsProcessed: 10,
      itemsFailed: 0,
    };
  }

  test("returns healthy when all sources completed within 24h", async () => {
    const now = new Date();
    mockPrisma.politician_sync_log.findMany.mockResolvedValue([
      completedLog("bundestag", now, now),
      completedLog("abgeordnetenwatch", now, now),
    ]);

    const result = await checkSyncHealth();

    expect(result.healthy).toBe(true);
    expect(result.staleSources).toHaveLength(0);
    expect(result.error).toBeUndefined();
  });

  test("detects stale sources older than 24h", async () => {
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    mockPrisma.politician_sync_log.findMany.mockResolvedValue([
      completedLog("bundestag", twoDaysAgo, twoDaysAgo),
      completedLog("abgeordnetenwatch", twoDaysAgo, twoDaysAgo),
    ]);

    const result = await checkSyncHealth();

    expect(result.healthy).toBe(false);
    expect(result.staleSources).toHaveLength(2);
    expect(result.staleSources[0].source).toBe("bundestag");
    expect(result.staleSources[0].hoursSince).toBeGreaterThanOrEqual(48);
  });

  test("treats sources with no successful completion as stale", async () => {
    const now = new Date();
    mockPrisma.politician_sync_log.findMany.mockResolvedValue([
      {
        source: "plenar-speeches",
        status: "failed",
        startedAt: now,
        completedAt: null,
        itemsProcessed: 0,
        itemsFailed: 5,
      },
    ]);

    const result = await checkSyncHealth();

    expect(result.healthy).toBe(false);
    expect(result.staleSources[0].hoursSince).toBe(Infinity);
  });

  test("sends webhook alert when SYNC_ALERT_WEBHOOK is set", async () => {
    const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue({ ok: true });
    process.env.SYNC_ALERT_WEBHOOK = "https://example.com/webhook";

    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    mockPrisma.politician_sync_log.findMany.mockResolvedValue([
      completedLog("bundestag", twoDaysAgo, twoDaysAgo),
    ]);

    await checkSyncHealth();

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://example.com/webhook",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.stringContaining("politician_sync_stale"),
      }),
    );
    fetchSpy.mockRestore();
  });

  test("returns unhealthy when DB query fails", async () => {
    mockPrisma.politician_sync_log.findMany.mockRejectedValue(new Error("DB is down"));

    const result = await checkSyncHealth();

    expect(result.healthy).toBe(false);
    expect(result.error).toBe("DB is down");
  });

  test("accepts an injected Prisma client", async () => {
    const customFindMany = jest.fn().mockResolvedValue([]);
    const result = await checkSyncHealth({
      politician_sync_log: { findMany: customFindMany },
    });

    expect(customFindMany).toHaveBeenCalled();
    expect(result.healthy).toBe(true);
  });
});

// SPDX-License-Identifier: MIT
const consoleLogger = require("../utils/logger/console.js");

const prisma = require("../utils/prisma");

/**
 * Append-only audit event log.
 * Deletes are disabled by default (EVENT_LOGS_ALLOW_PURGE=1 to override)
 * to preserve a tamper-resistant activity trail.
 */
const EventLogs = {
  /**
   * Persist a named audit event with optional metadata and user attribution.
   * @param {string} event - Event name, e.g. "api_key_created"
   * @param {Object} [metadata={}] - Arbitrary key/value payload serialised to JSON
   * @param {number|null} [userId=null] - ID of the acting user (null = system action)
   * @param {Object|null} [tx=null] - Optional Prisma transaction client
   * @returns {Promise<{eventLog: Object|null, message: string|null}>}
   */
  logEvent: async function (event, metadata = {}, userId = null, tx = null) {
    try {
      const client = tx || prisma;
      const eventLog = await client.event_logs.create({
        data: {
          event,
          metadata: metadata ? JSON.stringify(metadata) : null,
          userId: userId ? Number(userId) : null,
          occurredAt: new Date(),
        },
      });
      consoleLogger.info(`\x1b[32m[Event Logged]\x1b[0m - ${event}`);
      return { eventLog, message: null };
    } catch (error) {
      consoleLogger.error(
        `\x1b[31m[Event Logging Failed]\x1b[0m - ${event}`,
        error.message,
      );
      return { eventLog: null, message: error.message };
    }
  },

  /**
   * Return log entries for a specific event name.
   * @param {string} event - Event name to filter by
   * @param {number|null} [limit=null] - Max rows (default 1000)
   * @param {Object|null} [orderBy=null] - Prisma orderBy (default occurredAt desc)
   * @returns {Promise<Array>}
   */
  getByEvent: async function (event, limit = null, orderBy = null) {
    try {
      const logs = await prisma.event_logs.findMany({
        where: { event },
        take: limit ?? 1000,
        select: {
          id: true,
          event: true,
          metadata: true,
          userId: true,
          occurredAt: true,
        },
        ...(orderBy !== null
          ? { orderBy }
          : { orderBy: { occurredAt: "desc" } }),
      });
      return logs;
    } catch (error) {
      consoleLogger.error(error.message);
      return [];
    }
  },

  /**
   * Return log entries attributed to a specific user.
   * @param {number|null} userId
   * @param {number|null} [limit=null] - Max rows (default 1000)
   * @param {Object|null} [orderBy=null] - Prisma orderBy (default occurredAt desc)
   * @returns {Promise<Array>}
   */
  getByUserId: async function (userId, limit = null, orderBy = null) {
    try {
      const logs = await prisma.event_logs.findMany({
        where: { userId: userId != null ? Number(userId) : null },
        take: limit ?? 1000,
        select: {
          id: true,
          event: true,
          metadata: true,
          userId: true,
          occurredAt: true,
        },
        ...(orderBy !== null
          ? { orderBy }
          : { orderBy: { occurredAt: "desc" } }),
      });
      return logs;
    } catch (error) {
      consoleLogger.error(error.message);
      return [];
    }
  },

  /**
   * Generic paginated query over event_logs (no user join).
   * @param {Object} [clause={}] - Prisma where clause
   * @param {number|null} [limit=null] - Max rows (default 1000)
   * @param {Object|null} [orderBy=null] - Prisma orderBy
   * @param {number|null} [offset=null] - Rows to skip (for pagination)
   * @returns {Promise<Array>}
   */
  where: async function (
    clause = {},
    limit = null,
    orderBy = null,
    offset = null,
  ) {
    try {
      const logs = await prisma.event_logs.findMany({
        where: clause,
        select: {
          id: true,
          event: true,
          metadata: true,
          userId: true,
          occurredAt: true,
        },
        ...(limit !== null ? { take: limit } : { take: 1000 }),
        ...(offset !== null ? { skip: offset } : {}),
        ...(orderBy !== null
          ? { orderBy }
          : { orderBy: { occurredAt: "desc" } }),
      });
      return logs;
    } catch (error) {
      consoleLogger.error(error.message);
      return [];
    }
  },

  /**
   * Paginated query including joined user data (username).
   * @param {Object} [clause={}] - Prisma where clause
   * @param {number|null} [limit=null] - Max rows (default 1000)
   * @param {number|null} [offset=null] - Rows to skip
   * @param {Object|null} [orderBy=null] - Prisma orderBy
   * @returns {Promise<Array<{id, event, metadata, userId, occurredAt, user: {username}}>>}
   */
  whereWithData: async function (
    clause = {},
    limit = null,
    offset = null,
    orderBy = null,
  ) {
    try {
      const logs = await prisma.event_logs.findMany({
        where: clause,
        select: {
          id: true,
          event: true,
          metadata: true,
          userId: true,
          occurredAt: true,
          user: { select: { username: true } },
        },
        ...(limit !== null ? { take: limit } : { take: 1000 }),
        ...(offset !== null ? { skip: offset } : {}),
        ...(orderBy !== null
          ? { orderBy }
          : { orderBy: { occurredAt: "desc" } }),
      });

      const results = logs.map((res) => ({
        id: res.id,
        event: res.event,
        metadata: res.metadata,
        userId: res.userId,
        occurredAt: res.occurredAt,
        user: res.user
          ? { username: res.user.username }
          : { username: "unknown user" },
      }));

      return results;
    } catch (error) {
      consoleLogger.error(error.message);
      return [];
    }
  },

  /**
   * Count log entries matching the clause.
   * @param {Object} [clause={}] - Prisma where clause
   * @returns {Promise<number>}
   */
  count: async function (clause = {}) {
    try {
      const count = await prisma.event_logs.count({
        where: clause,
      });
      return count;
    } catch (error) {
      consoleLogger.error(error.message);
      return 0;
    }
  },

  /**
   * Purge log entries. Disabled by default — set EVENT_LOGS_ALLOW_PURGE=1
   * to enable. Throws if the env var is not set (append-only protection).
   * @param {Object} [clause={}] - Prisma where clause
   * @returns {Promise<boolean>}
   */
  delete: async function (clause = {}) {
    const allow = process.env.EVENT_LOGS_ALLOW_PURGE;
    if (allow !== "1" && allow !== "true") {
      throw new Error(
        "[event_logs] delete refused: append-only mode. Set EVENT_LOGS_ALLOW_PURGE=1 to override.",
      );
    }
    try {
      await prisma.event_logs.deleteMany({
        where: clause,
      });
      return true;
    } catch (error) {
      consoleLogger.error(error.message);
      return false;
    }
  },
};

module.exports = { EventLogs };

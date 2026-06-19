// SPDX-License-Identifier: MIT
const prisma = require("../utils/prisma");

const EventLogs = {
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
      // eslint-disable-next-line no-console
      console.info(`\x1b[32m[Event Logged]\x1b[0m - ${event}`);
      return { eventLog, message: null };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(
        `\x1b[31m[Event Logging Failed]\x1b[0m - ${event}`,
        error.message,
      );
      return { eventLog: null, message: error.message };
    }
  },

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
      // eslint-disable-next-line no-console
      console.error(error.message);
      return [];
    }
  },

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
      // eslint-disable-next-line no-console
      console.error(error.message);
      return [];
    }
  },

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
        ...(limit !== null ? { take: limit } : {}),
        ...(offset !== null ? { skip: offset } : {}),
        ...(orderBy !== null
          ? { orderBy }
          : { orderBy: { occurredAt: "desc" } }),
      });
      return logs;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error.message);
      return [];
    }
  },

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
        ...(limit !== null ? { take: limit } : {}),
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
      // eslint-disable-next-line no-console
      console.error(error.message);
      return [];
    }
  },

  count: async function (clause = {}) {
    try {
      const count = await prisma.event_logs.count({
        where: clause,
      });
      return count;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error.message);
      return 0;
    }
  },

  delete: async function (clause = {}) {
    try {
      await prisma.event_logs.deleteMany({
        where: clause,
      });
      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error.message);
      return false;
    }
  },
};

module.exports = { EventLogs };

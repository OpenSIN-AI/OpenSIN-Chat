// SPDX-License-Identifier: MIT
const consoleLogger = require("../utils/logger/console.js");

const prisma = require("../utils/prisma");
const { clampLimit, MAX_LIST_LIMIT } = require("../utils/database/queryLimits");

const CacheData = {
  new: async function (inputs = {}) {
    try {
      const cache = await prisma.cache_data.create({
        data: inputs,
      });
      return { cache, message: null };
    } catch (error) {
      consoleLogger.error(error.message);
      return { cache: null, message: error.message };
    }
  },

  get: async function (clause = {}, limit = null, orderBy = null) {
    try {
      const cache = await prisma.cache_data.findFirst({
        where: clause,
        take: clampLimit(limit, { fallback: MAX_LIST_LIMIT }),
        ...(orderBy !== null ? { orderBy } : {}),
      });
      return cache || null;
    } catch (error) {
      consoleLogger.error(error.message);
      return null;
    }
  },

  delete: async function (clause = {}) {
    try {
      await prisma.cache_data.deleteMany({
        where: clause,
      });
      return true;
    } catch (error) {
      consoleLogger.error(error.message);
      return false;
    }
  },

  where: async function (clause = {}, limit = null, orderBy = null) {
    try {
      const caches = await prisma.cache_data.findMany({
        where: clause,
        take: clampLimit(limit, { fallback: MAX_LIST_LIMIT }),
        ...(orderBy !== null ? { orderBy } : {}),
      });
      return caches;
    } catch (error) {
      consoleLogger.error(error.message);
      return [];
    }
  },

  count: async function (clause = {}) {
    try {
      const count = await prisma.cache_data.count({
        where: clause,
      });
      return count;
    } catch (error) {
      consoleLogger.error(error.message);
      return 0;
    }
  },
};

module.exports = { CacheData };

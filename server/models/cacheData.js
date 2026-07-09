// SPDX-License-Identifier: MIT
const consoleLogger = require("../utils/logger/console.js");

const prisma = require("../utils/prisma");
const { clampLimit, MAX_LIST_LIMIT } = require("../utils/database/queryLimits");

/**
 * Generic key/value cache table backed by SQLite via Prisma.
 * Used to persist transient computed data (model lists, provider responses,
 * etc.) without writing to disk or keeping them in process memory.
 */
const CacheData = {
  /**
   * Insert a new cache entry.
   * @param {Object} inputs - Prisma `cache_data` field values (name, data, belongsTo, byId, expiresAt)
   * @returns {Promise<{cache: Object|null, message: string|null}>}
   */
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

  /**
   * Return the first matching cache entry.
   * @param {Object} clause - Prisma where clause
   * @param {number|null} limit - Maximum rows (clamped to MAX_LIST_LIMIT)
   * @param {Object|null} orderBy - Prisma orderBy clause
   * @returns {Promise<Object|null>}
   */
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

  /**
   * Delete all cache entries matching the given clause.
   * @param {Object} clause - Prisma where clause
   * @returns {Promise<boolean>}
   */
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

  /**
   * Return all cache entries matching the given clause.
   * @param {Object} clause - Prisma where clause
   * @param {number|null} limit - Maximum rows (clamped to MAX_LIST_LIMIT)
   * @param {Object|null} orderBy - Prisma orderBy clause
   * @returns {Promise<Array>}
   */
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

  /**
   * Count cache entries matching the given clause.
   * @param {Object} clause - Prisma where clause
   * @returns {Promise<number>}
   */
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

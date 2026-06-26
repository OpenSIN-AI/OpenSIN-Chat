// SPDX-License-Identifier: MIT
const consoleLogger = require("../utils/logger/console.js");

const prisma = require("../utils/prisma");

const ApiKey = {
  tablename: "api_keys",
  writable: ["name"],

  makeSecret: () => {
    const uuidAPIKey = require("uuid-apikey");
    return uuidAPIKey.create().apiKey;
  },

  _stripSecret: function (apiKey) {
    if (!apiKey) return null;
    const { secret: _secret, ...rest } = apiKey;
    return rest;
  },

  create: async function (createdByUserId = null, name = null) {
    try {
      const normalizedName =
        typeof name === "string" && name.trim().length > 0 ? name.trim() : null;
      const apiKey = await prisma.api_keys.create({
        data: {
          name: normalizedName,
          secret: this.makeSecret(),
          createdBy: createdByUserId,
        },
      });

      return { apiKey, error: null };
    } catch (error) {
      consoleLogger.error("FAILED TO CREATE API KEY.", error.message);
      return { apiKey: null, error: error.message };
    }
  },

  get: async function (clause = {}) {
    try {
      const apiKey = await prisma.api_keys.findFirst({ where: clause });
      return apiKey ? this._stripSecret(apiKey) : null;
    } catch (error) {
      consoleLogger.error("FAILED TO GET API KEY.", error.message);
      return null;
    }
  },

  count: async function (clause = {}) {
    try {
      const count = await prisma.api_keys.count({ where: clause });
      return count;
    } catch (error) {
      consoleLogger.error("FAILED TO COUNT API KEYS.", error.message);
      return 0;
    }
  },

  delete: async function (clause = {}) {
    try {
      await prisma.api_keys.deleteMany({ where: clause });
      return true;
    } catch (error) {
      consoleLogger.error("FAILED TO DELETE API KEY.", error.message);
      return false;
    }
  },

  /**
   * Deletes all developer API keys for a user.
   * Should be called when a user is deleted to revoke all their keys.
   * @param {number} userId - The user ID whose keys should be deleted
   * @returns {Promise<{success: boolean, error: string|null}>}
   */
  deleteAllForUser: async function (userId) {
    try {
      if (!userId) return { success: false, error: "User ID is required" };
      await prisma.api_keys.deleteMany({
        where: { createdBy: parseInt(userId) },
      });
      return { success: true, error: null };
    } catch (error) {
      consoleLogger.error("Failed to delete API keys for user", error);
      return { success: false, error: error.message };
    }
  },

  where: async function (clause = {}, limit) {
    try {
      const apiKeys = await prisma.api_keys.findMany({
        where: clause,
        take: limit,
      });
      return apiKeys.map((k) => this._stripSecret(k));
    } catch (error) {
      consoleLogger.error("FAILED TO GET API KEYS.", error.message);
      return [];
    }
  },

  whereWithUser: async function (clause = {}, limit) {
    try {
      const { User } = require("./user");
      const apiKeys = await this.where(clause, limit);

      const userIds = [
        ...new Set(apiKeys.filter((k) => k.createdBy).map((k) => k.createdBy)),
      ];
      const users =
        userIds.length > 0 ? await User.where({ id: { in: userIds } }) : [];
      const userMap = new Map(users.map((u) => [u.id, u]));

      for (const apiKey of apiKeys) {
        if (!apiKey.createdBy) continue;
        const user = userMap.get(apiKey.createdBy);
        if (!user) continue;

        apiKey.createdBy = {
          id: user.id,
          username: user.username,
          role: user.role,
        };
      }

      return apiKeys;
    } catch (error) {
      consoleLogger.error("FAILED TO GET API KEYS WITH USER.", error.message);
      return [];
    }
  },
};

module.exports = { ApiKey };

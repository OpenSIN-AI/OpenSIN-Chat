// SPDX-License-Identifier: MIT
const consoleLogger = require("../utils/logger/console.js");
const crypto = require("node:crypto");

const prisma = require("../utils/prisma");

const HASH_PREFIX = "sha256:";

function hashKey(key) {
  return `${HASH_PREFIX}${crypto.createHash("sha256").update(String(key)).digest("hex")}`;
}

function isHashedKey(key) {
  return typeof key === "string" && key.startsWith(HASH_PREFIX);
}
const { clampLimit, MAX_LIST_LIMIT } = require("../utils/database/queryLimits");
const { SystemSettings } = require("./systemSettings");
const { ROLES } = require("../utils/middleware/multiUserProtected");

const BrowserExtensionApiKey = {
  _safeView: function (apiKey) {
    if (!apiKey) return null;
    const { key: _key, ...safe } = apiKey;
    return { ...safe, keyPrefix: "brx-••••" };
  },
  /**
   * Creates a new secret for a browser extension API key.
   * @returns {string} brx-*** API key to use with extension
   */
  makeSecret: () => {
    const uuidAPIKey = require("uuid-apikey");
    return `brx-${uuidAPIKey.create().apiKey}`;
  },

  /**
   * Creates a new api key for the browser Extension
   * @param {number|null} userId - User id to associate creation of key with.
   * @returns {Promise<{apiKey: import("@prisma/client").browser_extension_api_keys|null, error:string|null}>}
   */
  create: async function (userId = null) {
    try {
      const key = this.makeSecret();
      const stored = await prisma.browser_extension_api_keys.create({
        data: {
          key: hashKey(key),
          user_id: userId,
        },
      });
      // Return the credential exactly once. Subsequent reads are masked.
      return { apiKey: { ...stored, key }, error: null };
    } catch (error) {
      consoleLogger.error("Failed to create browser extension API key", error);
      return { apiKey: null, error: error.message };
    }
  },

  /**
   * Validated existing API key
   * @param {string} key
   * @returns {Promise<{apiKey: import("@prisma/client").browser_extension_api_keys|boolean}>}
   */
  validate: async function (key) {
    if (!key || !key.startsWith("brx-")) return false;
    try {
      const presentedKey = key.toString();
      let apiKey = await prisma.browser_extension_api_keys.findUnique({
        where: { key: hashKey(presentedKey) },
      });

      // Migrate legacy plaintext rows after their first successful use.
      if (!apiKey) {
        const legacy = await prisma.browser_extension_api_keys.findUnique({
          where: { key: presentedKey },
        });
        if (legacy) {
          apiKey = await prisma.browser_extension_api_keys.update({
            where: { id: legacy.id },
            data: { key: hashKey(presentedKey) },
          });
        }
      }
      if (!apiKey) return false;

      const multiUserMode = await SystemSettings.isMultiUserMode();
      if (!multiUserMode) return this._safeView(apiKey);

      // In multi-user mode, check if the key is associated with a user.
      return apiKey.user_id ? this._safeView(apiKey) : false;
    } catch (error) {
      consoleLogger.error(
        "FAILED TO VALIDATE BROWSER EXTENSION API KEY.",
        error.message,
      );
      return false;
    }
  },

  /**
   * Fetches browser api key by params.
   * @param {object} clause - Prisma props for search
   * @returns {Promise<{apiKey: import("@prisma/client").browser_extension_api_keys|boolean}>}
   */
  get: async function (clause = {}) {
    try {
      let apiKey = null;
      if (typeof clause.key === "string" && !isHashedKey(clause.key)) {
        const presentedKey = clause.key;
        const rest = { ...clause };
        delete rest.key;
        apiKey = await prisma.browser_extension_api_keys.findFirst({
          where: { ...rest, key: hashKey(presentedKey) },
        });
        if (!apiKey) {
          const legacy = await prisma.browser_extension_api_keys.findFirst({
            where: { ...rest, key: presentedKey },
          });
          if (legacy) {
            apiKey = await prisma.browser_extension_api_keys.update({
              where: { id: legacy.id },
              data: { key: hashKey(presentedKey) },
            });
          }
        }
      } else {
        apiKey = await prisma.browser_extension_api_keys.findFirst({
          where: clause,
        });
      }
      return this._safeView(apiKey);
    } catch (error) {
      consoleLogger.error(
        "FAILED TO GET BROWSER EXTENSION API KEY.",
        error.message,
      );
      return null;
    }
  },

  /**
   * Deletes browser api key by db id.
   * @param {number} id - database id of browser key
   * @returns {Promise<{success: boolean, error:string|null}>}
   */
  delete: async function (id) {
    try {
      await prisma.browser_extension_api_keys.delete({
        where: { id: parseInt(id) },
      });
      return { success: true, error: null };
    } catch (error) {
      consoleLogger.error("Failed to delete browser extension API key", error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Deletes all browser extension API keys for a user.
   * Should be called when a user is deleted to revoke all their keys.
   * @param {number} userId - The user ID whose keys should be deleted
   * @returns {Promise<{success: boolean, error: string|null}>}
   */
  deleteAllForUser: async function (userId) {
    try {
      if (!userId) return { success: false, error: "User ID is required" };
      await prisma.browser_extension_api_keys.deleteMany({
        where: { user_id: parseInt(userId) },
      });
      return { success: true, error: null };
    } catch (error) {
      consoleLogger.error(
        "Failed to delete browser extension API keys for user",
        error,
      );
      return { success: false, error: error.message };
    }
  },

  /**
   * Gets browser keys by params
   * @param {object} clause
   * @param {number|null} limit
   * @param {object|null} orderBy
   * @returns {Promise<import("@prisma/client").browser_extension_api_keys[]>}
   */
  where: async function (clause = {}, limit = null, orderBy = null) {
    try {
      const apiKeys = await prisma.browser_extension_api_keys.findMany({
        where: clause,
        take: clampLimit(limit, { fallback: MAX_LIST_LIMIT }),
        ...(orderBy !== null ? { orderBy } : {}),
        include: {
          user: { select: { id: true, username: true, role: true } },
        },
      });
      return apiKeys.map((apiKey) => this._safeView(apiKey));
    } catch (error) {
      consoleLogger.error(
        "FAILED TO GET BROWSER EXTENSION API KEYS.",
        error.message,
      );
      return [];
    }
  },

  /**
   * Get browser API keys for user
   * @param {import("@prisma/client").users} user
   * @param {object} clause
   * @param {number|null} limit
   * @param {object|null} orderBy
   * @returns {Promise<import("@prisma/client").browser_extension_api_keys[]>}
   */
  whereWithUser: async function (
    user,
    clause = {},
    limit = null,
    orderBy = null,
  ) {
    // Admin can view and use any keys
    if ([ROLES.admin].includes(user.role))
      return await this.where(clause, limit, orderBy);

    try {
      const apiKeys = await prisma.browser_extension_api_keys.findMany({
        where: {
          ...clause,
          user_id: user.id,
        },
        include: {
          user: { select: { id: true, username: true, role: true } },
        },
        take: clampLimit(limit, { fallback: MAX_LIST_LIMIT }),
        ...(orderBy !== null ? { orderBy } : {}),
      });
      return apiKeys.map((apiKey) => this._safeView(apiKey));
    } catch (error) {
      consoleLogger.error(error.message);
      return [];
    }
  },

  /**
   * Updates owner of all DB ids to new admin.
   * @param {number} userId
   * @returns {Promise<void>}
   */
  migrateApiKeysToMultiUser: async function (userId) {
    try {
      await prisma.browser_extension_api_keys.updateMany({
        where: {
          user_id: null,
        },
        data: {
          user_id: userId,
        },
      });
    } catch (error) {
      consoleLogger.error(
        "Error migrating API keys to multi-user mode:",
        error,
      );
    }
  },
};

module.exports = { BrowserExtensionApiKey, hashKey, isHashedKey };

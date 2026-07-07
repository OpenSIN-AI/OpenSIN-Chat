// SPDX-License-Identifier: MIT
// Purpose: Phase 4 — DB-backed settings abstraction that replaces the
// AnythingLLM anti-pattern of mutating `process.env` at runtime and dumping
// application settings back to the `.env` file.
//
// Architecture:
//   - Persistent provider/application settings live in `managed_env_settings`.
//   - Sensitive values (API keys, tokens, secrets, passwords, connection
//     strings) are encrypted at rest via EncryptionManager (AES-256-GCM).
//   - Every mutation is recorded in `settings_audit_log` (secrets redacted).
//   - An in-memory cache with TTL avoids repeated DB hits on hot read paths.
//   - `process.env` is still populated at runtime as a read cache so the rest
//     of the codebase keeps working unchanged, but the DB is the source of
//     truth: on boot `hydrate()` loads DB values into `process.env`.
//
// NOTE: Bootstrap/infrastructure secrets (SIG_KEY, SIG_SALT, JWT_SECRET,
// DATABASE_URL, ports, storage paths, HTTPS certs) intentionally stay in the
// `.env` file — they are required *before* the DB/decryption layer is
// available (chicken-and-egg), so they cannot be stored encrypted in the DB.
const consoleLogger = require("../logger/console.js");

// Keys whose values must be encrypted at rest. Matches secrets, tokens, keys,
// passwords and DB connection strings regardless of provider.
const SENSITIVE_KEY_PATTERN =
  /(_KEY|_TOKEN|_SECRET|SECRET|PASSWORD|PASSWD|CREDENTIAL|CONNECTION_STRING|API_KEY|AUTH_TOKEN)/i;

// Default cache TTL (ms). Settings change rarely, so a short TTL is plenty to
// avoid hammering the DB on hot paths while staying fresh across a cluster.
const DEFAULT_TTL_MS = 30_000;

class SettingsManager {
  static _cache = new Map(); // envKey -> { value, expiresAt }
  static _ttlMs = DEFAULT_TTL_MS;
  static _hydrated = false;

  static log(text, ...args) {
    consoleLogger.log(`\x1b[35m[SettingsManager]\x1b[0m ${text}`, ...args);
  }

  /** Whether an env key holds a sensitive value that must be encrypted. */
  static isSensitive(envKey = "") {
    return SENSITIVE_KEY_PATTERN.test(String(envKey));
  }

  /** Lazily required prisma client (avoids loading it at module import time). */
  static _db() {
    if (!this.__db) this.__db = require("../prisma");
    return this.__db;
  }

  /** Lazily constructed EncryptionManager (avoids circular boot deps). */
  static _encryptor() {
    if (!this.__encryptor) {
      const { EncryptionManager } = require("../EncryptionManager");
      this.__encryptor = new EncryptionManager();
    }
    return this.__encryptor;
  }

  static _now() {
    return Date.now();
  }

  static _setCache(envKey, value) {
    this._cache.set(envKey, { value, expiresAt: this._now() + this._ttlMs });
  }

  static _getCache(envKey) {
    const hit = this._cache.get(envKey);
    if (!hit) return undefined;
    if (hit.expiresAt < this._now()) {
      this._cache.delete(envKey);
      return undefined;
    }
    return hit.value;
  }

  /** Clear the in-memory cache (used by tests + after bulk writes). */
  static clearCache() {
    this._cache.clear();
  }

  /** Decrypt a stored row value if it is flagged encrypted. */
  static _decodeRow(row) {
    if (!row) return null;
    if (!row.encrypted) return row.value;
    if (row.value === null || row.value === undefined) return row.value;
    try {
      return this._encryptor().decrypt(row.value);
    } catch (e) {
      this.log(`Failed to decrypt "${row.envKey}": ${e.message}`);
      return null;
    }
  }

  /**
   * Read a single setting. Resolution order: in-memory cache -> DB (decrypting
   * as needed) -> `process.env` fallback (graceful during migration).
   * @param {string} envKey
   * @returns {Promise<string|null>}
   */
  static async get(envKey) {
    if (!envKey) return null;
    const cached = this._getCache(envKey);
    if (cached !== undefined) return cached;

    try {
      const row = await this._db().managed_env_settings.findUnique({
        where: { envKey },
      });
      if (row) {
        const value = this._decodeRow(row);
        this._setCache(envKey, value);
        return value;
      }
    } catch (e) {
      this.log(`DB read failed for "${envKey}": ${e.message}`);
    }

    // Graceful fallback to the process env (pre-migration / bootstrap keys).
    const fallback = process.env[envKey] ?? null;
    this._setCache(envKey, fallback);
    return fallback;
  }

  /**
   * Persist a single setting to the DB (encrypting sensitive values), update
   * the runtime `process.env` read cache, record an audit entry, and refresh
   * the in-memory cache.
   * @param {string} envKey
   * @param {string|null} value
   * @param {{ userId?: number|null, category?: string|null, action?: string }} [opts]
   */
  static async set(envKey, value, opts = {}) {
    const { userId = null, category = null, action = "update" } = opts;
    if (!envKey) throw new Error("SettingsManager.set requires an envKey");

    const sensitive = this.isSensitive(envKey);
    const previousRuntime = process.env[envKey] ?? null;
    const storedValue =
      sensitive && value !== null && value !== undefined
        ? this._encryptor().encrypt(String(value))
        : value === null || value === undefined
          ? null
          : String(value);

    try {
      await this._db().managed_env_settings.upsert({
        where: { envKey },
        update: {
          value: storedValue,
          encrypted: sensitive,
          category,
          lastUpdatedAt: new Date(),
        },
        create: {
          envKey,
          value: storedValue,
          encrypted: sensitive,
          category,
        },
      });
    } catch (e) {
      this.log(`DB write failed for "${envKey}": ${e.message}`);
      throw e;
    }

    // Update runtime read cache so existing `process.env` consumers see it.
    if (value === null || value === undefined) delete process.env[envKey];
    else process.env[envKey] = String(value);

    this._setCache(envKey, value ?? null);
    await this._audit({ envKey, action, previousRuntime, value, sensitive, userId });
    return true;
  }

  /**
   * Bulk-persist a map of { ENV_KEY: value } to the DB. Replaces the old
   * `dumpENV()` file write for managed application settings.
   * @param {Record<string,string>} envMap
   * @param {{ userId?: number|null }} [opts]
   */
  static async persist(envMap = {}, opts = {}) {
    const { userId = null } = opts;
    const keys = Object.keys(envMap || {});
    for (const envKey of keys) {
      try {
        await this.set(envKey, envMap[envKey], { userId });
      } catch (e) {
        this.log(`persist() skipped "${envKey}": ${e.message}`);
      }
    }
    return keys.length;
  }

  /** Write a redacted-safe audit log entry for a setting mutation. */
  static async _audit({ envKey, action, previousRuntime, value, sensitive, userId }) {
    try {
      const redacted = !!sensitive;
      await this._db().settings_audit_log.create({
        data: {
          envKey,
          action: action || "update",
          previousValue: redacted
            ? previousRuntime
              ? "***redacted***"
              : null
            : (previousRuntime ?? null),
          newValue: redacted
            ? value
              ? "***redacted***"
              : null
            : value === null || value === undefined
              ? null
              : String(value),
          redacted,
          userId: userId ?? null,
        },
      });
    } catch (e) {
      // Audit failures must never block a settings write.
      this.log(`audit write failed for "${envKey}": ${e.message}`);
    }
  }

  /**
   * Load every persisted setting from the DB into `process.env` on boot, so
   * the rest of the app (which reads `process.env`) uses DB values as the
   * source of truth. Must run AFTER EncryptionManager is available.
   */
  static async hydrate() {
    try {
      const rows = await this._db().managed_env_settings.findMany();
      let loaded = 0;
      for (const row of rows) {
        const value = this._decodeRow(row);
        if (value === null || value === undefined) continue;
        process.env[row.envKey] = String(value);
        this._setCache(row.envKey, String(value));
        loaded++;
      }
      this._hydrated = true;
      if (loaded > 0) this.log(`Hydrated ${loaded} setting(s) from DB into runtime env.`);
      return loaded;
    } catch (e) {
      // A missing table (pre-migration) is non-fatal — fall back to env vars.
      this.log(`hydrate() skipped: ${e.message}`);
      return 0;
    }
  }

  /**
   * Read recent audit log entries (admin surface / rollback support).
   * @param {{ envKey?: string, limit?: number }} [opts]
   */
  static async auditLog({ envKey = null, limit = 100 } = {}) {
    try {
      return await this._db().settings_audit_log.findMany({
        where: envKey ? { envKey } : undefined,
        orderBy: { createdAt: "desc" },
        take: Math.min(Number(limit) || 100, 500),
      });
    } catch (e) {
      this.log(`auditLog() failed: ${e.message}`);
      return [];
    }
  }
}

module.exports = { SettingsManager, SENSITIVE_KEY_PATTERN };

// SPDX-License-Identifier: MIT
// Purpose: Phase 4 one-time migration — copies existing managed settings from
// the current environment (`.env` / process.env) into the DB-backed
// `managed_env_settings` table via SettingsManager. Sensitive values are
// encrypted at rest automatically.
//
// Usage (from the `server/` directory):
//   node --env-file-if-exists=.env scripts/migrate-env-to-db.js
//   NODE_ENV=production node scripts/migrate-env-to-db.js
//
// Idempotent: re-running simply upserts the same values.
const path = require("path");

process.env.NODE_ENV === "development"
  ? require("dotenv").config({ path: `.env.${process.env.NODE_ENV}` })
  : require("dotenv").config();

const { KEY_MAPPING } = require("../utils/helpers/updateENV/keyMapping");
const { SettingsManager } = require("../utils/SettingsManager");

/**
 * Migrate all KEY_MAPPING env vars from process.env into the DB via
 * SettingsManager. Idempotent — safe to call multiple times (upserts).
 * @param {{ silent?: boolean }} opts
 */
async function migrateEnvToDb({ silent = false } = {}) {
  const managedEnvKeys = Object.values(KEY_MAPPING).map((v) => v.envKey);
  let migrated = 0;
  let skipped = 0;

  if (!silent)
    console.log(
      `[migrate-env-to-db] Scanning ${managedEnvKeys.length} managed settings...`,
    );

  for (const envKey of managedEnvKeys) {
    const value = process.env[envKey];
    if (value === undefined || value === null || String(value).length === 0) {
      skipped++;
      continue;
    }
    try {
      await SettingsManager.set(envKey, value, {
        userId: null,
        action: "migrate",
        category: "env-migration",
      });
      if (!silent) {
        const label = SettingsManager.isSensitive(envKey) ? "(encrypted)" : "";
        console.log(`  migrated ${envKey} ${label}`);
      }
      migrated++;
    } catch (e) {
      console.error(`  FAILED ${envKey}: ${e.message}`);
    }
  }

  if (!silent)
    console.log(
      `[migrate-env-to-db] Done. Migrated ${migrated}, skipped ${skipped} (unset).`,
    );

  return { migrated, skipped };
}

module.exports = { migrateEnvToDb };

// Allow direct CLI execution: node scripts/migrate-env-to-db.js
if (require.main === module) {
  migrateEnvToDb()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(`[migrate-env-to-db] Fatal: ${e.message}`);
      process.exit(1);
    });
}

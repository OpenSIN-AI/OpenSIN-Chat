// SPDX-License-Identifier: MIT
// Purpose: Shared utility helpers for SystemSettings modules.
// Extracted from systemSettings.js as part of issue #510 God-File split.

const { default: slugify } = require("slugify");
const consoleLogger = require("../../utils/logger/console.js");

function isNullOrNaN(value) {
  if (value === null) return true;
  return isNaN(value);
}

/**
 * Merges a string field from source to target if it passes validation.
 * @param {Object} target - The target object to merge into
 * @param {Object} source - The source object to read from
 * @param {string} fieldName - The field name to merge
 * @param {Function|null} validator - Optional validator function that returns false to reject the value
 */
function mergeStringField(target, source, fieldName, validator = null) {
  const value = source[fieldName];
  if (value && typeof value === "string" && value.trim()) {
    if (validator && !validator(value)) return;
    target[fieldName] = value.trim();
  }
}

/**
 * Merges SQL connection updates from the frontend with existing backend connections.
 * Processes three types of actions: "remove", "update", and "add".
 *
 * @param {Array<Object>} existingConnections - Current connections stored in the database
 * @param {Array<Object>} updates - Connection updates from frontend, each with an action property
 * @returns {Array<Object>} - The merged connections array
 */
function mergeConnections(existingConnections = [], updates = []) {
  const connectionsMap = new Map(
    existingConnections.map((conn) => [conn.database_id, conn]),
  );

  for (const update of updates) {
    const {
      action,
      database_id,
      originalDatabaseId,
      connectionString,
      engine,
      schema,
    } = update;

    switch (action) {
      case "remove": {
        connectionsMap.delete(database_id);
        break;
      }
      case "update": {
        if (!connectionString) continue;
        const newId = slugify(database_id);

        // Verify original connection exists
        if (!connectionsMap.has(originalDatabaseId)) {
          consoleLogger.warn(
            `[mergeConnections] Update skipped: Original connection "${originalDatabaseId}" not found`,
          );
          break;
        }

        // Check for name conflict (excluding the one being updated)
        if (newId !== originalDatabaseId && connectionsMap.has(newId)) {
          consoleLogger.warn(
            `[mergeConnections] Update skipped: New name "${newId}" conflicts with existing connection`,
          );
          break;
        }

        // Remove old and add updated connection
        connectionsMap.delete(originalDatabaseId);
        connectionsMap.set(newId, {
          engine,
          database_id: newId,
          connectionString,
          ...(schema && { schema }),
        });
        break;
      }

      case "add": {
        if (!connectionString) continue;
        const slugifiedId = slugify(database_id);

        // Skip if already exists
        if (connectionsMap.has(slugifiedId)) {
          consoleLogger.warn(
            `[mergeConnections] Add skipped: Connection "${slugifiedId}" already exists`,
          );
          break;
        }

        connectionsMap.set(slugifiedId, {
          engine,
          database_id: slugifiedId,
          connectionString,
          ...(schema && { schema }),
        });
        break;
      }

      default: {
        throw new Error("SQL connection update contains an invalid action.");
      }
    }
  }

  return Array.from(connectionsMap.values());
}

module.exports = {
  isNullOrNaN,
  mergeStringField,
  mergeConnections,
};

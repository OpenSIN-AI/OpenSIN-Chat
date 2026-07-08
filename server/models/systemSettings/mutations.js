// SPDX-License-Identifier: MIT
// Purpose: Write/delete operations for SystemSettings.
// Extracted from systemSettings.js as part of issue #510 God-File split.

const consoleLogger = require("../../utils/logger/console.js");
const prisma = require("../../utils/prisma");
const { supportedFields } = require("./constants");

/**
 * Creates mutation methods bound to a SystemSettings instance.
 * @param {Object} ss - The SystemSettings object (for self-referencing calls)
 * @param {Object} validations - The validations map
 * @returns {Object} Mutation methods
 */
function createMutations(ss, validations) {
  return {
    // Can take generic keys and will pre-filter invalid keys
    // from the set before sending to the explicit update function
    // that will then enforce validations as well.
    updateSettings: async function (updates = {}) {
      const validFields = Object.keys(updates).filter((key) =>
        supportedFields.includes(key),
      );

      Object.entries(updates).forEach(([key]) => {
        if (validFields.includes(key)) return;
        delete updates[key];
      });

      return await ss._updateSettings(updates);
    },

    delete: async function (clause = {}) {
      try {
        if (!Object.keys(clause).length)
          throw new Error("Clause cannot be empty");
        await prisma.system_settings.deleteMany({ where: clause });
        return true;
      } catch (error) {
        consoleLogger.error(error.message);
        return false;
      }
    },

    // Explicit update of settings + key validations.
    // Only use this method when directly setting a key value
    // that takes no user input for the keys being modified.
    _updateSettings: async function (updates = {}) {
      try {
        const updatePromises = [];
        for (const key of Object.keys(updates)) {
          let validatedValue = updates[key];
          if (validations.hasOwnProperty(key)) {
            if (validations[key].constructor.name === "AsyncFunction") {
              validatedValue = await validations[key](updates[key]);
            } else {
              validatedValue = validations[key](updates[key]);
            }
          }

          if (validatedValue === undefined) continue;

          updatePromises.push(
            prisma.system_settings.upsert({
              where: { label: key },
              update: {
                value: validatedValue === null ? null : String(validatedValue),
              },
              create: {
                label: key,
                value: validatedValue === null ? null : String(validatedValue),
              },
            }),
          );
        }

        await Promise.all(updatePromises);
        if (Object.prototype.hasOwnProperty.call(updates, "multi_user_mode")) {
          try {
            const {
              invalidateMultiUserModeCache,
            } = require("../../utils/middleware/validatedRequest");
            invalidateMultiUserModeCache();
          } catch {}
        }
        return { success: true, error: null };
      } catch (error) {
        consoleLogger.error("FAILED TO UPDATE SYSTEM SETTINGS", error.message);
        return { success: false, error: error.message };
      }
    },

    markOnboardingComplete: async function () {
      try {
        await ss._updateSettings({ onboarding_complete: true });
        const { Telemetry } = require("../telemetry");
        await Telemetry.sendTelemetry("onboarding_complete");
        return true;
      } catch (error) {
        consoleLogger.error(error.message);
        return false;
      }
    },
  };
}

module.exports = { createMutations };

// SPDX-License-Identifier: MIT
const consoleLogger = require("../logger/console.js");

const { SystemSettings } = require("../../models/systemSettings");

// Explicitly check that a specific feature flag is enabled.
// This should match the key in the SystemSetting label.
function featureFlagEnabled(featureFlagKey = null) {
  return async (_, response, next) => {
    try {
      if (!featureFlagKey) return response.sendStatus(401);

      const flagValue = (
        await SystemSettings.get({ label: String(featureFlagKey) })
      )?.value;
      if (!flagValue) return response.sendStatus(401);

      if (flagValue === "enabled") {
        next();
        return;
      }

      return response.sendStatus(401);
    } catch (e) {
      consoleLogger.error(e.message, e);
      response.status(500).json({ error: "Internal server error" });
    }
  };
}
module.exports = {
  featureFlagEnabled,
};

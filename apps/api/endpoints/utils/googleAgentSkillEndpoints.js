// SPDX-License-Identifier: MIT
const consoleLogger = require("../../utils/logger/console.js");

const {
  isSingleUserMode,
} = require("../../utils/middleware/multiUserProtected");
const { validatedRequest } = require("../../utils/middleware/validatedRequest");
const { GmailBridge } = require("../../utils/agents/aibitat/plugins/gmail/lib");
const {
  GoogleCalendarBridge,
} = require("../../utils/agents/aibitat/plugins/google-calendar/lib");

function googleAgentSkillEndpoints(app) {
  if (!app) return;

  app.get(
    "/admin/agent-skills/gmail/status",
    [validatedRequest],
    async (_request, response) => {
      try {
        const config = await GmailBridge.getConfig();

        const enabledAccounts = Array.isArray(config.accounts)
          ? config.accounts.filter((account) => account.enabled !== false)
          : [];
        const isConfigured = Boolean(
          config.binaryAvailable && enabledAccounts.length > 0,
        );

        return response.status(200).json({
          success: true,
          isConfigured,
          accountCount: enabledAccounts.length,
          defaultAccountId: config.defaultAccountId || "",
          config: {
            provider: "himalaya",
            isConfigured,
            binaryAvailable: Boolean(config.binaryAvailable),
            binary: config.binary || "",
            version: config.version || "",
            configPath: config.configPath || "",
            runtimeError: config.runtimeError || "",
            accounts: enabledAccounts.map((account) => ({
              id: account.id,
              label: account.label,
              email: account.email,
            })),
          },
        });
      } catch (e) {
        consoleLogger.error("Gmail status error:", e);
        response
          .status(500)
          .json({ success: false, error: "Internal server error." });
      }
    },
  );

  app.get(
    "/admin/agent-skills/google-calendar/status",
    [validatedRequest, isSingleUserMode],
    async (_request, response) => {
      try {
        const config = await GoogleCalendarBridge.getConfig();

        const hasDeploymentId = !!config.deploymentId;
        const hasApiKey = !!config.apiKey;
        const isConfigured = hasDeploymentId && hasApiKey;

        const safeConfig = {
          deploymentId: config.deploymentId || "",
          apiKey: hasApiKey ? "********" : "",
        };

        return response.status(200).json({
          success: true,
          isConfigured,
          config: safeConfig,
        });
      } catch (e) {
        consoleLogger.error("Google Calendar status error:", e);
        response
          .status(500)
          .json({ success: false, error: "Internal server error." });
      }
    },
  );
}

module.exports = { googleAgentSkillEndpoints };

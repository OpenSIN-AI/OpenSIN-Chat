// SPDX-License-Identifier: MIT
// Purpose: System settings endpoints — ENV updates, password, multi-user mode, system prompts.
// Docs: server/endpoints/system.doc.md
const consoleLogger = require("../../utils/logger/console.js");

const crypto = require("crypto");
const { SystemSettings } = require("../../models/systemSettings");
const { User } = require("../../models/user");
const { Telemetry } = require("../../models/telemetry");
const { EventLogs } = require("../../models/eventLogs");
const {
  BrowserExtensionApiKey,
} = require("../../models/browserExtensionApiKey");
const { MobileDevice } = require("../../models/mobileDevice");
const { Memory } = require("../../models/memory");
const { WorkspaceChats } = require("../../models/workspaceChats");
const { SlashCommandPresets } = require("../../models/slashCommandsPresets");
const { AgentSkillWhitelist } = require("../../models/agentSkillWhitelist");
const { reqBody, multiUserMode } = require("../../utils/http");
const { updateENV } = require("../../utils/helpers/updateENV");
const { SettingsManager } = require("../../utils/SettingsManager");
const {
  validatedRequest,
  invalidateAuthTokenHash,
} = require("../../utils/middleware/validatedRequest");
const {
  flexUserRoleValid,
  ROLES,
} = require("../../utils/middleware/multiUserProtected");
const { simpleRateLimit } = require("../../utils/middleware/simpleRateLimit");

function settingsEndpoints(app) {
  if (!app) return;

  app.post(
    "/system/update-env",
    [validatedRequest, flexUserRoleValid([ROLES.admin])],
    async (request, response) => {
      try {
        const body = reqBody(request);
        const { newValues, error } = await updateENV(
          body,
          false,
          response?.locals?.user?.id,
        );
        response.status(200).json({ newValues, error });
      } catch (e) {
        consoleLogger.error(e.message, e);
        response
          .status(500)
          .json({ newValues: null, error: "Internal server error" });
      }
    },
  );

  app.post(
    "/system/update-password",
    [
      validatedRequest,
      simpleRateLimit({
        bucket: "password-update-ip",
        max: 10,
        windowMs: 60 * 60 * 1000,
        identity: "user",
      }),
    ],
    async (request, response) => {
      try {
        // Cannot update password in multi - user mode.
        if (multiUserMode(response)) {
          response.sendStatus(401);
          return;
        }

        let error = null;
        const { usePassword } = reqBody(request);
        if (!usePassword) {
          // Password is being disabled so directly unset everything to bypass validation.
          process.env.AUTH_TOKEN = "";
          process.env.JWT_SECRET = crypto.randomBytes(64).toString("base64url");
        } else {
          error = await updateENV(
            {
              AuthToken: crypto.randomBytes(48).toString("base64url"),
              JWTSecret: crypto.randomBytes(64).toString("base64url"),
            },
            true,
          )?.error;
        }
        invalidateAuthTokenHash();
        response.status(200).json({ success: !error, error });
      } catch (e) {
        consoleLogger.error(e.message, e);
        response
          .status(500)
          .json({ success: false, error: "Internal server error" });
      }
    },
  );

  app.post(
    "/system/enable-multi-user",
    [
      validatedRequest,
      simpleRateLimit({
        bucket: "enable-multi-user",
        max: 3,
        windowMs: 60 * 60 * 1000,
      }),
    ],
    async (request, response) => {
      let createdUser = null;
      try {
        if (response.locals.multiUserMode) {
          response.status(200).json({
            success: false,
            error: "Multi-user mode is already enabled.",
          });
          return;
        }

        const { username, password } = reqBody(request);
        if (!username || typeof username !== "string" || !username.trim()) {
          return response.status(400).json({ error: "Username is required." });
        }
        if (!password || typeof password !== "string" || !password.trim()) {
          return response.status(400).json({ error: "Password is required." });
        }
        const passwordCheck = User.checkPasswordComplexity(password);
        if (!passwordCheck.checkedOK) {
          return response.status(400).json({ error: passwordCheck.error });
        }
        const { user, error } = await User.create({
          username,
          password,
          role: ROLES.admin,
        });
        createdUser = user;

        if (error || !user) {
          response.status(400).json({
            success: false,
            error: error || "Failed to enable multi-user mode.",
          });
          return;
        }

        await SystemSettings._updateSettings({
          multi_user_mode: true,
        });
        await BrowserExtensionApiKey.migrateApiKeysToMultiUser(user.id);
        await Memory.migrateToMultiUser(user.id);
        await WorkspaceChats.migrateToMultiUser(user.id);
        await MobileDevice.migrateDevicesToMultiUser(user.id);
        await SlashCommandPresets.migrateToMultiUser(user.id);
        await AgentSkillWhitelist.clearSingleUserWhitelist();
        await updateENV(
          {
            JWTSecret:
              process.env.JWT_SECRET ||
              crypto.randomBytes(64).toString("base64url"),
          },
          true,
        );
        await Telemetry.sendTelemetry("enabled_multi_user_mode", {
          multiUserMode: true,
        });
        await EventLogs.logEvent("multi_user_mode_enabled", {}, user?.id);
        response.status(200).json({ success: !!user, error });
      } catch (e) {
        // Only roll back the user that was just created — NOT all users.
        // The previous code called User.delete({}) which wiped every user
        // from the database when any error occurred during multi-user
        // setup, destroying existing accounts and locking everyone out.
        if (createdUser?.id) {
          await User.delete({ id: createdUser.id }).catch(() => {});
        }
        await SystemSettings._updateSettings({
          multi_user_mode: false,
        });

        consoleLogger.error(e.message, e);
        response.sendStatus(500);
      }
    },
  );

  app.get(
    "/system/multi-user-mode",
    [validatedRequest],
    async (_, response) => {
      try {
        const multiUserMode = await SystemSettings.isMultiUserMode();
        response.status(200).json({ multiUserMode });
      } catch (e) {
        consoleLogger.error(e.message, e);
        response.sendStatus(500);
      }
    },
  );

  app.get(
    "/system/default-system-prompt",
    [validatedRequest, flexUserRoleValid([ROLES.all])],
    async (_, response) => {
      try {
        const defaultSystemPrompt = await SystemSettings.get({
          label: "default_system_prompt",
        });

        response.status(200).json({
          success: true,
          defaultSystemPrompt:
            defaultSystemPrompt?.value ||
            SystemSettings.saneDefaultSystemPrompt,
          saneDefaultSystemPrompt: SystemSettings.saneDefaultSystemPrompt,
        });
      } catch (error) {
        consoleLogger.error("Error fetching default system prompt:", error);
        response
          .status(500)
          .json({ success: false, message: "Internal server error" });
      }
    },
  );

  app.post(
    "/system/default-system-prompt",
    [validatedRequest, flexUserRoleValid([ROLES.admin])],
    async (request, response) => {
      try {
        const { defaultSystemPrompt } = reqBody(request);
        const { success, error } = await SystemSettings.updateSettings({
          default_system_prompt: defaultSystemPrompt,
        });
        if (!success)
          throw new Error(
            error && error.message
              ? error.message
              : "Failed to update default system prompt.",
          );
        response.status(200).json({
          success: true,
          message: "Default system prompt updated successfully.",
        });
      } catch (error) {
        const id = crypto.randomUUID();

        consoleLogger.error(
          `[system default-system-prompt error id=${id}]`,
          error,
        );
        response.status(500).json({
          success: false,
          message: "Internal server error",
          id,
        });
      }
    },
  );
  // Issue #4 — Settings rollback: restore a setting to its previous value
  // using the audit log entry. Admin-only.
  app.post(
    "/system/settings/rollback",
    [validatedRequest, flexUserRoleValid([ROLES.admin])],
    async (request, response) => {
      try {
        const { envKey } = reqBody(request);
        if (!envKey)
          return response
            .status(400)
            .json({ restored: false, error: "envKey is required" });
        const userId = response?.locals?.user?.id ?? null;
        const result = await SettingsManager.rollback(envKey, { userId });
        response.status(result.restored ? 200 : 400).json(result);
      } catch (e) {
        consoleLogger.error(e.message, e);
        response.status(500).json({ restored: false, error: e.message });
      }
    },
  );

  // Issue #4 — Settings audit log: read recent mutations for a key. Admin-only.
  app.get(
    "/system/settings/audit-log",
    [validatedRequest, flexUserRoleValid([ROLES.admin])],
    async (request, response) => {
      try {
        const { envKey, limit } = request.query;
        const entries = await SettingsManager.auditLog({
          envKey: envKey || null,
          limit: limit ? Number(limit) : 100,
        });
        response.status(200).json({ entries });
      } catch (e) {
        consoleLogger.error(e.message, e);
        response.status(500).json({ entries: [], error: e.message });
      }
    },
  );
}

module.exports = { settingsEndpoints };

// SPDX-License-Identifier: MIT
// Purpose: User self-service, slash command presets, and prompt variable endpoints.
// Docs: server/endpoints/system.doc.md
const consoleLogger = require("../../utils/logger/console.js");

const crypto = require("crypto");
const { User } = require("../../models/user");
const { EventLogs } = require("../../models/eventLogs");
const {
  BrowserExtensionApiKey,
} = require("../../models/browserExtensionApiKey");
const { ApiKey } = require("../../models/apiKeys");
const { SlashCommandPresets } = require("../../models/slashCommandsPresets");
const { SystemPromptVariables } = require("../../models/systemPromptVariables");
const { VALID_COMMANDS } = require("../../utils/chats");
const { reqBody, userFromSession, multiUserMode } = require("../../utils/http");
const { validatedRequest } = require("../../utils/middleware/validatedRequest");
const {
  flexUserRoleValid,
  ROLES,
} = require("../../utils/middleware/multiUserProtected");
const { simpleRateLimit } = require("../../utils/middleware/simpleRateLimit");

function userManagementEndpoints(app) {
  if (!app) return;

  // GDPR: User self-service account deletion (right to be forgotten)
  // Allows a user to delete their own account with password confirmation.
  app.delete(
    "/system/user",
    [
      validatedRequest,
      flexUserRoleValid([ROLES.all]),
      simpleRateLimit({
        bucket: "user-self-delete",
        max: 5,
        windowMs: 60 * 1000,
      }),
    ],
    async (request, response) => {
      try {
        const sessionUser = await userFromSession(request, response);
        if (!sessionUser?.id) {
          response
            .status(401)
            .json({ success: false, error: "Authentication required." });
          return;
        }

        const id = Number(sessionUser.id);
        const isMultiUser = await multiUserMode(response);

        // In multi-user mode, require password confirmation to prevent
        // account deletion via a stolen session token.
        if (isMultiUser) {
          const { currentPassword } = reqBody(request);
          if (!currentPassword) {
            response.status(400).json({
              success: false,
              error: "Current password is required to delete your account.",
            });
            return;
          }
          const fullUser = await User._get({ id });
          const bcrypt = require("bcryptjs");
          if (
            !fullUser ||
            !bcrypt.compareSync(String(currentPassword), fullUser.password)
          ) {
            await User.recordFailedLogin(id);
            response.status(403).json({
              success: false,
              error: "Current password is incorrect.",
            });
            return;
          }
        }

        // Prevent the last admin from deleting their own account (system lockout).
        if (sessionUser.role === ROLES.admin) {
          const adminCount = await User.count({ role: ROLES.admin });
          if (adminCount <= 1) {
            response.status(400).json({
              success: false,
              error:
                "Cannot delete the last remaining admin account. Assign another admin first.",
            });
            return;
          }
        }

        await BrowserExtensionApiKey.deleteAllForUser(id);
        await ApiKey.deleteAllForUser(id);
        await User.delete({ id });
        await EventLogs.logEvent(
          "user_self_deleted",
          { userName: sessionUser.username },
          id,
        );
        response.status(200).json({ success: true, error: null });
      } catch (e) {
        consoleLogger.error(e);
        response.sendStatus(500);
      }
    },
  );

  // Used for when a user in multi-user updates their own profile
  // from the UI.
  app.post(
    "/system/user",
    [
      validatedRequest,
      simpleRateLimit({
        bucket: "user-self-update",
        max: 10,
        windowMs: 60 * 1000,
      }),
    ],
    async (request, response) => {
      try {
        const sessionUser = await userFromSession(request, response);
        const { username, password, currentPassword, bio } = reqBody(request);
        const id = Number(sessionUser.id);

        if (!id) {
          response
            .status(400)
            .json({ success: false, error: "Invalid user ID" });
          return;
        }

        const updates = {};
        // If the username is being changed, validate it.
        // Otherwise, do not attempt to validate it to allow existing users to keep their username if not changing it.
        if (username !== sessionUser.username)
          updates.username = User.validations.username(String(username));

        // When changing password, verify the current password to prevent
        // account takeover via a stolen session token (e.g. XSS).
        if (password) {
          if (!currentPassword) {
            response.status(400).json({
              success: false,
              error: "Current password is required to change password.",
            });
            return;
          }
          const fullUser = await User._get({ id });
          const bcrypt = require("bcryptjs");
          if (
            !fullUser ||
            !bcrypt.compareSync(String(currentPassword), fullUser.password)
          ) {
            await User.recordFailedLogin(id);
            response.status(403).json({
              success: false,
              error: "Current password is incorrect.",
            });
            return;
          }
          updates.password = String(password);
        }

        if (bio) updates.bio = String(bio).slice(0, 1000);

        if (Object.keys(updates).length === 0) {
          response
            .status(400)
            .json({ success: false, error: "No updates provided" });
          return;
        }

        const { success, error } = await User.update(id, updates);
        response.status(200).json({ success, error });
      } catch (e) {
        const errorId = crypto.randomUUID();
        consoleLogger.error(`[endpoint error ${errorId}]`, e);
        response.status(500).json({
          success: false,
          error: "Internal server error",
          errorId,
        });
      }
    },
  );

  app.get(
    "/system/slash-command-presets",
    [validatedRequest, flexUserRoleValid([ROLES.all])],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const userPresets = await SlashCommandPresets.getUserPresets(user?.id);
        response.status(200).json({ presets: userPresets });
      } catch (error) {
        consoleLogger.error("Error fetching slash command presets:", error);
        response.status(500).json({ message: "Internal server error" });
      }
    },
  );

  app.post(
    "/system/slash-command-presets",
    [validatedRequest, flexUserRoleValid([ROLES.all])],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const { command, prompt, description } = reqBody(request);
        const formattedCommand = SlashCommandPresets.formatCommand(
          String(command),
        );

        if (Object.keys(VALID_COMMANDS).includes(formattedCommand)) {
          return response.status(400).json({
            message:
              "Cannot create a preset with a command that matches a system command",
          });
        }

        const presetData = {
          command: formattedCommand,
          prompt: prompt ? String(prompt) : "",
          description: description ? String(description) : "",
        };

        const preset = await SlashCommandPresets.create(user?.id, presetData);
        if (!preset) {
          return response
            .status(500)
            .json({ message: "Failed to create preset" });
        }
        response.status(201).json({ preset });
      } catch (error) {
        consoleLogger.error("Error creating slash command preset:", error);
        response.status(500).json({ message: "Internal server error" });
      }
    },
  );

  app.post(
    "/system/slash-command-presets/:slashCommandId",
    [validatedRequest, flexUserRoleValid([ROLES.all])],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const { slashCommandId } = request.params;
        const { command, prompt, description } = reqBody(request);
        const formattedCommand = SlashCommandPresets.formatCommand(
          String(command),
        );

        if (Object.keys(VALID_COMMANDS).includes(formattedCommand)) {
          return response.status(400).json({
            message:
              "Cannot update a preset to use a command that matches a system command",
          });
        }

        // Valid user running owns the preset if user session is valid.
        const ownsPreset = await SlashCommandPresets.get({
          userId: user?.id ?? null,
          id: Number(slashCommandId),
        });
        if (!ownsPreset)
          return response.status(404).json({ message: "Preset not found" });

        const updates = {
          command: formattedCommand,
          prompt: prompt ? String(prompt) : "",
          description: description ? String(description) : "",
        };

        const preset = await SlashCommandPresets.update(
          Number(slashCommandId),
          updates,
        );
        if (!preset) return response.sendStatus(422);
        response.status(200).json({ preset: { ...ownsPreset, ...updates } });
      } catch (error) {
        consoleLogger.error("Error updating slash command preset:", error);
        response.status(500).json({ message: "Internal server error" });
      }
    },
  );

  app.delete(
    "/system/slash-command-presets/:slashCommandId",
    [validatedRequest, flexUserRoleValid([ROLES.all])],
    async (request, response) => {
      try {
        const { slashCommandId } = request.params;
        const user = await userFromSession(request, response);

        // Valid user running owns the preset if user session is valid.
        const ownsPreset = await SlashCommandPresets.get({
          userId: user?.id ?? null,
          id: Number(slashCommandId),
        });
        if (!ownsPreset)
          return response
            .status(403)
            .json({ message: "Failed to delete preset" });

        await SlashCommandPresets.delete(Number(slashCommandId));
        response.sendStatus(204);
      } catch (error) {
        consoleLogger.error("Error deleting slash command preset:", error);
        response.status(500).json({ message: "Internal server error" });
      }
    },
  );

  app.get(
    "/system/prompt-variables",
    [validatedRequest, flexUserRoleValid([ROLES.all])],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const variables = await SystemPromptVariables.getAll(user?.id);
        response.status(200).json({ variables });
      } catch (error) {
        const id = crypto.randomUUID();

        consoleLogger.error(
          `[system prompt-variables fetch error id=${id}]`,
          error,
        );
        response.status(500).json({
          success: false,
          error: "Internal error",
          id,
        });
      }
    },
  );

  app.post(
    "/system/prompt-variables",
    [validatedRequest, flexUserRoleValid([ROLES.admin])],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const { key, value, description = null } = reqBody(request);

        if (!key || !value) {
          return response.status(400).json({
            success: false,
            error: "Key and value are required",
          });
        }

        const variable = await SystemPromptVariables.create({
          key,
          value,
          description,
          userId: user?.id || null,
        });

        response.status(200).json({
          success: true,
          variable,
        });
      } catch (error) {
        const id = crypto.randomUUID();

        consoleLogger.error(
          `[system prompt-variables create error id=${id}]`,
          error,
        );
        response.status(500).json({
          success: false,
          error: "Internal error",
          id,
        });
      }
    },
  );

  app.put(
    "/system/prompt-variables/:id",
    [validatedRequest, flexUserRoleValid([ROLES.admin])],
    async (request, response) => {
      try {
        const { id } = request.params;
        const { key, value, description = null } = reqBody(request);

        if (!key || !value) {
          return response.status(400).json({
            success: false,
            error: "Key and value are required",
          });
        }

        const variable = await SystemPromptVariables.update(Number(id), {
          key,
          value,
          description,
        });

        if (!variable) {
          return response.status(404).json({
            success: false,
            error: "Variable not found",
          });
        }

        response.status(200).json({
          success: true,
          variable,
        });
      } catch (error) {
        consoleLogger.error("Error updating system prompt variable:", error);
        response.status(500).json({
          success: false,
          error: "Failed to update system prompt variable.",
        });
      }
    },
  );

  app.delete(
    "/system/prompt-variables/:id",
    [validatedRequest, flexUserRoleValid([ROLES.admin])],
    async (request, response) => {
      try {
        const { id } = request.params;
        const success = await SystemPromptVariables.delete(Number(id));

        if (!success) {
          return response.status(404).json({
            success: false,
            error: "System prompt variable not found or could not be deleted",
          });
        }

        response.status(200).json({
          success: true,
        });
      } catch (error) {
        consoleLogger.error("Error deleting system prompt variable:", error);
        response.status(500).json({
          success: false,
          error: "Failed to delete system prompt variable.",
        });
      }
    },
  );
}

module.exports = { userManagementEndpoints };

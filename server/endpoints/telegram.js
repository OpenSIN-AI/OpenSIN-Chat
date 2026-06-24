// SPDX-License-Identifier: MIT
// Purpose: Telegram bot management endpoints — config, connect, disconnect,
// user approval/denial/revocation, and config updates.
// Docs: server/endpoints/telegram.js.doc.md
const consoleLogger = require("../utils/logger/console.js");

const { validatedRequest } = require("../utils/middleware/validatedRequest");
const {
  flexUserRoleValid,
  ROLES,
} = require("../utils/middleware/multiUserProtected");
const { reqBody } = require("../utils/http");
const {
  ExternalCommunicationConnector,
} = require("../models/externalCommunicationConnector");
const { Workspace } = require("../models/workspace");
const { getModelTag } = require("./utils");

const TELEGRAM_API_BASE = "https://api.telegram.org";
const TELEGRAM_BOT_TYPE = "telegram";

/**
 * Calls the Telegram Bot API getMe endpoint to validate the bot token
 * and retrieve the bot's username.
 * @param {string} botToken - The Telegram bot API token
 * @returns {Promise<{ok: boolean, username?: string, error?: string}>}
 */
async function validateBotToken(botToken) {
  try {
    const res = await fetch(
      `${TELEGRAM_API_BASE}/bot${botToken}/getMe`,
      { signal: AbortSignal.timeout(10_000) },
    );
    const data = await res.json();
    if (!data.ok) {
      return {
        ok: false,
        error: data.description || "Invalid bot token",
      };
    }
    return {
      ok: true,
      username: data.result?.username || "",
    };
  } catch (e) {
    return {
      ok: false,
      error: `Failed to validate bot token: ${e.message}`,
    };
  }
}

/**
 * Builds a safe config response (without the bot token) for the frontend.
 * @param {object|null} connector - The ExternalCommunicationConnector row
 * @returns {object|null} Safe config object
 */
function buildConfigResponse(connector) {
  if (!connector) return null;
  const cfg = connector.config || {};
  return {
    active: connector.active,
    connected: connector.active,
    bot_username: cfg.bot_username || "",
    default_workspace: cfg.default_workspace || "",
    active_thread_name: cfg.active_thread_name || "Default Thread",
    chat_model: cfg.chat_model || getModelTag(),
    voice_response_mode: cfg.voice_response_mode || "text_only",
  };
}

function telegramEndpoints(app) {
  if (!app) return;

  app.get(
    "/telegram/config",
    [validatedRequest, flexUserRoleValid([ROLES.admin])],
    async (_request, response) => {
      try {
        const connector = await ExternalCommunicationConnector.get(
          TELEGRAM_BOT_TYPE,
        );
        const config = buildConfigResponse(connector);
        return response.status(200).json({ config, error: null });
      } catch (e) {
        consoleLogger.error("Telegram config error:", e);
        return response
          .status(500)
          .json({ config: null, error: "Internal server error" });
      }
    },
  );

  app.post(
    "/telegram/connect",
    [validatedRequest, flexUserRoleValid([ROLES.admin])],
    async (request, response) => {
      try {
        const { bot_token, default_workspace } = reqBody(request);
        if (!bot_token || typeof bot_token !== "string") {
          return response
            .status(400)
            .json({ success: false, error: "Bot token is required" });
        }

        const validation = await validateBotToken(bot_token);
        if (!validation.ok) {
          return response
            .status(400)
            .json({ success: false, error: validation.error });
        }

        let workspaceSlug = "";
        if (default_workspace) {
          const workspace = await Workspace.get({
            slug: String(default_workspace),
          });
          if (workspace) workspaceSlug = workspace.slug;
        }

        const { error } = await ExternalCommunicationConnector.upsert(
          TELEGRAM_BOT_TYPE,
          {
            active: true,
            bot_token: String(bot_token),
            bot_username: validation.username,
            default_workspace: workspaceSlug,
            voice_response_mode: "text_only",
            pending_users: [],
            approved_users: [],
          },
        );

        if (error) {
          return response
            .status(400)
            .json({ success: false, error });
        }

        return response.status(200).json({
          success: true,
          bot_username: validation.username,
        });
      } catch (e) {
        consoleLogger.error("Telegram connect error:", e);
        return response
          .status(500)
          .json({ success: false, error: "Internal server error" });
      }
    },
  );

  app.post(
    "/telegram/disconnect",
    [validatedRequest, flexUserRoleValid([ROLES.admin])],
    async (_request, response) => {
      try {
        await ExternalCommunicationConnector.delete(TELEGRAM_BOT_TYPE);
        return response.status(200).json({ success: true, error: null });
      } catch (e) {
        consoleLogger.error("Telegram disconnect error:", e);
        return response
          .status(500)
          .json({ success: false, error: "Internal server error" });
      }
    },
  );

  app.get(
    "/telegram/status",
    [validatedRequest, flexUserRoleValid([ROLES.admin])],
    async (_request, response) => {
      try {
        const connector = await ExternalCommunicationConnector.get(
          TELEGRAM_BOT_TYPE,
        );
        if (!connector) {
          return response
            .status(200)
            .json({ active: false, bot_username: null });
        }
        return response.status(200).json({
          active: connector.active,
          bot_username: connector.config?.bot_username || null,
        });
      } catch (e) {
        consoleLogger.error("Telegram status error:", e);
        return response
          .status(500)
          .json({ active: false, bot_username: null });
      }
    },
  );

  app.get(
    "/telegram/pending-users",
    [validatedRequest, flexUserRoleValid([ROLES.admin])],
    async (_request, response) => {
      try {
        const connector = await ExternalCommunicationConnector.get(
          TELEGRAM_BOT_TYPE,
        );
        const users = connector?.config?.pending_users || [];
        return response.status(200).json({ users });
      } catch (e) {
        consoleLogger.error("Telegram pending-users error:", e);
        return response.status(200).json({ users: [] });
      }
    },
  );

  app.get(
    "/telegram/approved-users",
    [validatedRequest, flexUserRoleValid([ROLES.admin])],
    async (_request, response) => {
      try {
        const connector = await ExternalCommunicationConnector.get(
          TELEGRAM_BOT_TYPE,
        );
        const users = connector?.config?.approved_users || [];
        return response.status(200).json({ users });
      } catch (e) {
        consoleLogger.error("Telegram approved-users error:", e);
        return response.status(200).json({ users: [] });
      }
    },
  );

  app.post(
    "/telegram/approve-user",
    [validatedRequest, flexUserRoleValid([ROLES.admin])],
    async (request, response) => {
      try {
        const { chatId } = reqBody(request);
        if (!chatId) {
          return response
            .status(400)
            .json({ success: false, error: "chatId is required" });
        }

        const connector = await ExternalCommunicationConnector.get(
          TELEGRAM_BOT_TYPE,
        );
        if (!connector) {
          return response
            .status(400)
            .json({ success: false, error: "Telegram bot is not connected" });
        }

        const cfg = connector.config || {};
        const pending = Array.isArray(cfg.pending_users) ? cfg.pending_users : [];
        const approved = Array.isArray(cfg.approved_users)
          ? cfg.approved_users
          : [];

        const userIndex = pending.findIndex(
          (u) => String(u.chatId) === String(chatId),
        );
        if (userIndex === -1) {
          return response
            .status(400)
            .json({ success: false, error: "User not found in pending list" });
        }

        const [user] = pending.splice(userIndex, 1);
        approved.push(user);

        const { error } = await ExternalCommunicationConnector.updateConfig(
          TELEGRAM_BOT_TYPE,
          { pending_users: pending, approved_users: approved },
        );

        if (error) {
          return response.status(400).json({ success: false, error });
        }

        return response.status(200).json({ success: true, error: null });
      } catch (e) {
        consoleLogger.error("Telegram approve-user error:", e);
        return response
          .status(500)
          .json({ success: false, error: "Internal server error" });
      }
    },
  );

  app.post(
    "/telegram/deny-user",
    [validatedRequest, flexUserRoleValid([ROLES.admin])],
    async (request, response) => {
      try {
        const { chatId } = reqBody(request);
        if (!chatId) {
          return response
            .status(400)
            .json({ success: false, error: "chatId is required" });
        }

        const connector = await ExternalCommunicationConnector.get(
          TELEGRAM_BOT_TYPE,
        );
        if (!connector) {
          return response
            .status(400)
            .json({ success: false, error: "Telegram bot is not connected" });
        }

        const cfg = connector.config || {};
        const pending = Array.isArray(cfg.pending_users) ? cfg.pending_users : [];

        const userIndex = pending.findIndex(
          (u) => String(u.chatId) === String(chatId),
        );
        if (userIndex === -1) {
          return response
            .status(400)
            .json({ success: false, error: "User not found in pending list" });
        }

        pending.splice(userIndex, 1);

        const { error } = await ExternalCommunicationConnector.updateConfig(
          TELEGRAM_BOT_TYPE,
          { pending_users: pending },
        );

        if (error) {
          return response.status(400).json({ success: false, error });
        }

        return response.status(200).json({ success: true, error: null });
      } catch (e) {
        consoleLogger.error("Telegram deny-user error:", e);
        return response
          .status(500)
          .json({ success: false, error: "Internal server error" });
      }
    },
  );

  app.post(
    "/telegram/revoke-user",
    [validatedRequest, flexUserRoleValid([ROLES.admin])],
    async (request, response) => {
      try {
        const { chatId } = reqBody(request);
        if (!chatId) {
          return response
            .status(400)
            .json({ success: false, error: "chatId is required" });
        }

        const connector = await ExternalCommunicationConnector.get(
          TELEGRAM_BOT_TYPE,
        );
        if (!connector) {
          return response
            .status(400)
            .json({ success: false, error: "Telegram bot is not connected" });
        }

        const cfg = connector.config || {};
        const approved = Array.isArray(cfg.approved_users)
          ? cfg.approved_users
          : [];

        const userIndex = approved.findIndex(
          (u) => String(u.chatId) === String(chatId),
        );
        if (userIndex === -1) {
          return response
            .status(400)
            .json({ success: false, error: "User not found in approved list" });
        }

        approved.splice(userIndex, 1);

        const { error } = await ExternalCommunicationConnector.updateConfig(
          TELEGRAM_BOT_TYPE,
          { approved_users: approved },
        );

        if (error) {
          return response.status(400).json({ success: false, error });
        }

        return response.status(200).json({ success: true, error: null });
      } catch (e) {
        consoleLogger.error("Telegram revoke-user error:", e);
        return response
          .status(500)
          .json({ success: false, error: "Internal server error" });
      }
    },
  );

  app.post(
    "/telegram/update-config",
    [validatedRequest, flexUserRoleValid([ROLES.admin])],
    async (request, response) => {
      try {
        const updates = reqBody(request);
        if (!updates || typeof updates !== "object") {
          return response
            .status(400)
            .json({ success: false, error: "Invalid config updates" });
        }

        const allowedKeys = [
          "voice_response_mode",
          "default_workspace",
          "active_thread_name",
        ];
        const filtered = {};
        for (const key of allowedKeys) {
          if (key in updates) filtered[key] = updates[key];
        }

        if (Object.keys(filtered).length === 0) {
          return response
            .status(400)
            .json({ success: false, error: "No valid config keys to update" });
        }

        const { error } = await ExternalCommunicationConnector.updateConfig(
          TELEGRAM_BOT_TYPE,
          filtered,
        );

        if (error) {
          return response.status(400).json({ success: false, error });
        }

        return response.status(200).json({ success: true, error: null });
      } catch (e) {
        consoleLogger.error("Telegram update-config error:", e);
        return response
          .status(500)
          .json({ success: false, error: "Internal server error" });
      }
    },
  );
}

module.exports = { telegramEndpoints };

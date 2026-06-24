// SPDX-License-Identifier: MIT
// Purpose: Event log, workspace chat, and data export endpoints.
// Docs: server/endpoints/system.doc.md
const consoleLogger = require("../../utils/logger/console.js");

const { EventLogs } = require("../../models/eventLogs");
const { WorkspaceChats } = require("../../models/workspaceChats");
const { exportChatsAsType } = require("../../utils/helpers/chat/convertTo");
const { reqBody, userFromSession } = require("../../utils/http");
const { validatedRequest } = require("../../utils/middleware/validatedRequest");
const {
  flexUserRoleValid,
  ROLES,
} = require("../../utils/middleware/multiUserProtected");
const {
  chatHistoryViewable,
} = require("../../utils/middleware/chatHistoryViewable");

function dataExportEndpoints(app) {
  if (!app) return;

  app.post(
    "/system/event-logs",
    [validatedRequest, flexUserRoleValid([ROLES.admin])],
    async (request, response) => {
      try {
        const { offset = 0, limit = 10 } = reqBody(request);
        const clampedLimit = Math.min(Math.max(parseInt(limit) || 10, 1), 100);
        const clampedOffset = Math.max(parseInt(offset) || 0, 0);
        const logs = await EventLogs.whereWithData(
          {},
          clampedLimit,
          clampedOffset * clampedLimit,
          {
            id: "desc",
          },
        );
        const totalLogs = await EventLogs.count();
        const hasPages = totalLogs > (clampedOffset + 1) * clampedLimit;

        response.status(200).json({ logs: logs, hasPages, totalLogs });
      } catch (e) {
        // eslint-disable-next-line no-console
        consoleLogger.error(e);
        response.sendStatus(500);
      }
    },
  );

  app.delete(
    "/system/event-logs",
    [validatedRequest, flexUserRoleValid([ROLES.admin])],
    async (_, response) => {
      try {
        await EventLogs.delete();
        await EventLogs.logEvent(
          "event_logs_cleared",
          {},
          response?.locals?.user?.id,
        );
        response.json({ success: true });
      } catch (e) {
        // eslint-disable-next-line no-console
        consoleLogger.error(e);
        response.sendStatus(500);
      }
    },
  );

  app.post(
    "/system/workspace-chats",
    [
      chatHistoryViewable,
      validatedRequest,
      flexUserRoleValid([ROLES.admin, ROLES.manager]),
    ],
    async (request, response) => {
      try {
        const { offset = 0, limit = 20 } = reqBody(request);
        const clampedLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
        const clampedOffset = Math.max(parseInt(offset) || 0, 0);
        const chats = await WorkspaceChats.whereWithData(
          {},
          clampedLimit,
          clampedOffset * clampedLimit,
          { id: "desc" },
        );
        const totalChats = await WorkspaceChats.count();
        const hasPages = totalChats > (clampedOffset + 1) * clampedLimit;

        response.status(200).json({ chats: chats, hasPages, totalChats });
      } catch (e) {
        // eslint-disable-next-line no-console
        consoleLogger.error(e);
        response.sendStatus(500);
      }
    },
  );

  app.delete(
    "/system/workspace-chats/:id",
    [validatedRequest, flexUserRoleValid([ROLES.admin, ROLES.manager])],
    async (request, response) => {
      try {
        const { id } = request.params;
        Number(id) === -1
          ? await WorkspaceChats.delete({}, true)
          : await WorkspaceChats.delete({ id: Number(id) });
        response.json({ success: true, error: null });
      } catch (e) {
        // eslint-disable-next-line no-console
        consoleLogger.error(e);
        response.sendStatus(500);
      }
    },
  );

  app.get(
    "/system/export-chats",
    [
      chatHistoryViewable,
      validatedRequest,
      flexUserRoleValid([ROLES.manager, ROLES.admin]),
    ],
    async (request, response) => {
      try {
        const { type = "jsonl", chatType = "workspace" } = request.query;
        const { contentType, data } = await exportChatsAsType(type, chatType);
        await EventLogs.logEvent(
          "exported_chats",
          {
            type,
            chatType,
          },
          response.locals.user?.id,
        );
        const safeType =
          String(type)
            .replace(/[^a-zA-Z0-9_-]/g, "")
            .slice(0, 20) || "jsonl";
        const safeChatType =
          String(chatType)
            .replace(/[^a-zA-Z0-9_-]/g, "")
            .slice(0, 20) || "workspace";
        const ext = safeType === "jsonAlpaca" ? "json" : safeType;
        response.setHeader("Content-Type", contentType);
        response.setHeader(
          "Content-Disposition",
          `attachment; filename="exported-chats-${safeChatType}.${ext}"`,
        );
        response.status(200).send(data);
      } catch (e) {
        // eslint-disable-next-line no-console
        consoleLogger.error(e);
        response.sendStatus(500);
      }
    },
  );

  // GDPR: User self-service data export (data portability)
  // Allows a user to export their own chat data without admin intervention.
  app.get(
    "/system/export-my-data",
    [chatHistoryViewable, validatedRequest, flexUserRoleValid([ROLES.all])],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        if (!user?.id) {
          response
            .status(401)
            .json({ success: false, error: "Authentication required." });
          return;
        }

        const { type = "jsonl" } = request.query;
        const safeType =
          String(type)
            .replace(/[^a-zA-Z0-9_-]/g, "")
            .slice(0, 20) || "jsonl";

        const chats = await WorkspaceChats.whereWithData(
          { user_id: user.id, include: true },
          null,
          null,
          { id: "asc" },
        );

        const { contentType, data } = await exportChatsAsType(
          safeType,
          "workspace",
          chats,
        );
        await EventLogs.logEvent(
          "exported_my_data",
          { type: safeType, count: chats.length },
          user.id,
        );
        const ext = safeType === "jsonAlpaca" ? "json" : safeType;
        response.setHeader("Content-Type", contentType);
        response.setHeader(
          "Content-Disposition",
          `attachment; filename="my-data-${user.username}.${ext}"`,
        );
        response.setHeader("Content-Length", Buffer.byteLength(data));
        response.status(200).send(data);
      } catch (e) {
        // eslint-disable-next-line no-console
        consoleLogger.error(e);
        response.sendStatus(500);
      }
    },
  );
}

module.exports = { dataExportEndpoints };

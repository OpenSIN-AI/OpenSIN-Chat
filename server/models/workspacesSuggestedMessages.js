// SPDX-License-Identifier: MIT
const consoleLogger = require("../utils/logger/console.js");

const prisma = require("../utils/prisma");

const WorkspaceSuggestedMessages = {
  get: async function (clause = {}) {
    try {
      const message = await prisma.workspace_suggested_messages.findFirst({
        where: clause,
      });
      return message || null;
    } catch (error) {
      consoleLogger.error(error.message);
      return null;
    }
  },

  where: async function (clause = {}, limit) {
    try {
      const messages = await prisma.workspace_suggested_messages.findMany({
        where: clause,
        take: limit || undefined,
      });
      return messages;
    } catch (error) {
      consoleLogger.error(error.message);
      return [];
    }
  },

  saveAll: async function (messages, workspaceSlug) {
    try {
      const workspace = await prisma.workspaces.findUnique({
        where: { slug: workspaceSlug },
      });

      if (!workspace) throw new Error("Workspace not found");

      const safeMessages = Array.isArray(messages) ? messages : [];

      const validMessages = safeMessages
        .filter(
          (msg) =>
            msg &&
            typeof msg === "object" &&
            typeof msg.heading === "string" &&
            typeof msg.message === "string",
        )
        .map((msg) => ({
          heading: msg.heading.slice(0, 255),
          message: msg.message.slice(0, 1000),
        }));

      return await prisma.$transaction([
        prisma.workspace_suggested_messages.deleteMany({
          where: { workspaceId: workspace.id },
        }),
        ...validMessages.map((message) =>
          prisma.workspace_suggested_messages.create({
            data: {
              workspaceId: workspace.id,
              heading: message.heading,
              message: message.message,
            },
          }),
        ),
      ]);
    } catch (error) {
      consoleLogger.error("Failed to save all messages", error.message);
      return [];
    }
  },

  getMessages: async function (workspaceSlug) {
    try {
      const workspace = await prisma.workspaces.findUnique({
        where: { slug: workspaceSlug },
      });

      if (!workspace) throw new Error("Workspace not found");

      const messages = await prisma.workspace_suggested_messages.findMany({
        where: { workspaceId: workspace.id },
        orderBy: { createdAt: "asc" },
      });

      return messages.map((msg) => ({
        heading: msg.heading,
        message: msg.message,
      }));
    } catch (error) {
      consoleLogger.error("Failed to get all messages", error.message);
      return [];
    }
  },
};

module.exports.WorkspaceSuggestedMessages = WorkspaceSuggestedMessages;

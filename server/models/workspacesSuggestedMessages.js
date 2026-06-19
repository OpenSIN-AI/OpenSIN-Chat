// SPDX-License-Identifier: MIT
const prisma = require("../utils/prisma");

const WorkspaceSuggestedMessages = {
  get: async function (clause = {}) {
    try {
      const message = await prisma.workspace_suggested_messages.findFirst({
        where: clause,
      });
      return message || null;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error.message);
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
      // eslint-disable-next-line no-console
      console.error(error.message);
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

      return await prisma.$transaction([
        prisma.workspace_suggested_messages.deleteMany({
          where: { workspaceId: workspace.id },
        }),
        ...safeMessages.map((message) =>
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
      // eslint-disable-next-line no-console
      console.error("Failed to save all messages", error.message);
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
      // eslint-disable-next-line no-console
      console.error("Failed to get all messages", error.message);
      return [];
    }
  },
};

module.exports.WorkspaceSuggestedMessages = WorkspaceSuggestedMessages;

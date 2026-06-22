// SPDX-License-Identifier: MIT
const prisma = require("../utils/prisma");
const { safeJSONStringify } = require("../utils/helpers/chat/responses");

const WorkspaceChats = {
  new: async function ({
    workspaceId,
    prompt,
    response = {},
    user = null,
    threadId = null,
    include = true,
    apiSessionId = null,
  }) {
    try {
      const chat = await prisma.workspace_chats.create({
        data: {
          workspaceId,
          prompt,
          response: safeJSONStringify(response),
          user_id: user?.id || null,
          thread_id: threadId,
          api_session_id: apiSessionId,
          include,
        },
      });
      // Update thread's lastUpdatedAt so the thread list sorts correctly.
      if (threadId) {
        await prisma.workspace_threads
          .update({
            where: { id: Number(threadId) },
            data: { lastUpdatedAt: new Date() },
          })
          .catch(() => {});
      }
      return { chat, message: null };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error.message);
      return { chat: null, message: error.message };
    }
  },

  forWorkspaceByUser: async function (
    workspaceId = null,
    userId = null,
    limit = null,
    orderBy = null,
  ) {
    if (!workspaceId || !userId) return [];
    try {
      const chats = await prisma.workspace_chats.findMany({
        where: {
          workspaceId,
          user_id: userId,
          thread_id: null, // this function is now only used for the default thread on workspaces and users
          api_session_id: null, // do not include api-session chats in the frontend for anyone.
          include: true,
        },
        select: {
          id: true,
          prompt: true,
          response: true,
          createdAt: true,
          feedbackScore: true,
        },
        ...(limit !== null ? { take: limit } : {}),
        ...(orderBy !== null ? { orderBy } : { orderBy: { id: "asc" } }),
      });
      return chats;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error.message);
      return [];
    }
  },

  forWorkspaceByApiSessionId: async function (
    workspaceId = null,
    apiSessionId = null,
    limit = null,
    orderBy = null,
  ) {
    if (!workspaceId || !apiSessionId) return [];
    try {
      const chats = await prisma.workspace_chats.findMany({
        where: {
          workspaceId,
          user_id: null,
          api_session_id: String(apiSessionId),
          thread_id: null,
        },
        select: {
          id: true,
          prompt: true,
          response: true,
          createdAt: true,
          feedbackScore: true,
        },
        ...(limit !== null ? { take: limit } : {}),
        ...(orderBy !== null ? { orderBy } : { orderBy: { id: "asc" } }),
      });
      return chats;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error.message);
      return [];
    }
  },

  forWorkspace: async function (
    workspaceId = null,
    limit = null,
    orderBy = null,
  ) {
    if (!workspaceId) return [];
    try {
      const chats = await prisma.workspace_chats.findMany({
        where: {
          workspaceId,
          thread_id: null, // this function is now only used for the default thread on workspaces
          api_session_id: null, // do not include api-session chats in the frontend for anyone.
          include: true,
        },
        select: {
          id: true,
          prompt: true,
          response: true,
          createdAt: true,
          feedbackScore: true,
        },
        ...(limit !== null ? { take: limit } : {}),
        ...(orderBy !== null ? { orderBy } : { orderBy: { id: "asc" } }),
      });
      return chats;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error.message);
      return [];
    }
  },

  /**
   * @deprecated Use markThreadHistoryInvalidV2 instead.
   */
  markHistoryInvalid: async function (workspaceId = null, user = null) {
    if (!workspaceId) return;
    try {
      await prisma.workspace_chats.updateMany({
        where: {
          workspaceId,
          user_id: user?.id,
          thread_id: null, // this function is now only used for the default thread on workspaces
        },
        data: {
          include: false,
        },
      });
      return;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error.message);
    }
  },

  /**
   * @deprecated Use markThreadHistoryInvalidV2 instead.
   */
  markThreadHistoryInvalid: async function (
    workspaceId = null,
    user = null,
    threadId = null,
  ) {
    if (!workspaceId || !threadId) return;
    try {
      await prisma.workspace_chats.updateMany({
        where: {
          workspaceId,
          thread_id: threadId,
          user_id: user?.id,
        },
        data: {
          include: false,
        },
      });
      return;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error.message);
    }
  },

  /**
   * @description This function is used to mark a thread's history as invalid.
   * and works with an arbitrary where clause.
   * @param {Object} whereClause - The where clause to update the chats.
   * @param {Object} data - The data to update the chats with.
   * @returns {Promise<void>}
   */
  markThreadHistoryInvalidV2: async function (whereClause = {}) {
    if (
      !whereClause ||
      typeof whereClause !== "object" ||
      !whereClause.workspaceId
    )
      return;
    try {
      await prisma.workspace_chats.updateMany({
        where: whereClause,
        data: {
          include: false,
        },
      });
      return;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error.message);
    }
  },

  get: async function (clause = {}, limit = null, orderBy = null) {
    try {
      const chat = await prisma.workspace_chats.findFirst({
        where: clause,
        select: {
          id: true,
          workspaceId: true,
          prompt: true,
          response: true,
          user_id: true,
          thread_id: true,
          api_session_id: true,
          createdAt: true,
          feedbackScore: true,
          include: true,
        },
        ...(limit !== null ? { take: limit } : {}),
        ...(orderBy !== null ? { orderBy } : {}),
      });
      return chat || null;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error.message);
      return null;
    }
  },

  delete: async function (clause = {}) {
    try {
      await prisma.workspace_chats.deleteMany({
        where: clause,
      });
      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error.message);
      return false;
    }
  },

  where: async function (
    clause = {},
    limit = null,
    orderBy = null,
    offset = null,
  ) {
    try {
      const chats = await prisma.workspace_chats.findMany({
        where: clause,
        select: {
          id: true,
          workspaceId: true,
          prompt: true,
          response: true,
          user_id: true,
          thread_id: true,
          api_session_id: true,
          createdAt: true,
          feedbackScore: true,
          include: true,
        },
        ...(limit !== null ? { take: limit } : {}),
        ...(offset !== null ? { skip: offset } : {}),
        ...(orderBy !== null ? { orderBy } : {}),
      });
      return chats;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error.message);
      return [];
    }
  },

  count: async function (clause = {}) {
    try {
      const count = await prisma.workspace_chats.count({
        where: clause,
      });
      return count;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error.message);
      return 0;
    }
  },

  whereWithData: async function (
    clause = {},
    limit = null,
    offset = null,
    orderBy = null,
  ) {
    try {
      const chats = await prisma.workspace_chats.findMany({
        where: clause,
        select: {
          id: true,
          workspaceId: true,
          prompt: true,
          response: true,
          user_id: true,
          thread_id: true,
          api_session_id: true,
          createdAt: true,
          feedbackScore: true,
          include: true,
          workspace: { select: { name: true, slug: true } },
          users: { select: { username: true } },
        },
        ...(limit !== null ? { take: limit } : {}),
        ...(offset !== null ? { skip: offset } : {}),
        ...(orderBy !== null ? { orderBy } : {}),
      });

      const results = chats.map((res) => ({
        ...res,
        workspace: res.workspace
          ? { name: res.workspace.name, slug: res.workspace.slug }
          : { name: "deleted workspace", slug: null },
        user: res.users
          ? { username: res.users.username }
          : { username: res.api_session_id !== null ? "API" : "unknown user" },
      }));

      // Strip the relation aliases to match the original shape
      for (const res of results) {
        delete res.users;
      }

      return results;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error.message);
      return [];
    }
  },
  updateFeedbackScore: async function (chatId = null, feedbackScore = null) {
    if (!chatId) return;
    try {
      await prisma.workspace_chats.update({
        where: {
          id: Number(chatId),
        },
        data: {
          feedbackScore:
            feedbackScore === null ? null : Number(feedbackScore) === 1,
        },
      });
      return;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error.message);
    }
  },

  // Explicit update of settings + key validations.
  // Only use this method when directly setting a key value
  // that takes no user input for the keys being modified.
  _update: async function (id = null, data = {}) {
    if (!id) throw new Error("No workspace chat id provided for update");

    try {
      await prisma.workspace_chats.update({
        where: { id },
        data,
      });
      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error.message);
      return false;
    }
  },
  markMemoryProcessed: async function (ids = []) {
    if (!Array.isArray(ids) || ids.length === 0) return;
    try {
      const safeIds = ids.map(Number).filter(Number.isInteger);
      if (safeIds.length === 0) return;
      await prisma.workspace_chats.updateMany({
        where: { id: { in: safeIds } },
        data: { memoryProcessed: true },
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error.message);
    }
  },

  migrateToMultiUser: async function (adminUserId) {
    try {
      await prisma.workspace_chats.updateMany({
        where: { user_id: null },
        data: { user_id: adminUserId },
      });
      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error.message);
      return false;
    }
  },

  bulkCreate: async function (chatsData) {
    if (!Array.isArray(chatsData) || chatsData.length === 0)
      return { chats: [], message: null };
    try {
      await prisma.workspace_chats.createMany({ data: chatsData });
      return { chats: { count: chatsData.length }, message: null };
    } catch {
      try {
        const createdChats = [];
        const BATCH = 50;
        for (let i = 0; i < chatsData.length; i += BATCH) {
          const batch = chatsData.slice(i, i + BATCH);
          const batchCreated = await prisma.$transaction(
            batch.map((d) => prisma.workspace_chats.create({ data: d })),
          );
          createdChats.push(...batchCreated);
        }
        return { chats: createdChats, message: null };
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error.message);
        return { chats: null, message: error.message };
      }
    }
  },
  upsert: async function (
    chatId = null,
    data = {
      workspaceId: null,
      prompt: null,
      response: {},
      user: null,
      threadId: null,
      include: true,
      apiSessionId: null,
    },
  ) {
    try {
      const payload = {
        workspaceId: data.workspaceId,
        response: safeJSONStringify(data.response),
        user_id: data.user?.id || null,
        thread_id: data.threadId,
        api_session_id: data.apiSessionId,
        include: data.include,
      };

      const { chat } = await prisma.workspace_chats.upsert({
        where: {
          id: Number(chatId),
        },
        // On updates, we already have the prompt so we don't need to set it again.
        update: { ...payload, lastUpdatedAt: new Date() },

        // On creates, we need to set the prompt or else record will fail.
        create: { ...payload, prompt: data.prompt },
      });
      return { chat, message: null };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error.message);
      return { chat: null, message: error.message };
    }
  },
};

module.exports = { WorkspaceChats };

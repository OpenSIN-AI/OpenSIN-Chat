// SPDX-License-Identifier: MIT
const consoleLogger = require("../utils/logger/console.js");

const { randomBytes } = require("crypto");
const prisma = require("../utils/prisma");
const slugifyModule = require("slugify");
const { v4: uuidv4 } = require("uuid");
const truncate = require("truncate");

const WorkspaceThread = {
  defaultName: "New Thread",
  writable: ["name"],

  /**
   * The default Slugify module requires some additional mapping to prevent downstream issues
   * if the user is able to define a slug externally. We have to block non-escapable URL chars
   * so that is the slug is rendered it doesn't break the URL or UI when visited.
   * @param {...any} args - slugify args for npm package.
   * @returns {string}
   */
  slugify: function (...args) {
    slugifyModule.extend({
      "+": " plus ",
      "!": " bang ",
      "@": " at ",
      "*": " splat ",
      ".": " dot ",
      ":": "",
      "~": "",
      "(": "",
      ")": "",
      "'": "",
      '"': "",
      "|": "",
    });
    return slugifyModule(...args);
  },

  new: async function (workspace, userId = null, data = {}) {
    try {
      let slug = data.slug
        ? this.slugify(data.slug, { lowercase: true })
        : uuidv4();

      // When a slug is explicitly provided, check for collision and retry
      // with a random suffix (mirrors Workspace.new behaviour). UUID-based
      // slugs (no data.slug) are already unique and need no check.
      if (data.slug && slug) {
        const existing = await this.get({ slug });
        if (existing) {
          const slugSeed = randomBytes(4).toString("hex").slice(0, 8);
          slug = this.slugify(`${data.slug}-${slugSeed}`, { lowercase: true });
        }
      }

      const thread = await prisma.workspace_threads.create({
        data: {
          name: data.name ? String(data.name).slice(0, 255) : this.defaultName,
          slug,
          user_id: userId ? Number(userId) : null,
          workspace_id: workspace.id,
        },
      });

      return { thread, message: null };
    } catch (error) {
      // eslint-disable-next-line no-console
      consoleLogger.error(error.message);
      return { thread: null, message: error.message };
    }
  },

  update: async function (prevThread = null, data = {}) {
    if (!prevThread) throw new Error("No thread id provided for update");

    const validData = {};
    Object.entries(data).forEach(([key, value]) => {
      if (!this.writable.includes(key)) return;
      if (key === "name") {
        if (value === null || value === undefined) return;
        if (typeof value !== "string") value = String(value);
        validData[key] = value.slice(0, 255);
      } else {
        validData[key] = value;
      }
    });

    if (Object.keys(validData).length === 0)
      return { thread: prevThread, message: "No valid fields to update!" };

    try {
      const thread = await prisma.workspace_threads.update({
        where: { id: prevThread.id },
        data: validData,
      });
      return { thread, message: null };
    } catch (error) {
      // eslint-disable-next-line no-console
      consoleLogger.error(error.message);
      return { thread: null, message: error.message };
    }
  },

  get: async function (clause = {}) {
    try {
      const thread = await prisma.workspace_threads.findFirst({
        where: clause,
      });

      return thread || null;
    } catch (error) {
      // eslint-disable-next-line no-console
      consoleLogger.error(error.message);
      return null;
    }
  },

  delete: async function (clause = {}) {
    try {
      // workspace_chats and workspace_agent_invocations have thread_id columns
      // with NO foreign-key relation to workspace_threads (by design — see
      // schema comment). Prisma cascade-delete therefore cannot reach them,
      // so we must clean them up manually to prevent orphaned rows with
      // dangling thread_id references. Wrap in a transaction so a failure
      // mid-cleanup does not leave partial state.
      const threads = await prisma.workspace_threads.findMany({
        where: clause,
        select: { id: true },
      });
      const threadIds = threads.map((t) => t.id);

      await prisma.$transaction([
        ...(threadIds.length > 0
          ? [
              prisma.workspace_chats.deleteMany({
                where: { thread_id: { in: threadIds } },
              }),
              prisma.workspace_agent_invocations.deleteMany({
                where: { thread_id: { in: threadIds } },
              }),
            ]
          : []),
        prisma.workspace_threads.deleteMany({
          where: clause,
        }),
      ]);
      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      consoleLogger.error(error.message);
      return false;
    }
  },

  // ==========================================
  // <-- ÄNDERUNG: Globale Default-Sortierung
  // ==========================================
  where: async function (
    clause = {},
    limit = null,
    orderBy = { createdAt: "desc" }, // <-- ÄNDERUNG: War vorher 'null'
    include = null,
  ) {
    try {
      const results = await prisma.workspace_threads.findMany({
        where: clause,
        ...(limit !== null ? { take: limit } : {}),
        ...(orderBy !== null ? { orderBy } : {}),
        ...(include !== null ? { include } : {}),
      });
      return results;
    } catch (error) {
      // eslint-disable-next-line no-console
      consoleLogger.error(error.message);
      return [];
    }
  },

  // Will fire on first message (included or not) for a thread and rename the thread based on the prompt.
  autoRenameThread: async function ({
    workspace = null,
    thread = null,
    user = null,
    prompt = null,
    onRename = null,
  }) {
    if (!workspace || !thread || !prompt) return { renamed: false, thread };
    if (thread.name !== this.defaultName) return { renamed: false, thread }; // don't rename if already named.

    const { WorkspaceChats } = require("./workspaceChats");
    const chatCount = await WorkspaceChats.count({
      workspaceId: workspace.id,
      user_id: user?.id || null,
      thread_id: thread.id,
    });
    if (chatCount !== 1) return { renamed: false, thread };
    const result = await this.update(thread, {
      name: truncate(prompt, 22),
    });
    const updatedThread = result.thread;
    if (!updatedThread) return { renamed: false, thread };

    onRename?.(updatedThread);
    return { renamed: true, thread: updatedThread };
  },
};

module.exports = { WorkspaceThread };

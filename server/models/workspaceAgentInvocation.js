// SPDX-License-Identifier: MIT
const consoleLogger = require("../utils/logger/console.js");

const prisma = require("../utils/prisma");
const { clampLimit, MAX_LIST_LIMIT } = require("../utils/database/queryLimits");
const { v4: uuidv4 } = require("uuid");

/**
 * Tracks individual agent invocations within a workspace.
 * Each invocation records the prompt, associated workspace/user/thread,
 * and a closed flag that is set once the agent run completes or is aborted.
 */
const WorkspaceAgentInvocation = {
  /**
   * Extract @-mentioned agent handles from a prompt string.
   * Only parses strings that start with `@agent`.
   * @param {string} promptString
   * @returns {string[]} Array of @handle strings (e.g. ["@agent", "@agent-code"])
   */
  parseAgents: function (promptString) {
    if (!promptString.startsWith("@agent")) return [];
    return promptString.split(/\s+/).filter((v) => v.startsWith("@"));
  },

  /**
   * Mark an invocation as closed (completed or aborted).
   * No-ops if uuid is falsy — safe to call unconditionally.
   * @param {string} uuid
   * @returns {Promise<void>}
   */
  close: async function (uuid) {
    if (!uuid) return;
    try {
      await prisma.workspace_agent_invocations.update({
        where: { uuid: String(uuid) },
        data: { closed: true },
      });
    } catch {}
  },

  /**
   * Create a new agent invocation record.
   * @param {Object} params
   * @param {string} params.prompt - The raw agent invocation prompt
   * @param {Object} params.workspace - Workspace object with `.id`
   * @param {Object|null} [params.user=null] - User object with `.id` (null = anonymous)
   * @param {Object|null} [params.thread=null] - Thread object with `.id` (null = no thread)
   * @returns {Promise<{invocation: Object|null, message: string|null}>}
   */
  new: async function ({ prompt, workspace, user = null, thread = null }) {
    try {
      const invocation = await prisma.workspace_agent_invocations.create({
        data: {
          uuid: uuidv4(),
          workspace_id: workspace.id,
          prompt: String(prompt),
          user_id: user?.id,
          thread_id: thread?.id,
        },
      });

      return { invocation, message: null };
    } catch (error) {
      consoleLogger.error(error.message);
      return { invocation: null, message: error.message };
    }
  },

  /**
   * Return the first invocation matching the clause.
   * @param {Object} [clause={}] - Prisma where clause
   * @returns {Promise<Object|null>}
   */
  get: async function (clause = {}) {
    try {
      const invocation = await prisma.workspace_agent_invocations.findFirst({
        where: clause,
      });

      return invocation || null;
    } catch (error) {
      consoleLogger.error(error.message);
      return null;
    }
  },

  /**
   * Return an invocation with its workspace relation eagerly loaded.
   * @param {Object} [clause={}] - Prisma where clause
   * @returns {Promise<Object|null>} Invocation with `.workspace` attached
   */
  getWithWorkspace: async function (clause = {}) {
    try {
      const invocation = await prisma.workspace_agent_invocations.findFirst({
        where: clause,
        include: {
          workspace: true,
        },
      });

      return invocation || null;
    } catch (error) {
      consoleLogger.error(error.message);
      return null;
    }
  },

  /**
   * Delete all invocations matching the clause.
   * @param {Object} [clause={}] - Prisma where clause
   * @returns {Promise<boolean>}
   */
  delete: async function (clause = {}) {
    try {
      await prisma.workspace_agent_invocations.deleteMany({
        where: clause,
      });
      return true;
    } catch (error) {
      consoleLogger.error(error.message);
      return false;
    }
  },

  /**
   * Return all invocations matching the clause.
   * @param {Object} [clause={}] - Prisma where clause
   * @param {number|null} [limit=null] - Max rows (clamped to MAX_LIST_LIMIT)
   * @param {Object|null} [orderBy=null] - Prisma orderBy clause
   * @returns {Promise<Array>}
   */
  where: async function (clause = {}, limit = null, orderBy = null) {
    try {
      const results = await prisma.workspace_agent_invocations.findMany({
        where: clause,
        take: clampLimit(limit, { fallback: MAX_LIST_LIMIT }),
        ...(orderBy !== null ? { orderBy } : {}),
      });
      return results;
    } catch (error) {
      consoleLogger.error(error.message);
      return [];
    }
  },
};

module.exports = { WorkspaceAgentInvocation };

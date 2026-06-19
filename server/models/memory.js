// SPDX-License-Identifier: MIT
const prisma = require("../utils/prisma");

const SUPPORTS_VECTORS = process.env.DATABASE_TYPE === "postgres";

const SAFE_SELECT = SUPPORTS_VECTORS
  ? undefined
  : {
      id: true,
      userId: true,
      workspaceId: true,
      scope: true,
      content: true,
      lastUsedAt: true,
      createdAt: true,
      updatedAt: true,
    };

/**
 * @typedef {Object} Memory
 * @property {number} id
 * @property {number|null} userId
 * @property {number|null} workspaceId
 * @property {"workspace"|"global"} scope
 * @property {string} content
 * @property {Date|null} lastUsedAt
 * @property {Date} createdAt
 * @property {Date} updatedAt
 */

function toInt(v) {
  const n = Number(v);
  if (!Number.isInteger(n))
    throw new Error(`Expected integer, got ${JSON.stringify(v)}`);
  return n;
}

const Memory = {
  GLOBAL_LIMIT: 5,
  WORKSPACE_LIMIT: 20,
  MAX_INJECTED_WORKSPACE_LIMIT: 5,
  VALID_SCOPES: ["workspace", "global"],

  validations: {
    id: (v) => toInt(v),
    userId: (v = null) => (v === null || v === undefined ? null : toInt(v)),
    workspaceId: (v = null) =>
      v === null || v === undefined ? null : toInt(v),
    scope: (v = "workspace") => {
      if (!Memory.VALID_SCOPES.includes(v))
        throw new Error(`Invalid scope: ${JSON.stringify(v)}`);
      return v;
    },
    content: (v) => {
      if (typeof v !== "string" || v.trim().length === 0)
        throw new Error("Content must be a non-empty string");
      return v.trim().slice(0, 10000);
    },
  },

  /**
   * List a user's workspace-scoped memories, newest first.
   * @param {number|null} userId
   * @param {number} workspaceId
   * @returns {Promise<Memory[]>}
   */
  forUserWorkspace: async function (userId, workspaceId) {
    try {
      const memories = await prisma.memories.findMany({
        where: {
          userId: this.validations.userId(userId),
          workspaceId: this.validations.id(workspaceId),
          scope: "workspace",
        },
        orderBy: { createdAt: "desc" },
        take: this.WORKSPACE_LIMIT,
        ...(SAFE_SELECT ? { select: SAFE_SELECT } : {}),
      });
      return memories;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error.message);
      return [];
    }
  },

  /**
   * List a user's global-scoped memories, newest first.
   * @param {number|null} userId
   * @returns {Promise<Memory[]>}
   */
  globalForUser: async function (userId) {
    try {
      const memories = await prisma.memories.findMany({
        where: {
          userId: this.validations.userId(userId),
          scope: "global",
        },
        orderBy: { createdAt: "desc" },
        take: this.GLOBAL_LIMIT,
        ...(SAFE_SELECT ? { select: SAFE_SELECT } : {}),
      });
      return memories;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error.message);
      return [];
    }
  },

  /**
   * Create a memory, enforcing per-scope limits (global: 5, workspace: 20).
   * @param {Object} params
   * @param {number|null} params.userId
   * @param {number|null} [params.workspaceId]
   * @param {"workspace"|"global"} [params.scope]
   * @param {string} params.content
   * @returns {Promise<{memory: Memory|null, message: string|null}>}
   */
  create: async function ({
    userId,
    workspaceId = null,
    scope = "workspace",
    content,
  }) {
    try {
      const validatedScope = this.validations.scope(scope);
      if (validatedScope === "workspace" && !workspaceId)
        return {
          memory: null,
          message: "workspaceId is required for workspace-scoped memories.",
        };
      const limit =
        validatedScope === "global" ? this.GLOBAL_LIMIT : this.WORKSPACE_LIMIT;
      const where = {
        userId: this.validations.userId(userId),
        scope: validatedScope,
      };
      if (validatedScope === "workspace")
        where.workspaceId = this.validations.workspaceId(workspaceId);

      const result = await prisma.$transaction(async (tx) => {
        const count = await tx.memories.count({ where });
        if (count >= limit)
          return {
            memory: null,
            message: `Maximum ${scope} memory limit (${limit}) reached.`,
          };

        const memory = await tx.memories.create({
          data: {
            userId: this.validations.userId(userId),
            workspaceId:
              validatedScope === "global"
                ? null
                : this.validations.workspaceId(workspaceId),
            scope: validatedScope,
            content: this.validations.content(content),
          },
          ...(SAFE_SELECT ? { select: SAFE_SELECT } : {}),
        });
        return { memory, message: null };
      });
      return result;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error.message);
      return { memory: null, message: error.message };
    }
  },

  /**
   * Update an existing memory's content.
   * When userId is provided, the update is scoped to that user (prevents TOCTOU races).
   * @param {number} id
   * @param {{content: string}} fields
   * @param {number|null} [userId] - optional ownership filter
   * @returns {Promise<{memory: Memory|null, message: string|null}>}
   */
  update: async function (id, { content }, userId = undefined) {
    try {
      if (userId !== undefined) {
        const existing = await prisma.memories.findFirst({
          where: {
            id: this.validations.id(id),
            userId: this.validations.userId(userId),
          },
          ...(SAFE_SELECT ? { select: SAFE_SELECT } : {}),
        });
        if (!existing)
          return {
            memory: null,
            message: "Memory not found or not owned by user.",
          };
      }
      const memory = await prisma.memories.update({
        where: { id: this.validations.id(id) },
        data: {
          content: this.validations.content(content),
          updatedAt: new Date(),
        },
        ...(SAFE_SELECT ? { select: SAFE_SELECT } : {}),
      });
      return { memory, message: null };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error.message);
      return { memory: null, message: error.message };
    }
  },

  /**
   * Delete a memory by id.
   * When userId is provided, the delete is scoped to that user (prevents TOCTOU races).
   * @param {number} id
   * @param {number|null} [userId] - optional ownership filter
   * @returns {Promise<boolean>} true on success, false on error
   */
  delete: async function (id, userId = undefined) {
    try {
      if (userId !== undefined) {
        const result = await prisma.memories.deleteMany({
          where: {
            id: this.validations.id(id),
            userId: this.validations.userId(userId),
          },
        });
        return result.count > 0;
      }
      await prisma.memories.delete({
        where: { id: this.validations.id(id) },
      });
      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error.message);
      return false;
    }
  },

  /**
   * Promote a workspace-scoped memory to global scope.
   * Enforces the global limit and clears its workspaceId.
   * @param {number} id
   * @returns {Promise<{memory: Memory|null, message: string|null}>}
   */
  promoteToGlobal: async function (id) {
    try {
      const validatedId = this.validations.id(id);
      const existing = await prisma.memories.findUnique({
        where: { id: validatedId },
        ...(SAFE_SELECT ? { select: SAFE_SELECT } : {}),
      });
      if (!existing) return { memory: null, message: "Memory not found." };
      if (existing.scope === "global")
        return { memory: existing, message: "Memory is already global." };

      const result = await prisma.$transaction(async (tx) => {
        const globalCount = await tx.memories.count({
          where: {
            userId: this.validations.userId(existing.userId),
            scope: "global",
          },
        });
        if (globalCount >= this.GLOBAL_LIMIT)
          return {
            memory: null,
            message: `Maximum global memory limit (${this.GLOBAL_LIMIT}) reached.`,
          };

        const memory = await tx.memories.update({
          where: { id: validatedId },
          data: { scope: "global", workspaceId: null, updatedAt: new Date() },
          ...(SAFE_SELECT ? { select: SAFE_SELECT } : {}),
        });
        return { memory, message: null };
      });
      return result;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error.message);
      return { memory: null, message: error.message };
    }
  },

  /**
   * Demote a global memory to workspace scope, assigning it to the target workspace.
   * Enforces the per-workspace limit.
   * @param {number} id
   * @param {number} workspaceId
   * @returns {Promise<{memory: Memory|null, message: string|null}>}
   */
  demoteToWorkspace: async function (id, workspaceId) {
    try {
      return await prisma.$transaction(async (tx) => {
        const existing = await tx.memories.findUnique({
          where: { id: this.validations.id(id) },
          ...(SAFE_SELECT ? { select: SAFE_SELECT } : {}),
        });
        if (!existing) return { memory: null, message: "Memory not found." };
        if (existing.scope === "workspace")
          return {
            memory: existing,
            message: "Memory is already workspace-scoped.",
          };

        const wsCount = await this.countForScope(
          existing.userId,
          workspaceId,
          "workspace",
          tx,
        );
        if (wsCount >= this.WORKSPACE_LIMIT) {
          throw new Error(`WORKSPACE_LIMIT reached: ${this.WORKSPACE_LIMIT}`);
        }

        const memory = await tx.memories.update({
          where: { id: this.validations.id(id) },
          data: {
            scope: "workspace",
            workspaceId: this.validations.id(workspaceId),
            updatedAt: new Date(),
          },
          ...(SAFE_SELECT ? { select: SAFE_SELECT } : {}),
        });
        return { memory, message: null };
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error.message);
      if (String(error.message).startsWith("WORKSPACE_LIMIT reached")) {
        return {
          memory: null,
          message: `Maximum workspace memory limit (${this.WORKSPACE_LIMIT}) reached.`,
        };
      }
      return { memory: null, message: error.message };
    }
  },

  /**
   * Stamp a set of memories as just-used (for recency tracking / reranking).
   * @param {number[]} [ids]
   * @returns {Promise<void>}
   */
  updateLastUsed: async function (ids = []) {
    if (!Array.isArray(ids) || ids.length === 0) return;
    try {
      await prisma.memories.updateMany({
        where: { id: { in: ids.map(this.validations.id) } },
        data: { lastUsedAt: new Date() },
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error.message);
    }
  },

  /**
   * Count a user's memories in a given scope. For "workspace" scope the workspaceId is required.
   * @param {number|null} userId
   * @param {number|null} workspaceId
   * @param {"workspace"|"global"} scope
   * @returns {Promise<number>}
   */
  countForScope: async function (userId, workspaceId, scope, client = prisma) {
    try {
      const where = {
        userId: this.validations.userId(userId),
        scope: this.validations.scope(scope),
      };
      if (scope === "workspace")
        where.workspaceId = this.validations.workspaceId(workspaceId);
      return await client.memories.count({ where });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error.message);
      return 0;
    }
  },

  /**
   * Replace all of a user's workspace-scoped memories for a workspace with the given set.
   * Runs in a transaction so a failure mid-write does not leave a partial state.
   * Caps the input at this.WORKSPACE_LIMIT.
   * @param {number|null} userId
   * @param {number} workspaceId
   * @param {string[]} memories - memory contents to insert
   * @returns {Promise<boolean>}
   */
  replaceWorkspaceMemories: async function (userId, workspaceId, memories) {
    try {
      const safeMemories = Array.isArray(memories)
        ? memories.filter((m) => typeof m === "string" && m.trim().length > 0)
        : [];

      await prisma.$transaction(async (tx) => {
        await tx.memories.deleteMany({
          where: {
            userId: this.validations.userId(userId),
            workspaceId: this.validations.id(workspaceId),
            scope: "workspace",
          },
        });

        for (const content of safeMemories.slice(0, this.WORKSPACE_LIMIT)) {
          await tx.memories.create({
            data: {
              userId: this.validations.userId(userId),
              workspaceId: this.validations.id(workspaceId),
              scope: "workspace",
              content,
            },
            ...(SAFE_SELECT ? { select: SAFE_SELECT } : {}),
          });
        }
      });
      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error.message);
      return false;
    }
  },

  /**
   * Apply extracted memories from the two-phase Observer/Reflector pipeline.
   * Each memory has an `action` field:
   *   - "create": insert a new memory (WORKSPACE or GLOBAL)
   *   - "update": revise an existing WORKSPACE memory by ID
   * Skipped items are already filtered out before this method is called.
   * @param {number|null} userId
   * @param {number} workspaceId
   * @param {{content: string, scope: "WORKSPACE"|"GLOBAL", action: "create"|"update", updateId?: number}[]} newMemories
   * @param {number} globalSlots - how many global slots are available
   * @returns {Promise<{workspaceCount: number, globalCount: number, updatedCount: number}>}
   */
  applyExtractedMemories: async function (
    userId,
    workspaceId,
    newMemories,
    globalSlots,
  ) {
    const result = { workspaceCount: 0, globalCount: 0, updatedCount: 0 };
    try {
      const safeMemories = Array.isArray(newMemories)
        ? newMemories.filter(
            (m) =>
              typeof m === "object" &&
              m !== null &&
              typeof m.content === "string" &&
              m.content.trim().length > 0 &&
              ["WORKSPACE", "GLOBAL"].includes(m.scope) &&
              ["create", "update"].includes(m.action),
          )
        : [];

      const creates = safeMemories.filter((m) => m.action === "create");
      const updates = safeMemories.filter(
        (m) => m.action === "update" && typeof m.updateId === "number",
      );

      const newWorkspace = creates
        .filter((m) => m.scope === "WORKSPACE")
        .slice(0, this.WORKSPACE_LIMIT);
      const newGlobal = creates
        .filter((m) => m.scope === "GLOBAL")
        .slice(0, Math.max(0, globalSlots));

      let actuallyUpdated = 0;
      await prisma.$transaction(async (tx) => {
        for (const { content } of newWorkspace) {
          await tx.memories.create({
            data: {
              userId: this.validations.userId(userId),
              workspaceId: this.validations.id(workspaceId),
              scope: "workspace",
              content,
            },
            ...(SAFE_SELECT ? { select: SAFE_SELECT } : {}),
          });
        }

        for (const { content } of newGlobal) {
          await tx.memories.create({
            data: {
              userId: this.validations.userId(userId),
              workspaceId: null,
              scope: "global",
              content,
            },
            ...(SAFE_SELECT ? { select: SAFE_SELECT } : {}),
          });
        }

        for (const { updateId, content } of updates) {
          const updateResult = await tx.memories.updateMany({
            where: {
              id: this.validations.id(updateId),
              userId: this.validations.userId(userId),
            },
            data: {
              content: this.validations.content(content),
              updatedAt: new Date(),
            },
          });
          if (updateResult.count > 0) actuallyUpdated++;
        }
      });

      result.workspaceCount = newWorkspace.length;
      result.globalCount = newGlobal.length;
      result.updatedCount = actuallyUpdated;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error.message);
    }
    return result;
  },

  /**
   * Assign all unowned memories (userId null) to the admin account when the system enters multi-user mode.
   * @param {number} adminUserId
   * @returns {Promise<boolean>}
   */
  migrateToMultiUser: async function (adminUserId) {
    try {
      await prisma.memories.updateMany({
        where: { userId: null },
        data: { userId: this.validations.id(adminUserId) },
      });
      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error.message);
      return false;
    }
  },

  /**
   * Fetch the first memory matching the given where clause.
   * @param {object} [clause] - Prisma where clause
   * @returns {Promise<Memory|null>}
   */
  get: async function (clause = {}) {
    try {
      const memory = await prisma.memories.findFirst({
        where: clause,
        ...(SAFE_SELECT ? { select: SAFE_SELECT } : {}),
      });
      return memory || null;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error.message);
      return null;
    }
  },
};

module.exports = { Memory };

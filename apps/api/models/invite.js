// SPDX-License-Identifier: MIT
const consoleLogger = require("../utils/logger/console.js");

const { safeJsonParse } = require("../utils/http");
const prisma = require("../utils/prisma");

// Default upper bound when no caller-supplied limit is given.
// Prevents a full-table scan on large deployments.
const MAX_INVITE_LIST = 1_000;

const Invite = {
  // Invites expire after this many ms. Configurable via INVITE_EXPIRY_HOURS env var.
  // Default: 7 days (168 hours). 0 disables expiry (backwards-compatible).
  expiryMs: (() => {
    const hours = Number(process.env.INVITE_EXPIRY_HOURS || 168);
    return Number.isNaN(hours) ? 168 * 60 * 60 * 1000 : hours * 60 * 60 * 1000;
  })(),

  makeCode: () => {
    const uuidAPIKey = require("uuid-apikey");
    return uuidAPIKey.create().apiKey;
  },

  /**
   * Check if a pending invite has expired based on its createdAt timestamp.
   * @param {Object} invite - The invite record from the database.
   * @returns {boolean} True if the invite has expired.
   */
  isExpired: function (invite) {
    if (!invite || this.expiryMs <= 0) return false;
    if (invite.status !== "pending") return false;
    const ageMs = Date.now() - new Date(invite.createdAt).getTime();
    return ageMs > this.expiryMs;
  },

  create: async function ({ createdByUserId = 0, workspaceIds = [] }) {
    try {
      const invite = await prisma.invites.create({
        data: {
          code: this.makeCode(),
          createdBy: createdByUserId,
          workspaceIds: JSON.stringify(workspaceIds),
        },
      });
      return { invite, error: null };
    } catch (error) {
      consoleLogger.error("FAILED TO CREATE INVITE.", error.message);
      return { invite: null, error: error.message };
    }
  },

  deactivate: async function (inviteId = null) {
    try {
      await prisma.invites.update({
        where: { id: Number(inviteId) },
        data: { status: "disabled" },
      });
      return { success: true, error: null };
    } catch (error) {
      consoleLogger.error(error.message);
      return { success: false, error: error.message };
    }
  },

  markClaimed: async function (inviteId = null, user) {
    try {
      // Atomically claim the invite + assign workspaces in a single
      // transaction so a failure mid-way does not leave the invite marked
      // "claimed" while the user has no workspace access. Previously the
      // invite update and workspace-user creation were separate operations
      // and the function returned { success: true } even when the workspace
      // assignment failed.
      return await prisma.$transaction(async (tx) => {
        const invite = await tx.invites.update({
          where: { id: Number(inviteId) },
          data: { status: "claimed", claimedBy: user.id },
        });

        if (!!invite?.workspaceIds) {
          const ids = safeJsonParse(invite.workspaceIds, [])
            .map((id) => Number(id))
            .filter((id) => !isNaN(id));
          if (ids.length === 0) {
            return { success: true, error: null };
          }
          const workspaces = await tx.workspaces.findMany({
            where: { id: { in: ids } },
            select: { id: true },
            take: 100,
          });
          const validIds = new Set(workspaces.map((w) => w.id));
          const validWorkspaceIds = ids.filter((id) => validIds.has(id));

          if (validWorkspaceIds.length !== 0) {
            // Batch check for existing memberships to avoid N+1 findFirst calls
            const existingMemberships = await tx.workspace_users.findMany({
              where: {
                user_id: Number(user.id),
                workspace_id: { in: validWorkspaceIds },
              },
              select: { workspace_id: true },
            });
            const existingWorkspaceIds = new Set(
              existingMemberships.map((m) => m.workspace_id),
            );
            const newWorkspaceIds = validWorkspaceIds.filter(
              (id) => !existingWorkspaceIds.has(id),
            );

            // Batch create all new memberships in a single createMany call
            if (newWorkspaceIds.length > 0) {
              await tx.workspace_users.createMany({
                data: newWorkspaceIds.map((workspaceId) => ({
                  user_id: Number(user.id),
                  workspace_id: workspaceId,
                })),
              });
            }
          }
        }

        return { success: true, error: null };
      });
    } catch (error) {
      consoleLogger.error(error.message);
      return { success: false, error: error.message };
    }
  },

  get: async function (clause = {}) {
    try {
      const invite = await prisma.invites.findFirst({ where: clause });
      return invite || null;
    } catch (error) {
      consoleLogger.error(error.message);
      return null;
    }
  },

  count: async function (clause = {}) {
    try {
      const count = await prisma.invites.count({ where: clause });
      return count;
    } catch (error) {
      consoleLogger.error(error.message);
      return 0;
    }
  },

  delete: async function (clause = {}) {
    try {
      await prisma.invites.deleteMany({ where: clause });
      return true;
    } catch (error) {
      consoleLogger.error(error.message);
      return false;
    }
  },

  where: async function (clause = {}, limit) {
    try {
      // `limit || undefined` would pass undefined when limit is 0, leaving the
      // query unbounded. Use an explicit nullish check and fall back to
      // MAX_INVITE_LIST so the query always has a hard cap.
      const take = limit != null && limit > 0 ? limit : MAX_INVITE_LIST;
      const invites = await prisma.invites.findMany({
        where: clause,
        take,
      });
      return invites;
    } catch (error) {
      consoleLogger.error(error.message);
      return [];
    }
  },

  whereWithUsers: async function (clause = {}, limit) {
    const { User } = require("./user");
    try {
      const invites = await this.where(clause, limit);
      const userIds = new Set();
      for (const invite of invites) {
        if (invite.claimedBy) userIds.add(invite.claimedBy);
        if (invite.createdBy) userIds.add(invite.createdBy);
      }
      const users =
        userIds.size > 0 ? await User.where({ id: { in: [...userIds] } }) : [];
      const userMap = new Map(users.map((u) => [u.id, u]));
      for (const invite of invites) {
        if (invite.claimedBy) {
          const u = userMap.get(invite.claimedBy);
          invite.claimedBy = {
            id: u?.id,
            username: u?.username,
          };
        }

        if (invite.createdBy) {
          const u = userMap.get(invite.createdBy);
          invite.createdBy = {
            id: u?.id,
            username: u?.username,
          };
        }
      }
      return invites;
    } catch (error) {
      consoleLogger.error(error.message);
      return [];
    }
  },
};

module.exports = { Invite };

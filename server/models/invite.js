// SPDX-License-Identifier: MIT
const consoleLogger = require("../utils/logger/console.js");

const { safeJsonParse } = require("../utils/http");
const prisma = require("../utils/prisma");

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
          });
          const validIds = new Set(workspaces.map((w) => w.id));
          const validWorkspaceIds = ids.filter((id) => validIds.has(id));

          if (validWorkspaceIds.length !== 0) {
            for (const workspaceId of validWorkspaceIds) {
              await tx.workspace_users.create({
                data: {
                  user_id: Number(user.id),
                  workspace_id: workspaceId,
                },
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
      const invites = await prisma.invites.findMany({
        where: clause,
        take: limit || undefined,
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
      for (const invite of invites) {
        if (invite.claimedBy) {
          const acceptedUser = await User.get({ id: invite.claimedBy });
          invite.claimedBy = {
            id: acceptedUser?.id,
            username: acceptedUser?.username,
          };
        }

        if (invite.createdBy) {
          const createdUser = await User.get({ id: invite.createdBy });
          invite.createdBy = {
            id: createdUser?.id,
            username: createdUser?.username,
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

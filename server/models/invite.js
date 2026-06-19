// SPDX-License-Identifier: MIT
const { safeJsonParse } = require("../utils/http");
const prisma = require("../utils/prisma");

const Invite = {
  // Invites expire after this many ms. Configurable via INVITE_EXPIRY_HOURS env var.
  // Default: 7 days (168 hours). 0 disables expiry (backwards-compatible).
  expiryMs: Number(process.env.INVITE_EXPIRY_HOURS || 168) * 60 * 60 * 1000,

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
      // eslint-disable-next-line no-console
      console.error("FAILED TO CREATE INVITE.", error.message);
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
      // eslint-disable-next-line no-console
      console.error(error.message);
      return { success: false, error: error.message };
    }
  },

  markClaimed: async function (inviteId = null, user) {
    try {
      const invite = await prisma.invites.update({
        where: { id: Number(inviteId) },
        data: { status: "claimed", claimedBy: user.id },
      });

      try {
        if (!!invite?.workspaceIds) {
          const { Workspace } = require("./workspace");
          const { WorkspaceUser } = require("./workspaceUsers");
          const workspaceIds = (await Workspace.where({})).map(
            (workspace) => workspace.id,
          );
          const ids = safeJsonParse(invite.workspaceIds, [])
            .map((id) => Number(id))
            .filter((id) => workspaceIds.includes(id));
          if (ids.length !== 0) await WorkspaceUser.createMany(user.id, ids);
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(
          "Could not add user to workspaces automatically",
          e.message,
        );
      }

      return { success: true, error: null };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error.message);
      return { success: false, error: error.message };
    }
  },

  get: async function (clause = {}) {
    try {
      const invite = await prisma.invites.findFirst({ where: clause });
      return invite || null;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error.message);
      return null;
    }
  },

  count: async function (clause = {}) {
    try {
      const count = await prisma.invites.count({ where: clause });
      return count;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error.message);
      return 0;
    }
  },

  delete: async function (clause = {}) {
    try {
      await prisma.invites.deleteMany({ where: clause });
      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error.message);
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
      // eslint-disable-next-line no-console
      console.error(error.message);
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
      // eslint-disable-next-line no-console
      console.error(error.message);
      return [];
    }
  },
};

module.exports = { Invite };

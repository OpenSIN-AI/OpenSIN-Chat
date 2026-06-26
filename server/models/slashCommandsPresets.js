// SPDX-License-Identifier: MIT
const consoleLogger = require("../utils/logger/console.js");

const { v4 } = require("uuid");
const prisma = require("../utils/prisma");
const CMD_REGEX = new RegExp(/[^a-zA-Z0-9_-]/g);

const SlashCommandPresets = {
  formatCommand: function (command = "") {
    if (!command || command.length < 2) return `/${v4().split("-")[0]}`;

    let adjustedCmd = command.toLowerCase().replace(/^\/+/, ""); // Strip ALL leading slashes
    return `/${adjustedCmd.replace(CMD_REGEX, "-")}`; // replace any invalid chars with '-'
  },

  get: async function (clause = {}) {
    try {
      const preset = await prisma.slash_command_presets.findFirst({
        where: clause,
      });
      return preset || null;
    } catch (error) {
      consoleLogger.error(error.message);
      return null;
    }
  },

  where: async function (clause = {}, limit) {
    try {
      const presets = await prisma.slash_command_presets.findMany({
        where: clause,
        take: limit || undefined,
      });
      return presets;
    } catch (error) {
      consoleLogger.error(error.message);
      return [];
    }
  },

  // Command + userId must be unique combination.
  create: async function (userId = null, presetData = {}) {
    try {
      const existingPreset = await this.get({
        userId: userId ? Number(userId) : null,
        command: String(presetData.command),
      });

      if (existingPreset) {
        return existingPreset;
      }

      const preset = await prisma.slash_command_presets.create({
        data: {
          ...presetData,
          // This field (uid) is either the user_id or 0 (for non-multi-user mode).
          // the UID field enforces the @@unique(userId, command) constraint since
          // the real relational field (userId) cannot be non-null so this 'dummy' field gives us something
          // to constrain against within the context of prisma and sqlite that works.
          uid: userId ? Number(userId) : 0,
          userId: userId ? Number(userId) : null,
        },
      });
      return preset;
    } catch (error) {
      consoleLogger.error("Failed to create preset", error.message);
      return null;
    }
  },

  getUserPresets: async function (userId = null) {
    try {
      return (
        await prisma.slash_command_presets.findMany({
          where: { userId: !!userId ? Number(userId) : null },
          orderBy: { createdAt: "asc" },
        })
      )?.map((preset) => ({
        id: preset.id,
        command: preset.command,
        prompt: preset.prompt,
        description: preset.description,
      }));
    } catch (error) {
      consoleLogger.error("Failed to get user presets", error.message);
      return [];
    }
  },

  update: async function (presetId = null, presetData = {}) {
    try {
      // Only allow updating user-facing fields. Without this filter,
      // raw presetData is passed directly to Prisma and could overwrite
      // protected fields like id, userId, uid, or createdAt.
      const allowedFields = ["command", "prompt", "description"];
      const filteredData = {};
      for (const key of allowedFields) {
        if (presetData.hasOwnProperty(key)) {
          filteredData[key] = presetData[key];
        }
      }
      if (Object.keys(filteredData).length === 0) return null;

      const preset = await prisma.slash_command_presets.update({
        where: { id: Number(presetId) },
        data: filteredData,
      });
      return preset;
    } catch (error) {
      consoleLogger.error("Failed to update preset", error.message);
      return null;
    }
  },

  delete: async function (presetId = null) {
    try {
      await prisma.slash_command_presets.delete({
        where: { id: Number(presetId) },
      });
      return true;
    } catch (error) {
      consoleLogger.error("Failed to delete preset", error.message);
      return false;
    }
  },

  /**
   * Migrates all slash command presets with null userId to the specified admin user.
   * Called during multi-user mode enablement to assign orphaned presets to the new admin.
   * @param {number} adminUserId - The admin user ID to assign presets to
   * @returns {Promise<void>}
   */
  migrateToMultiUser: async function (adminUserId) {
    try {
      await prisma.slash_command_presets.updateMany({
        where: { userId: null },
        data: {
          userId: adminUserId,
          uid: adminUserId,
        },
      });
    } catch (error) {
      consoleLogger.error(
        "Error migrating slash command presets to multi-user mode:",
        error,
      );
    }
  },
};

module.exports.SlashCommandPresets = SlashCommandPresets;

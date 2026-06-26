// SPDX-License-Identifier: MIT
const consoleLogger = require("../utils/logger/console.js");

const { v4 } = require("uuid");
const prisma = require("../utils/prisma");
const bcrypt = require("bcryptjs");

const RecoveryCode = {
  tablename: "recovery_codes",
  writable: [],
  create: async function (userId, code) {
    try {
      const codeHash = await bcrypt.hash(code, 10);
      const recoveryCode = await prisma.recovery_codes.create({
        data: { user_id: userId, code_hash: codeHash },
      });
      return { recoveryCode, error: null };
    } catch (error) {
      consoleLogger.error("FAILED TO CREATE RECOVERY CODE.", error.message);
      return { recoveryCode: null, error: error.message };
    }
  },
  createMany: async function (data) {
    try {
      const recoveryCodes = await prisma.$transaction(
        data.map((recoveryCode) =>
          prisma.recovery_codes.create({ data: recoveryCode }),
        ),
      );
      return { recoveryCodes, error: null };
    } catch (error) {
      consoleLogger.error("FAILED TO CREATE RECOVERY CODES.", error.message);
      return { recoveryCodes: null, error: error.message };
    }
  },
  findFirst: async function (clause = {}) {
    try {
      const recoveryCode = await prisma.recovery_codes.findFirst({
        where: clause,
      });
      return recoveryCode;
    } catch (error) {
      consoleLogger.error("FAILED TO FIND RECOVERY CODE.", error.message);
      return null;
    }
  },
  findMany: async function (clause = {}) {
    try {
      const recoveryCodes = await prisma.recovery_codes.findMany({
        where: clause,
        take: 100,
      });
      return recoveryCodes;
    } catch (error) {
      consoleLogger.error("FAILED TO FIND RECOVERY CODES.", error.message);
      return [];
    }
  },
  deleteMany: async function (clause = {}) {
    try {
      await prisma.recovery_codes.deleteMany({ where: clause });
      return true;
    } catch (error) {
      consoleLogger.error("FAILED TO DELETE RECOVERY CODES.", error.message);
      return false;
    }
  },
  hashesForUser: async function (userId = null) {
    if (!userId) return [];
    return (await this.findMany({ user_id: userId })).map(
      (recovery) => recovery.code_hash,
    );
  },
};

const PasswordResetToken = {
  tablename: "password_reset_tokens",
  resetExpiryMs: 600_000, // 10 minutes in ms;
  writable: [],
  calcExpiry: function () {
    return new Date(Date.now() + this.resetExpiryMs);
  },
  create: async function (userId) {
    try {
      const passwordResetToken = await prisma.password_reset_tokens.create({
        data: { user_id: userId, token: v4(), expiresAt: this.calcExpiry() },
      });
      return { passwordResetToken, error: null };
    } catch (error) {
      consoleLogger.error(
        "FAILED TO CREATE PASSWORD RESET TOKEN.",
        error.message,
      );
      return { passwordResetToken: null, error: error.message };
    }
  },
  findUnique: async function (clause = {}) {
    try {
      const passwordResetToken = await prisma.password_reset_tokens.findUnique({
        where: clause,
      });
      return passwordResetToken;
    } catch (error) {
      consoleLogger.error(
        "FAILED TO FIND PASSWORD RESET TOKEN.",
        error.message,
      );
      return null;
    }
  },
  deleteMany: async function (clause = {}) {
    try {
      await prisma.password_reset_tokens.deleteMany({ where: clause });
      return true;
    } catch (error) {
      consoleLogger.error(
        "FAILED TO DELETE PASSWORD RESET TOKEN.",
        error.message,
      );
      return false;
    }
  },

  /**
   * Atomically claim a single-use reset token.
   * Deletes the token only if it exists and has not expired, returning the
   * delete count so callers can detect a concurrent claim (TOCTOU race).
   * @param {string} token - The plaintext token to claim.
   * @returns {Promise<{count: number, userId: number|null}>}
   */
  claim: async function (token) {
    try {
      const record = await prisma.password_reset_tokens.findUnique({
        where: { token: String(token) },
      });
      if (!record) return { count: 0, userId: null };
      if (record.expiresAt < new Date()) {
        // Clean up the expired token so it doesn't accumulate in the DB.
        try {
          await prisma.password_reset_tokens.delete({
            where: { id: record.id },
          });
        } catch {
          // already deleted by a concurrent request — ignore
        }
        return { count: 0, userId: record.user_id };
      }

      const result = await prisma.password_reset_tokens.deleteMany({
        where: {
          token: String(token),
          expiresAt: { gte: new Date() },
        },
      });
      return { count: result.count, userId: record.user_id };
    } catch (error) {
      consoleLogger.error(
        "FAILED TO CLAIM PASSWORD RESET TOKEN.",
        error.message,
      );
      return { count: 0, userId: null };
    }
  },
};

module.exports = {
  RecoveryCode,
  PasswordResetToken,
};

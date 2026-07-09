// SPDX-License-Identifier: MIT
// Tests for security-critical PasswordRecovery model (Issue #380).
// Covers: RecoveryCode CRUD, PasswordResetToken creation, claim (single-use),
// expiry validation, and hash verification.

jest.mock("../../utils/prisma", () => {
  const mockRecoveryCodes = {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    deleteMany: jest.fn(),
  };
  const mockResetTokens = {
    create: jest.fn(),
    findUnique: jest.fn(),
    deleteMany: jest.fn(),
    updateMany: jest.fn(),
  };
  return {
    recovery_codes: mockRecoveryCodes,
    password_reset_tokens: mockResetTokens,
    $transaction: jest.fn(async (ops) => {
      if (Array.isArray(ops)) return Promise.all(ops);
      return ops;
    }),
  };
});

jest.mock("../../utils/logger/console.js", () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

jest.mock("bcryptjs", () => ({
  hash: jest.fn().mockResolvedValue("$2a$12$hashedvalue"),
  compare: jest.fn().mockResolvedValue(true),
}));

jest.mock("uuid", () => ({
  v4: jest.fn(() => "test-uuid-1234"),
}));

const {
  RecoveryCode,
  PasswordResetToken,
} = require("../../models/passwordRecovery");
const prisma = require("../../utils/prisma");
const bcrypt = require("bcryptjs");

describe("RecoveryCode model (security-critical)", () => {
  afterEach(() => jest.clearAllMocks());

  describe("RecoveryCode.create", () => {
    it("creates a recovery code with a bcrypt hash", async () => {
      prisma.recovery_codes.create.mockResolvedValue({
        id: 1,
        user_id: 42,
        code_hash: "$2a$12$hashedvalue",
      });

      const { recoveryCode, error } = await RecoveryCode.create(42, "ABC123");

      expect(error).toBeNull();
      expect(recoveryCode).toBeTruthy();
      expect(bcrypt.hash).toHaveBeenCalledWith("ABC123", 12);
      expect(prisma.recovery_codes.create).toHaveBeenCalledWith({
        data: { user_id: 42, code_hash: "$2a$12$hashedvalue" },
      });
    });

    it("returns null and error on prisma failure", async () => {
      prisma.recovery_codes.create.mockRejectedValue(new Error("DB error"));

      const { recoveryCode, error } = await RecoveryCode.create(42, "ABC123");

      expect(recoveryCode).toBeNull();
      expect(error).toBe("DB error");
    });
  });

  describe("RecoveryCode.findFirst", () => {
    it("returns the recovery code when found", async () => {
      const mockCode = { id: 1, user_id: 42, code_hash: "hashed" };
      prisma.recovery_codes.findFirst.mockResolvedValue(mockCode);

      const result = await RecoveryCode.findFirst({ user_id: 42 });

      expect(result).toEqual(mockCode);
    });

    it("returns null when not found", async () => {
      prisma.recovery_codes.findFirst.mockResolvedValue(null);

      const result = await RecoveryCode.findFirst({ user_id: 999 });

      expect(result).toBeNull();
    });

    it("returns null on prisma error", async () => {
      prisma.recovery_codes.findFirst.mockRejectedValue(new Error("DB error"));

      const result = await RecoveryCode.findFirst({ user_id: 42 });

      expect(result).toBeNull();
    });
  });

  describe("RecoveryCode.findMany", () => {
    it("returns multiple recovery codes", async () => {
      const mockCodes = [
        { id: 1, user_id: 42, code_hash: "hash1" },
        { id: 2, user_id: 42, code_hash: "hash2" },
      ];
      prisma.recovery_codes.findMany.mockResolvedValue(mockCodes);

      const results = await RecoveryCode.findMany({ user_id: 42 });

      expect(results).toHaveLength(2);
      expect(prisma.recovery_codes.findMany).toHaveBeenCalledWith({
        where: { user_id: 42 },
        take: 100,
      });
    });

    it("returns empty array on prisma error", async () => {
      prisma.recovery_codes.findMany.mockRejectedValue(new Error("DB error"));

      const results = await RecoveryCode.findMany({ user_id: 42 });

      expect(results).toEqual([]);
    });
  });

  describe("RecoveryCode.deleteMany", () => {
    it("deletes codes matching the clause and returns true", async () => {
      prisma.recovery_codes.deleteMany.mockResolvedValue({ count: 3 });

      const result = await RecoveryCode.deleteMany({ user_id: 42 });

      expect(result).toBe(true);
    });

    it("returns false on prisma error", async () => {
      prisma.recovery_codes.deleteMany.mockRejectedValue(new Error("DB error"));

      const result = await RecoveryCode.deleteMany({ user_id: 42 });

      expect(result).toBe(false);
    });
  });

  describe("RecoveryCode.hashesForUser", () => {
    it("returns an array of code hashes for a user", async () => {
      prisma.recovery_codes.findMany.mockResolvedValue([
        { code_hash: "hash1" },
        { code_hash: "hash2" },
      ]);

      const hashes = await RecoveryCode.hashesForUser(42);

      expect(hashes).toEqual(["hash1", "hash2"]);
    });

    it("returns empty array when userId is null", async () => {
      const hashes = await RecoveryCode.hashesForUser(null);

      expect(hashes).toEqual([]);
      expect(prisma.recovery_codes.findMany).not.toHaveBeenCalled();
    });
  });
});

describe("PasswordResetToken model (security-critical)", () => {
  afterEach(() => jest.clearAllMocks());

  describe("PasswordResetToken.create", () => {
    it("creates a reset token with a UUID and 10-minute expiry", async () => {
      prisma.password_reset_tokens.create.mockImplementation(({ data }) =>
        Promise.resolve({
          id: 1,
          user_id: 42,
          token: "test-uuid-1234",
          expiresAt: data.expiresAt,
        }),
      );

      const { passwordResetToken, error } =
        await PasswordResetToken.create(42);

      expect(error).toBeNull();
      expect(passwordResetToken).toBeTruthy();
      expect(passwordResetToken.token).toBe("test-uuid-1234");
      // Expiry should be ~10 minutes from now
      const expiry = passwordResetToken.expiresAt;
      expect(expiry).toBeInstanceOf(Date);
      expect(expiry.getTime() - Date.now()).toBeGreaterThan(500_000); // >~8.3 min
      expect(expiry.getTime() - Date.now()).toBeLessThan(700_000); // <~11.7 min
    });

    it("returns null and error on prisma failure", async () => {
      prisma.password_reset_tokens.create.mockRejectedValue(
        new Error("DB error"),
      );

      const { passwordResetToken, error } =
        await PasswordResetToken.create(42);

      expect(passwordResetToken).toBeNull();
      expect(error).toBe("DB error");
    });
  });

  describe("PasswordResetToken.findUnique", () => {
    it("returns the token when found", async () => {
      const mockToken = {
        id: 1,
        token: "test-uuid-1234",
        user_id: 42,
        expiresAt: new Date(Date.now() + 600000),
      };
      prisma.password_reset_tokens.findUnique.mockResolvedValue(mockToken);

      const result = await PasswordResetToken.findUnique({
        token: "test-uuid-1234",
      });

      expect(result).toEqual(mockToken);
    });

    it("returns null when not found", async () => {
      prisma.password_reset_tokens.findUnique.mockResolvedValue(null);

      const result = await PasswordResetToken.findUnique({
        token: "nonexistent",
      });

      expect(result).toBeNull();
    });

    it("returns null on prisma error", async () => {
      prisma.password_reset_tokens.findUnique.mockRejectedValue(
        new Error("DB error"),
      );

      const result = await PasswordResetToken.findUnique({
        token: "test",
      });

      expect(result).toBeNull();
    });
  });

  describe("PasswordResetToken.deleteMany", () => {
    it("deletes tokens matching the clause and returns true", async () => {
      prisma.password_reset_tokens.deleteMany.mockResolvedValue({ count: 1 });

      const result = await PasswordResetToken.deleteMany({ user_id: 42 });

      expect(result).toBe(true);
    });

    it("returns false on prisma error", async () => {
      prisma.password_reset_tokens.deleteMany.mockRejectedValue(
        new Error("DB error"),
      );

      const result = await PasswordResetToken.deleteMany({ user_id: 42 });

      expect(result).toBe(false);
    });
  });

  describe("PasswordResetToken.calcExpiry", () => {
    it("returns a date ~10 minutes in the future", () => {
      const expiry = PasswordResetToken.calcExpiry();

      expect(expiry).toBeInstanceOf(Date);
      expect(expiry.getTime() - Date.now()).toBeGreaterThan(500_000);
      expect(expiry.getTime() - Date.now()).toBeLessThan(700_000);
    });
  });

  describe("PasswordResetToken.claim (single-use atomic claim)", () => {
    it("atomically claims a valid, non-expired token", async () => {
      prisma.password_reset_tokens.deleteMany.mockResolvedValue({ count: 1 });
      prisma.password_reset_tokens.findUnique.mockResolvedValue({
        user_id: 42,
        expiresAt: new Date(Date.now() + 600_000), // 10 minutes in the future
      });

      const result = await PasswordResetToken.claim("valid-token");

      expect(result.count).toBe(1);
      expect(result.userId).toBe(42);
    });

    it("returns count=0 when token was already claimed (race condition)", async () => {
      // Token has already been deleted by a concurrent request — findUnique returns null.
      prisma.password_reset_tokens.findUnique.mockResolvedValue(null);
      prisma.password_reset_tokens.deleteMany.mockResolvedValue({ count: 0 });

      const result = await PasswordResetToken.claim("raced-token");

      expect(result.count).toBe(0);
      expect(result.userId).toBeNull();
    });

    it("returns count=0 on error", async () => {
      prisma.password_reset_tokens.deleteMany.mockRejectedValue(
        new Error("DB error"),
      );

      const result = await PasswordResetToken.claim("error-token");

      expect(result.count).toBe(0);
      expect(result.userId).toBeNull();
    });
  });
});

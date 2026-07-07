// SPDX-License-Identifier: MIT
// Tests for security-critical TemporaryAuthToken model (Issue #380).
// Covers: issue, validate (single-use + expiry), invalidateUserTokens.
// Verifies that tokens are single-use (atomic claim prevents TOCTOU race).

jest.mock("../../utils/prisma", () => {
  const mockTokens = {
    create: jest.fn(),
    findUnique: jest.fn(),
    deleteMany: jest.fn(),
  };
  return {
    temporary_auth_tokens: mockTokens,
    $transaction: jest.fn(async (fn) => {
      if (typeof fn === "function") {
        return fn({
          temporary_auth_tokens: mockTokens,
        });
      }
      return Promise.all(fn);
    }),
  };
});

jest.mock("../../utils/http", () => ({
  makeJWT: jest.fn(() => "mock-jwt-token"),
}));

jest.mock("../../utils/logger/console.js", () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

const { TemporaryAuthToken } = require("../../models/temporaryAuthToken");
const prisma = require("../../utils/prisma");
const { makeJWT } = require("../../utils/http");

describe("TemporaryAuthToken model (security-critical)", () => {
  afterEach(() => jest.clearAllMocks());

  // ── issue ───────────────────────────────────────────────────────────
  describe("TemporaryAuthToken.issue", () => {
    it("creates a token with expiry for a valid user ID", async () => {
      prisma.temporary_auth_tokens.create.mockResolvedValue({
        id: 1,
        token: "allm-tat-abc123",
        userId: 42,
        expiresAt: new Date(Date.now() + 3600000),
      });

      const { token, error } = await TemporaryAuthToken.issue(42);

      expect(error).toBeNull();
      expect(token).toBeTruthy();
      expect(token).toMatch(/^allm-tat-/);
      // Old tokens should be deleted before creating new one (in transaction)
      expect(prisma.temporary_auth_tokens.deleteMany).toHaveBeenCalledWith({
        where: { userId: 42 },
      });
      expect(prisma.temporary_auth_tokens.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 42,
          token: expect.any(String),
          expiresAt: expect.any(Date),
        }),
      });
    });

    it("throws when userId is null", async () => {
      await expect(TemporaryAuthToken.issue(null)).rejects.toThrow(
        "User ID is required",
      );
      expect(prisma.temporary_auth_tokens.create).not.toHaveBeenCalled();
    });

    it("throws when userId is undefined", async () => {
      await expect(TemporaryAuthToken.issue()).rejects.toThrow(
        "User ID is required",
      );
    });

    it("returns null token and error on prisma failure", async () => {
      prisma.temporary_auth_tokens.create.mockRejectedValue(
        new Error("DB error"),
      );

      const { token, error } = await TemporaryAuthToken.issue(42);

      expect(token).toBeNull();
      expect(error).toBe("DB error");
    });

    it("deletes existing tokens before creating a new one (single-use)", async () => {
      prisma.temporary_auth_tokens.create.mockResolvedValue({ id: 2 });

      await TemporaryAuthToken.issue(42);

      // deleteMany should be called inside the transaction before create
      expect(prisma.temporary_auth_tokens.deleteMany).toHaveBeenCalled();
    });
  });

  // ── validate ────────────────────────────────────────────────────────
  describe("TemporaryAuthToken.validate", () => {
    it("returns session token for a valid, non-expired token", async () => {
      const futureDate = new Date(Date.now() + 3600000);
      prisma.temporary_auth_tokens.findUnique.mockResolvedValue({
        token: "allm-tat-valid",
        expiresAt: futureDate,
        user: { id: 42, username: "testuser", suspended: false },
      });
      prisma.temporary_auth_tokens.deleteMany.mockResolvedValue({ count: 1 });

      const { sessionToken, token, error } =
        await TemporaryAuthToken.validate("allm-tat-valid");

      expect(error).toBeNull();
      expect(sessionToken).toBe("mock-jwt-token");
      expect(token).toBeTruthy();
      expect(makeJWT).toHaveBeenCalled();
    });

    it("rejects an empty token string", async () => {
      const { sessionToken, error } =
        await TemporaryAuthToken.validate("");

      expect(sessionToken).toBeNull();
      expect(error).toBe("Public token is required to validate a temporary auth token.");
    });

    it("rejects a non-existent token", async () => {
      prisma.temporary_auth_tokens.findUnique.mockResolvedValue(null);

      const { sessionToken, error } =
        await TemporaryAuthToken.validate("allm-tat-nonexistent");

      expect(sessionToken).toBeNull();
      expect(error).toBe("Invalid token.");
    });

    it("rejects an expired token", async () => {
      const pastDate = new Date(Date.now() - 3600000);
      prisma.temporary_auth_tokens.findUnique.mockResolvedValue({
        token: "allm-tat-expired",
        expiresAt: pastDate,
        user: { id: 42, username: "testuser", suspended: false },
      });

      const { sessionToken, error } =
        await TemporaryAuthToken.validate("allm-tat-expired");

      expect(sessionToken).toBeNull();
      expect(error).toBe("Token expired.");
    });

    it("rejects a token for a suspended user", async () => {
      const futureDate = new Date(Date.now() + 3600000);
      prisma.temporary_auth_tokens.findUnique.mockResolvedValue({
        token: "allm-tat-suspended",
        expiresAt: futureDate,
        user: { id: 42, username: "banned", suspended: true },
      });

      const { sessionToken, error } =
        await TemporaryAuthToken.validate("allm-tat-suspended");

      expect(sessionToken).toBeNull();
      expect(error).toBe("User account suspended.");
    });

    it("rejects a token that was already claimed (TOCTOU race)", async () => {
      const futureDate = new Date(Date.now() + 3600000);
      prisma.temporary_auth_tokens.findUnique.mockResolvedValue({
        token: "allm-tat-raced",
        expiresAt: futureDate,
        user: { id: 42, username: "testuser", suspended: false },
      });
      // Simulate a concurrent claim: deleteMany returns count=0
      prisma.temporary_auth_tokens.deleteMany.mockResolvedValue({ count: 0 });

      const { sessionToken, error } =
        await TemporaryAuthToken.validate("allm-tat-raced");

      expect(sessionToken).toBeNull();
      expect(error).toBe("Token already used or expired.");
    });
  });

  // ── invalidateUserTokens ─────────────────────────────────────────────
  describe("TemporaryAuthToken.invalidateUserTokens", () => {
    it("deletes all tokens for a user", async () => {
      prisma.temporary_auth_tokens.deleteMany.mockResolvedValue({ count: 3 });

      const result = await TemporaryAuthToken.invalidateUserTokens(42);

      expect(result).toBe(true);
      expect(prisma.temporary_auth_tokens.deleteMany).toHaveBeenCalledWith({
        where: { userId: 42 },
      });
    });

    it("throws when userId is null", async () => {
      await expect(TemporaryAuthToken.invalidateUserTokens(null)).rejects.toThrow(
        "User ID is required",
      );
    });
  });

  // ── makeTempToken ────────────────────────────────────────────────────
  describe("TemporaryAuthToken.makeTempToken", () => {
    it("generates a token with the allm-tat- prefix", () => {
      const token = TemporaryAuthToken.makeTempToken();
      expect(token).toMatch(/^allm-tat-/);
      expect(token.length).toBeGreaterThan(10);
    });

    it("generates unique tokens", () => {
      const token1 = TemporaryAuthToken.makeTempToken();
      const token2 = TemporaryAuthToken.makeTempToken();
      expect(token1).not.toBe(token2);
    });
  });
});

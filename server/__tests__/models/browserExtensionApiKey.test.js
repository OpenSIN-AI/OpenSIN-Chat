// SPDX-License-Identifier: MIT
// Tests for security-critical BrowserExtensionApiKey model (Issue #380).
// Covers: create, validate (format + multi-user mode), get, delete,
// deleteAllForUser. Verifies that keys are prefixed with "brx-" and
// that multi-user mode enforces user association.

jest.mock("../../utils/prisma", () => {
  const mockKeys = {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  };
  return {
    browser_extension_api_keys: mockKeys,
  };
});

jest.mock("../../models/systemSettings", () => ({
  SystemSettings: {
    isMultiUserMode: jest.fn().mockResolvedValue(false),
  },
}));

jest.mock("../../utils/middleware/multiUserProtected", () => ({
  ROLES: { admin: "admin", manager: "manager", user: "user", all: "all" },
}));

jest.mock("../../utils/logger/console.js", () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

const { BrowserExtensionApiKey } = require("../../models/browserExtensionApiKey");
const prisma = require("../../utils/prisma");
const { SystemSettings } = require("../../models/systemSettings");

describe("BrowserExtensionApiKey model (security-critical)", () => {
  afterEach(() => jest.clearAllMocks());

  // ── makeSecret ──────────────────────────────────────────────────────
  describe("BrowserExtensionApiKey.makeSecret", () => {
    it("generates a key with the brx- prefix", () => {
      const key = BrowserExtensionApiKey.makeSecret();
      expect(key).toMatch(/^brx-/);
      expect(key.length).toBeGreaterThan(10);
    });

    it("generates unique keys", () => {
      const key1 = BrowserExtensionApiKey.makeSecret();
      const key2 = BrowserExtensionApiKey.makeSecret();
      expect(key1).not.toBe(key2);
    });
  });

  // ── create ──────────────────────────────────────────────────────────
  describe("BrowserExtensionApiKey.create", () => {
    it("creates a key associated with a user", async () => {
      prisma.browser_extension_api_keys.create.mockResolvedValue({
        id: 1,
        key: "brx-test-key",
        user_id: 42,
      });

      const { apiKey, error } = await BrowserExtensionApiKey.create(42);

      expect(error).toBeNull();
      expect(apiKey).toBeTruthy();
      expect(apiKey.key).toMatch(/^brx-/);
      expect(prisma.browser_extension_api_keys.create).toHaveBeenCalledWith({
        data: {
          key: expect.stringMatching(/^brx-/),
          user_id: 42,
        },
      });
    });

    it("creates a key without a user (single-user mode)", async () => {
      prisma.browser_extension_api_keys.create.mockResolvedValue({
        id: 2,
        key: "brx-another-key",
        user_id: null,
      });

      const { apiKey, error } = await BrowserExtensionApiKey.create(null);

      expect(error).toBeNull();
      expect(apiKey.user_id).toBeNull();
    });

    it("returns null and error on prisma failure", async () => {
      prisma.browser_extension_api_keys.create.mockRejectedValue(
        new Error("DB error"),
      );

      const { apiKey, error } = await BrowserExtensionApiKey.create(42);

      expect(apiKey).toBeNull();
      expect(error).toBe("DB error");
    });
  });

  // ── validate ────────────────────────────────────────────────────────
  describe("BrowserExtensionApiKey.validate", () => {
    it("returns the API key for a valid key in single-user mode", async () => {
      const mockKey = { id: 1, key: "brx-valid", user_id: null };
      prisma.browser_extension_api_keys.findUnique.mockResolvedValue(mockKey);
      SystemSettings.isMultiUserMode.mockResolvedValue(false);

      const result = await BrowserExtensionApiKey.validate("brx-valid");

      expect(result).toEqual(mockKey);
    });

    it("returns false for a key without the brx- prefix", async () => {
      const result = await BrowserExtensionApiKey.validate("invalid-key");

      expect(result).toBe(false);
      expect(prisma.browser_extension_api_keys.findUnique).not.toHaveBeenCalled();
    });

    it("returns false for an empty key", async () => {
      const result = await BrowserExtensionApiKey.validate("");

      expect(result).toBe(false);
    });

    it("returns false for a non-existent key", async () => {
      prisma.browser_extension_api_keys.findUnique.mockResolvedValue(null);

      const result = await BrowserExtensionApiKey.validate("brx-nonexistent");

      expect(result).toBe(false);
    });

    it("returns the key in multi-user mode when user_id is set", async () => {
      const mockKey = { id: 1, key: "brx-multi", user_id: 42 };
      prisma.browser_extension_api_keys.findUnique.mockResolvedValue(mockKey);
      SystemSettings.isMultiUserMode.mockResolvedValue(true);

      const result = await BrowserExtensionApiKey.validate("brx-multi");

      expect(result).toEqual(mockKey);
    });

    it("returns false in multi-user mode when user_id is null", async () => {
      const mockKey = { id: 2, key: "brx-no-user", user_id: null };
      prisma.browser_extension_api_keys.findUnique.mockResolvedValue(mockKey);
      SystemSettings.isMultiUserMode.mockResolvedValue(true);

      const result = await BrowserExtensionApiKey.validate("brx-no-user");

      expect(result).toBe(false);
    });

    it("returns false on prisma error", async () => {
      prisma.browser_extension_api_keys.findUnique.mockRejectedValue(
        new Error("DB error"),
      );

      const result = await BrowserExtensionApiKey.validate("brx-error");

      expect(result).toBe(false);
    });
  });

  // ── get ─────────────────────────────────────────────────────────────
  describe("BrowserExtensionApiKey.get", () => {
    it("returns the key when found", async () => {
      const mockKey = { id: 1, key: "brx-found", user_id: 42 };
      prisma.browser_extension_api_keys.findFirst.mockResolvedValue(mockKey);

      const result = await BrowserExtensionApiKey.get({ id: 1 });

      expect(result).toEqual(mockKey);
    });

    it("returns null when not found", async () => {
      prisma.browser_extension_api_keys.findFirst.mockResolvedValue(null);

      const result = await BrowserExtensionApiKey.get({ id: 999 });

      expect(result).toBeNull();
    });

    it("returns null on prisma error", async () => {
      prisma.browser_extension_api_keys.findFirst.mockRejectedValue(
        new Error("DB error"),
      );

      const result = await BrowserExtensionApiKey.get({ id: 1 });

      expect(result).toBeNull();
    });
  });

  // ── delete ──────────────────────────────────────────────────────────
  describe("BrowserExtensionApiKey.delete", () => {
    it("deletes a key by id and returns success", async () => {
      prisma.browser_extension_api_keys.delete.mockResolvedValue({ id: 1 });

      const { success, error } = await BrowserExtensionApiKey.delete(1);

      expect(error).toBeNull();
      expect(success).toBe(true);
      expect(prisma.browser_extension_api_keys.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it("returns error on prisma failure", async () => {
      prisma.browser_extension_api_keys.delete.mockRejectedValue(
        new Error("DB error"),
      );

      const { success, error } = await BrowserExtensionApiKey.delete(999);

      expect(success).toBe(false);
      expect(error).toBe("DB error");
    });
  });

  // ── deleteAllForUser ─────────────────────────────────────────────────
  describe("BrowserExtensionApiKey.deleteAllForUser", () => {
    it("deletes all keys for a user", async () => {
      prisma.browser_extension_api_keys.deleteMany.mockResolvedValue({
        count: 3,
      });

      const { success, error } =
        await BrowserExtensionApiKey.deleteAllForUser(42);

      expect(error).toBeNull();
      expect(success).toBe(true);
      expect(prisma.browser_extension_api_keys.deleteMany).toHaveBeenCalledWith({
        where: { user_id: 42 },
      });
    });

    it("returns error when userId is null", async () => {
      const { success, error } =
        await BrowserExtensionApiKey.deleteAllForUser(null);

      expect(success).toBe(false);
      expect(error).toBe("User ID is required");
    });

    it("returns error on prisma failure", async () => {
      prisma.browser_extension_api_keys.deleteMany.mockRejectedValue(
        new Error("DB error"),
      );

      const { success, error } =
        await BrowserExtensionApiKey.deleteAllForUser(42);

      expect(success).toBe(false);
      expect(error).toBe("DB error");
    });
  });
});

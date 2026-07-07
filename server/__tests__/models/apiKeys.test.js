// SPDX-License-Identifier: MIT
// Security-critical tests for the ApiKey model (Issue #380).
//
// Covers: create (key generation), get with valid/invalid key,
// delete + verify, and list (where) for a user.
//
// The ApiKey model does not expose a standalone `list` method.
// The equivalent is `ApiKey.where({ createdBy: userId })`.

jest.mock("../../utils/prisma", () => {
  const mockApiKeys = {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    deleteMany: jest.fn(),
  };
  return {
    api_keys: mockApiKeys,
  };
});

const { ApiKey } = require("../../models/apiKeys");
const prisma = require("../../utils/prisma");

describe("ApiKey model (security-critical)", () => {
  afterEach(() => jest.clearAllMocks());

  // ──────────────────────────────────────────────
  // ApiKey.create
  // ──────────────────────────────────────────────
  describe("ApiKey.create", () => {
    it("generates a key and returns it with no error", async () => {
      const fakeKey = "ak_generated_secret_key_12345";
      prisma.api_keys.create.mockResolvedValue({
        id: 1,
        name: "test-key",
        secret: fakeKey,
        createdBy: 5,
        createdAt: new Date(),
        lastUpdatedAt: new Date(),
      });

      const { apiKey, error } = await ApiKey.create(5, "test-key");

      expect(error).toBeNull();
      expect(apiKey).toBeDefined();
      expect(apiKey.id).toBe(1);
      expect(apiKey.name).toBe("test-key");
      expect(apiKey.createdBy).toBe(5);
      // The secret must be present on the created record
      expect(apiKey.secret).toBe(fakeKey);
      expect(prisma.api_keys.create).toHaveBeenCalledTimes(1);
      expect(prisma.api_keys.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: "test-key",
          createdBy: 5,
          secret: expect.any(String),
        }),
      });
    });

    it("generates a non-empty secret string", () => {
      const secret = ApiKey.makeSecret();
      expect(typeof secret).toBe("string");
      expect(secret.length).toBeGreaterThan(10);
    });

    it("generates unique secrets on successive calls", () => {
      const s1 = ApiKey.makeSecret();
      const s2 = ApiKey.makeSecret();
      expect(s1).not.toBe(s2);
    });

    it("normalizes a whitespace-only name to null", async () => {
      prisma.api_keys.create.mockResolvedValue({
        id: 2,
        name: null,
        secret: "ak_key",
        createdBy: 1,
      });

      const { apiKey } = await ApiKey.create(1, "   ");
      expect(apiKey.name).toBeNull();
      expect(prisma.api_keys.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ name: null }),
      });
    });

    it("defaults name to null when not provided", async () => {
      prisma.api_keys.create.mockResolvedValue({
        id: 3,
        name: null,
        secret: "ak_key",
        createdBy: 1,
      });

      const { apiKey } = await ApiKey.create(1);
      expect(apiKey.name).toBeNull();
    });

    it("returns an error when prisma fails", async () => {
      prisma.api_keys.create.mockRejectedValue(new Error("DB failure"));
      const { apiKey, error } = await ApiKey.create(1, "fail-key");
      expect(apiKey).toBeNull();
      expect(error).toBe("DB failure");
    });
  });

  // ──────────────────────────────────────────────
  // ApiKey.get
  // ──────────────────────────────────────────────
  describe("ApiKey.get", () => {
    it("returns the key (without secret) when found with a valid clause", async () => {
      prisma.api_keys.findFirst.mockResolvedValue({
        id: 10,
        name: "prod-key",
        secret: "super_secret_value",
        createdBy: 7,
        createdAt: new Date(),
        lastUpdatedAt: new Date(),
      });

      const result = await ApiKey.get({ id: 10 });

      expect(result).toBeDefined();
      expect(result.id).toBe(10);
      expect(result.name).toBe("prod-key");
      // _stripSecret must remove the secret field
      expect(result.secret).toBeUndefined();
      expect(prisma.api_keys.findFirst).toHaveBeenCalledWith({ where: { id: 10 } });
    });

    it("returns null when the key does not exist (invalid key)", async () => {
      prisma.api_keys.findFirst.mockResolvedValue(null);

      const result = await ApiKey.get({ id: 99999 });

      expect(result).toBeNull();
      expect(prisma.api_keys.findFirst).toHaveBeenCalledWith({
        where: { id: 99999 },
      });
    });

    it("returns null when looking up by a non-existent secret", async () => {
      prisma.api_keys.findFirst.mockResolvedValue(null);

      const result = await ApiKey.get({ secret: "invalid_secret_xyz" });

      expect(result).toBeNull();
    });

    it("returns null on database error", async () => {
      prisma.api_keys.findFirst.mockRejectedValue(new Error("DB error"));

      const result = await ApiKey.get({ id: 1 });
      expect(result).toBeNull();
    });
  });

  // ──────────────────────────────────────────────
  // ApiKey.delete
  // ──────────────────────────────────────────────
  describe("ApiKey.delete", () => {
    it("deletes a key by id and returns true", async () => {
      prisma.api_keys.deleteMany.mockResolvedValue({ count: 1 });

      const result = await ApiKey.delete({ id: 5 });
      expect(result).toBe(true);
      expect(prisma.api_keys.deleteMany).toHaveBeenCalledWith({
        where: { id: 5 },
      });
    });

    it("verifies the key is gone after deletion", async () => {
      // Key exists before deletion
      prisma.api_keys.findFirst.mockResolvedValueOnce({
        id: 8,
        name: "to-delete",
        secret: "secret123",
        createdBy: 1,
      });
      const before = await ApiKey.get({ id: 8 });
      expect(before).toBeDefined();
      expect(before.id).toBe(8);

      // Delete
      prisma.api_keys.deleteMany.mockResolvedValue({ count: 1 });
      const deleted = await ApiKey.delete({ id: 8 });
      expect(deleted).toBe(true);

      // Key is gone after deletion
      prisma.api_keys.findFirst.mockResolvedValueOnce(null);
      const after = await ApiKey.get({ id: 8 });
      expect(after).toBeNull();
    });

    it("returns false on database error", async () => {
      prisma.api_keys.deleteMany.mockRejectedValue(new Error("DB error"));
      const result = await ApiKey.delete({ id: 999 });
      expect(result).toBe(false);
    });
  });

  // ──────────────────────────────────────────────
  // ApiKey.list  (via ApiKey.where)
  // ──────────────────────────────────────────────
  describe("ApiKey.where (list for a user)", () => {
    it("returns all keys for a user with secrets stripped", async () => {
      prisma.api_keys.findMany.mockResolvedValue([
        {
          id: 1,
          name: "key-one",
          secret: "secret_a",
          createdBy: 5,
          createdAt: new Date(),
          lastUpdatedAt: new Date(),
        },
        {
          id: 2,
          name: "key-two",
          secret: "secret_b",
          createdBy: 5,
          createdAt: new Date(),
          lastUpdatedAt: new Date(),
        },
      ]);

      const keys = await ApiKey.where({ createdBy: 5 });

      expect(keys).toHaveLength(2);
      expect(keys[0].id).toBe(1);
      expect(keys[0].name).toBe("key-one");
      expect(keys[0].secret).toBeUndefined();
      expect(keys[1].id).toBe(2);
      expect(keys[1].secret).toBeUndefined();
      expect(prisma.api_keys.findMany).toHaveBeenCalledWith({
        where: { createdBy: 5 },
        take: undefined,
      });
    });

    it("returns an empty array when the user has no keys", async () => {
      prisma.api_keys.findMany.mockResolvedValue([]);

      const keys = await ApiKey.where({ createdBy: 999 });
      expect(keys).toEqual([]);
    });

    it("returns an empty array on database error", async () => {
      prisma.api_keys.findMany.mockRejectedValue(new Error("DB error"));

      const keys = await ApiKey.where({ createdBy: 1 });
      expect(keys).toEqual([]);
    });

    it("respects the limit parameter", async () => {
      prisma.api_keys.findMany.mockResolvedValue([]);

      await ApiKey.where({ createdBy: 1 }, 10);
      expect(prisma.api_keys.findMany).toHaveBeenCalledWith({
        where: { createdBy: 1 },
        take: 10,
      });
    });
  });

  // ──────────────────────────────────────────────
  // ApiKey.count
  // ──────────────────────────────────────────────
  describe("ApiKey.count", () => {
    it("returns the count of keys matching the clause", async () => {
      prisma.api_keys.count.mockResolvedValue(3);
      const count = await ApiKey.count({ createdBy: 5 });
      expect(count).toBe(3);
      expect(prisma.api_keys.count).toHaveBeenCalledWith({ where: { createdBy: 5 } });
    });

    it("returns 0 on database error", async () => {
      prisma.api_keys.count.mockRejectedValue(new Error("DB error"));
      const count = await ApiKey.count({ createdBy: 5 });
      expect(count).toBe(0);
    });
  });

  // ──────────────────────────────────────────────
  // ApiKey._stripSecret
  // ──────────────────────────────────────────────
  describe("ApiKey._stripSecret", () => {
    it("removes the secret field from an api key object", () => {
      const input = { id: 1, name: "test", secret: "abc", createdBy: 2 };
      const result = ApiKey._stripSecret(input);
      expect(result.id).toBe(1);
      expect(result.name).toBe("test");
      expect(result.createdBy).toBe(2);
      expect(result.secret).toBeUndefined();
    });

    it("returns null for falsy input", () => {
      expect(ApiKey._stripSecret(null)).toBeNull();
      expect(ApiKey._stripSecret(undefined)).toBeNull();
      expect(ApiKey._stripSecret(0)).toBeNull();
    });
  });
});

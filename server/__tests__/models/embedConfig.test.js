// SPDX-License-Identifier: MIT
// Tests for the EmbedConfig model (Issue #529).
// Covers: new, update, get, getWithWorkspace, delete, where,
// whereWithWorkspace, parseAllowedHosts, and validation helpers.

jest.mock("../../utils/prisma", () => {
  const mockEmbedConfigs = {
    create: jest.fn(),
    update: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    deleteMany: jest.fn(),
  };
  return {
    embed_configs: mockEmbedConfigs,
  };
});

jest.mock("../../utils/logger/console.js", () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

jest.mock("../../utils/database/queryLimits", () => ({
  clampLimit: jest.fn((val, opts) => val || opts.fallback),
  MAX_LIST_LIMIT: 1000,
}));

jest.mock("uuid", () => ({
  v4: jest.fn(() => "test-uuid-1234"),
}));

const { EmbedConfig } = require("../../models/embedConfig");
const prisma = require("../../utils/prisma");

describe("EmbedConfig model", () => {
  afterEach(() => jest.clearAllMocks());

  // ── writable ───────────────────────────────────────────────────────
  describe("writable fields", () => {
    it("exposes the list of writable keys", () => {
      expect(EmbedConfig.writable).toContain("enabled");
      expect(EmbedConfig.writable).toContain("name");
      expect(EmbedConfig.writable).toContain("chat_mode");
      expect(EmbedConfig.writable).toContain("workspace_id");
      expect(EmbedConfig.writable).toContain("message_limit");
    });
  });

  // ── new ────────────────────────────────────────────────────────────
  describe("new", () => {
    it("creates an embed config with valid data", async () => {
      const fakeEmbed = {
        id: 1,
        uuid: "test-uuid-1234",
        enabled: true,
        name: "My Embed",
        chat_mode: "chat",
        workspace_id: 10,
      };
      prisma.embed_configs.create.mockResolvedValue(fakeEmbed);

      const { embed, message } = await EmbedConfig.new(
        {
          name: "My Embed",
          chat_mode: "chat",
          workspace_id: 10,
          allow_model_override: true,
          allow_temperature_override: false,
          allow_prompt_override: true,
          max_chats_per_day: 100,
          max_chats_per_session: 10,
          message_limit: 25,
          allowlist_domains: "example.com,foo.bar.com",
        },
        5,
      );

      expect(message).toBeNull();
      expect(embed).toBeDefined();
      expect(embed.id).toBe(1);
      expect(prisma.embed_configs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            uuid: "test-uuid-1234",
            enabled: true,
            name: "My Embed",
            chat_mode: "chat",
            createdBy: 5,
            workspace: { connect: { id: 10 } },
          }),
        }),
      );
    });

    it("defaults chat_mode to query when invalid", async () => {
      prisma.embed_configs.create.mockResolvedValue({ id: 1 });

      await EmbedConfig.new(
        { name: "Test", chat_mode: "invalid", workspace_id: 1 },
        1,
      );

      expect(prisma.embed_configs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ chat_mode: "query" }),
        }),
      );
    });

    it("defaults chat_mode to query when not provided", async () => {
      prisma.embed_configs.create.mockResolvedValue({ id: 1 });

      await EmbedConfig.new({ name: "Test", workspace_id: 1 }, 1);

      expect(prisma.embed_configs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ chat_mode: "query" }),
        }),
      );
    });

    it("sets createdBy to null when no creatorId", async () => {
      prisma.embed_configs.create.mockResolvedValue({ id: 1 });

      await EmbedConfig.new({ name: "Test", workspace_id: 1 });

      expect(prisma.embed_configs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ createdBy: null }),
        }),
      );
    });

    it("returns error on prisma failure", async () => {
      prisma.embed_configs.create.mockRejectedValue(new Error("DB error"));

      const { embed, message } = await EmbedConfig.new(
        { name: "Test", workspace_id: 1 },
        1,
      );

      expect(embed).toBeNull();
      expect(message).toBe("DB error");
    });
  });

  // ── update ─────────────────────────────────────────────────────────
  describe("update", () => {
    it("updates valid writable fields", async () => {
      prisma.embed_configs.update.mockResolvedValue({ id: 1 });

      const result = await EmbedConfig.update(1, {
        name: "Updated Name",
        enabled: false,
      });

      expect(result.success).toBe(true);
      expect(result.error).toBeNull();
      expect(prisma.embed_configs.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: { name: "Updated Name", enabled: false },
        }),
      );
    });

    it("returns success with message when no valid fields", async () => {
      const result = await EmbedConfig.update(1, { invalid_field: "x" });

      expect(result.success).toBe(true);
      expect(result.error).toBe("No valid fields to update!");
      expect(prisma.embed_configs.update).not.toHaveBeenCalled();
    });

    it("throws when no embedId provided", async () => {
      await expect(EmbedConfig.update(null, { name: "x" })).rejects.toThrow(
        "No embed id provided",
      );
    });

    it("returns failure on prisma error", async () => {
      prisma.embed_configs.update.mockRejectedValue(new Error("DB error"));

      const result = await EmbedConfig.update(1, { name: "x" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("DB error");
    });
  });

  // ── get ────────────────────────────────────────────────────────────
  describe("get", () => {
    it("returns first matching embed config", async () => {
      prisma.embed_configs.findFirst.mockResolvedValue({ id: 1, name: "test" });

      const result = await EmbedConfig.get({ id: 1 });

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
    });

    it("returns null when no match", async () => {
      prisma.embed_configs.findFirst.mockResolvedValue(null);

      const result = await EmbedConfig.get({ id: 999 });

      expect(result).toBeNull();
    });

    it("returns null on error", async () => {
      prisma.embed_configs.findFirst.mockRejectedValue(new Error("DB error"));

      const result = await EmbedConfig.get({ id: 1 });

      expect(result).toBeNull();
    });
  });

  // ── getWithWorkspace ───────────────────────────────────────────────
  describe("getWithWorkspace", () => {
    it("returns embed config with workspace included", async () => {
      prisma.embed_configs.findFirst.mockResolvedValue({
        id: 1,
        workspace: { id: 10, name: "ws" },
      });

      const result = await EmbedConfig.getWithWorkspace({ id: 1 });

      expect(result).toBeDefined();
      expect(result.workspace.id).toBe(10);
      expect(prisma.embed_configs.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          include: { workspace: true },
        }),
      );
    });

    it("returns null when not found", async () => {
      prisma.embed_configs.findFirst.mockResolvedValue(null);

      const result = await EmbedConfig.getWithWorkspace({ id: 999 });

      expect(result).toBeNull();
    });

    it("returns null on error", async () => {
      prisma.embed_configs.findFirst.mockRejectedValue(new Error("DB error"));

      const result = await EmbedConfig.getWithWorkspace({ id: 1 });

      expect(result).toBeNull();
    });
  });

  // ── delete ─────────────────────────────────────────────────────────
  describe("delete", () => {
    it("deletes embed configs matching clause", async () => {
      prisma.embed_configs.deleteMany.mockResolvedValue({ count: 1 });

      const result = await EmbedConfig.delete({ id: 1 });

      expect(result).toBe(true);
      expect(prisma.embed_configs.deleteMany).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it("returns false on error", async () => {
      prisma.embed_configs.deleteMany.mockRejectedValue(new Error("DB error"));

      const result = await EmbedConfig.delete({ id: 1 });

      expect(result).toBe(false);
    });
  });

  // ── where ──────────────────────────────────────────────────────────
  describe("where", () => {
    it("returns matching embed configs", async () => {
      const fakeResults = [{ id: 1 }, { id: 2 }];
      prisma.embed_configs.findMany.mockResolvedValue(fakeResults);

      const result = await EmbedConfig.where({ enabled: true }, 10);

      expect(result).toEqual(fakeResults);
      expect(prisma.embed_configs.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { enabled: true },
          take: 10,
        }),
      );
    });

    it("passes orderBy when provided", async () => {
      prisma.embed_configs.findMany.mockResolvedValue([]);

      await EmbedConfig.where({}, null, { name: "asc" });

      expect(prisma.embed_configs.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { name: "asc" } }),
      );
    });

    it("returns [] on error", async () => {
      prisma.embed_configs.findMany.mockRejectedValue(new Error("DB error"));

      const result = await EmbedConfig.where({ id: 1 });

      expect(result).toEqual([]);
    });
  });

  // ── whereWithWorkspace ─────────────────────────────────────────────
  describe("whereWithWorkspace", () => {
    it("returns embed configs with workspace and chat count", async () => {
      prisma.embed_configs.findMany.mockResolvedValue([
        { id: 1, workspace: { id: 10 }, _count: { embed_chats: 5 } },
      ]);

      const result = await EmbedConfig.whereWithWorkspace({ enabled: true });

      expect(result).toHaveLength(1);
      expect(prisma.embed_configs.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            workspace: true,
            _count: { select: { embed_chats: true } },
          },
        }),
      );
    });

    it("returns [] on error", async () => {
      prisma.embed_configs.findMany.mockRejectedValue(new Error("DB error"));

      const result = await EmbedConfig.whereWithWorkspace({ id: 1 });

      expect(result).toEqual([]);
    });
  });

  // ── parseAllowedHosts ──────────────────────────────────────────────
  describe("parseAllowedHosts", () => {
    it("parses valid JSON allowlist", () => {
      const embed = { id: 1, allowlist_domains: '["https://example.com"]' };
      const result = EmbedConfig.parseAllowedHosts(embed);

      expect(result).toEqual(["https://example.com"]);
    });

    it("returns null when allowlist_domains is falsy", () => {
      const embed = { id: 1, allowlist_domains: null };
      const result = EmbedConfig.parseAllowedHosts(embed);

      expect(result).toBeNull();
    });

    it("returns empty array on invalid JSON (safe fallback)", () => {
      const embed = { id: 1, allowlist_domains: "not valid json" };
      const result = EmbedConfig.parseAllowedHosts(embed);

      expect(result).toEqual([]);
    });
  });
});

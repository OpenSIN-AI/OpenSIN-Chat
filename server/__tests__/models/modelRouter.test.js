// SPDX-License-Identifier: MIT
// Tests for the ModelRouter model (Issue #529).
// Covers: create, get, getWithRules, getWithRulesAndCount, where,
// getAllWithCounts, update, delete, workspaceCount, and validations.

jest.mock("../../utils/prisma", () => {
  const mockModelRouters = {
    create: jest.fn(),
    update: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    delete: jest.fn(),
  };
  const mockWorkspaces = {
    count: jest.fn(),
    groupBy: jest.fn(),
  };
  return {
    model_routers: mockModelRouters,
    workspaces: mockWorkspaces,
  };
});

jest.mock("@prisma/client", () => {
  class PrismaClientKnownRequestError extends Error {
    constructor(message, { code, clientVersion }) {
      super(message);
      this.code = code;
      this.name = "PrismaClientKnownRequestError";
    }
  }
  return {
    Prisma: {
      PrismaClientKnownRequestError,
    },
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

jest.mock("../../models/modelRouterRule", () => ({
  ModelRouterRule: {
    _hydrate: jest.fn((rule) => ({ ...rule, hydrated: true })),
  },
}));

jest.mock("../../utils/router", () => ({
  ModelRouterService: {
    DEFAULT_STICKY_MS: 300000,
  },
}));

const { Prisma } = require("@prisma/client");
const { ModelRouter } = require("../../models/modelRouter");
const prisma = require("../../utils/prisma");

describe("ModelRouter model", () => {
  afterEach(() => jest.clearAllMocks());

  // ── validations ────────────────────────────────────────────────────
  describe("validations", () => {
    it("validates name (trimmed, max 255)", () => {
      expect(ModelRouter.validations.name("  test  ")).toBe("test");
      expect(ModelRouter.validations.name(null)).toBeNull();
      expect(ModelRouter.validations.name(123)).toBeNull();
      const long = "x".repeat(300);
      expect(ModelRouter.validations.name(long).length).toBe(255);
    });

    it("validates description (trimmed)", () => {
      expect(ModelRouter.validations.description("  desc  ")).toBe("desc");
      expect(ModelRouter.validations.description(null)).toBeNull();
      expect(ModelRouter.validations.description(123)).toBeNull();
    });

    it("validates fallback_provider", () => {
      expect(ModelRouter.validations.fallback_provider("openai")).toBe("openai");
      expect(ModelRouter.validations.fallback_provider(null)).toBeNull();
      expect(ModelRouter.validations.fallback_provider(123)).toBeNull();
    });

    it("validates fallback_model", () => {
      expect(ModelRouter.validations.fallback_model("gpt-4")).toBe("gpt-4");
      expect(ModelRouter.validations.fallback_model(null)).toBeNull();
    });

    it("validates cooldown_seconds (0-3600)", () => {
      expect(ModelRouter.validations.cooldown_seconds(30)).toBe(30);
      expect(ModelRouter.validations.cooldown_seconds(0)).toBe(0);
      expect(ModelRouter.validations.cooldown_seconds(3600)).toBe(3600);
      expect(ModelRouter.validations.cooldown_seconds(-1)).toBeNull();
      expect(ModelRouter.validations.cooldown_seconds(3601)).toBeNull();
      expect(ModelRouter.validations.cooldown_seconds("abc")).toBeNull();
      expect(ModelRouter.validations.cooldown_seconds(30.7)).toBe(31);
    });
  });

  // ── create ─────────────────────────────────────────────────────────
  describe("create", () => {
    it("creates a router with valid data", async () => {
      const fakeRouter = {
        id: 1,
        name: "test-router",
        fallback_provider: "openai",
        fallback_model: "gpt-4",
        cooldown_seconds: 30,
      };
      prisma.model_routers.create.mockResolvedValue(fakeRouter);

      const { router, error } = await ModelRouter.create(
        {
          name: "test-router",
          description: "test desc",
          fallback_provider: "openai",
          fallback_model: "gpt-4",
        },
        5,
      );

      expect(error).toBeNull();
      expect(router).toBeDefined();
      expect(router.id).toBe(1);
      expect(prisma.model_routers.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: "test-router",
            description: "test desc",
            fallback_provider: "openai",
            fallback_model: "gpt-4",
            created_by: 5,
          }),
        }),
      );
    });

    it("returns error when name is missing", async () => {
      const { router, error } = await ModelRouter.create({
        fallback_provider: "openai",
        fallback_model: "gpt-4",
      });

      expect(router).toBeNull();
      expect(error).toBe("Name is required.");
    });

    it("returns error when fallback provider/model missing", async () => {
      const { router, error } = await ModelRouter.create({
        name: "test",
      });

      expect(router).toBeNull();
      expect(error).toBe("Fallback provider and model are required.");
    });

    it("uses default cooldown when not provided", async () => {
      prisma.model_routers.create.mockResolvedValue({ id: 1 });

      await ModelRouter.create({
        name: "test",
        fallback_provider: "openai",
        fallback_model: "gpt-4",
      });

      // DEFAULT_STICKY_MS / 1000 = 300000 / 1000 = 300
      expect(prisma.model_routers.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ cooldown_seconds: 300 }),
        }),
      );
    });

    it("returns duplicate error on P2002", async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        "Unique constraint",
        { code: "P2002", clientVersion: "test" },
      );
      prisma.model_routers.create.mockRejectedValue(prismaError);

      const { router, error } = await ModelRouter.create({
        name: "dup",
        fallback_provider: "openai",
        fallback_model: "gpt-4",
      });

      expect(router).toBeNull();
      expect(error).toBe("A router with that name already exists.");
    });

    it("returns generic error on other failures", async () => {
      prisma.model_routers.create.mockRejectedValue(new Error("DB error"));

      const { router, error } = await ModelRouter.create({
        name: "test",
        fallback_provider: "openai",
        fallback_model: "gpt-4",
      });

      expect(router).toBeNull();
      expect(error).toBe("DB error");
    });
  });

  // ── get ────────────────────────────────────────────────────────────
  describe("get", () => {
    it("returns first matching router", async () => {
      prisma.model_routers.findFirst.mockResolvedValue({ id: 1, name: "r" });

      const result = await ModelRouter.get({ id: 1 });

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
    });

    it("returns null when no match", async () => {
      prisma.model_routers.findFirst.mockResolvedValue(null);

      const result = await ModelRouter.get({ id: 999 });

      expect(result).toBeNull();
    });

    it("returns null on error", async () => {
      prisma.model_routers.findFirst.mockRejectedValue(new Error("DB error"));

      const result = await ModelRouter.get({ id: 1 });

      expect(result).toBeNull();
    });
  });

  // ── getWithRules ───────────────────────────────────────────────────
  describe("getWithRules", () => {
    it("returns router with hydrated rules", async () => {
      prisma.model_routers.findFirst.mockResolvedValue({
        id: 1,
        name: "r",
        rules: [{ id: 10, priority: 1 }],
      });

      const result = await ModelRouter.getWithRules({ id: 1 });

      expect(result).toBeDefined();
      expect(result.rules).toHaveLength(1);
      expect(result.rules[0].hydrated).toBe(true);
    });

    it("returns null when router not found", async () => {
      prisma.model_routers.findFirst.mockResolvedValue(null);

      const result = await ModelRouter.getWithRules({ id: 999 });

      expect(result).toBeNull();
    });

    it("returns null on error", async () => {
      prisma.model_routers.findFirst.mockRejectedValue(new Error("DB error"));

      const result = await ModelRouter.getWithRules({ id: 1 });

      expect(result).toBeNull();
    });
  });

  // ── getWithRulesAndCount ───────────────────────────────────────────
  describe("getWithRulesAndCount", () => {
    it("returns router with rules and workspace count", async () => {
      prisma.model_routers.findFirst.mockResolvedValue({
        id: 1,
        name: "r",
        rules: [{ id: 10, priority: 1 }],
      });
      prisma.workspaces.count.mockResolvedValue(3);

      const result = await ModelRouter.getWithRulesAndCount({ id: 1 });

      expect(result).toBeDefined();
      expect(result.workspaceCount).toBe(3);
      expect(result.rules[0].hydrated).toBe(true);
    });

    it("returns null when router not found", async () => {
      prisma.model_routers.findFirst.mockResolvedValue(null);

      const result = await ModelRouter.getWithRulesAndCount({ id: 999 });

      expect(result).toBeNull();
    });

    it("returns null on error", async () => {
      prisma.model_routers.findFirst.mockRejectedValue(new Error("DB error"));

      const result = await ModelRouter.getWithRulesAndCount({ id: 1 });

      expect(result).toBeNull();
    });
  });

  // ── where ──────────────────────────────────────────────────────────
  describe("where", () => {
    it("returns matching routers with default orderBy", async () => {
      prisma.model_routers.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);

      const result = await ModelRouter.where({});

      expect(result).toHaveLength(2);
      expect(prisma.model_routers.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: "asc" },
        }),
      );
    });

    it("passes custom orderBy when provided", async () => {
      prisma.model_routers.findMany.mockResolvedValue([]);

      await ModelRouter.where({}, null, { name: "desc" });

      expect(prisma.model_routers.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { name: "desc" } }),
      );
    });

    it("returns [] on error", async () => {
      prisma.model_routers.findMany.mockRejectedValue(new Error("DB error"));

      const result = await ModelRouter.where({});

      expect(result).toEqual([]);
    });
  });

  // ── getAllWithCounts ───────────────────────────────────────────────
  describe("getAllWithCounts", () => {
    it("returns routers with rule and workspace counts", async () => {
      prisma.model_routers.findMany.mockResolvedValue([
        { id: 1, name: "r1", _count: { rules: 3 } },
        { id: 2, name: "r2", _count: { rules: 0 } },
      ]);
      prisma.workspaces.groupBy.mockResolvedValue([
        { router_id: 1, _count: { router_id: 5 } },
      ]);

      const result = await ModelRouter.getAllWithCounts();

      expect(result).toHaveLength(2);
      expect(result[0].ruleCount).toBe(3);
      expect(result[0].workspaceCount).toBe(5);
      expect(result[1].ruleCount).toBe(0);
      expect(result[1].workspaceCount).toBe(0);
    });

    it("returns [] on error", async () => {
      prisma.model_routers.findMany.mockRejectedValue(new Error("DB error"));

      const result = await ModelRouter.getAllWithCounts();

      expect(result).toEqual([]);
    });
  });

  // ── update ─────────────────────────────────────────────────────────
  describe("update", () => {
    it("updates name and description", async () => {
      prisma.model_routers.update.mockResolvedValue({
        id: 1,
        name: "updated",
        description: "new desc",
      });

      const { router, error } = await ModelRouter.update(1, {
        name: "updated",
        description: "new desc",
      });

      expect(error).toBeNull();
      expect(router.name).toBe("updated");
      expect(prisma.model_routers.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: { name: "updated", description: "new desc" },
        }),
      );
    });

    it("updates fallback_provider and fallback_model", async () => {
      prisma.model_routers.update.mockResolvedValue({ id: 1 });

      const { error } = await ModelRouter.update(1, {
        fallback_provider: "anthropic",
        fallback_model: "claude-3",
      });

      expect(error).toBeNull();
      expect(prisma.model_routers.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            fallback_provider: "anthropic",
            fallback_model: "claude-3",
          },
        }),
      );
    });

    it("updates cooldown_seconds", async () => {
      prisma.model_routers.update.mockResolvedValue({ id: 1 });

      const { error } = await ModelRouter.update(1, { cooldown_seconds: 60 });

      expect(error).toBeNull();
      expect(prisma.model_routers.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { cooldown_seconds: 60 },
        }),
      );
    });

    it("throws when no id provided", async () => {
      await expect(ModelRouter.update(null, { name: "x" })).rejects.toThrow(
        "No router id provided",
      );
    });

    it("returns error when name is empty", async () => {
      const { router, error } = await ModelRouter.update(1, { name: "" });

      expect(router).toBeNull();
      expect(error).toBe("Name cannot be empty.");
    });

    it("returns error when fallback_provider is empty", async () => {
      const { router, error } = await ModelRouter.update(1, {
        fallback_provider: "",
      });

      expect(router).toBeNull();
      expect(error).toBe("Fallback provider is required.");
    });

    it("returns error when fallback_model is empty", async () => {
      const { router, error } = await ModelRouter.update(1, {
        fallback_model: "",
      });

      expect(router).toBeNull();
      expect(error).toBe("Fallback model is required.");
    });

    it("returns error when cooldown_seconds is invalid", async () => {
      const { router, error } = await ModelRouter.update(1, {
        cooldown_seconds: -5,
      });

      expect(router).toBeNull();
      expect(error).toContain("Cooldown must be");
    });

    it("returns no-valid-fields message when data is empty", async () => {
      const { router, error } = await ModelRouter.update(1, {});

      expect(error).toBe("No valid fields to update.");
      expect(router).toEqual({ id: 1 });
    });

    it("returns duplicate error on P2002", async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        "Unique constraint",
        { code: "P2002", clientVersion: "test" },
      );
      prisma.model_routers.update.mockRejectedValue(prismaError);

      const { router, error } = await ModelRouter.update(1, { name: "dup" });

      expect(router).toBeNull();
      expect(error).toBe("A router with that name already exists.");
    });

    it("returns generic error on other failures", async () => {
      prisma.model_routers.update.mockRejectedValue(new Error("DB error"));

      const { router, error } = await ModelRouter.update(1, { name: "x" });

      expect(router).toBeNull();
      expect(error).toBe("DB error");
    });
  });

  // ── delete ─────────────────────────────────────────────────────────
  describe("delete", () => {
    it("deletes a router by id", async () => {
      prisma.model_routers.delete.mockResolvedValue({ id: 1 });

      const result = await ModelRouter.delete(1);

      expect(result).toBe(true);
      expect(prisma.model_routers.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it("returns false when no id provided", async () => {
      const result = await ModelRouter.delete(null);

      expect(result).toBe(false);
      expect(prisma.model_routers.delete).not.toHaveBeenCalled();
    });

    it("returns false on error", async () => {
      prisma.model_routers.delete.mockRejectedValue(new Error("DB error"));

      const result = await ModelRouter.delete(1);

      expect(result).toBe(false);
    });
  });

  // ── workspaceCount ─────────────────────────────────────────────────
  describe("workspaceCount", () => {
    it("returns count of workspaces using the router", async () => {
      prisma.workspaces.count.mockResolvedValue(7);

      const result = await ModelRouter.workspaceCount(1);

      expect(result).toBe(7);
      expect(prisma.workspaces.count).toHaveBeenCalledWith({
        where: { router_id: 1 },
      });
    });

    it("returns 0 on error", async () => {
      prisma.workspaces.count.mockRejectedValue(new Error("DB error"));

      const result = await ModelRouter.workspaceCount(1);

      expect(result).toBe(0);
    });
  });
});

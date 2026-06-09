// SPDX-License-Identifier: MIT
jest.mock("../../utils/middleware/validatedRequest", () => ({
  validatedRequest: (_req, _res, next) => next(),
}));
jest.mock("../../utils/middleware/multiUserProtected", () => ({
  isSingleUserMode: (_req, _res, next) => next(),
  flexUserRoleValid: () => (_req, _res, next) => next(),
  ROLES: { all: "<all>", admin: "admin", manager: "manager", default: "default" },
}));
jest.mock("../../utils/middleware/validWorkspace", () => ({
  validWorkspaceSlug: (_req, _res, next) => next(),
}));
jest.mock("../../utils/logger", () => () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

const mockUserFromSession = jest.fn();
jest.mock("../../utils/http", () => ({
  reqBody: (req) => req.body,
  userFromSession: (...a) => mockUserFromSession(...a),
}));

const mockMemoriesEnabled = jest.fn();
jest.mock("../../models/systemSettings", () => ({
  SystemSettings: { memoriesEnabled: (...a) => mockMemoriesEnabled(...a) },
}));

const mockMemoryGlobalForUser = jest.fn();
const mockMemoryForUserWorkspace = jest.fn();
const mockMemoryCreate = jest.fn();
const mockMemoryUpdate = jest.fn();
const mockMemoryDelete = jest.fn();
const mockMemoryGet = jest.fn();
const mockMemoryPromote = jest.fn();
const mockMemoryDemote = jest.fn();
jest.mock("../../models/memory", () => ({
  Memory: {
    globalForUser: (...a) => mockMemoryGlobalForUser(...a),
    forUserWorkspace: (...a) => mockMemoryForUserWorkspace(...a),
    create: (...a) => mockMemoryCreate(...a),
    update: (...a) => mockMemoryUpdate(...a),
    delete: (...a) => mockMemoryDelete(...a),
    get: (...a) => mockMemoryGet(...a),
    promoteToGlobal: (...a) => mockMemoryPromote(...a),
    demoteToWorkspace: (...a) => mockMemoryDemote(...a),
  },
}));

const { createMockApp, createMockRes } = require("../helpers/mockExpressApp");
const { memoryEndpoints } = require("../../endpoints/memory");

function buildApp() {
  const harness = createMockApp();
  memoryEndpoints(harness.app);
  return harness;
}

async function callWithLocals(harness, method, path, req = {}, locals = {}) {
  const key = `${method.toLowerCase()} ${path}`;
  const route = harness.routes.find(r => r.method === method.toLowerCase() && r.pattern === path);
  if (!route) throw new Error(`No route registered for ${key}`);
  const handler = route.handler;
  const request = {
    body: req.body || {},
    params: req.params || {},
    query: req.query || {},
    header: (name) => (req.headers || {})[name] || "Bearer test-key",
  };
  const response = createMockRes();
  Object.assign(response.locals, locals);
  await handler(request, response);
  return response;
}

describe("Memory endpoints", () => {
  afterEach(() => jest.clearAllMocks());

  describe("GET /workspaces/:slug/memories", () => {
    const workspace = { id: 1, name: "WS" };
    const user = { id: 10 };

    it("returns global and workspace memories", async () => {
      mockUserFromSession.mockResolvedValue(user);
      mockMemoryGlobalForUser.mockResolvedValue([{ id: 1, scope: "global" }]);
      mockMemoryForUserWorkspace.mockResolvedValue([{ id: 2, scope: "workspace" }]);
      const harness = buildApp();
      const res = await callWithLocals(
        harness,
        "get",
        "/workspaces/:slug/memories",
        {},
        { workspace },
      );
      expect(res.statusCode).toBe(200);
      expect(res.body.memories.global).toHaveLength(1);
      expect(res.body.memories.workspace).toHaveLength(1);
    });

    it("returns 500 on exception", async () => {
      mockUserFromSession.mockRejectedValue(new Error("fail"));
      const harness = buildApp();
      const res = await callWithLocals(
        harness,
        "get",
        "/workspaces/:slug/memories",
        {},
        { workspace },
      );
      expect(res.statusCode).toBe(500);
    });
  });

  describe("POST /workspaces/:slug/memories", () => {
    const workspace = { id: 1 };
    const user = { id: 10 };

    it("creates a workspace-scoped memory", async () => {
      mockUserFromSession.mockResolvedValue(user);
      mockMemoryCreate.mockResolvedValue({
        memory: { id: 1, content: "note", scope: "workspace" },
        message: null,
      });
      const harness = buildApp();
      const res = await callWithLocals(
        harness,
        "post",
        "/workspaces/:slug/memories",
        { body: { content: "note", scope: "workspace" } },
        { workspace },
      );
      expect(res.statusCode).toBe(200);
      expect(res.body.memory.scope).toBe("workspace");
      expect(mockMemoryCreate).toHaveBeenCalledWith(
        expect.objectContaining({ workspaceId: 1, scope: "workspace" }),
      );
    });

    it("creates a global-scoped memory with null workspaceId", async () => {
      mockUserFromSession.mockResolvedValue(user);
      mockMemoryCreate.mockResolvedValue({
        memory: { id: 2, content: "global note", scope: "global" },
        message: null,
      });
      const harness = buildApp();
      const res = await callWithLocals(
        harness,
        "post",
        "/workspaces/:slug/memories",
        { body: { content: "global note", scope: "global" } },
        { workspace },
      );
      expect(res.statusCode).toBe(200);
      expect(mockMemoryCreate).toHaveBeenCalledWith(
        expect.objectContaining({ workspaceId: null, scope: "global" }),
      );
    });

    it("returns 400 when create fails", async () => {
      mockUserFromSession.mockResolvedValue(user);
      mockMemoryCreate.mockResolvedValue({
        memory: null,
        message: "Duplicate",
      });
      const harness = buildApp();
      const res = await callWithLocals(
        harness,
        "post",
        "/workspaces/:slug/memories",
        { body: { content: "dup" } },
        { workspace },
      );
      expect(res.statusCode).toBe(400);
    });

    it("returns 500 on exception", async () => {
      mockUserFromSession.mockRejectedValue(new Error("fail"));
      const harness = buildApp();
      const res = await callWithLocals(
        harness,
        "post",
        "/workspaces/:slug/memories",
        { body: { content: "x" } },
        { workspace },
      );
      expect(res.statusCode).toBe(500);
    });
  });

  describe("PUT /memories/:memoryId", () => {
    it("updates memory content", async () => {
      mockMemoryGet.mockResolvedValue({ id: 5, content: "old" });
      mockMemoryUpdate.mockResolvedValue({
        memory: { id: 5, content: "new" },
        message: null,
      });
      const harness = buildApp();
      const res = await callWithLocals(
        harness,
        "put",
        "/memories/:memoryId",
        { body: { content: "new" }, params: { memoryId: "5" } },
        {},
      );
      expect(res.statusCode).toBe(200);
      expect(res.body.memory.content).toBe("new");
    });

    it("returns 400 when update fails", async () => {
      mockMemoryGet.mockResolvedValue({ id: 5 });
      mockMemoryUpdate.mockResolvedValue({ memory: null, message: "invalid" });
      const harness = buildApp();
      const res = await callWithLocals(
        harness,
        "put",
        "/memories/:memoryId",
        { body: { content: "x" }, params: { memoryId: "5" } },
        {},
      );
      expect(res.statusCode).toBe(400);
    });

    it("returns 500 on exception", async () => {
      mockMemoryGet.mockResolvedValue({ id: 5 });
      mockMemoryUpdate.mockRejectedValue(new Error("fail"));
      const harness = buildApp();
      const res = await callWithLocals(
        harness,
        "put",
        "/memories/:memoryId",
        { body: { content: "x" }, params: { memoryId: "5" } },
        {},
      );
      expect(res.statusCode).toBe(500);
    });
  });

  describe("DELETE /memories/:memoryId", () => {
    it("deletes a memory successfully", async () => {
      mockMemoryGet.mockResolvedValue({ id: 5 });
      mockMemoryDelete.mockResolvedValue(undefined);
      const harness = buildApp();
      const res = await callWithLocals(
        harness,
        "delete",
        "/memories/:memoryId",
        { params: { memoryId: "5" } },
        {},
      );
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockMemoryDelete).toHaveBeenCalledWith(5);
    });

    it("returns 500 on exception", async () => {
      mockMemoryGet.mockResolvedValue({ id: 5 });
      mockMemoryDelete.mockRejectedValue(new Error("fail"));
      const harness = buildApp();
      const res = await callWithLocals(
        harness,
        "delete",
        "/memories/:memoryId",
        { params: { memoryId: "5" } },
        {},
      );
      expect(res.statusCode).toBe(500);
    });
  });

  describe("POST /memories/:memoryId/promote", () => {
    it("promotes a memory to global scope", async () => {
      mockMemoryGet.mockResolvedValue({ id: 5, scope: "workspace" });
      mockMemoryPromote.mockResolvedValue({
        memory: { id: 5, scope: "global" },
        message: null,
      });
      const harness = buildApp();
      const res = await callWithLocals(
        harness,
        "post",
        "/memories/:memoryId/promote",
        { params: { memoryId: "5" } },
        {},
      );
      expect(res.statusCode).toBe(200);
      expect(res.body.memory.scope).toBe("global");
    });

    it("returns 400 when promote fails", async () => {
      mockMemoryGet.mockResolvedValue({ id: 5 });
      mockMemoryPromote.mockResolvedValue({ memory: null, message: "already global" });
      const harness = buildApp();
      const res = await callWithLocals(
        harness,
        "post",
        "/memories/:memoryId/promote",
        { params: { memoryId: "5" } },
        {},
      );
      expect(res.statusCode).toBe(400);
    });

    it("returns 500 on exception", async () => {
      mockMemoryGet.mockResolvedValue({ id: 5 });
      mockMemoryPromote.mockRejectedValue(new Error("fail"));
      const harness = buildApp();
      const res = await callWithLocals(
        harness,
        "post",
        "/memories/:memoryId/promote",
        { params: { memoryId: "5" } },
        {},
      );
      expect(res.statusCode).toBe(500);
    });
  });

  describe("POST /memories/:memoryId/demote/:slug", () => {
    const workspace = { id: 2, name: "Target" };

    it("demotes a memory to workspace scope", async () => {
      mockMemoryGet.mockResolvedValue({ id: 5, scope: "global" });
      mockMemoryDemote.mockResolvedValue({
        memory: { id: 5, scope: "workspace", workspaceId: 2 },
        message: null,
      });
      const harness = buildApp();
      const res = await callWithLocals(
        harness,
        "post",
        "/memories/:memoryId/demote/:slug",
        { params: { memoryId: "5", slug: "target" } },
        { workspace },
      );
      expect(res.statusCode).toBe(200);
      expect(mockMemoryDemote).toHaveBeenCalledWith(5, 2);
    });

    it("returns 400 when demote fails", async () => {
      mockMemoryGet.mockResolvedValue({ id: 5 });
      mockMemoryDemote.mockResolvedValue({ memory: null, message: "no workspace" });
      const harness = buildApp();
      const res = await callWithLocals(
        harness,
        "post",
        "/memories/:memoryId/demote/:slug",
        { params: { memoryId: "5", slug: "t" } },
        { workspace },
      );
      expect(res.statusCode).toBe(400);
    });

    it("returns 500 on exception", async () => {
      mockMemoryGet.mockResolvedValue({ id: 5 });
      mockMemoryDemote.mockRejectedValue(new Error("fail"));
      const harness = buildApp();
      const res = await callWithLocals(
        harness,
        "post",
        "/memories/:memoryId/demote/:slug",
        { params: { memoryId: "5", slug: "t" } },
        { workspace },
      );
      expect(res.statusCode).toBe(500);
    });
  });
});

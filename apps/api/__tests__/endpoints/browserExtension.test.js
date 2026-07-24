// SPDX-License-Identifier: MIT
// Tests for browserExtension endpoints (Issue #382).
//
// Covers: GET /browser-extension/check, DELETE /browser-extension/disconnect,
// GET /browser-extension/workspaces, POST /browser-extension/embed-content,
// POST /browser-extension/upload-content, GET /browser-extension/api-keys,
// POST /browser-extension/api-keys/new, DELETE /browser-extension/api-keys/:id

jest.mock("../../utils/middleware/validatedRequest", () => ({
  validatedRequest: (_req, _res, next) => next(),
}));
jest.mock("../../utils/middleware/multiUserProtected", () => ({
  flexUserRoleValid: () => (_req, _res, next) => next(),
  ROLES: { admin: "admin", manager: "manager", default: "default" },
}));
jest.mock("../../utils/middleware/simpleRateLimit", () => ({
  simpleRateLimit: () => (_req, _res, next) => next(),
}));
jest.mock("../../utils/middleware/validBrowserExtensionApiKey", () => ({
  validBrowserExtensionApiKey: (req, res, next) => {
    res.locals.apiKey = { id: 1, key: "ext-key-123" };
    next();
  },
}));
jest.mock("../../utils/logger/console.js", () => ({
  error: jest.fn(),
  log: jest.fn(),
}));
jest.mock("../../utils/http", () => ({
  reqBody: (req) => req.body,
  multiUserMode: () => false,
  userFromSession: async () => ({ id: 1, role: "admin" }),
}));

const mockWorkspaceWhere = jest.fn();
const mockWorkspaceWhereWithUser = jest.fn();
const mockWorkspaceGet = jest.fn();
const mockWorkspaceGetWithUser = jest.fn();
jest.mock("../../models/workspace", () => ({
  Workspace: {
    where: (...a) => mockWorkspaceWhere(...a),
    whereWithUser: (...a) => mockWorkspaceWhereWithUser(...a),
    get: (...a) => mockWorkspaceGet(...a),
    getWithUser: (...a) => mockWorkspaceGetWithUser(...a),
  },
}));

const mockApiKeyWhere = jest.fn();
const mockApiKeyWhereWithUser = jest.fn();
const mockApiKeyCreate = jest.fn();
const mockApiKeyDelete = jest.fn();
const mockApiKeyGet = jest.fn();
jest.mock("../../models/browserExtensionApiKey", () => ({
  BrowserExtensionApiKey: {
    where: (...a) => mockApiKeyWhere(...a),
    whereWithUser: (...a) => mockApiKeyWhereWithUser(...a),
    create: (...a) => mockApiKeyCreate(...a),
    delete: (...a) => mockApiKeyDelete(...a),
    get: (...a) => mockApiKeyGet(...a),
  },
}));

const mockDocAddDocuments = jest.fn();
jest.mock("../../models/documents", () => ({
  Document: { addDocuments: (...a) => mockDocAddDocuments(...a) },
}));

const mockCollectorProcessRawText = jest.fn();
jest.mock("../../utils/collectorApi", () => ({
  CollectorApi: jest.fn().mockImplementation(() => ({
    processRawText: (...a) => mockCollectorProcessRawText(...a),
  })),
}));

const mockTelemetrySend = jest.fn().mockResolvedValue(undefined);
jest.mock("../../models/telemetry", () => ({
  Telemetry: { sendTelemetry: (...a) => mockTelemetrySend(...a) },
}));

const { extensionEndpoints: browserExtensionEndpoints } = require("../../endpoints/extensions");
const { createMockApp } = require("../helpers/mockExpressApp");

function buildApp() {
  const harness = createMockApp();
  browserExtensionEndpoints(harness.app);
  return harness;
}

describe("browserExtensionEndpoints", () => {
  let app;
  beforeEach(() => {
    app = buildApp();
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GET /browser-extension/check
  // ─────────────────────────────────────────────────────────────────────────
  describe("GET /browser-extension/check", () => {
    it("returns connected status with workspaces", async () => {
      const fakeWorkspaces = [{ id: 1, name: "WS1" }];
      mockWorkspaceWhere.mockResolvedValue(fakeWorkspaces);

      const res = await app.call("get", "/browser-extension/check");

      expect(res.statusCode).toBe(200);
      expect(res.body.connected).toBe(true);
      expect(res.body.workspaces).toEqual(fakeWorkspaces);
      expect(res.body.apiKeyId).toBe(1);
    });

    it("returns 500 on error", async () => {
      mockWorkspaceWhere.mockRejectedValue(new Error("DB error"));

      const res = await app.call("get", "/browser-extension/check");

      expect(res.statusCode).toBe(500);
      expect(res.body.connected).toBe(false);
      expect(res.body.error).toBe("Failed to fetch workspaces");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // DELETE /browser-extension/disconnect
  // ─────────────────────────────────────────────────────────────────────────
  describe("DELETE /browser-extension/disconnect", () => {
    it("disconnects and revokes the API key", async () => {
      mockApiKeyDelete.mockResolvedValue({ success: true, error: null });

      const res = await app.call("delete", "/browser-extension/disconnect");

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockApiKeyDelete).toHaveBeenCalledWith(1);
    });

    it("returns 500 when delete fails", async () => {
      mockApiKeyDelete.mockResolvedValue({ success: false, error: "Not found" });

      const res = await app.call("delete", "/browser-extension/disconnect");

      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe("Failed to disconnect and revoke API key");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GET /browser-extension/workspaces
  // ─────────────────────────────────────────────────────────────────────────
  describe("GET /browser-extension/workspaces", () => {
    it("returns workspaces list", async () => {
      const fakeWorkspaces = [{ id: 1, name: "WS1" }, { id: 2, name: "WS2" }];
      mockWorkspaceWhere.mockResolvedValue(fakeWorkspaces);

      const res = await app.call("get", "/browser-extension/workspaces");

      expect(res.statusCode).toBe(200);
      expect(res.body.workspaces).toHaveLength(2);
    });

    it("returns 500 on error", async () => {
      mockWorkspaceWhere.mockRejectedValue(new Error("DB error"));

      const res = await app.call("get", "/browser-extension/workspaces");

      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe("Failed to fetch workspaces");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // POST /browser-extension/embed-content
  // ─────────────────────────────────────────────────────────────────────────
  describe("POST /browser-extension/embed-content", () => {
    it("embeds content successfully", async () => {
      mockWorkspaceGet.mockResolvedValue({ id: 1, name: "WS1" });
      mockCollectorProcessRawText.mockResolvedValue({
        success: true,
        documents: [{ location: "/tmp/doc1.txt" }],
      });
      mockDocAddDocuments.mockResolvedValue({ failedToEmbed: [], errors: [] });

      const res = await app.call("post", "/browser-extension/embed-content", {
        body: { workspaceId: "1", textContent: "Some text to embed" },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockTelemetrySend).toHaveBeenCalledWith("browser_extension_embed_content");
    });

    it("returns 400 when workspaceId is missing", async () => {
      const res = await app.call("post", "/browser-extension/embed-content", {
        body: { textContent: "Some text" },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe("workspaceId is required.");
    });

    it("returns 400 when textContent is missing", async () => {
      const res = await app.call("post", "/browser-extension/embed-content", {
        body: { workspaceId: "1" },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain("textContent is required");
    });

    it("returns 400 when textContent is empty string", async () => {
      const res = await app.call("post", "/browser-extension/embed-content", {
        body: { workspaceId: "1", textContent: "   " },
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain("textContent is required");
    });

    it("returns 404 when workspace not found", async () => {
      mockWorkspaceGet.mockResolvedValue(null);

      const res = await app.call("post", "/browser-extension/embed-content", {
        body: { workspaceId: "999", textContent: "Some text" },
      });

      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe("Workspace not found");
    });

    it("returns 500 when collector processing fails", async () => {
      mockWorkspaceGet.mockResolvedValue({ id: 1 });
      mockCollectorProcessRawText.mockResolvedValue({
        success: false,
        reason: "Collector unavailable",
      });

      const res = await app.call("post", "/browser-extension/embed-content", {
        body: { workspaceId: "1", textContent: "Some text" },
      });

      expect(res.statusCode).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Collector unavailable");
    });

    it("returns 500 when embedding fails", async () => {
      mockWorkspaceGet.mockResolvedValue({ id: 1 });
      mockCollectorProcessRawText.mockResolvedValue({
        success: true,
        documents: [{ location: "/tmp/doc.txt" }],
      });
      mockDocAddDocuments.mockResolvedValue({
        failedToEmbed: ["doc.txt"],
        errors: ["Embedding error"],
      });

      const res = await app.call("post", "/browser-extension/embed-content", {
        body: { workspaceId: "1", textContent: "Some text" },
      });

      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe("Embedding error");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // POST /browser-extension/upload-content
  // ─────────────────────────────────────────────────────────────────────────
  describe("POST /browser-extension/upload-content", () => {
    it("uploads content successfully", async () => {
      mockCollectorProcessRawText.mockResolvedValue({ success: true });

      const res = await app.call("post", "/browser-extension/upload-content", {
        body: { textContent: "Some text", metadata: { source: "web" } },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockTelemetrySend).toHaveBeenCalledWith("browser_extension_upload_content");
    });

    it("returns 400 when textContent is missing", async () => {
      const res = await app.call("post", "/browser-extension/upload-content", {
        body: {},
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain("textContent is required");
    });

    it("returns 500 when collector processing fails", async () => {
      mockCollectorProcessRawText.mockResolvedValue({
        success: false,
        reason: "Collector error",
      });

      const res = await app.call("post", "/browser-extension/upload-content", {
        body: { textContent: "Some text" },
      });

      expect(res.statusCode).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GET /browser-extension/api-keys
  // ─────────────────────────────────────────────────────────────────────────
  describe("GET /browser-extension/api-keys", () => {
    it("returns list of API keys", async () => {
      const fakeKeys = [{ id: 1, key: "key-1" }, { id: 2, key: "key-2" }];
      mockApiKeyWhere.mockResolvedValue(fakeKeys);

      const res = await app.call("get", "/browser-extension/api-keys");

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.apiKeys).toEqual(fakeKeys);
    });

    it("returns 500 on error", async () => {
      mockApiKeyWhere.mockRejectedValue(new Error("DB error"));

      const res = await app.call("get", "/browser-extension/api-keys");

      expect(res.statusCode).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // POST /browser-extension/api-keys/new
  // ─────────────────────────────────────────────────────────────────────────
  describe("POST /browser-extension/api-keys/new", () => {
    it("creates a new API key", async () => {
      mockApiKeyCreate.mockResolvedValue({
        apiKey: { key: "new-key-abc" },
        error: null,
      });

      const res = await app.call("post", "/browser-extension/api-keys/new");

      expect(res.statusCode).toBe(200);
      expect(res.body.apiKey).toBe("new-key-abc");
    });

    it("returns 500 when create fails", async () => {
      mockApiKeyCreate.mockResolvedValue({
        apiKey: null,
        error: "Rate limited",
      });

      const res = await app.call("post", "/browser-extension/api-keys/new");

      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe("Failed to create API key");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // DELETE /browser-extension/api-keys/:id
  // ─────────────────────────────────────────────────────────────────────────
  describe("DELETE /browser-extension/api-keys/:id", () => {
    it("deletes an API key", async () => {
      mockApiKeyDelete.mockResolvedValue({ success: true, error: null });

      const res = await app.call("delete", "/browser-extension/api-keys/5");

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("returns 500 when delete fails", async () => {
      mockApiKeyDelete.mockResolvedValue({ success: false, error: "Not found" });

      const res = await app.call("delete", "/browser-extension/api-keys/999");

      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe("Failed to revoke API key");
    });
  });
});

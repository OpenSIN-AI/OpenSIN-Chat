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
const mockMultiUserMode = jest.fn();
jest.mock("../../utils/http", () => ({
  reqBody: (req) => req.body,
  userFromSession: (...a) => mockUserFromSession(...a),
  multiUserMode: (...a) => mockMultiUserMode(...a),
}));

jest.mock("../../utils/files/multer", () => ({
  handleFileUpload: (_req, _res, next) => next(),
  mirrorToSupabase: jest.fn().mockResolvedValue(false),
}));

const mockTelemetrySend = jest.fn().mockResolvedValue(undefined);
jest.mock("../../models/telemetry", () => ({
  Telemetry: { sendTelemetry: (...a) => mockTelemetrySend(...a) },
}));

const mockEventLog = jest.fn();
jest.mock("../../models/eventLogs", () => ({
  EventLogs: { logEvent: (...a) => mockEventLog(...a) },
}));

const mockThreadGet = jest.fn();
jest.mock("../../models/workspaceThread", () => ({
  WorkspaceThread: { get: (...a) => mockThreadGet(...a) },
}));

const mockGetContext = jest.fn();
const mockParsedDelete = jest.fn();
const mockMoveToDocuments = jest.fn();
const mockParsedCreate = jest.fn();
jest.mock("../../models/workspaceParsedFiles", () => ({
  WorkspaceParsedFiles: {
    getContextMetadataAndLimits: (...a) => mockGetContext(...a),
    delete: (...a) => mockParsedDelete(...a),
    moveToDocumentsAndEmbed: (...a) => mockMoveToDocuments(...a),
    create: (...a) => mockParsedCreate(...a),
  },
}));

const mockCollectorOnline = jest.fn();
const mockCollectorParse = jest.fn();
const mockCollectorLog = jest.fn();
jest.mock("../../utils/collectorApi", () => ({
  CollectorApi: jest.fn(() => ({
    online: (...a) => mockCollectorOnline(...a),
    parseDocument: (...a) => mockCollectorParse(...a),
    log: (...a) => mockCollectorLog(...a),
  })),
}));

// Lightweight in-memory ParseJobs mock so the sync-parse route can create,
// update, and retrieve jobs without hitting SQLite.
const _jobStore = new Map();
jest.mock("../../utils/parseJobs", () => {
  const JOB_STATUS = {
    PENDING: "pending",
    PROCESSING: "processing",
    COMPLETED: "completed",
    FAILED: "failed",
  };
  return {
    JOB_STATUS,
    ParseJobs: {
      create: jest.fn(async ({ workspaceId, userId = null, originalname }) => {
        const job = {
          id: "test-job-id",
          workspaceId,
          userId,
          originalname,
          status: JOB_STATUS.PENDING,
          files: null,
          error: null,
          createdAt: Date.now(),
          finishedAt: null,
        };
        _jobStore.set(job.id, job);
        return job;
      }),
      get: jest.fn(async (jobId) => _jobStore.get(jobId) ?? null),
      markProcessing: jest.fn(async (jobId) => {
        const j = _jobStore.get(jobId);
        if (j) j.status = JOB_STATUS.PROCESSING;
      }),
      markCompleted: jest.fn(async (jobId, files) => {
        const j = _jobStore.get(jobId);
        if (j) {
          j.status = JOB_STATUS.COMPLETED;
          j.files = files;
          j.finishedAt = Date.now();
        }
      }),
      markFailed: jest.fn(async (jobId, error) => {
        const j = _jobStore.get(jobId);
        if (j) {
          j.status = JOB_STATUS.FAILED;
          j.error = error;
          j.finishedAt = Date.now();
        }
      }),
    },
    recoverStalledJobs: jest.fn(),
  };
});

const { createMockApp, createMockRes } = require("../helpers/mockExpressApp");
const { workspaceParsedFilesEndpoints } = require("../../endpoints/workspacesParsedFiles");

function buildApp() {
  const harness = createMockApp();
  workspaceParsedFilesEndpoints(harness.app);
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
    file: req.file || undefined,
  };
  const response = createMockRes();
  response.sendStatus = (code) => {
    response.statusCode = code;
    response.ended = true;
    return response;
  };
  Object.assign(response.locals, locals);
  await handler(request, response);
  return response;
}

describe("Workspace Parsed Files endpoints", () => {
  afterEach(() => {
    jest.clearAllMocks();
    _jobStore.clear();
  });

  describe("GET /workspace/:slug/parsed-files", () => {
    const workspace = { id: 1, name: "WS" };
    const user = { id: 10 };

    it("returns files and context metadata without thread", async () => {
      mockUserFromSession.mockResolvedValue(user);
      mockMultiUserMode.mockReturnValue(false);
      mockGetContext.mockResolvedValue({
        files: [{ id: 1, filename: "a.json" }],
        contextWindow: 4096,
        currentContextTokenCount: 100,
      });
      const harness = buildApp();
      const res = await callWithLocals(
        harness,
        "get",
        "/workspace/:slug/parsed-files",
        {},
        { workspace },
      );
      expect(res.statusCode).toBe(200);
      expect(res.body.files).toHaveLength(1);
      expect(res.body.contextWindow).toBe(4096);
    });

    it("passes thread when threadSlug query param provided", async () => {
      mockUserFromSession.mockResolvedValue(user);
      mockMultiUserMode.mockReturnValue(false);
      mockThreadGet.mockResolvedValue({ id: 5, name: "T" });
      mockGetContext.mockResolvedValue({ files: [], contextWindow: 4096, currentContextTokenCount: 0 });
      const harness = buildApp();
      const res = await callWithLocals(
        harness,
        "get",
        "/workspace/:slug/parsed-files",
        { query: { threadSlug: "t1" } },
        { workspace },
      );
      expect(res.statusCode).toBe(200);
      expect(mockGetContext).toHaveBeenCalledWith(
        workspace,
        expect.objectContaining({ id: 5 }),
        null,
      );
    });

    it("returns 500 on exception", async () => {
      mockUserFromSession.mockRejectedValue(new Error("fail"));
      const harness = buildApp();
      const res = await callWithLocals(
        harness,
        "get",
        "/workspace/:slug/parsed-files",
        {},
        { workspace },
      );
      expect(res.statusCode).toBe(500);
    });
  });

  describe("DELETE /workspace/:slug/delete-parsed-files", () => {
    const workspace = { id: 1 };
    const user = { id: 10 };

    it("rejects empty fileIds with 400", async () => {
      const harness = buildApp();
      const res = await callWithLocals(
        harness,
        "delete",
        "/workspace/:slug/delete-parsed-files",
        { body: { fileIds: [] } },
        { workspace },
      );
      expect(res.statusCode).toBe(400);
    });

    it("deletes specified files successfully", async () => {
      mockUserFromSession.mockResolvedValue(user);
      mockParsedDelete.mockResolvedValue(true);
      const harness = buildApp();
      const res = await callWithLocals(
        harness,
        "delete",
        "/workspace/:slug/delete-parsed-files",
        { body: { fileIds: [1, 2, 3] } },
        { workspace },
      );
      expect(res.statusCode).toBe(200);
    });

    it("returns 403 when delete returns false", async () => {
      mockUserFromSession.mockResolvedValue(user);
      mockParsedDelete.mockResolvedValue(false);
      const harness = buildApp();
      const res = await callWithLocals(
        harness,
        "delete",
        "/workspace/:slug/delete-parsed-files",
        { body: { fileIds: [1] } },
        { workspace },
      );
      expect(res.statusCode).toBe(403);
    });

    it("returns 500 on exception", async () => {
      mockUserFromSession.mockRejectedValue(new Error("fail"));
      const harness = buildApp();
      const res = await callWithLocals(
        harness,
        "delete",
        "/workspace/:slug/delete-parsed-files",
        { body: { fileIds: [1] } },
        { workspace },
      );
      expect(res.statusCode).toBe(500);
    });
  });

  describe("POST /workspace/:slug/embed-parsed-file/:fileId", () => {
    const workspace = { id: 1 };
    const user = { id: 10 };

    it("rejects missing fileId with 400", async () => {
      mockUserFromSession.mockResolvedValue(null);
      const harness = buildApp();
      const res = await callWithLocals(
        harness,
        "post",
        "/workspace/:slug/embed-parsed-file/:fileId",
        { params: { slug: "ws", fileId: null } },
        { workspace },
      );
      expect(res.statusCode).toBe(400);
    });

    it("embeds a file and returns document", async () => {
      mockUserFromSession.mockResolvedValue(user);
      mockMoveToDocuments.mockResolvedValue({
        success: true,
        error: null,
        document: { name: "doc.pdf" },
      });
      mockParsedDelete.mockResolvedValue(true);
      const harness = buildApp();
      const res = await callWithLocals(
        harness,
        "post",
        "/workspace/:slug/embed-parsed-file/:fileId",
        { params: { slug: "ws", fileId: "42" } },
        { workspace },
      );
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.document.name).toBe("doc.pdf");
      expect(mockTelemetrySend).toHaveBeenCalledWith("document_embedded");
      expect(mockEventLog).toHaveBeenCalled();
    });

    it("returns 500 when embed fails", async () => {
      mockUserFromSession.mockResolvedValue(user);
      mockMoveToDocuments.mockResolvedValue({
        success: false,
        error: "embed failed",
      });
      mockParsedDelete.mockResolvedValue(true);
      const harness = buildApp();
      const res = await callWithLocals(
        harness,
        "post",
        "/workspace/:slug/embed-parsed-file/:fileId",
        { params: { slug: "ws", fileId: "42" } },
        { workspace },
      );
      expect(res.statusCode).toBe(500);
    });

    it("returns 500 on exception", async () => {
      mockUserFromSession.mockRejectedValue(new Error("fail"));
      mockParsedDelete.mockResolvedValue(true);
      const harness = buildApp();
      const res = await callWithLocals(
        harness,
        "post",
        "/workspace/:slug/embed-parsed-file/:fileId",
        { params: { slug: "ws", fileId: "42" } },
        { workspace },
      );
      expect(res.statusCode).toBe(500);
    });
  });

  describe("POST /workspace/:slug/parse (sync mode, ?sync=true)", () => {
    const workspace = { id: 1, slug: "ws" };
    const user = { id: 10 };
    const syncQuery = { sync: "true" };

    it("rejects when collector is offline", async () => {
      mockUserFromSession.mockResolvedValue(user);
      mockCollectorOnline.mockResolvedValue(false);
      const harness = buildApp();
      const res = await callWithLocals(
        harness,
        "post",
        "/workspace/:slug/parse",
        { file: { originalname: "doc.pdf" }, query: syncQuery },
        { workspace },
      );
      expect(res.statusCode).toBe(500);
      expect(res.body.error).toMatch(/not online/i);
    });

    it("parses a document successfully", async () => {
      mockUserFromSession.mockResolvedValue(user);
      mockCollectorOnline.mockResolvedValue(true);
      mockCollectorParse.mockResolvedValue({
        success: true,
        documents: [{ id: "d1", token_count_estimate: 50 }],
      });
      mockParsedCreate.mockResolvedValue({
        file: { id: 1, filename: "doc.pdf-d1.json" },
        error: null,
      });
      const harness = buildApp();
      const res = await callWithLocals(
        harness,
        "post",
        "/workspace/:slug/parse",
        { file: { originalname: "doc.pdf" }, body: {}, query: syncQuery },
        { workspace },
      );
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.files).toHaveLength(1);
      expect(mockEventLog).toHaveBeenCalled();
    });

    it("returns 500 when parse returns no documents", async () => {
      mockUserFromSession.mockResolvedValue(user);
      mockCollectorOnline.mockResolvedValue(true);
      mockCollectorParse.mockResolvedValue({
        success: false,
        reason: "parse error",
        documents: [],
      });
      const harness = buildApp();
      const res = await callWithLocals(
        harness,
        "post",
        "/workspace/:slug/parse",
        { file: { originalname: "doc.pdf" }, body: {}, query: syncQuery },
        { workspace },
      );
      expect(res.statusCode).toBe(500);
      expect(res.body.error).toMatch(/parse error/i);
    });

    it("returns 500 when db create throws", async () => {
      mockUserFromSession.mockResolvedValue(user);
      mockCollectorOnline.mockResolvedValue(true);
      mockCollectorParse.mockResolvedValue({
        success: true,
        documents: [{ id: "d1" }],
      });
      mockParsedCreate.mockResolvedValue({
        file: null,
        error: "db error",
      });
      const harness = buildApp();
      const res = await callWithLocals(
        harness,
        "post",
        "/workspace/:slug/parse",
        { file: { originalname: "doc.pdf" }, body: {}, query: syncQuery },
        { workspace },
      );
      expect(res.statusCode).toBe(500);
    });

    it("returns 500 on exception", async () => {
      mockUserFromSession.mockRejectedValue(new Error("fail"));
      const harness = buildApp();
      const res = await callWithLocals(
        harness,
        "post",
        "/workspace/:slug/parse",
        { file: { originalname: "doc.pdf" }, body: {}, query: syncQuery },
        { workspace },
      );
      expect(res.statusCode).toBe(500);
    });
  });

  describe("POST /workspace/:slug/parse (async default) + parse-status", () => {
    const workspace = { id: 1, slug: "ws" };
    const user = { id: 10 };

    /** Lets pending background microtasks (runParseJob) settle. */
    const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

    it("rejects missing file with 400", async () => {
      mockUserFromSession.mockResolvedValue(user);
      const harness = buildApp();
      const res = await callWithLocals(
        harness,
        "post",
        "/workspace/:slug/parse",
        { body: {} },
        { workspace },
      );
      expect(res.statusCode).toBe(400);
    });

    it("responds 202 with a jobId immediately and completes in background", async () => {
      mockUserFromSession.mockResolvedValue(user);
      mockMultiUserMode.mockReturnValue(false);
      mockCollectorOnline.mockResolvedValue(true);
      mockCollectorParse.mockResolvedValue({
        success: true,
        documents: [{ id: "d1", token_count_estimate: 50 }],
      });
      mockParsedCreate.mockResolvedValue({
        file: { id: 1, filename: "doc.pdf-d1.json", tokenCountEstimate: 50 },
        error: null,
      });
      const harness = buildApp();
      const res = await callWithLocals(
        harness,
        "post",
        "/workspace/:slug/parse",
        { file: { originalname: "doc.pdf" }, body: {} },
        { workspace },
      );
      expect(res.statusCode).toBe(202);
      expect(res.body.success).toBe(true);
      expect(res.body.jobId).toBeDefined();

      await flush();

      const statusRes = await callWithLocals(
        harness,
        "get",
        "/workspace/:slug/parse-status/:jobId",
        { params: { slug: "ws", jobId: res.body.jobId } },
        { workspace },
      );
      expect(statusRes.statusCode).toBe(200);
      expect(statusRes.body.status).toBe("completed");
      expect(statusRes.body.files).toHaveLength(1);
      expect(mockEventLog).toHaveBeenCalled();
    });

    it("marks job failed when the collector parse fails", async () => {
      mockUserFromSession.mockResolvedValue(user);
      mockMultiUserMode.mockReturnValue(false);
      mockCollectorOnline.mockResolvedValue(true);
      mockCollectorParse.mockResolvedValue({
        success: false,
        reason: "parse error",
        documents: [],
      });
      const harness = buildApp();
      const res = await callWithLocals(
        harness,
        "post",
        "/workspace/:slug/parse",
        { file: { originalname: "doc.pdf" }, body: {} },
        { workspace },
      );
      expect(res.statusCode).toBe(202);

      await flush();

      const statusRes = await callWithLocals(
        harness,
        "get",
        "/workspace/:slug/parse-status/:jobId",
        { params: { slug: "ws", jobId: res.body.jobId } },
        { workspace },
      );
      expect(statusRes.statusCode).toBe(200);
      expect(statusRes.body.status).toBe("failed");
      expect(statusRes.body.error).toMatch(/parse error/i);
    });

    it("returns 404 for unknown job ids", async () => {
      mockUserFromSession.mockResolvedValue(user);
      mockMultiUserMode.mockReturnValue(false);
      const harness = buildApp();
      const statusRes = await callWithLocals(
        harness,
        "get",
        "/workspace/:slug/parse-status/:jobId",
        { params: { slug: "ws", jobId: "does-not-exist" } },
        { workspace },
      );
      expect(statusRes.statusCode).toBe(404);
    });

    it("scopes job visibility to the owning workspace", async () => {
      mockUserFromSession.mockResolvedValue(user);
      mockMultiUserMode.mockReturnValue(false);
      mockCollectorOnline.mockResolvedValue(true);
      mockCollectorParse.mockResolvedValue({
        success: true,
        documents: [{ id: "d1", token_count_estimate: 1 }],
      });
      mockParsedCreate.mockResolvedValue({
        file: { id: 1, filename: "doc.pdf-d1.json" },
        error: null,
      });
      const harness = buildApp();
      const res = await callWithLocals(
        harness,
        "post",
        "/workspace/:slug/parse",
        { file: { originalname: "doc.pdf" }, body: {} },
        { workspace },
      );
      await flush();

      const otherWorkspace = { id: 999, slug: "other" };
      const statusRes = await callWithLocals(
        harness,
        "get",
        "/workspace/:slug/parse-status/:jobId",
        { params: { slug: "other", jobId: res.body.jobId } },
        { workspace: otherWorkspace },
      );
      expect(statusRes.statusCode).toBe(404);
    });
  });
});

// SPDX-License-Identifier: MIT
jest.mock("../../utils/middleware/validatedRequest", () => ({
  validatedRequest: (_req, _res, next) => next(),
}));
jest.mock("../../utils/middleware/multiUserProtected", () => ({
  isSingleUserMode: (_req, _res, next) => next(),
  flexUserRoleValid: () => (_req, _res, next) => next(),
  ROLES: { all: "<all>", admin: "admin", manager: "manager", default: "default" },
}));
jest.mock("../../utils/logger", () => () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

jest.mock("../../utils/http", () => ({
  reqBody: (req) => req.body,
  safeJsonParse: (str, fb) => { try { return JSON.parse(str); } catch { return fb; } },
}));

const mockJobAvailableTools = jest.fn();
const mockJobWhere = jest.fn();
const mockJobGet = jest.fn();
const mockJobCreate = jest.fn();
const mockJobUpdate = jest.fn();
const mockJobDelete = jest.fn();
const mockJobCanActivate = jest.fn();
const mockIsValidCron = jest.fn();
jest.mock("../../models/scheduledJob", () => ({
  ScheduledJob: {
    availableTools: (...a) => mockJobAvailableTools(...a),
    where: (...a) => mockJobWhere(...a),
    get: (...a) => mockJobGet(...a),
    create: (...a) => mockJobCreate(...a),
    update: (...a) => mockJobUpdate(...a),
    delete: (...a) => mockJobDelete(...a),
    canActivate: (...a) => mockJobCanActivate(...a),
    isValidCron: (...a) => mockIsValidCron(...a),
  },
}));

const mockRunGet = jest.fn();
const mockRunWhere = jest.fn();
const mockRunMarkRead = jest.fn();
const mockRunContinue = jest.fn();
const mockRunKill = jest.fn();
jest.mock("../../models/scheduledJobRun", () => ({
  ScheduledJobRun: {
    get: (...a) => mockRunGet(...a),
    where: (...a) => mockRunWhere(...a),
    markRead: (...a) => mockRunMarkRead(...a),
    continueInThread: (...a) => mockRunContinue(...a),
    kill: (...a) => mockRunKill(...a),
  },
}));

const mockBgAddJob = jest.fn();
const mockBgSyncJob = jest.fn();
const mockBgRemoveJob = jest.fn();
const mockBgKillRun = jest.fn();
const mockBgEnqueue = jest.fn();
jest.mock("../../utils/BackgroundWorkers", () => ({
  BackgroundService: jest.fn(() => ({
    addScheduledJob: (...a) => mockBgAddJob(...a),
    syncScheduledJob: (...a) => mockBgSyncJob(...a),
    removeScheduledJob: (...a) => mockBgRemoveJob(...a),
    killRun: (...a) => mockBgKillRun(...a),
    enqueueScheduledJob: (...a) => mockBgEnqueue(...a),
  })),
}));

const mockTelemetrySend = jest.fn().mockResolvedValue(undefined);
jest.mock("../../models/telemetry", () => ({
  Telemetry: { sendTelemetry: (...a) => mockTelemetrySend(...a) },
}));

const { createMockApp } = require("../helpers/mockExpressApp");
const { scheduledJobEndpoints } = require("../../endpoints/scheduledJobs");

function buildApp() {
  const harness = createMockApp();
  scheduledJobEndpoints(harness.app);
  return harness;
}

async function callWithPatch(harness, method, path, req = {}) {
  const key = `${method.toLowerCase()} ${path}`;
  const handler = harness.routes[key];
  if (!handler) throw new Error(`No route registered for ${key}`);
  const request = {
    body: req.body || {},
    params: req.params || {},
    query: req.query || {},
    header: (name) => (req.headers || {})[name] || "Bearer test-key",
  };
  const { createMockRes } = require("../helpers/mockExpressApp");
  const response = createMockRes();
  response.sendStatus = (code) => {
    response.statusCode = code;
    response.ended = true;
    return response;
  };
  await handler(request, response);
  return response;
}

describe("Scheduled Jobs endpoints", () => {
  afterEach(() => jest.clearAllMocks());

  describe("GET /scheduled-jobs/available-tools", () => {
    it("returns available tools", async () => {
      mockJobAvailableTools.mockResolvedValue(["web_search", "code_exec"]);
      const { call } = buildApp();
      const res = await call("get", "/scheduled-jobs/available-tools");
      expect(res.statusCode).toBe(200);
      expect(res.body.tools).toEqual(["web_search", "code_exec"]);
    });

    it("returns 500 on error", async () => {
      mockJobAvailableTools.mockRejectedValue(new Error("fail"));
      const { call } = buildApp();
      const res = await call("get", "/scheduled-jobs/available-tools");
      expect(res.statusCode).toBe(500);
    });
  });

  describe("GET /scheduled-jobs/runs/:runId", () => {
    it("returns 404 when run not found", async () => {
      mockRunGet.mockResolvedValue(null);
      const { call } = buildApp();
      const res = await call("get", "/scheduled-jobs/runs/:runId", {
        params: { runId: "99" },
      });
      expect(res.statusCode).toBe(404);
      expect(res.body.error).toMatch(/not found/i);
    });

    it("returns run with parsed result", async () => {
      mockRunGet.mockResolvedValue({ id: 1, jobId: 10, result: '{"key":"val"}' });
      mockJobGet.mockResolvedValue({ id: 10, name: "Daily" });
      const { call } = buildApp();
      const res = await call("get", "/scheduled-jobs/runs/:runId", {
        params: { runId: "1" },
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.run.result).toEqual({ key: "val" });
      expect(res.body.job.id).toBe(10);
    });

    it("returns 500 on exception", async () => {
      mockRunGet.mockRejectedValue(new Error("fail"));
      const { call } = buildApp();
      const res = await call("get", "/scheduled-jobs/runs/:runId", {
        params: { runId: "1" },
      });
      expect(res.statusCode).toBe(500);
    });
  });

  describe("POST /scheduled-jobs/runs/:runId/:action", () => {
    it("marks a run as read", async () => {
      mockRunMarkRead.mockResolvedValue(undefined);
      const { call } = buildApp();
      const res = await call("post", "/scheduled-jobs/runs/:runId/:action", {
        params: { runId: "5", action: "read" },
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockRunMarkRead).toHaveBeenCalledWith(5);
    });

    it("continues a run in thread", async () => {
      mockRunContinue.mockResolvedValue({
        workspace: { slug: "ws1" },
        thread: { slug: "t1" },
      });
      const { call } = buildApp();
      const res = await call("post", "/scheduled-jobs/runs/:runId/:action", {
        params: { runId: "5", action: "continue" },
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.workspaceSlug).toBe("ws1");
      expect(res.body.threadSlug).toBe("t1");
    });

    it("returns 500 when continue fails", async () => {
      mockRunContinue.mockResolvedValue({ error: "no thread" });
      const { call } = buildApp();
      const res = await call("post", "/scheduled-jobs/runs/:runId/:action", {
        params: { runId: "5", action: "continue" },
      });
      expect(res.statusCode).toBe(500);
    });

    it("kills a running job via background service", async () => {
      mockRunGet.mockResolvedValue({ id: 5, jobId: 10, status: "running" });
      mockBgKillRun.mockReturnValue(true);
      const { call } = buildApp();
      const res = await call("post", "/scheduled-jobs/runs/:runId/:action", {
        params: { runId: "5", action: "kill" },
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockRunKill).not.toHaveBeenCalled();
    });

    it("kills a queued job via DB when bg service cannot", async () => {
      mockRunGet.mockResolvedValue({ id: 5, jobId: 10, status: "queued" });
      mockBgKillRun.mockReturnValue(false);
      const { call } = buildApp();
      const res = await call("post", "/scheduled-jobs/runs/:runId/:action", {
        params: { runId: "5", action: "kill" },
      });
      expect(res.statusCode).toBe(200);
      expect(mockRunKill).toHaveBeenCalledWith(5);
    });

    it("returns 404 when killing nonexistent run", async () => {
      mockRunGet.mockResolvedValue(null);
      const { call } = buildApp();
      const res = await call("post", "/scheduled-jobs/runs/:runId/:action", {
        params: { runId: "99", action: "kill" },
      });
      expect(res.statusCode).toBe(404);
    });

    it("returns 400 when killing already-completed run", async () => {
      mockRunGet.mockResolvedValue({ id: 5, jobId: 10, status: "completed" });
      const { call } = buildApp();
      const res = await call("post", "/scheduled-jobs/runs/:runId/:action", {
        params: { runId: "5", action: "kill" },
      });
      expect(res.statusCode).toBe(400);
    });

    it("returns 500 for invalid action", async () => {
      const { call } = buildApp();
      const res = await call("post", "/scheduled-jobs/runs/:runId/:action", {
        params: { runId: "5", action: "invalid" },
      });
      expect(res.statusCode).toBe(500);
    });
  });

  describe("GET /scheduled-jobs", () => {
    it("returns jobs with latest runs", async () => {
      mockJobWhere.mockResolvedValue([
        { id: 1, name: "Job1", runs: [{ id: 10, startedAt: "2025-01-01" }] },
        { id: 2, name: "Job2", runs: [] },
      ]);
      const { call } = buildApp();
      const res = await call("get", "/scheduled-jobs");
      expect(res.statusCode).toBe(200);
      expect(res.body.jobs).toHaveLength(2);
      expect(res.body.jobs[0].latestRun.id).toBe(10);
      expect(res.body.jobs[1].latestRun).toBeNull();
    });

    it("returns 500 on error", async () => {
      mockJobWhere.mockRejectedValue(new Error("fail"));
      const { call } = buildApp();
      const res = await call("get", "/scheduled-jobs");
      expect(res.statusCode).toBe(500);
    });
  });

  describe("POST /scheduled-jobs/new", () => {
    it("rejects missing name with 400", async () => {
      const { call } = buildApp();
      const res = await call("post", "/scheduled-jobs/new", {
        body: { prompt: "p", schedule: "0 * * * *" },
      });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/name/i);
    });

    it("rejects missing prompt with 400", async () => {
      const { call } = buildApp();
      const res = await call("post", "/scheduled-jobs/new", {
        body: { name: "J", schedule: "0 * * * *" },
      });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/prompt/i);
    });

    it("rejects missing schedule with 400", async () => {
      const { call } = buildApp();
      const res = await call("post", "/scheduled-jobs/new", {
        body: { name: "J", prompt: "p" },
      });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/schedule/i);
    });

    it("rejects invalid cron with 400", async () => {
      mockIsValidCron.mockReturnValue(false);
      const { call } = buildApp();
      const res = await call("post", "/scheduled-jobs/new", {
        body: { name: "J", prompt: "p", schedule: "bad" },
      });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/cron/i);
    });

    it("rejects non-array tools with 400", async () => {
      mockIsValidCron.mockReturnValue(true);
      const { call } = buildApp();
      const res = await call("post", "/scheduled-jobs/new", {
        body: { name: "J", prompt: "p", schedule: "0 * * * *", tools: "not-array" },
      });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/tools/i);
    });

    it("rejects when active job cap reached", async () => {
      mockIsValidCron.mockReturnValue(true);
      mockJobCanActivate.mockResolvedValue({ allowed: false, limit: 5 });
      const { call } = buildApp();
      const res = await call("post", "/scheduled-jobs/new", {
        body: { name: "J", prompt: "p", schedule: "0 * * * *" },
      });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/maximum/i);
    });

    it("creates a job successfully", async () => {
      mockIsValidCron.mockReturnValue(true);
      mockJobCanActivate.mockResolvedValue({ allowed: true });
      const job = { id: 1, name: "J", prompt: "p", schedule: "0 * * * *" };
      mockJobCreate.mockResolvedValue({ job, error: null });
      const { call } = buildApp();
      const res = await call("post", "/scheduled-jobs/new", {
        body: { name: " J ", prompt: " p ", schedule: " 0 * * * * " },
      });
      expect(res.statusCode).toBe(201);
      expect(res.body.job.name).toBe("J");
      expect(mockBgAddJob).toHaveBeenCalledWith(job);
    });

    it("returns 400 when create returns error", async () => {
      mockIsValidCron.mockReturnValue(true);
      mockJobCanActivate.mockResolvedValue({ allowed: true });
      mockJobCreate.mockResolvedValue({ job: null, error: "duplicate" });
      const { call } = buildApp();
      const res = await call("post", "/scheduled-jobs/new", {
        body: { name: "J", prompt: "p", schedule: "0 * * * *" },
      });
      expect(res.statusCode).toBe(400);
    });

    it("returns 500 on exception", async () => {
      mockIsValidCron.mockReturnValue(true);
      mockJobCanActivate.mockRejectedValue(new Error("fail"));
      const { call } = buildApp();
      const res = await call("post", "/scheduled-jobs/new", {
        body: { name: "J", prompt: "p", schedule: "0 * * * *" },
      });
      expect(res.statusCode).toBe(500);
    });
  });

  describe("GET /scheduled-jobs/:id", () => {
    it("returns 404 when job not found", async () => {
      mockJobGet.mockResolvedValue(null);
      const { call } = buildApp();
      const res = await call("get", "/scheduled-jobs/:id", {
        params: { id: "99" },
      });
      expect(res.statusCode).toBe(404);
    });

    it("returns a single job", async () => {
      mockJobGet.mockResolvedValue({ id: 1, name: "Daily" });
      const { call } = buildApp();
      const res = await call("get", "/scheduled-jobs/:id", {
        params: { id: "1" },
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.job.name).toBe("Daily");
    });

    it("returns 500 on exception", async () => {
      mockJobGet.mockRejectedValue(new Error("fail"));
      const { call } = buildApp();
      const res = await call("get", "/scheduled-jobs/:id", {
        params: { id: "1" },
      });
      expect(res.statusCode).toBe(500);
    });
  });

  describe("PUT /scheduled-jobs/:id", () => {
    it("rejects invalid cron expression", async () => {
      mockIsValidCron.mockReturnValue(false);
      const { call } = buildApp();
      const res = await call("put", "/scheduled-jobs/:id", {
        params: { id: "1" },
        body: { schedule: "bad" },
      });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/cron/i);
    });

    it("rejects enabling when cap reached", async () => {
      mockIsValidCron.mockReturnValue(true);
      mockJobCanActivate.mockResolvedValue({ allowed: false, limit: 3 });
      const { call } = buildApp();
      const res = await call("put", "/scheduled-jobs/:id", {
        params: { id: "1" },
        body: { enabled: true },
      });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/maximum/i);
    });

    it("updates a job successfully", async () => {
      mockIsValidCron.mockReturnValue(true);
      mockJobCanActivate.mockResolvedValue({ allowed: true });
      const updated = { id: 1, name: "Updated" };
      mockJobUpdate.mockResolvedValue({ job: updated, error: null });
      const { call } = buildApp();
      const res = await call("put", "/scheduled-jobs/:id", {
        params: { id: "1" },
        body: { name: "Updated", schedule: "0 0 * * *" },
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.job.name).toBe("Updated");
      expect(mockBgSyncJob).toHaveBeenCalledWith(1);
    });

    it("returns 400 when update returns error", async () => {
      mockJobUpdate.mockResolvedValue({ job: null, error: "conflict" });
      const { call } = buildApp();
      const res = await call("put", "/scheduled-jobs/:id", {
        params: { id: "1" },
        body: { name: "New" },
      });
      expect(res.statusCode).toBe(400);
    });

    it("returns 500 on exception", async () => {
      mockJobUpdate.mockRejectedValue(new Error("fail"));
      const { call } = buildApp();
      const res = await call("put", "/scheduled-jobs/:id", {
        params: { id: "1" },
        body: { name: "New" },
      });
      expect(res.statusCode).toBe(500);
    });
  });

  describe("DELETE /scheduled-jobs/:id", () => {
    it("deletes a job and removes from background service", async () => {
      mockJobDelete.mockResolvedValue(true);
      const { call } = buildApp();
      const res = await call("delete", "/scheduled-jobs/:id", {
        params: { id: "1" },
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockBgRemoveJob).toHaveBeenCalledWith(1);
    });

    it("returns 500 on exception", async () => {
      mockJobDelete.mockRejectedValue(new Error("fail"));
      const { call } = buildApp();
      const res = await call("delete", "/scheduled-jobs/:id", {
        params: { id: "1" },
      });
      expect(res.statusCode).toBe(500);
    });
  });

  describe("POST /scheduled-jobs/:id/toggle", () => {
    it("returns 404 when job not found", async () => {
      mockJobGet.mockResolvedValue(null);
      const { call } = buildApp();
      const res = await call("post", "/scheduled-jobs/:id/toggle", {
        params: { id: "99" },
      });
      expect(res.statusCode).toBe(404);
    });

    it("toggles a disabled job to enabled (with activation check)", async () => {
      mockJobGet.mockResolvedValue({ id: 1, enabled: false });
      mockJobCanActivate.mockResolvedValue({ allowed: true });
      mockJobUpdate.mockResolvedValue({ job: { id: 1, enabled: true } });
      const { call } = buildApp();
      const res = await call("post", "/scheduled-jobs/:id/toggle", {
        params: { id: "1" },
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.job.enabled).toBe(true);
      expect(mockJobCanActivate).toHaveBeenCalled();
    });

    it("rejects enabling when cap reached", async () => {
      mockJobGet.mockResolvedValue({ id: 1, enabled: false });
      mockJobCanActivate.mockResolvedValue({ allowed: false, limit: 3 });
      const { call } = buildApp();
      const res = await call("post", "/scheduled-jobs/:id/toggle", {
        params: { id: "1" },
      });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/maximum/i);
    });

    it("toggles enabled job to disabled without activation check", async () => {
      mockJobGet.mockResolvedValue({ id: 1, enabled: true });
      mockJobUpdate.mockResolvedValue({ job: { id: 1, enabled: false } });
      const { call } = buildApp();
      const res = await call("post", "/scheduled-jobs/:id/toggle", {
        params: { id: "1" },
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.job.enabled).toBe(false);
      expect(mockJobCanActivate).not.toHaveBeenCalled();
    });

    it("returns 500 on exception", async () => {
      mockJobGet.mockRejectedValue(new Error("fail"));
      const { call } = buildApp();
      const res = await call("post", "/scheduled-jobs/:id/toggle", {
        params: { id: "1" },
      });
      expect(res.statusCode).toBe(500);
    });
  });

  describe("POST /scheduled-jobs/:id/trigger", () => {
    it("returns 404 when job not found", async () => {
      mockJobGet.mockResolvedValue(null);
      const { call } = buildApp();
      const res = await call("post", "/scheduled-jobs/:id/trigger", {
        params: { id: "99" },
      });
      expect(res.statusCode).toBe(404);
    });

    it("triggers a job successfully", async () => {
      mockJobGet.mockResolvedValue({ id: 1 });
      mockBgEnqueue.mockResolvedValue({ id: 100 });
      const { call } = buildApp();
      const res = await call("post", "/scheduled-jobs/:id/trigger", {
        params: { id: "1" },
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.skipped).toBe(false);
    });

    it("reports skipped when enqueue returns null", async () => {
      mockJobGet.mockResolvedValue({ id: 1 });
      mockBgEnqueue.mockResolvedValue(null);
      const { call } = buildApp();
      const res = await call("post", "/scheduled-jobs/:id/trigger", {
        params: { id: "1" },
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.skipped).toBe(true);
    });

    it("returns 500 on exception", async () => {
      mockJobGet.mockRejectedValue(new Error("fail"));
      const { call } = buildApp();
      const res = await call("post", "/scheduled-jobs/:id/trigger", {
        params: { id: "1" },
      });
      expect(res.statusCode).toBe(500);
    });
  });

  describe("GET /scheduled-jobs/:id/runs", () => {
    it("returns runs for a job", async () => {
      mockRunWhere.mockResolvedValue([{ id: 1 }, { id: 2 }]);
      const { call } = buildApp();
      const res = await call("get", "/scheduled-jobs/:id/runs", {
        params: { id: "1" },
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.runs).toHaveLength(2);
    });

    it("returns 500 on error", async () => {
      mockRunWhere.mockRejectedValue(new Error("fail"));
      const { call } = buildApp();
      const res = await call("get", "/scheduled-jobs/:id/runs", {
        params: { id: "1" },
      });
      expect(res.statusCode).toBe(500);
    });
  });
});

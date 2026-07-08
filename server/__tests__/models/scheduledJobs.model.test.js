// SPDX-License-Identifier: MIT
// Tests for ScheduledJob and ScheduledJobRun models (Issue #384).
//
// Covers the job lifecycle: creation, cron validation, status transitions
// (queued → running → completed/failed), timeout, dedup, and cleanup.

jest.mock("../../utils/logger/console.js", () => ({
  error: jest.fn(),
  log: jest.fn(),
}));

// Mock prisma with a realistic in-memory store
const mockPrisma = {
  scheduled_jobs: {
    create: jest.fn(),
    update: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  scheduled_job_runs: {
    create: jest.fn(),
    updateMany: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn(async (fn) => fn(mockPrisma)),
};

jest.mock("../../utils/prisma", () => mockPrisma);

jest.mock("../../utils/database/queryLimits", () => ({
  clampLimit: (limit, opts) => limit || opts?.fallback || 100,
  MAX_LIST_LIMIT: 100,
}));

const { ScheduledJob } = require("../../models/scheduledJob");
const { ScheduledJobRun } = require("../../models/scheduledJobRun");

describe("ScheduledJob model", () => {
  beforeEach(() => jest.clearAllMocks());

  // ─────────────────────────────────────────────────────────────────────────
  // isValidCron
  // ─────────────────────────────────────────────────────────────────────────
  describe("isValidCron", () => {
    it("returns true for valid cron expressions", () => {
      expect(ScheduledJob.isValidCron("0 9 * * 1-5")).toBe(true);
      expect(ScheduledJob.isValidCron("*/30 * * * *")).toBe(true);
      expect(ScheduledJob.isValidCron("0 0 1 * *")).toBe(true);
    });

    it("returns false for invalid cron expressions", () => {
      expect(ScheduledJob.isValidCron("not-a-cron")).toBe(false);
      expect(ScheduledJob.isValidCron("")).toBe(false);
      expect(ScheduledJob.isValidCron("100 99 99 99 99")).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // computeNextRunAt
  // ─────────────────────────────────────────────────────────────────────────
  describe("computeNextRunAt", () => {
    it("returns a Date for valid cron", () => {
      const result = ScheduledJob.computeNextRunAt("0 9 * * *");
      expect(result).toBeInstanceOf(Date);
    });

    it("returns null for invalid cron", () => {
      const result = ScheduledJob.computeNextRunAt("invalid");
      expect(result).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // create
  // ─────────────────────────────────────────────────────────────────────────
  describe("create", () => {
    it("creates a job with valid cron expression", async () => {
      const fakeJob = { id: 1, name: "Daily Report", schedule: "0 9 * * *", enabled: false };
      mockPrisma.scheduled_jobs.create.mockResolvedValue(fakeJob);

      const { job, error } = await ScheduledJob.create({
        name: "Daily Report",
        prompt: "Generate report",
        schedule: "0 9 * * *",
      });

      expect(error).toBeNull();
      expect(job).toEqual(fakeJob);
      expect(mockPrisma.scheduled_jobs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: "Daily Report",
            schedule: "0 9 * * *",
          }),
        }),
      );
    });

    it("returns error for invalid cron expression", async () => {
      const { job, error } = await ScheduledJob.create({
        name: "Bad Job",
        prompt: "test",
        schedule: "invalid-cron",
      });

      expect(job).toBeNull();
      expect(error).toBe("Invalid cron expression");
      expect(mockPrisma.scheduled_jobs.create).not.toHaveBeenCalled();
    });

    it("serializes tools array to JSON string", async () => {
      mockPrisma.scheduled_jobs.create.mockResolvedValue({ id: 1 });
      await ScheduledJob.create({
        name: "Job",
        prompt: "test",
        tools: ["tool1", "tool2"],
        schedule: "0 9 * * *",
      });

      expect(mockPrisma.scheduled_jobs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tools: JSON.stringify(["tool1", "tool2"]),
          }),
        }),
      );
    });

    it("sets tools to null when not provided", async () => {
      mockPrisma.scheduled_jobs.create.mockResolvedValue({ id: 1 });
      await ScheduledJob.create({
        name: "Job",
        prompt: "test",
        schedule: "0 9 * * *",
      });

      expect(mockPrisma.scheduled_jobs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tools: null }),
        }),
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // update
  // ─────────────────────────────────────────────────────────────────────────
  describe("update", () => {
    it("updates writable fields", async () => {
      const fakeJob = { id: 1, name: "Updated", enabled: true };
      mockPrisma.scheduled_jobs.update.mockResolvedValue(fakeJob);

      const { job, error } = await ScheduledJob.update(1, { name: "Updated" });

      expect(error).toBeNull();
      expect(job).toEqual(fakeJob);
      expect(mockPrisma.scheduled_jobs.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({ name: "Updated" }),
        }),
      );
    });

    it("rejects invalid cron on update", async () => {
      const { job, error } = await ScheduledJob.update(1, { schedule: "bad" });

      expect(job).toBeNull();
      expect(error).toBe("Invalid cron expression");
    });

    it("recalculates nextRunAt when schedule changes", async () => {
      mockPrisma.scheduled_jobs.update.mockResolvedValue({ id: 1 });

      await ScheduledJob.update(1, { schedule: "0 10 * * *" });

      expect(mockPrisma.scheduled_jobs.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            schedule: "0 10 * * *",
            nextRunAt: expect.any(Date),
          }),
        }),
      );
    });

    it("serializes tools on update", async () => {
      mockPrisma.scheduled_jobs.update.mockResolvedValue({ id: 1 });

      await ScheduledJob.update(1, { tools: ["a", "b"] });

      expect(mockPrisma.scheduled_jobs.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tools: JSON.stringify(["a", "b"]) }),
        }),
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // get / where / delete
  // ─────────────────────────────────────────────────────────────────────────
  describe("get", () => {
    it("returns job when found", async () => {
      mockPrisma.scheduled_jobs.findFirst.mockResolvedValue({ id: 1, name: "Job" });

      const job = await ScheduledJob.get({ id: 1 });
      expect(job).toEqual({ id: 1, name: "Job" });
    });

    it("returns null when not found", async () => {
      mockPrisma.scheduled_jobs.findFirst.mockResolvedValue(null);

      const job = await ScheduledJob.get({ id: 999 });
      expect(job).toBeNull();
    });
  });

  describe("where", () => {
    it("returns array of jobs", async () => {
      const fakeJobs = [{ id: 1 }, { id: 2 }];
      mockPrisma.scheduled_jobs.findMany.mockResolvedValue(fakeJobs);

      const jobs = await ScheduledJob.where({});
      expect(jobs).toEqual(fakeJobs);
    });

    it("returns empty array on error", async () => {
      mockPrisma.scheduled_jobs.findMany.mockRejectedValue(new Error("DB error"));

      const jobs = await ScheduledJob.where({});
      expect(jobs).toEqual([]);
    });
  });

  describe("delete", () => {
    it("returns true on successful delete", async () => {
      mockPrisma.scheduled_jobs.delete.mockResolvedValue({});

      const result = await ScheduledJob.delete(1);
      expect(result).toBe(true);
    });

    it("returns false on error", async () => {
      mockPrisma.scheduled_jobs.delete.mockRejectedValue(new Error("Not found"));

      const result = await ScheduledJob.delete(999);
      expect(result).toBe(false);
    });
  });
});

describe("ScheduledJobRun model", () => {
  beforeEach(() => jest.clearAllMocks());

  // ─────────────────────────────────────────────────────────────────────────
  // start (claim a run)
  // ─────────────────────────────────────────────────────────────────────────
  describe("start", () => {
    it("creates a queued run when no in-flight run exists", async () => {
      mockPrisma.scheduled_job_runs.findFirst.mockResolvedValue(null);
      const fakeRun = { id: 1, jobId: 5, status: "queued" };
      mockPrisma.scheduled_job_runs.create.mockResolvedValue(fakeRun);

      const run = await ScheduledJobRun.start(5);

      expect(run).toEqual(fakeRun);
      expect(mockPrisma.scheduled_job_runs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            jobId: 5,
            status: "queued",
          }),
        }),
      );
    });

    it("returns null when a run is already in flight (dedup)", async () => {
      mockPrisma.scheduled_job_runs.findFirst.mockResolvedValue({ id: 99 });

      const run = await ScheduledJobRun.start(5);

      expect(run).toBeNull();
      expect(mockPrisma.scheduled_job_runs.create).not.toHaveBeenCalled();
    });

    it("returns null on error", async () => {
      mockPrisma.scheduled_job_runs.findFirst.mockRejectedValue(new Error("DB error"));

      const run = await ScheduledJobRun.start(5);
      expect(run).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // markRunning (queued → running)
  // ─────────────────────────────────────────────────────────────────────────
  describe("markRunning", () => {
    it("transitions queued run to running", async () => {
      mockPrisma.scheduled_job_runs.updateMany.mockResolvedValue({ count: 1 });

      const result = await ScheduledJobRun.markRunning(1);

      expect(result).toBe(true);
      expect(mockPrisma.scheduled_job_runs.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1, status: "queued" },
          data: expect.objectContaining({
            status: "running",
            startedAt: expect.any(Date),
          }),
        }),
      );
    });

    it("returns false when run is not in queued state", async () => {
      mockPrisma.scheduled_job_runs.updateMany.mockResolvedValue({ count: 0 });

      const result = await ScheduledJobRun.markRunning(1);
      expect(result).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // complete (running → completed)
  // ─────────────────────────────────────────────────────────────────────────
  describe("complete", () => {
    it("marks a run as completed with result", async () => {
      mockPrisma.scheduled_job_runs.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.scheduled_job_runs.findFirst.mockResolvedValue({
        id: 1,
        status: "completed",
        result: '{"text":"done"}',
      });

      const run = await ScheduledJobRun.complete(1, { result: { text: "done" } });

      expect(run).not.toBeNull();
      expect(run.status).toBe("completed");
      expect(mockPrisma.scheduled_job_runs.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "completed",
            result: JSON.stringify({ text: "done" }),
          }),
        }),
      );
    });

    it("returns null when run is already terminal", async () => {
      mockPrisma.scheduled_job_runs.updateMany.mockResolvedValue({ count: 0 });

      const run = await ScheduledJobRun.complete(1, { result: "test" });
      expect(run).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // fail (running → failed)
  // ─────────────────────────────────────────────────────────────────────────
  describe("fail", () => {
    it("marks a run as failed with error message", async () => {
      mockPrisma.scheduled_job_runs.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.scheduled_job_runs.findFirst.mockResolvedValue({
        id: 1,
        status: "failed",
        error: "Something went wrong",
      });

      const run = await ScheduledJobRun.fail(1, { error: "Something went wrong" });

      expect(run).not.toBeNull();
      expect(run.status).toBe("failed");
      expect(run.error).toBe("Something went wrong");
    });

    it("returns null when run is already terminal", async () => {
      mockPrisma.scheduled_job_runs.updateMany.mockResolvedValue({ count: 0 });

      const run = await ScheduledJobRun.fail(1, { error: "test" });
      expect(run).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // timeout (running → timed_out)
  // ─────────────────────────────────────────────────────────────────────────
  describe("timeout", () => {
    it("marks a run as timed_out", async () => {
      mockPrisma.scheduled_job_runs.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.scheduled_job_runs.findFirst.mockResolvedValue({
        id: 1,
        status: "timed_out",
        error: "Job execution timed out",
      });

      const run = await ScheduledJobRun.timeout(1);

      expect(run).not.toBeNull();
      expect(run.status).toBe("timed_out");
      expect(run.error).toBe("Job execution timed out");
    });

    it("returns null when run is already terminal", async () => {
      mockPrisma.scheduled_job_runs.updateMany.mockResolvedValue({ count: 0 });

      const run = await ScheduledJobRun.timeout(1);
      expect(run).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // failIfNotTerminal
  // ─────────────────────────────────────────────────────────────────────────
  describe("failIfNotTerminal", () => {
    it("conditionally fails a non-terminal run", async () => {
      mockPrisma.scheduled_job_runs.updateMany.mockResolvedValue({ count: 1 });

      const result = await ScheduledJobRun.failIfNotTerminal(1, "Worker crashed");
      expect(result).toBe(true);
    });

    it("does not fail an already-terminal run", async () => {
      mockPrisma.scheduled_job_runs.updateMany.mockResolvedValue({ count: 0 });

      const result = await ScheduledJobRun.failIfNotTerminal(1, "Worker crashed");
      expect(result).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Lifecycle: queued → running → completed
  // ─────────────────────────────────────────────────────────────────────────
  describe("full lifecycle", () => {
    it("queued → running → completed", async () => {
      // Start: create queued run
      mockPrisma.scheduled_job_runs.findFirst.mockResolvedValue(null);
      mockPrisma.scheduled_job_runs.create.mockResolvedValue({
        id: 10,
        jobId: 1,
        status: "queued",
      });
      const started = await ScheduledJobRun.start(1);
      expect(started.status).toBe("queued");

      // Mark running
      mockPrisma.scheduled_job_runs.updateMany.mockResolvedValue({ count: 1 });
      const running = await ScheduledJobRun.markRunning(10);
      expect(running).toBe(true);

      // Complete
      mockPrisma.scheduled_job_runs.findFirst.mockResolvedValue({
        id: 10,
        status: "completed",
        result: '{"text":"ok"}',
      });
      const completed = await ScheduledJobRun.complete(10, { result: { text: "ok" } });
      expect(completed.status).toBe("completed");
    });

    it("queued → running → failed", async () => {
      mockPrisma.scheduled_job_runs.findFirst.mockResolvedValue(null);
      mockPrisma.scheduled_job_runs.create.mockResolvedValue({
        id: 20,
        jobId: 2,
        status: "queued",
      });
      const started = await ScheduledJobRun.start(2);
      expect(started.status).toBe("queued");

      mockPrisma.scheduled_job_runs.updateMany.mockResolvedValue({ count: 1 });
      await ScheduledJobRun.markRunning(20);

      mockPrisma.scheduled_job_runs.findFirst.mockResolvedValue({
        id: 20,
        status: "failed",
        error: "Execution error",
      });
      const failed = await ScheduledJobRun.fail(20, { error: "Execution error" });
      expect(failed.status).toBe("failed");
      expect(failed.error).toBe("Execution error");
    });
  });
});

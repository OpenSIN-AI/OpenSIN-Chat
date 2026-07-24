// SPDX-License-Identifier: MIT
/* eslint-env jest */
// Tests for server/utils/BackgroundWorkers/index.js — BackgroundService (Issue #388)
//
// BackgroundService uses Bree (job scheduler), p-queue (concurrency), and
// several Prisma models. We mock all external dependencies to isolate the
// service logic: singleton, job list, worker spawning, scheduled job
// management, error handling, and message handling.

// --- Mock dependencies ---
const mockBreeInstance = {
  start: jest.fn().mockResolvedValue(undefined),
  stop: jest.fn().mockResolvedValue(undefined),
  add: jest.fn().mockResolvedValue(undefined),
  remove: jest.fn().mockResolvedValue(undefined),
  run: jest.fn().mockResolvedValue(undefined),
  start: jest.fn().mockResolvedValue(undefined),
  stop: jest.fn().mockResolvedValue(undefined),
  workers: new Map(),
  config: { jobs: [] },
};

jest.mock("@mintplex-labs/bree", () => {
  return jest.fn().mockImplementation(function (opts) {
    Object.assign(mockBreeInstance, opts);
    return mockBreeInstance;
  });
});

jest.mock("@ladjs/graceful", () => {
  return jest.fn().mockImplementation(function (opts) {
    this.brees = opts?.brees || [];
    this.listen = jest.fn();
    this.stopBree = jest.fn();
    this.stop = jest.fn();
    return this;
  });
});

jest.mock("@breejs/later", () => ({
  date: { UTC: jest.fn() },
  parse: { cron: jest.fn().mockReturnValue({}) },
  setInterval: jest.fn().mockReturnValue({ clear: jest.fn() }),
}));

jest.mock("p-queue", () => {
  return {
    default: jest.fn().mockImplementation(function (opts) {
      this.concurrency = opts?.concurrency || 1;
      this.add = jest.fn().mockImplementation(async (fn) => {
        if (typeof fn === "function") return fn();
      });
      this.clear = jest.fn();
      return this;
    }),
  };
});

jest.mock("../../../utils/logger", () => {
  return jest.fn().mockReturnValue({
    info: jest.fn(),
    error: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
  });
});

jest.mock("../../../utils/logger/console.js", () => ({
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
}));

// Mock models that are lazily required inside boot()
jest.mock("../../../models/documentSyncQueue", () => ({
  DocumentSyncQueue: { enabled: jest.fn().mockResolvedValue(false) },
}));

jest.mock("../../../models/systemSettings", () => ({
  SystemSettings: { autoMemoriesEnabled: jest.fn().mockResolvedValue(false) },
}));

jest.mock("../../../models/scheduledJobRun", () => ({
  ScheduledJobRun: {
    failOrphanedRuns: jest.fn().mockResolvedValue(0),
    cleanupOldRuns: jest.fn().mockResolvedValue(0),
    start: jest.fn().mockResolvedValue({ id: 1 }),
    failIfNotTerminal: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock("../../../models/scheduledJob", () => ({
  ScheduledJob: {
    allEnabled: jest.fn().mockResolvedValue([]),
    recomputeNextRunAt: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue(null),
  },
}));

const { BackgroundService } = require("../../../utils/BackgroundWorkers");

beforeEach(() => {
  jest.clearAllMocks();
  // Reset singleton between tests
  BackgroundService._instance = null;
  mockBreeInstance.workers = new Map();
  mockBreeInstance.config = { jobs: [] };
  mockBreeInstance.add.mockResolvedValue(undefined);
  mockBreeInstance.remove.mockResolvedValue(undefined);
  mockBreeInstance.run.mockResolvedValue(undefined);
});

describe("BackgroundService — singleton pattern", () => {
  it("returns the same instance on subsequent construction", () => {
    const a = new BackgroundService();
    const b = new BackgroundService();
    expect(a).toBe(b);
  });

  it("preserves singleton across multiple constructions", () => {
    const a = new BackgroundService();
    a.customProp = "test";
    const b = new BackgroundService();
    expect(b.customProp).toBe("test");
  });
});

describe("BackgroundService — jobs()", () => {
  it("returns always-run jobs when no optional features are enabled", () => {
    const svc = new BackgroundService();
    svc.documentSyncEnabled = false;
    svc.memoryExtractionEnabled = false;

    const jobs = svc.jobs();
    const jobNames = jobs.map((j) => j.name);

    expect(jobNames).toContain("cleanup-orphan-documents");
    expect(jobNames).toContain("cleanup-generated-files");
    expect(jobNames).toContain("sync-politician-data");
    expect(jobs).toHaveLength(3);
  });

  it("includes memory jobs when memoryExtractionEnabled is true", () => {
    const svc = new BackgroundService();
    svc.memoryExtractionEnabled = true;
    svc.documentSyncEnabled = false;

    const jobs = svc.jobs();
    const jobNames = jobs.map((j) => j.name);

    expect(jobNames).toContain("extract-memories");
    expect(jobs).toHaveLength(4);
  });

  it("includes document sync jobs when documentSyncEnabled is true", () => {
    const svc = new BackgroundService();
    svc.documentSyncEnabled = true;
    svc.memoryExtractionEnabled = false;

    const jobs = svc.jobs();
    const jobNames = jobs.map((j) => j.name);

    expect(jobNames).toContain("sync-watched-documents");
    expect(jobs).toHaveLength(4);
  });

  it("includes all jobs when both features are enabled", () => {
    const svc = new BackgroundService();
    svc.documentSyncEnabled = true;
    svc.memoryExtractionEnabled = true;

    const jobs = svc.jobs();
    expect(jobs).toHaveLength(5);
  });

  it("each job has name, timeout, and interval properties", () => {
    const svc = new BackgroundService();
    const jobs = svc.jobs();
    for (const job of jobs) {
      expect(job).toHaveProperty("name");
      expect(job).toHaveProperty("timeout");
      expect(job).toHaveProperty("interval");
    }
  });
});

describe("BackgroundService — jobsRoot getter", () => {
  it("returns a path ending in /jobs", () => {
    const svc = new BackgroundService();
    const root = svc.jobsRoot;
    expect(root).toContain("jobs");
    expect(typeof root).toBe("string");
  });
});

describe("BackgroundService — onError", () => {
  it("logs error with service and origin metadata", () => {
    const svc = new BackgroundService();
    svc.logger = { error: jest.fn() };
    const err = new Error("worker crashed");
    err.name = "WorkerError";

    svc.onError(err, { name: "test-worker" });

    expect(svc.logger.error).toHaveBeenCalledWith(
      "worker crashed",
      expect.objectContaining({
        service: "bg-worker",
        origin: "WorkerError",
      }),
    );
  });
});

describe("BackgroundService — onWorkerMessageHandler", () => {
  it("logs non-silent worker messages", () => {
    const svc = new BackgroundService();
    svc.logger = { info: jest.fn() };
    const message = { message: "job completed", name: "cleanup-job" };

    svc.onWorkerMessageHandler(message, {});

    expect(svc.logger.info).toHaveBeenCalledWith(
      "job completed",
      expect.objectContaining({ service: "bg-worker", origin: "cleanup-job" }),
    );
  });

  it("suppresses silent worker messages", () => {
    const svc = new BackgroundService();
    svc.logger = { info: jest.fn() };
    const message = { silent: true, message: "heartbeat", name: "cleanup-job" };

    svc.onWorkerMessageHandler(message, {});

    expect(svc.logger.info).not.toHaveBeenCalled();
  });

  it("suppresses messages with nested silent flag", () => {
    const svc = new BackgroundService();
    svc.logger = { info: jest.fn() };
    const message = { message: { silent: true, content: "heartbeat" }, name: "x" };

    svc.onWorkerMessageHandler(message, {});

    expect(svc.logger.info).not.toHaveBeenCalled();
  });
});

describe("BackgroundService — spawnWorker", () => {
  it("throws if bree has not been booted", async () => {
    const svc = new BackgroundService();
    svc.bree = null;

    await expect(svc.spawnWorker("/path/to/script.js")).rejects.toThrow(
      "has not been booted",
    );
  });

  it("adds job to bree, runs it, and returns worker + jobId", async () => {
    const svc = new BackgroundService();
    const mockWorker = { pid: 12345, kill: jest.fn(), send: jest.fn(), on: jest.fn() };
    const workersMap = new Map();
    svc.bree = {
      add: jest.fn().mockImplementation(async (job) => {
        workersMap.set(job.name, mockWorker);
      }),
      run: jest.fn().mockResolvedValue(undefined),
      workers: workersMap,
    };

    const result = await svc.spawnWorker("/path/to/script.js");

    expect(result.worker).toBe(mockWorker);
    expect(result.jobId).toMatch(/^script-\d+$/);
    expect(svc.bree.add).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/path/to/script.js" }),
    );
  });

  it("throws when worker reference cannot be obtained from bree", async () => {
    const svc = new BackgroundService();
    svc.bree = {
      add: jest.fn().mockResolvedValue(undefined),
      run: jest.fn().mockResolvedValue(undefined),
      workers: new Map(), // empty — no worker will be found
    };

    await expect(svc.spawnWorker("/path/to/script.js")).rejects.toThrow(
      "Failed to get worker reference",
    );
  });
});

describe("BackgroundService — removeJob", () => {
  it("does nothing when jobId is falsy", async () => {
    const svc = new BackgroundService();
    svc.bree = { remove: jest.fn() };

    await svc.removeJob(null);
    await svc.removeJob("");
    await svc.removeJob(undefined);

    expect(svc.bree.remove).not.toHaveBeenCalled();
  });

  it("calls bree.remove with the jobId", async () => {
    const svc = new BackgroundService();
    svc.bree = { remove: jest.fn().mockResolvedValue(undefined) };

    await svc.removeJob("my-job-123");

    expect(svc.bree.remove).toHaveBeenCalledWith("my-job-123");
  });

  it("does not throw when bree.remove fails (job already gone)", async () => {
    const svc = new BackgroundService();
    svc.bree = { remove: jest.fn().mockRejectedValue(new Error("not found")) };

    await expect(svc.removeJob("gone-job")).resolves.not.toThrow();
  });

  it("handles bree being null", async () => {
    const svc = new BackgroundService();
    svc.bree = null;

    await expect(svc.removeJob("some-job")).resolves.not.toThrow();
  });
});

describe("BackgroundService — addScheduledJob", () => {
  it("registers a cron timer for the job", () => {
    const later = require("@breejs/later");
    const svc = new BackgroundService();
    const job = { id: 1, name: "test-job", schedule: "0 * * * *" };

    svc.addScheduledJob(job);

    expect(later.parse.cron).toHaveBeenCalledWith("0 * * * *");
    expect(later.setInterval).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Object),
    );
  });

  it("logs error and does not throw when cron parse fails", () => {
    const later = require("@breejs/later");
    later.parse.cron.mockImplementation(() => {
      throw new Error("invalid cron");
    });
    const svc = new BackgroundService();
    const job = { id: 2, name: "bad-job", schedule: "invalid" };

    expect(() => svc.addScheduledJob(job)).not.toThrow();
  });
});

describe("BackgroundService — removeScheduledJob", () => {
  it("clears existing timer and removes it", () => {
    const later = require("@breejs/later");
    const mockTimer = { clear: jest.fn() };
    later.setInterval.mockReturnValue(mockTimer);
    later.parse.cron.mockReturnValue({});
    const svc = new BackgroundService();
    const job = { id: 5, name: "j", schedule: "0 * * * *" };

    svc.addScheduledJob(job);
    svc.removeScheduledJob(5);

    expect(mockTimer.clear).toHaveBeenCalled();
  });

  it("does not throw when timer does not exist", () => {
    const svc = new BackgroundService();
    expect(() => svc.removeScheduledJob(999)).not.toThrow();
  });
});

describe("BackgroundService — killRun", () => {
  it("returns false when no workers exist for the job", () => {
    const svc = new BackgroundService();
    expect(svc.killRun(999, 1)).toBe(false);
  });
});

describe("BackgroundService — syncMemoryJob", () => {
  it("does nothing when bree is not initialized", async () => {
    const svc = new BackgroundService();
    svc.bree = null;

    await expect(svc.syncMemoryJob(true)).resolves.not.toThrow();
  });

  it("adds and starts memory job when enabled and not currently running", async () => {
    const svc = new BackgroundService();
    svc.bree = {
      config: { jobs: [] },
      add: jest.fn().mockResolvedValue(undefined),
      start: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
      remove: jest.fn().mockResolvedValue(undefined),
    };

    await svc.syncMemoryJob(true);

    expect(svc.bree.add).toHaveBeenCalled();
    expect(svc.bree.start).toHaveBeenCalledWith("extract-memories");
    expect(svc.memoryExtractionEnabled).toBe(true);
  });

  it("stops and removes memory job when disabled and currently running", async () => {
    const svc = new BackgroundService();
    svc.bree = {
      config: { jobs: [{ name: "extract-memories" }] },
      add: jest.fn(),
      start: jest.fn(),
      stop: jest.fn().mockResolvedValue(undefined),
      remove: jest.fn().mockResolvedValue(undefined),
    };

    await svc.syncMemoryJob(false);

    expect(svc.bree.stop).toHaveBeenCalledWith("extract-memories");
    expect(svc.bree.remove).toHaveBeenCalledWith("extract-memories");
    expect(svc.memoryExtractionEnabled).toBe(false);
  });

  it("does nothing when enabled and already running", async () => {
    const svc = new BackgroundService();
    svc.bree = {
      config: { jobs: [{ name: "extract-memories" }] },
      add: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      remove: jest.fn(),
    };

    await svc.syncMemoryJob(true);

    expect(svc.bree.add).not.toHaveBeenCalled();
    expect(svc.bree.start).not.toHaveBeenCalled();
  });

  it("does nothing when disabled and not running", async () => {
    const svc = new BackgroundService();
    svc.bree = {
      config: { jobs: [] },
      add: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      remove: jest.fn(),
    };

    await svc.syncMemoryJob(false);

    expect(svc.bree.stop).not.toHaveBeenCalled();
    expect(svc.bree.remove).not.toHaveBeenCalled();
  });
});

describe("BackgroundService — stop", () => {
  it("cleans up and nullifies bree and graceful", async () => {
    const svc = new BackgroundService();
    svc.bree = mockBreeInstance;
    svc.graceful = { stopBree: jest.fn() };

    await svc.stop();

    expect(svc.bree).toBeNull();
    expect(svc.graceful).toBeNull();
  });

  it("does not throw when bree or graceful is null", async () => {
    const svc = new BackgroundService();
    svc.bree = null;
    svc.graceful = null;

    await expect(svc.stop()).resolves.not.toThrow();
  });
});

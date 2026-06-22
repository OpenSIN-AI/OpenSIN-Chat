// SPDX-License-Identifier: MIT
jest.mock("@ladjs/graceful", () => {
  return class FakeGraceful {
    constructor() {}
    listen() {}
    stopBree() {}
  };
});
jest.mock("@mintplex-labs/bree", () => {
  return class FakeBree {
    constructor(config) {
      this.config = config;
      this.workers = new Map();
      this.started = false;
    }
    start() { this.started = true; }
    stop() { this.started = false; }
    async add(job) { this.config.jobs.push(job); }
    async run(name) {
      this.workers.set(name, {
        pid: 12345,
        send: jest.fn(),
        once: jest.fn((event, cb) => {
          if (event === "exit") this._exitCbs = this._exitCbs || [];
          this._exitCbs.push(cb);
        }),
        kill: jest.fn(),
      });
    }
    async remove(name) {
      this.workers.delete(name);
      this.config.jobs = this.config.jobs.filter((j) => j.name !== name);
    }
  };
});
jest.mock("@breejs/later", () => ({
  date: { UTC: jest.fn() },
  parse: { cron: jest.fn(() => ({})) },
  setInterval: jest.fn((cb) => ({
    clear: jest.fn(),
  })),
}));
jest.mock("p-queue", () => {
  return { default: class FakePQueue {
    constructor() { this.concurrency = 1; this.tasks = []; }
    add(fn) { this.tasks.push(fn); return Promise.resolve(); }
    clear() { this.tasks = []; }
  }};
});
jest.mock("../../../utils/logger", () => () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  log: jest.fn(),
}));

jest.mock("../../../models/documentSyncQueue", () => ({
  DocumentSyncQueue: { enabled: jest.fn().mockResolvedValue(false) },
}));
jest.mock("../../../models/systemSettings", () => ({
  SystemSettings: { autoMemoriesEnabled: jest.fn().mockResolvedValue(false) },
}));
jest.mock("../../../models/scheduledJobRun", () => ({
  ScheduledJobRun: {
    failOrphanedRuns: jest.fn().mockResolvedValue(0),
    start: jest.fn().mockResolvedValue({ id: 1 }),
    failIfNotTerminal: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock("../../../models/scheduledJob", () => ({
  ScheduledJob: {
    allEnabled: jest.fn().mockResolvedValue([]),
    get: jest.fn().mockResolvedValue(null),
    recomputeNextRunAt: jest.fn().mockResolvedValue(undefined),
  },
}));

describe("BackgroundService", () => {
  let BackgroundService;

  beforeEach(() => {
    jest.resetModules();
    BackgroundService = require("../../../utils/BackgroundWorkers").BackgroundService;
    BackgroundService._instance = null;
  });

  afterEach(() => {
    BackgroundService._instance = null;
    jest.clearAllMocks();
  });

  describe("Singleton", () => {
    test("gibt dieselbe Instanz zurück bei wiederholter Konstruktion", () => {
      const a = new BackgroundService();
      const b = new BackgroundService();
      expect(a).toBe(b);
    });

    test("setzt _instance beim ersten Konstruieren", () => {
      const svc = new BackgroundService();
      expect(BackgroundService._instance).toBe(svc);
    });
  });

  describe("jobs()", () => {
    test("returns only always-run jobs when features disabled", () => {
      const svc = new BackgroundService();
      svc.documentSyncEnabled = false;
      svc.memoryExtractionEnabled = false;
      const jobs = svc.jobs();
      expect(jobs).toHaveLength(3);
      expect(jobs.map((j) => j.name)).toEqual(
        expect.arrayContaining([
          "cleanup-orphan-documents",
          "cleanup-generated-files",
          "sync-politician-data",
        ]),
      );
    });

    test("includes memory jobs when memoryExtractionEnabled", () => {
      const svc = new BackgroundService();
      svc.documentSyncEnabled = false;
      svc.memoryExtractionEnabled = true;
      const jobs = svc.jobs();
      expect(jobs).toHaveLength(4);
      expect(jobs.some((j) => j.name === "extract-memories")).toBe(true);
    });

    test("includes document sync jobs when documentSyncEnabled", () => {
      const svc = new BackgroundService();
      svc.documentSyncEnabled = true;
      svc.memoryExtractionEnabled = false;
      const jobs = svc.jobs();
      expect(jobs).toHaveLength(4);
      expect(jobs.some((j) => j.name === "sync-watched-documents")).toBe(true);
    });

    test("includes all jobs when both features enabled", () => {
      const svc = new BackgroundService();
      svc.documentSyncEnabled = true;
      svc.memoryExtractionEnabled = true;
      const jobs = svc.jobs();
      expect(jobs).toHaveLength(5);
    });
  });

  describe("get jobsRoot", () => {
    test("gibt einen absoluten Pfad zurück", () => {
      const svc = new BackgroundService();
      const root = svc.jobsRoot;
      expect(typeof root).toBe("string");
      expect(root.length).toBeGreaterThan(0);
    });
  });

  describe("onError()", () => {
    test("loggt den Fehler über den Logger", () => {
      const svc = new BackgroundService();
      svc.logger = { error: jest.fn() };
      const err = new Error("Test crash");
      err.name = "WorkerError";
      svc.onError(err, {});
      expect(svc.logger.error).toHaveBeenCalledWith("Test crash", {
        service: "bg-worker",
        origin: "WorkerError",
      });
    });
  });

  describe("onWorkerMessageHandler()", () => {
    test("ignoriert stille Nachrichten (silent: true)", () => {
      const svc = new BackgroundService();
      svc.logger = { info: jest.fn() };
      svc.onWorkerMessageHandler({ silent: true, message: "quiet" }, {});
      expect(svc.logger.info).not.toHaveBeenCalled();
    });

    test("ignoriert Nachrichten mit message.silent: true", () => {
      const svc = new BackgroundService();
      svc.logger = { info: jest.fn() };
      svc.onWorkerMessageHandler(
        { message: { silent: true, text: "quiet" } },
        {},
      );
      expect(svc.logger.info).not.toHaveBeenCalled();
    });

    test("loggt nicht-stille Nachrichten", () => {
      const svc = new BackgroundService();
      svc.logger = { info: jest.fn() };
      svc.onWorkerMessageHandler(
        { message: "Worker finished task" },
        { name: "sync-job" },
      );
      expect(svc.logger.info).toHaveBeenCalledWith("Worker finished task", {
        service: "bg-worker",
        origin: undefined,
      });
    });
  });

  describe("addScheduledJob()", () => {
    test("registriert einen Cron-Timer für einen geplanten Job", () => {
      const later = require("@breejs/later");
      const svc = new BackgroundService();
      const job = { id: 5, schedule: "0 * * * *" };
      svc.addScheduledJob(job);
      expect(later.parse.cron).toHaveBeenCalledWith("0 * * * *");
      expect(later.setInterval).toHaveBeenCalledTimes(1);
    });
  });

  describe("removeScheduledJob()", () => {
    test("löscht den Timer ohne Fehler für unbekannte jobId", () => {
      const svc = new BackgroundService();
      expect(() => svc.removeScheduledJob(999)).not.toThrow();
    });
  });

  describe("killRun()", () => {
    test("gibt false zurück wenn kein Worker für jobId existiert", () => {
      const svc = new BackgroundService();
      expect(svc.killRun(999, 1)).toBe(false);
    });
  });

  describe("syncMemoryJob()", () => {
    test("tut nichts wenn bree nicht initialisiert", async () => {
      const svc = new BackgroundService();
      await expect(svc.syncMemoryJob(true)).resolves.toBeUndefined();
    });
  });

  describe("spawnWorker()", () => {
    test("wirft Fehler wenn bree nicht initialisiert", async () => {
      const svc = new BackgroundService();
      await expect(svc.spawnWorker("/some/path.js")).rejects.toThrow(
        "not been booted",
      );
    });
  });

  describe("removeJob()", () => {
    test("tut nichts bei leerer jobId", async () => {
      const svc = new BackgroundService();
      await expect(svc.removeJob(null)).resolves.toBeUndefined();
      await expect(svc.removeJob("")).resolves.toBeUndefined();
    });

    test("fängt Fehler ab wenn bree null ist", async () => {
      const svc = new BackgroundService();
      await expect(svc.removeJob("some-id")).resolves.toBeUndefined();
    });
  });

  describe("enqueueScheduledJob()", () => {
    test("gibt null zurück wenn ScheduledJobRun.start null liefert (bereits laufend)", async () => {
      const { ScheduledJobRun } = require("../../../models/scheduledJobRun");
      ScheduledJobRun.start.mockResolvedValueOnce(null);
      const svc = new BackgroundService();
      const result = await svc.enqueueScheduledJob(42);
      expect(result).toBeNull();
    });

    test("gibt den Run zurück und reiht ihn in die Queue ein", async () => {
      const { ScheduledJobRun } = require("../../../models/scheduledJobRun");
      const fakeRun = { id: 99 };
      ScheduledJobRun.start.mockResolvedValueOnce(fakeRun);
      const svc = new BackgroundService();
      svc.spawnWorker = jest.fn().mockResolvedValue({
        worker: { send: jest.fn(), once: jest.fn(), kill: jest.fn() },
        jobId: "w-1",
      });
      svc.removeJob = jest.fn().mockResolvedValue(undefined);
      const result = await svc.enqueueScheduledJob(42);
      expect(result).toEqual(fakeRun);
    });
  });

  describe("syncScheduledJob()", () => {
    test("entfernt Timer und fügt keinen neuen hinzu wenn Job deaktiviert", async () => {
      const { ScheduledJob } = require("../../../models/scheduledJob");
      ScheduledJob.get.mockResolvedValueOnce({ id: 1, enabled: false });
      const svc = new BackgroundService();
      svc.removeScheduledJob = jest.fn();
      svc.addScheduledJob = jest.fn();
      await svc.syncScheduledJob(1);
      expect(svc.removeScheduledJob).toHaveBeenCalledWith(1);
      expect(svc.addScheduledJob).not.toHaveBeenCalled();
    });

    test("entfernt und fügt Timer neu hinzu wenn Job aktiviert", async () => {
      const { ScheduledJob } = require("../../../models/scheduledJob");
      ScheduledJob.get.mockResolvedValueOnce({
        id: 1,
        enabled: true,
        schedule: "0 0 * * *",
      });
      const svc = new BackgroundService();
      svc.removeScheduledJob = jest.fn();
      svc.addScheduledJob = jest.fn();
      await svc.syncScheduledJob(1);
      expect(svc.removeScheduledJob).toHaveBeenCalledWith(1);
      expect(svc.addScheduledJob).toHaveBeenCalledWith({
        id: 1,
        enabled: true,
        schedule: "0 0 * * *",
      });
    });
  });

  describe("stop()", () => {
    test("bereinigt Timers und setzt bree/graceful auf null", async () => {
      const svc = new BackgroundService();
      svc.bree = { start: jest.fn() };
      svc.graceful = { stopBree: jest.fn() };
      await svc.stop();
      expect(svc.bree).toBeNull();
      expect(svc.graceful).toBeNull();
    });
  });
});

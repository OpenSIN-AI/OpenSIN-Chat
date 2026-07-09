// SPDX-License-Identifier: MIT
// Purpose: Unit tests for BackgroundWorkers and collectorApi (#388)
// Docs: tests/backgroundWorkersCollector.test.js

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock Bree and related deps
vi.mock("@mintplex-labs/bree", () => {
  return vi.fn().mockImplementation(() => ({
    start: vi.fn(() => Promise.resolve()),
    stop: vi.fn(() => Promise.resolve()),
    add: vi.fn(() => Promise.resolve()),
    remove: vi.fn(() => Promise.resolve()),
    run: vi.fn(() => Promise.resolve()),
    workers: new Map(),
    config: { jobs: [] },
  }));
});

vi.mock("@ladjs/graceful", () => {
  return vi.fn().mockImplementation(() => ({
    listen: vi.fn(),
    stopBree: vi.fn(),
    stop: vi.fn(),
  }));
});

vi.mock("@breejs/later", () => ({
  default: {
    date: { UTC: vi.fn() },
    parse: { text: vi.fn(() => ({ schedules: [] })) },
  },
}));

vi.mock("p-queue", () => ({
  default: vi.fn().mockImplementation(() => ({
    add: vi.fn((fn) => fn()),
    clear: vi.fn(),
    size: 0,
  })),
}));

vi.mock("../server/utils/logger", () => ({
  default: vi.fn(() => ({
    log: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  })),
}));

vi.mock("../server/utils/logger/console.js", () => ({
  default: {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("../server/models/documentSyncQueue", () => ({
  DocumentSyncQueue: {
    enabled: vi.fn(() => Promise.resolve(false)),
  },
}));

vi.mock("../server/models/systemSettings", () => ({
  SystemSettings: {
    autoMemoriesEnabled: vi.fn(() => Promise.resolve(false)),
  },
}));

vi.mock("../server/models/scheduledJobRun", () => ({
  ScheduledJobRun: {
    failOrphanedRuns: vi.fn(() => Promise.resolve(0)),
    cleanupOldRuns: vi.fn(() => Promise.resolve(0)),
  },
}));

// Mock collectorApi dependencies
vi.mock("../server/utils/EncryptionManager", () => ({
  EncryptionManager: vi.fn().mockImplementation(() => ({
    xPayload: "encrypted-payload",
  })),
}));

vi.mock("../server/utils/comKey", () => ({
  CommunicationKey: vi.fn().mockImplementation(() => ({
    sign: vi.fn(() => "signed-signature"),
    encrypt: vi.fn(() => "encrypted-signer"),
  })),
}));

vi.mock("undici", () => ({
  Agent: vi.fn().mockImplementation(() => ({})),
}));

vi.mock("../server/utils/logger/console.js", () => ({
  default: { log: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

// ---------------------------------------------------------------------------
// BackgroundService
// ---------------------------------------------------------------------------

import { BackgroundService } from "../server/utils/BackgroundWorkers";

describe("BackgroundService", () => {
  let service;

  beforeEach(() => {
    vi.clearAllMocks();
    BackgroundService._instance = null;
    service = new BackgroundService();
  });

  afterEach(() => {
    BackgroundService._instance = null;
  });

  describe("singleton pattern", () => {
    it("should return the same instance on subsequent construction", () => {
      const a = new BackgroundService();
      const b = new BackgroundService();
      expect(a).toBe(b);
    });
  });

  describe("jobs", () => {
    it("should return always-run jobs when no optional features are enabled", () => {
      service.documentSyncEnabled = false;
      service.memoryExtractionEnabled = false;
      const jobs = service.jobs();
      const names = jobs.map((j) => j.name);
      expect(names).toContain("cleanup-orphan-documents");
      expect(names).toContain("cleanup-generated-files");
      expect(names).toContain("sync-politician-data");
      expect(names).not.toContain("extract-memories");
      expect(names).not.toContain("sync-watched-documents");
    });

    it("should include memory jobs when memoryExtractionEnabled is true", () => {
      service.memoryExtractionEnabled = true;
      service.documentSyncEnabled = false;
      const jobs = service.jobs();
      const names = jobs.map((j) => j.name);
      expect(names).toContain("extract-memories");
    });

    it("should include document sync jobs when documentSyncEnabled is true", () => {
      service.documentSyncEnabled = true;
      service.memoryExtractionEnabled = false;
      const jobs = service.jobs();
      const names = jobs.map((j) => j.name);
      expect(names).toContain("sync-watched-documents");
    });

    it("should include all jobs when both features are enabled", () => {
      service.documentSyncEnabled = true;
      service.memoryExtractionEnabled = true;
      const jobs = service.jobs();
      expect(jobs.length).toBe(5);
    });
  });

  describe("jobsRoot", () => {
    it("should return a path ending with /jobs", () => {
      const root = service.jobsRoot;
      expect(typeof root).toBe("string");
      expect(root).toMatch(/jobs$/);
    });
  });

  describe("onError", () => {
    it("should log error without throwing", () => {
      const error = new Error("worker crashed");
      expect(() => service.onError(error, { name: "test-worker" })).not.toThrow();
    });
  });

  describe("onWorkerMessageHandler", () => {
    it("should not throw for silent messages", () => {
      const message = { silent: true };
      expect(() =>
        service.onWorkerMessageHandler(message, { name: "test" }),
      ).not.toThrow();
    });

    it("should not throw for regular messages", () => {
      const message = { message: "job completed" };
      expect(() =>
        service.onWorkerMessageHandler(message, { name: "test" }),
      ).not.toThrow();
    });
  });

  describe("syncMemoryJob", () => {
    it("should not throw when bree is not initialized", async () => {
      service.bree = null;
      await expect(service.syncMemoryJob(true)).resolves.toBeUndefined();
    });
  });

  describe("removeJob", () => {
    it("should not throw when jobId is falsy", async () => {
      await expect(service.removeJob(null)).resolves.toBeUndefined();
      await expect(service.removeJob("")).resolves.toBeUndefined();
    });

    it("should not throw when bree is null", async () => {
      service.bree = null;
      await expect(service.removeJob("some-job")).resolves.toBeUndefined();
    });
  });

  describe("spawnWorker", () => {
    it("should throw when bree has not been booted", async () => {
      service.bree = null;
      await expect(service.spawnWorker("/path/to/script.js")).rejects.toThrow(
        "not been booted",
      );
    });
  });

  describe("stop", () => {
    it("should not throw when called without boot", async () => {
      service.bree = null;
      service.graceful = null;
      await expect(service.stop()).resolves.toBeUndefined();
    });
  });
});

// ---------------------------------------------------------------------------
// CollectorApi
// ---------------------------------------------------------------------------

import { CollectorApi } from "../server/utils/collectorApi";

describe("CollectorApi", () => {
  let collector;
  let originalFetch;

  beforeEach(() => {
    vi.clearAllMocks();
    originalFetch = global.fetch;
    collector = new CollectorApi();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("getCollectorPort", () => {
    it("should return default port 8888 when COLLECTOR_PORT is not set", () => {
      delete process.env.COLLECTOR_PORT;
      expect(CollectorApi.getCollectorPort()).toBe(8888);
    });

    it("should return custom port when COLLECTOR_PORT is valid", () => {
      process.env.COLLECTOR_PORT = "9999";
      expect(CollectorApi.getCollectorPort()).toBe(9999);
      delete process.env.COLLECTOR_PORT;
    });

    it("should fall back to default when COLLECTOR_PORT is invalid", () => {
      process.env.COLLECTOR_PORT = "not-a-port";
      expect(CollectorApi.getCollectorPort()).toBe(8888);
      delete process.env.COLLECTOR_PORT;
    });

    it("should fall back to default when COLLECTOR_PORT is 0", () => {
      process.env.COLLECTOR_PORT = "0";
      expect(CollectorApi.getCollectorPort()).toBe(8888);
      delete process.env.COLLECTOR_PORT;
    });

    it("should fall back to default when COLLECTOR_PORT exceeds 65535", () => {
      process.env.COLLECTOR_PORT = "70000";
      expect(CollectorApi.getCollectorPort()).toBe(8888);
      delete process.env.COLLECTOR_PORT;
    });
  });

  describe("constructor", () => {
    it("should set endpoint to http://0.0.0.0:{port}", () => {
      process.env.COLLECTOR_PORT = "7777";
      const c = new CollectorApi();
      expect(c.endpoint).toBe("http://0.0.0.0:7777");
      delete process.env.COLLECTOR_PORT;
    });

    it("should create a CommunicationKey instance", () => {
      expect(collector.comkey).toBeDefined();
      expect(typeof collector.comkey.sign).toBe("function");
    });
  });

  describe("online", () => {
    it("should return true when collector responds ok", async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({ ok: true }),
      );
      const result = await collector.online();
      expect(result).toBe(true);
    });

    it("should return false when fetch throws (collector unreachable)", async () => {
      global.fetch = vi.fn(() => Promise.reject(new Error("ECONNREFUSED")));
      const result = await collector.online();
      expect(result).toBe(false);
    });

    it("should return false when response is not ok", async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({ ok: false }),
      );
      const result = await collector.online();
      expect(result).toBe(false);
    });
  });

  describe("acceptedFileTypes", () => {
    it("should return parsed JSON when response is ok", async () => {
      const types = { files: [".pdf", ".txt"] };
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(types),
        }),
      );
      const result = await collector.acceptedFileTypes();
      expect(result).toEqual(types);
    });

    it("should return null when fetch throws", async () => {
      global.fetch = vi.fn(() => Promise.reject(new Error("timeout")));
      const result = await collector.acceptedFileTypes();
      expect(result).toBeNull();
    });

    it("should return null when response is not ok", async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({ ok: false, json: () => Promise.resolve({}) }),
      );
      const result = await collector.acceptedFileTypes();
      expect(result).toBeNull();
    });
  });

  describe("processDocument", () => {
    it("should return false when filename is empty", async () => {
      const result = await collector.processDocument("");
      expect(result).toBe(false);
    });

    it("should return parsed response on success", async () => {
      const mockResponse = { success: true, documents: [{ id: 1 }] };
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        }),
      );
      const result = await collector.processDocument("test.pdf");
      expect(result).toEqual(mockResponse);
    });

    it("should return error object when fetch fails", async () => {
      global.fetch = vi.fn(() => Promise.reject(new Error("network error")));
      const result = await collector.processDocument("test.pdf");
      expect(result.success).toBe(false);
      expect(result.reason).toBe("network error");
      expect(result.documents).toEqual([]);
    });

    it("should return error object when response is not ok", async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({ ok: false, json: () => Promise.resolve({}) }),
      );
      const result = await collector.processDocument("test.pdf");
      expect(result.success).toBe(false);
    });
  });

  describe("processLink", () => {
    it("should return false when link is empty", async () => {
      const result = await collector.processLink("");
      expect(result).toBe(false);
    });

    it("should return parsed response on success", async () => {
      const mockResponse = { success: true, documents: [] };
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        }),
      );
      const result = await collector.processLink("https://example.com");
      expect(result).toEqual(mockResponse);
    });

    it("should return error object when fetch fails", async () => {
      global.fetch = vi.fn(() => Promise.reject(new Error("timeout")));
      const result = await collector.processLink("https://example.com");
      expect(result.success).toBe(false);
      expect(result.reason).toBe("timeout");
    });
  });

  describe("processRawText", () => {
    it("should return parsed response on success", async () => {
      const mockResponse = { success: true, documents: [{ id: 1 }] };
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        }),
      );
      const result = await collector.processRawText("Hello world");
      expect(result).toEqual(mockResponse);
    });

    it("should return error object when fetch fails", async () => {
      global.fetch = vi.fn(() => Promise.reject(new Error("ECONNREFUSED")));
      const result = await collector.processRawText("Hello world");
      expect(result.success).toBe(false);
      expect(result.reason).toBe("ECONNREFUSED");
    });
  });

  describe("convertAudioToWav", () => {
    it("should return failure when filename is empty", async () => {
      const result = await collector.convertAudioToWav("");
      expect(result.success).toBe(false);
      expect(result.wavFilename).toBeNull();
    });
  });

  describe("parseDocument", () => {
    it("should return false when filename is empty", async () => {
      const result = await collector.parseDocument("");
      expect(result).toBe(false);
    });

    it("should return parsed response on success", async () => {
      const mockResponse = { success: true, documents: [] };
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        }),
      );
      const result = await collector.parseDocument("doc.pdf");
      expect(result).toEqual(mockResponse);
    });

    it("should return error object when fetch fails", async () => {
      global.fetch = vi.fn(() => Promise.reject(new Error("connection refused")));
      const result = await collector.parseDocument("doc.pdf");
      expect(result.success).toBe(false);
      expect(result.reason).toBe("connection refused");
    });
  });
});

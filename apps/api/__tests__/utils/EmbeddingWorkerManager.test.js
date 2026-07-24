// SPDX-License-Identifier: MIT
const path = require("path");

jest.mock("../../utils/BackgroundWorkers", () => {
  return {
    BackgroundService: class {
      constructor() {
        this.jobsRoot = "/tmp";
      }
      async spawnWorker() {
        return {
          worker: {
            terminate: jest.fn(),
            send: jest.fn(),
            on: jest.fn(),
          },
          jobId: `job-${Math.random()}`,
        };
      }
    },
  };
});

jest.mock("../../models/eventLogs", () => ({
  EventLogs: { logEvent: jest.fn().mockResolvedValue(undefined) },
}));

const manager = require("../../utils/EmbeddingWorkerManager");
const { __internals } = manager;

beforeEach(() => {
  __internals.runningWorkers.clear();
  __internals.sseConnections.clear();
  __internals.eventHistory.clear();
  jest.clearAllMocks();
});

describe("EmbeddingWorkerManager — bounded Map growth (M1)", () => {
  it("caps runningWorkers at MAX_WORKERS=256 and evicts insertion-order LRU", async () => {
    const total = __internals.MAX_WORKERS + 1;

    for (let i = 0; i < total; i++) {
      await manager.embedFiles(`slug-${i}`, [`f-${i}.txt`], i + 1, null);
    }

    expect(__internals.runningWorkers.size).toBe(__internals.MAX_WORKERS);
    expect(__internals.runningWorkers.has("slug-0")).toBe(false);
    expect(__internals.runningWorkers.has(`slug-${total - 1}`)).toBe(true);
    expect(__internals.sseConnections.has("slug-0")).toBe(false);
    expect(__internals.eventHistory.has("slug-0")).toBe(false);
  });

  it("touches slug on access so eviction targets the actual oldest entry", async () => {
    const MAX = __internals.MAX_WORKERS;
    for (let i = 0; i < MAX; i++) {
      await manager.embedFiles(`slug-${i}`, [`f-${i}.txt`], i + 1, null);
    }

    manager.removeQueuedFile("slug-0", "f-0.txt");

    await manager.embedFiles(`slug-${MAX}`, [`f-${MAX}.txt`], MAX + 1, null);

    expect(__internals.runningWorkers.has("slug-0")).toBe(true);
    expect(__internals.runningWorkers.has("slug-1")).toBe(false);
    expect(__internals.runningWorkers.size).toBe(MAX);
  });

  it("exposes MAX_WORKERS = 256 as the documented cap", () => {
    expect(__internals.MAX_WORKERS).toBe(256);
  });
});

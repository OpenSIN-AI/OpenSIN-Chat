// SPDX-License-Identifier: MIT
jest.mock("../../../utils/prisma", () => ({
  job_queue: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
    groupBy: jest.fn(),
  },
}));

const queue = require("../../../utils/backgroundJobs/queue");
const prisma = require("../../../utils/prisma");

describe("PersistentBackgroundQueue", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queue.pollTimer = null;
    queue.isPolling = false;
    queue.pollCount = 0;
  });

  afterAll(() => {
    queue.stop();
  });

  describe("constructor", () => {
    test("initializes with default state", () => {
      expect(queue.isPolling).toBe(false);
      expect(queue.pollTimer).toBeNull();
      expect(queue.pollCount).toBe(0);
    });
  });

  describe("add", () => {
    test("creates a job in the queue", async () => {
      prisma.job_queue.create.mockResolvedValue({ id: 1, job_name: "TEST", payload: "{}", status: "pending" });
      await queue.add("TEST_JOB", { foo: "bar" });
      expect(prisma.job_queue.create).toHaveBeenCalledWith({
        data: {
          job_name: "TEST_JOB",
          payload: JSON.stringify({ foo: "bar" }),
          status: "pending",
        },
      });
    });

    test("starts polling after add", async () => {
      prisma.job_queue.create.mockResolvedValue({ id: 1, job_name: "TEST", payload: "{}", status: "pending" });
      prisma.job_queue.findMany.mockResolvedValue([]);
      prisma.job_queue.updateMany.mockResolvedValue({ count: 0 });
      prisma.job_queue.deleteMany.mockResolvedValue({ count: 0 });
      await queue.add("TEST_JOB", { foo: "bar" });
      expect(queue.isPolling).toBe(true);
      queue.stop();
    });

    test("handles errors gracefully", async () => {
      prisma.job_queue.create.mockRejectedValue(new Error("DB error"));
      // Should not throw
      await expect(queue.add("TEST_JOB", {})).resolves.not.toThrow();
    });
  });

  describe("stop", () => {
    test("clears poll timer and sets isPolling to false", () => {
      queue.isPolling = true;
      queue.pollTimer = setTimeout(() => {}, 1000);
      queue.stop();
      expect(queue.pollTimer).toBeNull();
      expect(queue.isPolling).toBe(false);
    });
  });

  describe("stats", () => {
    test("returns grouped job counts", async () => {
      prisma.job_queue.groupBy.mockResolvedValue([
        { status: "pending", _count: { _all: 5 } },
        { status: "completed", _count: { _all: 10 } },
      ]);
      const result = await queue.stats();
      expect(result).toEqual({ pending: 5, completed: 10 });
    });

    test("returns null on error", async () => {
      prisma.job_queue.groupBy.mockRejectedValue(new Error("DB error"));
      const result = await queue.stats();
      expect(result).toBeNull();
    });
  });

  describe("_executeJob", () => {
    test("throws for unknown job type", async () => {
      await expect(queue._executeJob({ id: 1, job_name: "UNKNOWN" }, {})).rejects.toThrow("Unknown job type: UNKNOWN");
    });
  });

  describe("start", () => {
    test("starts polling and prunes old jobs", async () => {
      prisma.job_queue.deleteMany.mockResolvedValue({ count: 0 });
      prisma.job_queue.findMany.mockResolvedValue([]);
      prisma.job_queue.updateMany.mockResolvedValue({ count: 0 });
      queue.start();
      // Give the async fire-and-forget a chance to complete
      await new Promise((r) => setTimeout(r, 10));
      expect(queue.isPolling).toBe(true);
      queue.stop();
    });
  });
});

// SPDX-License-Identifier: MIT
/**
 * Tests für die persistente SQLite-basierte Background Job Queue.
 *
 * Strategie: prisma wird komplett gemockt mit einer in-memory Map, damit
 * die Tests ohne echte SQLite-DB laufen können. Wir testen die Queue-Logik
 * (Lifecycle, Lock, Retry, Pruning, Recovery), nicht Prisma selbst.
 *
 * Hinweis: `queue.js` exportiert einen Singleton. Wir löschen den Module-Cache
 * vor jedem Test, damit jeder Test eine frische Instanz bekommt — das
 * verhindert State-Leakage zwischen Tests. Die Tests rufen KEINE
 * `start()`-Methoden auf, die `setTimeout` aktivieren würden; sie testen
 * die internen Methoden direkt (`_processNextJob`, `_recoverStaleJobs`,
 * `_pruneOldJobs`, `stats`). Damit läuft der Test-Process sauber aus.
 */

// ---- In-Memory Prisma Mock ----
class FakeJobQueueStore {
  constructor() {
    this.rows = [];
    this.nextId = 1;
    this.calls = [];
  }

  reset() {
    this.rows = [];
    this.nextId = 1;
    this.calls = [];
  }

  _audit(method, args) {
    this.calls.push({ method, args, at: Date.now() });
  }

  create({ data }) {
    this._audit("create", data);
    const row = {
      id: this.nextId++,
      ...data,
      // Prisma defaults — applied by the schema in production
      attempts: data.attempts ?? 0,
      max_attempts: data.max_attempts ?? 3,
      status: data.status ?? "pending",
      created_at: data.created_at || new Date(),
      updated_at: data.updated_at || new Date(),
    };
    this.rows.push(row);
    return Promise.resolve(row);
  }

  findMany({ where, orderBy, take } = {}) {
    this._audit("findMany", { where, orderBy, take });
    let result = [...this.rows];
    if (where) {
      result = result.filter((r) => {
        for (const [k, v] of Object.entries(where)) {
          if (k === "status" && typeof v === "string" && r.status !== v) return false;
          if (k === "status" && v?.in && !v.in.includes(r.status)) return false;
          if (k === "id" && r.id !== v) return false;
          if (k === "locked_at" && v?.lt) {
            if (!(r.locked_at && r.locked_at < v.lt)) return false;
          }
        }
        return true;
      });
    }
    if (orderBy?.created_at === "asc") {
      result.sort((a, b) => a.created_at - b.created_at);
    }
    if (take) result = result.slice(0, take);
    return Promise.resolve(result);
  }

  findFirst({ where } = {}) {
    this._audit("findFirst", where);
    const result = this.rows.find((r) => {
      for (const [k, v] of Object.entries(where || {})) {
        if (r[k] !== v) return false;
      }
      return true;
    });
    return Promise.resolve(result || null);
  }

  findUnique({ where }) {
    this._audit("findUnique", where);
    const row = this.rows.find((r) => r.id === where.id);
    return Promise.resolve(row || null);
  }

  update({ where, data }) {
    this._audit("update", { where, data });
    const row = this.rows.find((r) => r.id === where.id);
    if (!row) return Promise.reject(new Error("Not found"));
    Object.assign(row, data);
    if (data.status !== "processing") row.locked_at = null;
    return Promise.resolve(row);
  }

  updateMany({ where, data }) {
    this._audit("updateMany", { where, data });
    let count = 0;
    for (const r of this.rows) {
      let matches = true;
      for (const [k, v] of Object.entries(where)) {
        if (k === "status" && typeof v === "string" && r.status !== v) {
          matches = false;
          break;
        }
        if (k === "id" && r.id !== v) {
          matches = false;
          break;
        }
        if (k === "locked_at" && v?.lt) {
          if (!(r.locked_at && r.locked_at < v.lt)) {
            matches = false;
            break;
          }
        }
      }
      if (matches) {
        // Handle Prisma's { increment: N } operator
        for (const [k, v] of Object.entries(data)) {
          if (v && typeof v === "object" && "increment" in v) {
            r[k] = (r[k] || 0) + v.increment;
          } else {
            r[k] = v;
          }
        }
        if (data.status !== "processing") r.locked_at = null;
        count++;
      }
    }
    return Promise.resolve({ count });
  }

  deleteMany({ where } = {}) {
    this._audit("deleteMany", where);
    let count = 0;
    this.rows = this.rows.filter((r) => {
      // AND semantics: row matches the where if ALL conditions are true.
      // If matched, it gets DELETED.
      const allMatch = Object.entries(where || {}).every(([k, v]) => {
        if (k === "status" && v?.in) return v.in.includes(r.status);
        if (k === "status" && typeof v === "string") return r.status === v;
        if (k === "updated_at" && v?.lt) return r.updated_at < v.lt;
        if (k === "id") return r.id === v;
        return true;
      });
      if (allMatch) {
        count++;
        return false; // delete
      }
      return true; // keep
    });
    return Promise.resolve({ count });
  }

  groupBy({ by, _count }) {
    this._audit("groupBy", { by });
    const groups = {};
    for (const r of this.rows) {
      const key = by.map((k) => r[k]).join("|");
      groups[key] = (groups[key] || 0) + 1;
    }
    return Promise.resolve(
      Object.entries(groups).map(([k, count]) => ({
        [by[0]]: k,
        _count: { _all: count },
      })),
    );
  }
}

const store = new FakeJobQueueStore();

// Mock that doesn't use jest.mock hoisting — we install it before each test
function installMocks() {
  jest.resetModules();
  store.reset();
  jest.doMock("../../../utils/prisma", () => ({
    job_queue: {
      create: (a) => store.create(a),
      findMany: (a) => store.findMany(a),
      findFirst: (a) => store.findFirst(a),
      findUnique: (a) => store.findUnique(a),
      update: (a) => store.update(a),
      updateMany: (a) => store.updateMany(a),
      deleteMany: (a) => store.deleteMany(a),
      groupBy: (a) => store.groupBy(a),
    },
  }));
  jest.doMock("../../../utils/backgroundJobs/jobs/generateTitle", () =>
    jest.fn(async (payload) => ({ ok: true, payload })),
  );
}

function freshQueue() {
  installMocks();
  return require("../../../utils/backgroundJobs/queue");
}

function enqueueRow(data) {
  return store.create({ data });
}

// ---- Tests ----

describe("PersistentBackgroundQueue", () => {
  beforeEach(() => {
    installMocks();
  });

  describe("add()", () => {
    test("enqueues a pending job with JSON-serialized payload", async () => {
      const queue = freshQueue();
      // Stop the queue immediately so no polling timer keeps the process alive
      queue._ensurePolling();
      queue.stop();

      await queue.add("TEST_JOB", { foo: "bar", n: 42 });

      expect(store.rows).toHaveLength(1);
      expect(store.rows[0]).toMatchObject({
        job_name: "TEST_JOB",
        status: "pending",
        attempts: 0,
        max_attempts: 3,
      });
      expect(JSON.parse(store.rows[0].payload)).toEqual({ foo: "bar", n: 42 });
    });

    test("handles JSON.stringify errors gracefully (does not throw)", async () => {
      const queue = freshQueue();
      queue._ensurePolling();
      queue.stop();

      const circular = {};
      circular.self = circular;
      await expect(queue.add("BAD_JOB", circular)).resolves.toBeUndefined();
    });
  });

  describe("_processNextJob() — happy path", () => {
    test("processes pending job, marks completed, invokes handler with parsed payload", async () => {
      const queue = freshQueue();
      const handler = require("../../../utils/backgroundJobs/jobs/generateTitle");
      enqueueRow({ job_name: "GENERATE_THREAD_TITLE", payload: JSON.stringify({ x: 1 }), status: "pending" });

      await queue._processNextJob();

      expect(handler).toHaveBeenCalledWith({ x: 1 });
      expect(store.rows[0].status).toBe("completed");
      expect(store.rows[0].locked_at).toBeNull();
    });

    test("does nothing when no pending jobs exist", async () => {
      const queue = freshQueue();
      const handler = require("../../../utils/backgroundJobs/jobs/generateTitle");
      await queue._processNextJob();
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe("_processNextJob() — error path / retry", () => {
    test("on handler throw: retries up to max_attempts, then marks failed", async () => {
      const queue = freshQueue();
      const handler = require("../../../utils/backgroundJobs/jobs/generateTitle");
      handler.mockRejectedValue(new Error("LLM timeout"));

      enqueueRow({
        job_name: "GENERATE_THREAD_TITLE",
        payload: JSON.stringify({ x: 1 }),
        status: "pending",
        max_attempts: 3,
      });

      // Attempt 1
      await queue._processNextJob();
      expect(store.rows[0].status).toBe("pending");
      expect(store.rows[0].attempts).toBe(1);
      expect(store.rows[0].last_error).toContain("LLM timeout");

      // Attempt 2
      await queue._processNextJob();
      expect(store.rows[0].attempts).toBe(2);
      expect(store.rows[0].status).toBe("pending");

      // Attempt 3 — should now mark failed
      await queue._processNextJob();
      expect(store.rows[0].attempts).toBe(3);
      expect(store.rows[0].status).toBe("failed");
    });

    test("truncates last_error to 1000 chars to prevent DB bloat", async () => {
      const queue = freshQueue();
      const handler = require("../../../utils/backgroundJobs/jobs/generateTitle");
      const hugeError = "X".repeat(5000);
      handler.mockRejectedValueOnce(new Error(hugeError));

      enqueueRow({ job_name: "GENERATE_THREAD_TITLE", payload: "{}", status: "pending" });
      await queue._processNextJob();

      expect(store.rows[0].last_error.length).toBeLessThanOrEqual(1000);
    });

    test("unknown job_name throws 'Unknown job type' and marks failed after max_attempts", async () => {
      const queue = freshQueue();
      enqueueRow({ job_name: "NONEXISTENT_JOB_TYPE", payload: "{}", status: "pending", max_attempts: 1 });

      await queue._processNextJob();

      expect(store.rows[0].status).toBe("failed");
      expect(store.rows[0].attempts).toBe(1);
      expect(store.rows[0].last_error).toContain("Unknown job type");
    });
  });

  describe("CAS-lock semantics", () => {
    test("does not process a job that another worker already locked", async () => {
      const queue = freshQueue();
      enqueueRow({ job_name: "GENERATE_THREAD_TITLE", payload: "{}", status: "pending" });

      // Simulate concurrent worker: claim the job before our call
      await store.updateMany({
        where: { id: store.rows[0].id, status: "pending" },
        data: { status: "processing", locked_at: new Date() },
      });
      store.rows[0].attempts = 1;

      await queue._processNextJob();

      // Should NOT have been re-processed
      const job = store.rows[0];
      expect(job.status).toBe("processing");
      expect(job.attempts).toBe(1);
    });

    test("preserves FIFO order (oldest first)", async () => {
      const queue = freshQueue();
      const now = Date.now();
      await enqueueRow({ job_name: "GENERATE_THREAD_TITLE", payload: JSON.stringify({ which: "first" }), status: "pending", created_at: new Date(now - 10000) });
      await enqueueRow({ job_name: "GENERATE_THREAD_TITLE", payload: JSON.stringify({ which: "third" }), status: "pending", created_at: new Date(now) });
      await enqueueRow({ job_name: "GENERATE_THREAD_TITLE", payload: JSON.stringify({ which: "second" }), status: "pending", created_at: new Date(now - 5000) });

      const handler = require("../../../utils/backgroundJobs/jobs/generateTitle");
      const calls = [];
      handler.mockImplementation(async (p) => {
        calls.push(p.which);
        return { ok: true, payload: p };
      });

      await queue._processNextJob();
      await queue._processNextJob();
      await queue._processNextJob();

      expect(calls).toEqual(["first", "second", "third"]);
    });
  });

  describe("_recoverStaleJobs()", () => {
    test("resets processing jobs whose lock is older than 5 min", async () => {
      const queue = freshQueue();
      const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
      enqueueRow({
        job_name: "JOB",
        payload: "{}",
        status: "processing",
        attempts: 1,
        locked_at: tenMinAgo,
      });

      await queue._recoverStaleJobs();

      const job = store.rows[0];
      expect(job.status).toBe("pending");
      expect(job.locked_at).toBeNull();
    });

    test("does NOT reset fresh processing jobs (< 5 min old)", async () => {
      const queue = freshQueue();
      const oneMinAgo = new Date(Date.now() - 60 * 1000);
      enqueueRow({
        job_name: "JOB",
        payload: "{}",
        status: "processing",
        attempts: 1,
        locked_at: oneMinAgo,
      });

      await queue._recoverStaleJobs();

      const job = store.rows[0];
      expect(job.status).toBe("processing");
      expect(job.attempts).toBe(1);
    });
  });

  describe("_pruneOldJobs()", () => {
    test("deletes completed jobs older than retention window", async () => {
      const queue = freshQueue();
      const old = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
      enqueueRow({
        job_name: "JOB",
        payload: "{}",
        status: "completed",
        created_at: old,
        updated_at: old,
      });
      enqueueRow({
        job_name: "JOB",
        payload: "{}",
        status: "failed",
        created_at: old,
        updated_at: old,
      });

      await queue._pruneOldJobs();

      expect(store.rows).toHaveLength(0);
    });

    test("preserves recent completed jobs (within retention window)", async () => {
      const queue = freshQueue();
      enqueueRow({ job_name: "JOB", payload: "{}", status: "completed" });

      await queue._pruneOldJobs();

      expect(store.rows).toHaveLength(1);
    });

    test("preserves pending jobs regardless of age", async () => {
      const queue = freshQueue();
      const old = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      enqueueRow({
        job_name: "JOB",
        payload: "{}",
        status: "pending",
        created_at: old,
        updated_at: old,
      });

      await queue._pruneOldJobs();

      expect(store.rows).toHaveLength(1);
    });
  });

  describe("stats()", () => {
    test("returns counts grouped by status", async () => {
      const queue = freshQueue();
      enqueueRow({ job_name: "A", payload: "{}", status: "pending" });
      enqueueRow({ job_name: "A", payload: "{}", status: "pending" });
      enqueueRow({ job_name: "A", payload: "{}", status: "completed" });
      enqueueRow({ job_name: "A", payload: "{}", status: "failed" });

      const stats = await queue.stats();
      expect(stats).toEqual({ pending: 2, completed: 1, failed: 1 });
    });

    test("returns empty object when no jobs exist", async () => {
      const queue = freshQueue();
      const stats = await queue.stats();
      expect(stats).toEqual({});
    });
  });
});

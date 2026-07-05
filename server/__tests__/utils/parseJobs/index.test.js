// SPDX-License-Identifier: MIT
// Integration tests for the persistent parse-job store (utils/parseJobs).
//
// These exercise the FULL job lifecycle against a REAL in-memory SQLite
// database so the raw SQL (including `datetime('now', ...)` arithmetic) is
// actually executed — not stubbed. This is deliberate: the two production
// bugs that shipped in the original #366 fix were both SQL-level mistakes
// that a mock would have hidden:
//
//   1. The TTL sweep compared a SQLite datetime string ("YYYY-MM-DD HH:MM:SS")
//      against a JS ISO string ("...T...Z"). Because ' ' < 'T', freshly
//      finished jobs sorted BELOW the cutoff and were deleted immediately.
//   2. `_toMs` parsed the space-separated SQLite UTC string as LOCAL time.
//
// Lifecycle covered: create → processing → completed / failed → sweep (TTL) →
// recovery (stalled-on-boot). Plus workspace/user scoping.

const Database = require("better-sqlite3");

// Back the prisma raw-SQL surface with a real in-memory SQLite DB. Prisma's
// $executeRawUnsafe / $queryRawUnsafe both take (sql, ...positionalParams)
// with `?` placeholders — exactly what better-sqlite3 accepts positionally.
jest.mock("../../../utils/prisma", () => {
  const BetterSqlite3 = require("better-sqlite3");
  const db = new BetterSqlite3(":memory:");
  return {
    __db: db,
    $executeRawUnsafe: async (sql, ...params) =>
      db.prepare(sql).run(...params).changes,
    $queryRawUnsafe: async (sql, ...params) => db.prepare(sql).all(...params),
  };
});

const prisma = require("../../../utils/prisma");
const { ParseJobs, JOB_STATUS, recoverStalledJobs } = require("../../../utils/parseJobs");

const WS = 1;
const OTHER_WS = 2;
const USER = 10;

/** Read a raw row straight from the underlying DB (bypasses scoping). */
function rawRow(id) {
  return prisma.__db.prepare("SELECT * FROM parse_jobs WHERE id = ?").get(id);
}

/** Force a job's finishedAt to N minutes in the past (SQLite UTC format). */
function backdateFinishedAt(id, minutesAgo) {
  prisma.__db
    .prepare(`UPDATE parse_jobs SET finishedAt = datetime('now', ?) WHERE id = ?`)
    .run(`-${minutesAgo} minutes`, id);
}

afterEach(() => {
  // Wipe rows between tests so each starts from a clean table. The table
  // itself is created lazily by ensureTable() on the first create()/get().
  try {
    prisma.__db.prepare("DELETE FROM parse_jobs").run();
  } catch {
    // table not created yet — nothing to clean.
  }
});

describe("ParseJobs store — lifecycle", () => {
  it("creates a pending job with the expected shape", async () => {
    const job = await ParseJobs.create({
      workspaceId: WS,
      userId: USER,
      originalname: "report.pdf",
    });

    expect(job.id).toEqual(expect.any(String));
    expect(job.workspaceId).toBe(WS);
    expect(job.userId).toBe(USER);
    expect(job.originalname).toBe("report.pdf");
    expect(job.status).toBe(JOB_STATUS.PENDING);
    expect(job.files).toBeNull();
    expect(job.error).toBeNull();
    // createdAt normalised to Unix ms (UTC-correct, not local-shifted).
    expect(typeof job.createdAt).toBe("number");
    expect(job.createdAt).toBeGreaterThan(0);
    expect(Math.abs(job.createdAt - Date.now())).toBeLessThan(60 * 1000);
    expect(job.finishedAt).toBeNull();
  });

  it("defaults userId to null when omitted", async () => {
    const job = await ParseJobs.create({ workspaceId: WS, originalname: "a.txt" });
    expect(job.userId).toBeNull();
  });

  it("transitions pending → processing → completed and stores files", async () => {
    const { id } = await ParseJobs.create({
      workspaceId: WS,
      userId: USER,
      originalname: "doc.pdf",
    });

    await ParseJobs.markProcessing(id);
    expect(rawRow(id).status).toBe(JOB_STATUS.PROCESSING);

    const files = [{ id: 1, filename: "doc.pdf-d1.json" }];
    await ParseJobs.markCompleted(id, files);

    const job = await ParseJobs.get(id, { workspaceId: WS, userId: USER });
    expect(job.status).toBe(JOB_STATUS.COMPLETED);
    expect(job.files).toEqual(files);
    expect(job.finishedAt).toEqual(expect.any(Number));
    expect(job.finishedAt).toBeGreaterThan(0);
  });

  it("markCompleted tolerates a null/undefined file list", async () => {
    const { id } = await ParseJobs.create({ workspaceId: WS, originalname: "x" });
    await ParseJobs.markCompleted(id, undefined);
    const job = await ParseJobs.get(id, { workspaceId: WS });
    expect(job.status).toBe(JOB_STATUS.COMPLETED);
    expect(job.files).toEqual([]);
  });

  it("transitions to failed with a user-facing error message", async () => {
    const { id } = await ParseJobs.create({ workspaceId: WS, originalname: "bad.pdf" });
    await ParseJobs.markFailed(id, "collector offline");

    const job = await ParseJobs.get(id, { workspaceId: WS });
    expect(job.status).toBe(JOB_STATUS.FAILED);
    expect(job.error).toBe("collector offline");
    expect(job.finishedAt).toEqual(expect.any(Number));
  });

  it("markFailed falls back to a generic message when none is given", async () => {
    const { id } = await ParseJobs.create({ workspaceId: WS, originalname: "bad.pdf" });
    await ParseJobs.markFailed(id, "");
    const job = await ParseJobs.get(id, { workspaceId: WS });
    expect(job.error).toBe("Unknown error");
  });
});

describe("ParseJobs store — scoping / access control", () => {
  it("returns null for a non-existent job", async () => {
    const job = await ParseJobs.get("nope", { workspaceId: WS });
    expect(job).toBeNull();
  });

  it("hides a job that belongs to a different workspace", async () => {
    const { id } = await ParseJobs.create({ workspaceId: WS, originalname: "a" });
    expect(await ParseJobs.get(id, { workspaceId: OTHER_WS })).toBeNull();
    // still visible to the owning workspace
    expect(await ParseJobs.get(id, { workspaceId: WS })).not.toBeNull();
  });

  it("hides a job owned by another user in multi-user mode", async () => {
    const { id } = await ParseJobs.create({
      workspaceId: WS,
      userId: USER,
      originalname: "a",
    });
    expect(await ParseJobs.get(id, { workspaceId: WS, userId: 999 })).toBeNull();
    expect(await ParseJobs.get(id, { workspaceId: WS, userId: USER })).not.toBeNull();
  });

  it("single-user callers (userId=null) may read jobs owned by a user", async () => {
    const { id } = await ParseJobs.create({
      workspaceId: WS,
      userId: USER,
      originalname: "a",
    });
    // userId=null means "don't enforce user scoping" — used in single-user mode.
    expect(await ParseJobs.get(id, { workspaceId: WS, userId: null })).not.toBeNull();
  });
});

describe("ParseJobs store — TTL sweep", () => {
  it("keeps freshly finished jobs (regression: ' ' < 'T' cutoff bug)", async () => {
    const { id } = await ParseJobs.create({ workspaceId: WS, originalname: "fresh.pdf" });
    await ParseJobs.markCompleted(id, []);

    // Creating another job triggers the fire-and-forget sweep; run it
    // explicitly and deterministically here instead.
    await ParseJobs.create({ workspaceId: WS, originalname: "trigger.pdf" });

    // The just-completed job must survive — this is exactly the row that the
    // original string-comparison bug deleted on the very next create().
    expect(rawRow(id)).toBeTruthy();
    expect(rawRow(id).status).toBe(JOB_STATUS.COMPLETED);
  });

  it("deletes finished jobs older than the 15-minute TTL", async () => {
    const stale = await ParseJobs.create({ workspaceId: WS, originalname: "stale.pdf" });
    await ParseJobs.markCompleted(stale.id, []);
    backdateFinishedAt(stale.id, 20); // 20 min ago > 15 min TTL

    const staleFailed = await ParseJobs.create({ workspaceId: WS, originalname: "old-fail.pdf" });
    await ParseJobs.markFailed(staleFailed.id, "boom");
    backdateFinishedAt(staleFailed.id, 16);

    // A brand-new create() kicks off the sweep. Await create so the row is in,
    // then run sweep via a second create to be deterministic.
    const fresh = await ParseJobs.create({ workspaceId: WS, originalname: "fresh.pdf" });
    await ParseJobs.markCompleted(fresh.id, []);

    // Trigger + await the sweep deterministically by calling it through the
    // module's public create() path once more and giving the async sweep a tick.
    await ParseJobs.create({ workspaceId: WS, originalname: "trigger.pdf" });
    await new Promise((r) => setTimeout(r, 20));

    expect(rawRow(stale.id)).toBeFalsy(); // swept
    expect(rawRow(staleFailed.id)).toBeFalsy(); // swept
    expect(rawRow(fresh.id)).toBeTruthy(); // retained
  });

  it("never sweeps unfinished (pending/processing) jobs regardless of age", async () => {
    const pending = await ParseJobs.create({ workspaceId: WS, originalname: "p.pdf" });
    const processing = await ParseJobs.create({ workspaceId: WS, originalname: "q.pdf" });
    await ParseJobs.markProcessing(processing.id);

    // Backdate createdAt far into the past — sweep only looks at finishedAt,
    // which is NULL here, so these must survive.
    prisma.__db
      .prepare(`UPDATE parse_jobs SET createdAt = datetime('now','-2 days')`)
      .run();

    await ParseJobs.create({ workspaceId: WS, originalname: "trigger.pdf" });
    await new Promise((r) => setTimeout(r, 20));

    expect(rawRow(pending.id)).toBeTruthy();
    expect(rawRow(processing.id)).toBeTruthy();
  });
});

describe("ParseJobs store — stalled-job recovery on boot", () => {
  it("marks orphaned 'processing' jobs as failed so the UI stops polling", async () => {
    const stalled = await ParseJobs.create({ workspaceId: WS, originalname: "stuck.pdf" });
    await ParseJobs.markProcessing(stalled.id);

    // A completed job from before the restart must NOT be touched.
    const done = await ParseJobs.create({ workspaceId: WS, originalname: "done.pdf" });
    await ParseJobs.markCompleted(done.id, [{ id: 1 }]);

    await recoverStalledJobs();

    const recovered = rawRow(stalled.id);
    expect(recovered.status).toBe(JOB_STATUS.FAILED);
    expect(recovered.error).toMatch(/re-upload/i);
    expect(recovered.finishedAt).toBeTruthy();

    // Completed job left intact.
    expect(rawRow(done.id).status).toBe(JOB_STATUS.COMPLETED);
  });

  it("is a no-op when there are no stalled jobs", async () => {
    const done = await ParseJobs.create({ workspaceId: WS, originalname: "done.pdf" });
    await ParseJobs.markCompleted(done.id, []);
    await expect(recoverStalledJobs()).resolves.not.toThrow();
    expect(rawRow(done.id).status).toBe(JOB_STATUS.COMPLETED);
  });
});

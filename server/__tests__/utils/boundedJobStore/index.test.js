// Docs: index.test.doc.md
const { BoundedJobStore, JobCapacityError } = require("../../../utils/boundedJobStore");

describe("BoundedJobStore", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  test("set/get returns stored value", () => {
    const store = new BoundedJobStore({ maxJobs: 10, maxActive: 5, ttlMs: 60000 });
    store.set("job-1", { id: "job-1", status: "pending" });
    expect(store.get("job-1")).not.toBeNull();
    expect(store.get("job-1").id).toBe("job-1");
    expect(store.get("job-1").status).toBe("pending");
    expect(store.get("job-1")).toHaveProperty("_createdAt");
  });

  test("returns null for missing key", () => {
    const store = new BoundedJobStore({ maxJobs: 10, maxActive: 5, ttlMs: 60000 });
    expect(store.get("nonexistent")).toBeNull();
  });

  test("enforces maxJobs capacity limit", () => {
    const store = new BoundedJobStore({ maxJobs: 2, maxActive: 5, ttlMs: 60000 });
    store.set("a", { id: "a", status: "completed" });
    store.set("b", { id: "b", status: "completed" });
    expect(() => store.set("c", { id: "c", status: "completed" })).toThrow(JobCapacityError);
    expect(() => store.set("c", { id: "c", status: "completed" })).toThrow(/at capacity/);
  });

  test("enforces maxActive limit for pending/running jobs", () => {
    const store = new BoundedJobStore({ maxJobs: 10, maxActive: 2, ttlMs: 60000 });
    store.set("a", { id: "a", status: "running" });
    store.set("b", { id: "b", status: "pending" });
    expect(() => store.set("c", { id: "c", status: "pending" })).toThrow(JobCapacityError);
    expect(() => store.set("c", { id: "c", status: "pending" })).toThrow(/Too many active/);
  });

  test("does not count completed jobs against maxActive", () => {
    const store = new BoundedJobStore({ maxJobs: 10, maxActive: 2, ttlMs: 60000 });
    store.set("a", { id: "a", status: "completed" });
    store.set("b", { id: "b", status: "completed" });
    store.set("c", { id: "c", status: "pending" });
    store.set("d", { id: "d", status: "pending" });
    expect(() => store.set("e", { id: "e", status: "pending" })).toThrow(JobCapacityError);
  });

  test("evicts expired entries on set", () => {
    jest.useFakeTimers();
    const store = new BoundedJobStore({ maxJobs: 3, maxActive: 5, ttlMs: 1000 });
    store.set("a", { id: "a", status: "completed" });
    store.set("b", { id: "b", status: "completed" });
    expect(store.size).toBe(2);

    jest.advanceTimersByTime(1500);

    // Setting a third entry triggers eviction of expired "a" and "b"
    store.set("c", { id: "c", status: "completed" });
    expect(store.size).toBe(1);
    expect(store.get("a")).toBeNull();
    expect(store.get("b")).toBeNull();
    expect(store.get("c")).not.toBeNull();
  });

  test("delete and clear work as expected", () => {
    const store = new BoundedJobStore({ maxJobs: 10, maxActive: 5, ttlMs: 60000 });
    store.set("x", { id: "x", status: "pending" });
    store.set("y", { id: "y", status: "pending" });
    expect(store.size).toBe(2);

    store.delete("x");
    expect(store.get("x")).toBeNull();
    expect(store.size).toBe(1);

    store.clear();
    expect(store.size).toBe(0);
    expect(store.get("y")).toBeNull();
  });

  test("values() iterates over all entries", () => {
    const store = new BoundedJobStore({ maxJobs: 10, maxActive: 5, ttlMs: 60000 });
    store.set("a", { id: "a", status: "completed" });
    store.set("b", { id: "b", status: "pending" });
    const entries = Array.from(store.values());
    expect(entries).toHaveLength(2);
    expect(entries.map((e) => e.id)).toEqual(["a", "b"]);
  });
});

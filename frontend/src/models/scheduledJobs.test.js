// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import ScheduledJobs from "./scheduledJobs";

vi.mock("@/utils/constants", () => ({ API_BASE: "/api" }));
vi.mock("@/utils/request", () => ({
  baseHeaders: () => ({ "Content-Type": "application/json" }),
}));

describe("ScheduledJobs", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("list", () => {
    it("sends GET (default method) to /api/scheduled-jobs", async () => {
      const data = { jobs: [{ id: 1, name: "job1" }] };
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(data),
      });

      const result = await ScheduledJobs.list();
      expect(globalThis.fetch).toHaveBeenCalledWith("/api/scheduled-jobs", {
        headers: { "Content-Type": "application/json" },
      });
      expect(result).toEqual(data);
    });

    it("returns empty jobs on fetch error", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("fail"));

      const result = await ScheduledJobs.list();
      expect(result).toEqual({ jobs: [] });
    });
  });

  describe("create", () => {
    it("sends POST to /api/scheduled-jobs/new with data", async () => {
      const data = { job: { id: 2 } };
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(data),
      });

      const payload = { name: "job2", cron: "0 * * * *" };
      const result = await ScheduledJobs.create(payload);
      expect(globalThis.fetch).toHaveBeenCalledWith("/api/scheduled-jobs/new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      expect(result).toEqual(data);
    });

    it("returns fallback on fetch error", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("err"));

      const result = await ScheduledJobs.create({});
      expect(result).toEqual({
        job: null,
        error: "Failed to create scheduled job",
      });
    });
  });

  describe("get", () => {
    it("sends GET to /api/scheduled-jobs/:id", async () => {
      const data = { job: { id: 1 } };
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(data),
      });

      const result = await ScheduledJobs.get(1);
      expect(globalThis.fetch).toHaveBeenCalledWith("/api/scheduled-jobs/1", {
        headers: { "Content-Type": "application/json" },
      });
      expect(result).toEqual(data);
    });

    it("returns fallback on fetch error", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("err"));

      const result = await ScheduledJobs.get(99);
      expect(result).toEqual({ job: null });
    });
  });

  describe("update", () => {
    it("sends PUT to /api/scheduled-jobs/:id with data", async () => {
      const data = { job: { id: 1, name: "updated" } };
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(data),
      });

      const payload = { name: "updated" };
      const result = await ScheduledJobs.update(1, payload);
      expect(globalThis.fetch).toHaveBeenCalledWith("/api/scheduled-jobs/1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      expect(result).toEqual(data);
    });

    it("returns fallback on fetch error", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("err"));

      const result = await ScheduledJobs.update(1, {});
      expect(result).toEqual({ job: null, error: "err" });
    });
  });

  describe("delete", () => {
    it("sends DELETE to /api/scheduled-jobs/:id", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const result = await ScheduledJobs.delete(1);
      expect(globalThis.fetch).toHaveBeenCalledWith("/api/scheduled-jobs/1", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      expect(result).toEqual({ success: true });
    });

    it("returns fallback on fetch error", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("err"));

      const result = await ScheduledJobs.delete(1);
      expect(result).toEqual({ success: false });
    });
  });

  describe("toggle", () => {
    it("sends POST to /api/scheduled-jobs/:id/toggle", async () => {
      const data = { job: { id: 1, enabled: true } };
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(data),
      });

      const result = await ScheduledJobs.toggle(1);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/scheduled-jobs/1/toggle",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );
      expect(result).toEqual(data);
    });

    it("returns fallback on fetch error", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("err"));

      const result = await ScheduledJobs.toggle(1);
      expect(result).toEqual({ job: null });
    });
  });

  describe("trigger", () => {
    it("sends POST to /api/scheduled-jobs/:id/trigger", async () => {
      const data = { success: true };
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(data),
      });

      const result = await ScheduledJobs.trigger(1);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/scheduled-jobs/1/trigger",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );
      expect(result).toEqual(data);
    });

    it("returns fallback on fetch error", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(
        new Error("trigger fail"),
      );

      const result = await ScheduledJobs.trigger(1);
      expect(result).toEqual({ success: false, error: "trigger fail" });
    });
  });

  describe("runs", () => {
    it("sends GET to /api/scheduled-jobs/:id/runs", async () => {
      const data = { runs: [{ id: 100 }] };
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(data),
      });

      const result = await ScheduledJobs.runs(1);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/scheduled-jobs/1/runs",
        {
          headers: { "Content-Type": "application/json" },
        },
      );
      expect(result).toEqual(data);
    });

    it("returns fallback on fetch error", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("err"));

      const result = await ScheduledJobs.runs(1);
      expect(result).toEqual({ runs: [] });
    });
  });

  describe("getRun", () => {
    it("sends GET to /api/scheduled-jobs/runs/:runId", async () => {
      const data = { run: { id: 100 }, job: { id: 1 } };
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(data),
      });

      const result = await ScheduledJobs.getRun(100);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/scheduled-jobs/runs/100",
        {
          headers: { "Content-Type": "application/json" },
        },
      );
      expect(result).toEqual(data);
    });

    it("returns fallback on fetch error", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("err"));

      const result = await ScheduledJobs.getRun(100);
      expect(result).toEqual({ run: null, job: null });
    });
  });

  describe("markRunRead", () => {
    it("sends POST to /api/scheduled-jobs/runs/:runId/read", async () => {
      const data = { success: true };
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(data),
      });

      const result = await ScheduledJobs.markRunRead(100);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/scheduled-jobs/runs/100/read",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );
      expect(result).toEqual(data);
    });

    it("returns fallback on fetch error", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("err"));

      const result = await ScheduledJobs.markRunRead(100);
      expect(result).toEqual({ success: false });
    });
  });

  describe("continueInThread", () => {
    it("sends POST to /api/scheduled-jobs/runs/:runId/continue", async () => {
      const data = { workspaceSlug: "ws", threadSlug: "thread-1" };
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(data),
      });

      const result = await ScheduledJobs.continueInThread(100);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/scheduled-jobs/runs/100/continue",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );
      expect(result).toEqual(data);
    });

    it("returns fallback on fetch error", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("cont fail"));

      const result = await ScheduledJobs.continueInThread(100);
      expect(result).toEqual({
        workspaceSlug: null,
        threadSlug: null,
        error: "cont fail",
      });
    });
  });

  describe("availableTools", () => {
    it("sends GET to /api/scheduled-jobs/available-tools", async () => {
      const data = { tools: [{ name: "tool1" }] };
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(data),
      });

      const result = await ScheduledJobs.availableTools();
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/scheduled-jobs/available-tools",
        {
          headers: { "Content-Type": "application/json" },
        },
      );
      expect(result).toEqual(data);
    });

    it("returns fallback on fetch error", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("err"));

      const result = await ScheduledJobs.availableTools();
      expect(result).toEqual({ tools: [] });
    });
  });

  describe("killRun", () => {
    it("sends POST to /api/scheduled-jobs/runs/:runId/kill", async () => {
      const data = { success: true };
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(data),
      });

      const result = await ScheduledJobs.killRun(100);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/scheduled-jobs/runs/100/kill",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );
      expect(result).toEqual(data);
    });

    it("returns fallback on fetch error", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("kill fail"));

      const result = await ScheduledJobs.killRun(100);
      expect(result).toEqual({ success: false, error: "kill fail" });
    });
  });
});

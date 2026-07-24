// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import ModelRouter from "./modelRouter";

vi.mock("@/utils/constants", () => ({ API_BASE: "/api" }));
vi.mock("@/utils/request", () => ({
  baseHeaders: () => ({ "Content-Type": "application/json" }),
}));

describe("ModelRouter", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getAll", () => {
    it("sends GET to /api/model-routers and returns routers array", async () => {
      const routers = [{ id: 1, name: "r1" }];
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ routers }),
      });

      const result = await ModelRouter.getAll();
      expect(globalThis.fetch).toHaveBeenCalledWith("/api/model-routers", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      expect(result).toEqual(routers);
    });

    it("returns empty array when response has no routers field", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const result = await ModelRouter.getAll();
      expect(result).toEqual([]);
    });

    it("returns empty array on fetch error", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("fail"));
      vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await ModelRouter.getAll();
      expect(result).toEqual([]);
    });
  });

  describe("get", () => {
    it("sends GET to /api/model-routers/:id", async () => {
      const data = { router: { id: 1 } };
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(data),
      });

      const result = await ModelRouter.get(1);
      expect(globalThis.fetch).toHaveBeenCalledWith("/api/model-routers/1", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      expect(result).toEqual(data);
    });

    it("returns error on fetch rejection", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("not found"));
      vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await ModelRouter.get(99);
      expect(result).toEqual({ router: null, error: "not found" });
    });
  });

  describe("create", () => {
    it("sends POST to /api/model-routers/new with data", async () => {
      const data = { router: { id: 2, name: "new" } };
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(data),
      });

      const payload = { name: "new" };
      const result = await ModelRouter.create(payload);
      expect(globalThis.fetch).toHaveBeenCalledWith("/api/model-routers/new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      expect(result).toEqual(data);
    });

    it("returns error on fetch rejection", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("create fail"));
      vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await ModelRouter.create({});
      expect(result).toEqual({ router: null, error: "create fail" });
    });
  });

  describe("update", () => {
    it("sends PUT to /api/model-routers/:id with data", async () => {
      const data = { router: { id: 1, name: "updated" } };
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(data),
      });

      const payload = { name: "updated" };
      const result = await ModelRouter.update(1, payload);
      expect(globalThis.fetch).toHaveBeenCalledWith("/api/model-routers/1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      expect(result).toEqual(data);
    });

    it("returns error on fetch rejection", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("update fail"));
      vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await ModelRouter.update(1, {});
      expect(result).toEqual({ router: null, error: "update fail" });
    });
  });

  describe("delete", () => {
    it("sends DELETE to /api/model-routers/:id", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const result = await ModelRouter.delete(1);
      expect(globalThis.fetch).toHaveBeenCalledWith("/api/model-routers/1", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      expect(result).toEqual({ success: true });
    });

    it("returns error on fetch rejection", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("delete fail"));
      vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await ModelRouter.delete(1);
      expect(result).toEqual({ success: false, error: "delete fail" });
    });
  });

  describe("createRule", () => {
    it("sends POST to /api/model-routers/:routerId/rules/new", async () => {
      const data = { rule: { id: 10 } };
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(data),
      });

      const payload = { condition: "x" };
      const result = await ModelRouter.createRule(1, payload);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/model-routers/1/rules/new",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      expect(result).toEqual(data);
    });

    it("returns error on fetch rejection", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("rule fail"));
      vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await ModelRouter.createRule(1, {});
      expect(result).toEqual({ rule: null, error: "rule fail" });
    });
  });

  describe("updateRule", () => {
    it("sends PUT to /api/model-routers/:routerId/rules/:ruleId", async () => {
      const data = { rule: { id: 10, condition: "y" } };
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(data),
      });

      const payload = { condition: "y" };
      const result = await ModelRouter.updateRule(1, 10, payload);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/model-routers/1/rules/10",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      expect(result).toEqual(data);
    });

    it("returns error on fetch rejection", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(
        new Error("update rule fail"),
      );
      vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await ModelRouter.updateRule(1, 10, {});
      expect(result).toEqual({ rule: null, error: "update rule fail" });
    });
  });

  describe("deleteRule", () => {
    it("sends DELETE to /api/model-routers/:routerId/rules/:ruleId", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const result = await ModelRouter.deleteRule(1, 10);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/model-routers/1/rules/10",
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        },
      );
      expect(result).toEqual({ success: true });
    });

    it("returns error on fetch rejection", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(
        new Error("del rule fail"),
      );
      vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await ModelRouter.deleteRule(1, 10);
      expect(result).toEqual({ success: false, error: "del rule fail" });
    });
  });

  describe("reorderRules", () => {
    it("sends PUT to /api/model-routers/:routerId/rules/reorder with ruleUpdates", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const updates = [
        { id: 1, order: 0 },
        { id: 2, order: 1 },
      ];
      const result = await ModelRouter.reorderRules(1, updates);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/model-routers/1/rules/reorder",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ruleUpdates: updates }),
        },
      );
      expect(result).toEqual({ success: true });
    });

    it("returns error on fetch rejection", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(
        new Error("reorder fail"),
      );
      vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await ModelRouter.reorderRules(1, []);
      expect(result).toEqual({ success: false, error: "reorder fail" });
    });
  });
});

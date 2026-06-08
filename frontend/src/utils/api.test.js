// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/types/api", () => {
  class ApiError extends Error {
    constructor(status, message, details) {
      super(message);
      this.name = "ApiError";
      this.status = status;
      this.details = details;
    }
  }
  return { ApiError, ApiResponse: {}, ApiErrorResponse: {} };
});

import { ApiError } from "@/types/api";
import { apiGet, apiPost, apiPut, apiDelete, apiCall } from "@/utils/api";

function jsonResponse(body, status = 200, extraHeaders = {}) {
  const headers = { "Content-Type": "application/json", ...extraHeaders };
  return new Response(JSON.stringify(body), { status, headers });
}

function textResponse(text, status, extraHeaders = {}) {
  const headers = { "Content-Type": "text/plain", ...extraHeaders };
  return new Response(text, { status, headers });
}

describe("api utilities", () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  describe("apiGet", () => {
    it("returns parsed JSON on success", async () => {
      const data = { id: 1, name: "test" };
      global.fetch = vi.fn().mockResolvedValue(jsonResponse(data));

      const result = await apiGet("/api/items/1");
      expect(result).toEqual(data);
    });

    it("throws ApiError with correct status on failure", async () => {
      global.fetch = vi.fn().mockResolvedValue(
        textResponse("not found", 404)
      );

      try {
        await apiGet("/api/items/999");
      } catch (e) {
        expect(e).toBeInstanceOf(ApiError);
        expect(e.status).toBe(404);
        expect(e.message).toContain("404");
      }
    });

    it("sends GET with credentials include", async () => {
      global.fetch = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));

      await apiGet("/api/test");
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/test",
        expect.objectContaining({ method: "GET", credentials: "include" })
      );
    });
  });

  describe("apiPost", () => {
    it("sends JSON body and returns parsed response", async () => {
      const payload = { name: "new" };
      const response = { id: 2, name: "new" };
      global.fetch = vi.fn().mockResolvedValue(jsonResponse(response));

      const result = await apiPost("/api/items", payload);
      expect(result).toEqual(response);
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/items",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      );
    });

    it("omits body when data is undefined", async () => {
      global.fetch = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));

      await apiPost("/api/items");
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/items",
        expect.objectContaining({ body: undefined })
      );
    });

    it("throws ApiError on non-ok response", async () => {
      global.fetch = vi.fn().mockResolvedValue(
        textResponse("bad request", 400)
      );

      try {
        await apiPost("/api/items", {});
      } catch (e) {
        expect(e).toBeInstanceOf(ApiError);
        expect(e.status).toBe(400);
      }
    });
  });

  describe("apiPut", () => {
    it("sends JSON body with PUT method", async () => {
      const payload = { name: "updated" };
      const response = { id: 1, name: "updated" };
      global.fetch = vi.fn().mockResolvedValue(jsonResponse(response));

      const result = await apiPut("/api/items/1", payload);
      expect(result).toEqual(response);
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/items/1",
        expect.objectContaining({
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      );
    });

    it("throws ApiError on non-ok response", async () => {
      global.fetch = vi.fn().mockResolvedValue(
        textResponse("forbidden", 403)
      );

      try {
        await apiPut("/api/items/1", {});
      } catch (e) {
        expect(e).toBeInstanceOf(ApiError);
        expect(e.status).toBe(403);
      }
    });
  });

  describe("apiDelete", () => {
    it("returns parsed JSON when content-type is application/json", async () => {
      const data = { deleted: true };
      global.fetch = vi.fn().mockResolvedValue(jsonResponse(data, 200));

      const result = await apiDelete("/api/items/1");
      expect(result).toEqual(data);
    });

    it("returns undefined when response has no JSON content-type", async () => {
      global.fetch = vi.fn().mockResolvedValue(
        textResponse("", 200)
      );

      const result = await apiDelete("/api/items/1");
      expect(result).toBeUndefined();
    });

    it("throws ApiError on non-ok response", async () => {
      global.fetch = vi.fn().mockResolvedValue(
        textResponse("not found", 404)
      );

      try {
        await apiDelete("/api/items/999");
      } catch (e) {
        expect(e).toBeInstanceOf(ApiError);
        expect(e.status).toBe(404);
      }
    });
  });

  describe("apiCall", () => {
    it("wraps success as { success: true, data }", async () => {
      const result = await apiCall(() => Promise.resolve({ id: 1 }));
      expect(result).toEqual({ success: true, data: { id: 1 } });
    });

    it("wraps ApiError as { success: false, error, status }", async () => {
      const result = await apiCall(() => {
        throw new ApiError(422, "Validation failed");
      });
      expect(result).toEqual({
        success: false,
        error: "Validation failed",
        status: 422,
      });
    });

    it("wraps other errors as { success: false, error: String(err) }", async () => {
      const result = await apiCall(() => {
        throw new Error("Something broke");
      });
      expect(result).toEqual({
        success: false,
        error: "Error: Something broke",
      });
    });

    it("wraps non-Error throws", async () => {
      const result = await apiCall(() => {
        throw "string error";
      });
      expect(result).toEqual({
        success: false,
        error: "string error",
      });
    });
  });
});

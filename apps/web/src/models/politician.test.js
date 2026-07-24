// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/utils/constants", () => ({
  API_BASE: "http://localhost:3001/api",
}));

vi.mock("@/utils/request", () => ({
  baseHeaders: vi.fn(() => ({ Authorization: "Bearer test-token" })),
}));

import Politician from "./politician";

describe("Politician model", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("addToWorkspace sends POST with politicianId and workspaceSlug", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, data: { id: 42 } }),
    });

    const result = await Politician.addToWorkspace("pol-123", "my-workspace");

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ success: true, data: { id: 42 } });

    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toBe(
      "http://localhost:3001/api/politician/pol-123/add-to-workspace",
    );
    expect(opts.method).toBe("POST");
    expect(JSON.parse(opts.body)).toEqual({ workspaceSlug: "my-workspace" });
  });

  it("returns success=false on HTTP error", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: "Politician not found" }),
    });

    const result = await Politician.addToWorkspace("pol-999", "ws");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Politician not found");
  });

  it("returns success=false when data.success is false", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: false, error: "Already added" }),
    });

    const result = await Politician.addToWorkspace("pol-1", "ws");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Already added");
  });

  it("returns success=false with HTTP status when no error in response", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    });

    const result = await Politician.addToWorkspace("pol-1", "ws");

    expect(result.success).toBe(false);
    expect(result.error).toBe("HTTP 500");
  });

  it("returns success=false on network error", async () => {
    global.fetch.mockRejectedValueOnce(new Error("Network failure"));

    const result = await Politician.addToWorkspace("pol-1", "ws");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Network failure");
  });

  it("handles JSON parse error in response", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 502,
      json: () => Promise.reject(new Error("parse error")),
    });

    const result = await Politician.addToWorkspace("pol-1", "ws");

    expect(result.success).toBe(false);
    expect(result.error).toBe("HTTP 502");
  });
});

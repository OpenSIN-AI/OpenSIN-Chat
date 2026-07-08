// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
  writable: true,
});

import { useSubagents } from "./useSubagents";

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("useSubagents", () => {
  let originalFetch;

  beforeEach(() => {
    vi.clearAllMocks();
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("spawn returns true on success", async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({ success: true }));
    const { result } = renderHook(() => useSubagents("my-ws"));
    const ok = await result.current.spawn("run-1", {
      agentName: "test-agent",
      prompt: "do something",
    });
    expect(ok).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/workspace/my-ws/agent-runs/run-1/spawn",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("spawn returns false on failure", async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({ success: false }));
    const { result } = renderHook(() => useSubagents("my-ws"));
    const ok = await result.current.spawn("run-1", {
      agentName: "test-agent",
      prompt: "do something",
    });
    expect(ok).toBe(false);
  });

  it("spawn returns false on network error", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("network"));
    const { result } = renderHook(() => useSubagents("my-ws"));
    const ok = await result.current.spawn("run-1", {
      agentName: "test-agent",
      prompt: "do something",
    });
    expect(ok).toBe(false);
  });

  it("getTree returns tree data on success", async () => {
    const tree = { id: "run-1", children: [] };
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({ tree }));
    const { result } = renderHook(() => useSubagents("my-ws"));
    const result_tree = await result.current.getTree("run-1");
    expect(result_tree).toEqual(tree);
  });

  it("getTree returns null on error", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("network"));
    const { result } = renderHook(() => useSubagents("my-ws"));
    const result_tree = await result.current.getTree("run-1");
    expect(result_tree).toBeNull();
  });

  it("includes auth token in headers when available", async () => {
    localStorageMock.getItem.mockReturnValue("my-token");
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({ success: true }));
    const { result } = renderHook(() => useSubagents("my-ws"));
    await result.current.spawn("run-1", {
      agentName: "test-agent",
      prompt: "do something",
    });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer my-token",
        }),
      }),
    );
  });
});

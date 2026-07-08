// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

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

import { useTriggers } from "./useTriggers";

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("useTriggers", () => {
  let originalFetch;

  beforeEach(() => {
    vi.clearAllMocks();
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("starts with loading=true and empty triggers", () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(jsonResponse({ success: true, triggers: [] }));
    const { result } = renderHook(() => useTriggers("my-ws"));
    expect(result.current.loading).toBe(true);
    expect(result.current.triggers).toEqual([]);
  });

  it("fetches triggers on mount", async () => {
    const triggers = [{ id: "t1", name: "Test", active: true }];
    global.fetch = vi
      .fn()
      .mockResolvedValue(jsonResponse({ success: true, triggers }));
    const { result } = renderHook(() => useTriggers("my-ws"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.triggers).toEqual(triggers);
  });

  it("create returns true on success and refreshes", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(jsonResponse({ success: true, triggers: [] }));
    const { result } = renderHook(() => useTriggers("my-ws"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    global.fetch = vi.fn().mockResolvedValue(jsonResponse({ success: true }));
    const ok = await result.current.create({ name: "New Trigger" });
    expect(ok).toBe(true);
  });

  it("create returns false on failure", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(jsonResponse({ success: true, triggers: [] }));
    const { result } = renderHook(() => useTriggers("my-ws"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    global.fetch = vi.fn().mockResolvedValue(jsonResponse({ success: false }));
    const ok = await result.current.create({ name: "New" });
    expect(ok).toBe(false);
  });

  it("update sends PATCH and returns success", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(jsonResponse({ success: true, triggers: [] }));
    const { result } = renderHook(() => useTriggers("my-ws"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    global.fetch = vi.fn().mockResolvedValue(jsonResponse({ success: true }));
    const ok = await result.current.update("t1", { active: false });
    expect(ok).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/workspace/my-ws/triggers/t1",
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("remove sends DELETE and returns success", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(jsonResponse({ success: true, triggers: [] }));
    const { result } = renderHook(() => useTriggers("my-ws"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    global.fetch = vi.fn().mockResolvedValue(jsonResponse({ success: true }));
    const ok = await result.current.remove("t1");
    expect(ok).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/workspace/my-ws/triggers/t1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("toggle sends POST with active state", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(jsonResponse({ success: true, triggers: [] }));
    const { result } = renderHook(() => useTriggers("my-ws"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    global.fetch = vi.fn().mockResolvedValue(jsonResponse({ success: true }));
    const ok = await result.current.toggle("t1", true);
    expect(ok).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/workspace/my-ws/triggers/t1/toggle",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ active: true }),
      }),
    );
  });

  it("fire sends POST and returns success", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(jsonResponse({ success: true, triggers: [] }));
    const { result } = renderHook(() => useTriggers("my-ws"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    global.fetch = vi.fn().mockResolvedValue(jsonResponse({ success: true }));
    const ok = await result.current.fire("t1");
    expect(ok).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/workspace/my-ws/triggers/t1/fire",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("getRuns returns runs array", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(jsonResponse({ success: true, triggers: [] }));
    const { result } = renderHook(() => useTriggers("my-ws"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const runs = [{ id: "r1", status: "completed" }];
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({ runs }));
    const result_runs = await result.current.getRuns("t1");
    expect(result_runs).toEqual(runs);
  });

  it("getRuns returns empty array when no runs", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(jsonResponse({ success: true, triggers: [] }));
    const { result } = renderHook(() => useTriggers("my-ws"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    global.fetch = vi.fn().mockResolvedValue(jsonResponse({}));
    const result_runs = await result.current.getRuns("t1");
    expect(result_runs).toEqual([]);
  });

  it("replayRun sends POST and returns success", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(jsonResponse({ success: true, triggers: [] }));
    const { result } = renderHook(() => useTriggers("my-ws"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    global.fetch = vi.fn().mockResolvedValue(jsonResponse({ success: true }));
    const ok = await result.current.replayRun("t1", "r1");
    expect(ok).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/workspace/my-ws/triggers/t1/runs/r1/replay",
      expect.objectContaining({ method: "POST" }),
    );
  });
});

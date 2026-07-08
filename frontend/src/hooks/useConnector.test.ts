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

import { useConnector } from "./useConnector";

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("useConnector", () => {
  let originalFetch;

  beforeEach(() => {
    vi.clearAllMocks();
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("starts with empty accounts and not available", () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({ success: true, accounts: [] }));
    const { result } = renderHook(() => useConnector("google"));
    expect(result.current.accounts).toEqual([]);
    expect(result.current.available).toBe(false);
    expect(result.current.busy).toBe(false);
  });

  it("fetches and filters accounts by provider on mount", async () => {
    const accounts = [
      { id: 1, provider: "google", status: "active" },
      { id: 2, provider: "microsoft", status: "active" },
    ];
    global.fetch = vi.fn().mockResolvedValue(
      jsonResponse({ success: true, accounts, available: { google: true } }),
    );
    const { result } = renderHook(() => useConnector("google"));
    await waitFor(() => expect(result.current.accounts.length).toBe(1));
    expect(result.current.accounts[0].provider).toBe("google");
    expect(result.current.available).toBe(true);
  });

  it("connect returns false when status is coming_soon", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      jsonResponse({ success: true, accounts: [] }),
    );
    const { result } = renderHook(() => useConnector("google"));
    await waitFor(() => expect(result.current.busy).toBe(false));

    global.fetch = vi.fn().mockResolvedValue(
      jsonResponse({ status: "coming_soon" }),
    );
    const ok = await result.current.connect("gmail");
    expect(ok).toBe(false);
    expect(result.current.busy).toBe(false);
  });

  it("connect returns false when success is false", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      jsonResponse({ success: true, accounts: [] }),
    );
    const { result } = renderHook(() => useConnector("google"));
    await waitFor(() => expect(result.current.busy).toBe(false));

    global.fetch = vi.fn().mockResolvedValue(
      jsonResponse({ success: false }),
    );
    const ok = await result.current.connect("gmail");
    expect(ok).toBe(false);
  });

  it("disconnect sends POST and refreshes", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      jsonResponse({ success: true, accounts: [] }),
    );
    const { result } = renderHook(() => useConnector("google"));
    await waitFor(() => expect(result.current.accounts).toBeDefined());

    global.fetch = vi.fn().mockResolvedValue(
      jsonResponse({ success: true, accounts: [] }),
    );
    await result.current.disconnect("account-1");
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/connectors/google/disconnect",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("handles fetch errors gracefully", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("network"));
    const { result } = renderHook(() => useConnector("google"));
    // Should not throw, just silently fail
    await waitFor(() => expect(result.current.accounts).toEqual([]));
  });
});

// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/utils/constants", () => ({
  API_BASE: "/api",
  AUTH_TOKEN: "opensin_authToken",
  AUTH_USER: "opensin_user",
  AUTH_TIMESTAMP: "opensin_authTimestamp",
}));

vi.mock("@/utils/request", () => ({
  baseHeaders: vi.fn(() => ({ Authorization: "Bearer test-token" })),
}));

vi.mock("@/utils/fetchWithTimeout", () => ({
  fetchWithTimeout: vi.fn(),
}));

vi.mock("@/utils/safeStorage", () => ({
  safeRemoveItem: vi.fn(),
}));

vi.mock("@/utils/paths", () => ({
  default: {
    login: vi.fn(() => "/login"),
  },
}));

import {
  swrFetcher,
  swrConfig,
  handleAuthFailure,
  __resetRedirectFlag,
} from "./swrFetcher";
import { fetchWithTimeout } from "@/utils/fetchWithTimeout";
import { safeRemoveItem } from "@/utils/safeStorage";

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("swrFetcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prepends API_BASE to relative paths", async () => {
    (fetchWithTimeout as any).mockResolvedValue(jsonResponse({ ok: true }));
    await swrFetcher("/workspaces");
    expect(fetchWithTimeout).toHaveBeenCalledWith(
      "/api/workspaces",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      }),
    );
  });

  it("uses absolute URL as-is when it starts with http", async () => {
    (fetchWithTimeout as any).mockResolvedValue(jsonResponse({ ok: true }));
    await swrFetcher("https://example.com/data");
    expect(fetchWithTimeout).toHaveBeenCalledWith(
      "https://example.com/data",
      expect.any(Object),
    );
  });

  it("uses URL as-is when it starts with API_BASE", async () => {
    (fetchWithTimeout as any).mockResolvedValue(jsonResponse({ ok: true }));
    await swrFetcher("/api/workspaces");
    expect(fetchWithTimeout).toHaveBeenCalledWith(
      "/api/workspaces",
      expect.any(Object),
    );
  });

  it("returns parsed JSON on success", async () => {
    const data = { id: 1, name: "test" };
    (fetchWithTimeout as any).mockResolvedValue(jsonResponse(data));
    const result = await swrFetcher("/items/1");
    expect(result).toEqual(data);
  });

  it("throws an error with status on non-ok response", async () => {
    (fetchWithTimeout as any).mockResolvedValue(
      jsonResponse({ error: "not found" }, 404),
    );
    try {
      await swrFetcher("/items/999");
      expect.fail("Should have thrown");
    } catch (e) {
      expect(e.status).toBe(404);
      expect(e.message).toContain("404");
    }
  });

  it("calls handleAuthFailure on 401 response", async () => {
    (fetchWithTimeout as any).mockResolvedValue(jsonResponse({}, 401));
    try {
      await swrFetcher("/items");
    } catch {
      // expected
    }
    // handleAuthFailure clears storage and redirects
    // We verify it was called indirectly by checking safeRemoveItem
    expect(safeRemoveItem).toHaveBeenCalled();
  });
});

describe("swrConfig", () => {
  it("has fetcher, revalidateOnFocus, and dedupingInterval", () => {
    expect(swrConfig.fetcher).toBe(swrFetcher);
    expect(swrConfig.revalidateOnFocus).toBe(true);
    expect(swrConfig.dedupingInterval).toBe(15000);
  });

  it("shouldRetryOnError returns false for 401", () => {
    expect(swrConfig.shouldRetryOnError({ status: 401 })).toBe(false);
  });

  it("shouldRetryOnError returns true for non-401 errors", () => {
    expect(swrConfig.shouldRetryOnError({ status: 500 })).toBe(true);
    expect(swrConfig.shouldRetryOnError({})).toBe(true);
  });

  it("errorRetryCount is 2", () => {
    expect(swrConfig.errorRetryCount).toBe(2);
  });
});

describe("handleAuthFailure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // The swrFetcher 401 test earlier in this file sets the module-level
    // redirectingToLogin flag, which would cause handleAuthFailure() here
    // to be a no-op. Reset it so this suite tests the function in isolation.
    __resetRedirectFlag();
  });

  it("clears auth storage keys", () => {
    handleAuthFailure();
    expect(safeRemoveItem).toHaveBeenCalledWith("opensin_user");
    expect(safeRemoveItem).toHaveBeenCalledWith("opensin_authToken");
    expect(safeRemoveItem).toHaveBeenCalledWith("opensin_authTimestamp");
  });
});

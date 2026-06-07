// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { swrFetcher, swrConfig } from "./swrFetcher";

describe("swrFetcher", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("prefixes relative paths with the API base and returns parsed JSON", async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ hello: "world" }),
    });

    const data = await swrFetcher("/workspaces");
    expect(data).toEqual({ hello: "world" });
    const calledUrl = fetch.mock.calls[0][0];
    expect(calledUrl.endsWith("/workspaces")).toBe(true);
  });

  it("leaves absolute URLs untouched", async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({}) });
    await swrFetcher("https://example.com/data");
    expect(fetch.mock.calls[0][0]).toBe("https://example.com/data");
  });

  it("throws an error carrying the HTTP status on a non-2xx response", async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ error: "nope" }),
    });

    await expect(swrFetcher("/secret")).rejects.toMatchObject({
      status: 403,
      info: { error: "nope" },
    });
  });

  it("exposes a default config with stale-while-revalidate enabled", () => {
    expect(swrConfig.fetcher).toBe(swrFetcher);
    expect(swrConfig.revalidateOnFocus).toBe(true);
    expect(swrConfig.dedupingInterval).toBe(5000);
    expect(swrConfig.errorRetryCount).toBe(3);
  });
});

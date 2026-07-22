// SPDX-License-Identifier: MIT
import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import usePoliticianSync from "./usePoliticianSync";

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
    {children}
  </SWRConfig>
);

describe("usePoliticianSync", () => {
  it("returns loading state initially", () => {
    const { result } = renderHook(() => usePoliticianSync(), {
      wrapper: Wrapper,
    });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.stats).toBeNull();
    expect(result.current.syncStatus).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("fetches stats and sync status from the correct endpoints", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url) => {
        if (url.includes("/api/politician/stats")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                politicians: 733,
                speeches: 42,
                votes: 123,
              }),
          });
        }
        if (url.includes("/api/politician/sync/status")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                lastSync: new Date().toISOString(),
                isHealthy: true,
                sources: [
                  {
                    source: "bundestag",
                    status: "completed",
                    lastAttempt: new Date().toISOString(),
                    lastSuccess: new Date().toISOString(),
                    itemsProcessed: 733,
                    itemsFailed: 0,
                    error: null,
                    isHealthy: true,
                  },
                ],
                retryQueue: [],
              }),
          });
        }
        return Promise.reject(new Error(`Unexpected URL: ${url}`));
      }),
    );

    const { result } = renderHook(() => usePoliticianSync(), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.stats).toEqual({
      politicians: 733,
      speeches: 42,
      votes: 123,
    });
    expect(result.current.syncStatus?.isHealthy).toBe(true);
    expect(result.current.syncStatus?.sources).toHaveLength(1);
    expect(result.current.error).toBeNull();

    vi.unstubAllGlobals();
  });

  it("exposes an error when the API fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      }),
    );

    const { result } = renderHook(() => usePoliticianSync(), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.isLoading).toBe(false);

    vi.unstubAllGlobals();
  });
});

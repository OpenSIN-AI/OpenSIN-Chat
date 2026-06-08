// SPDX-License-Identifier: MIT
import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import useResearch from "./useResearch";

const Wrapper = ({ children }) => (
  <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
    {children}
  </SWRConfig>
);

describe("useResearch", () => {
  it("returns empty arrays initially", () => {
    const { result } = renderHook(() => useResearch(), { wrapper: Wrapper });
    expect(result.current.politicians).toEqual([]);
    expect(result.current.drucksachen).toEqual([]);
    expect(result.current.rssItems).toEqual([]);
    expect(result.current.isLoadingPoliticians).toBe(true);
    expect(result.current.isLoadingDrucksachen).toBe(true);
    expect(result.current.isLoadingRss).toBe(true);
  });

  it("returns research data after fetch", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url) => {
        if (url.includes("politicians")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: [{ id: 1, last_name: "Test" }] }),
          });
        }
        if (url.includes("drucksachen")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ documents: [{ id: 1, title: "Doc" }] }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ items: [{ title: "News" }] }),
        });
      }),
    );

    const { result } = renderHook(() => useResearch(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.politicians.length).toBe(1));
    expect(result.current.politicians[0].last_name).toBe("Test");
    expect(result.current.drucksachen[0].title).toBe("Doc");
    expect(result.current.rssItems[0].title).toBe("News");
    vi.unstubAllGlobals();
  });

  it("survives network errors without crashing", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: false, status: 500 })),
    );
    expect(() =>
      renderHook(() => useResearch(), { wrapper: Wrapper }),
    ).not.toThrow();
    vi.unstubAllGlobals();
  });
});

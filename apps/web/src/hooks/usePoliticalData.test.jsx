// SPDX-License-Identifier: MIT
import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import { usePoliticalData } from "./usePoliticalData";

const Wrapper = ({ children }) => (
  <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
    {children}
  </SWRConfig>
);

describe("usePoliticalData", () => {
  it("returns empty arrays initially", () => {
    const { result } = renderHook(() => usePoliticalData(), {
      wrapper: Wrapper,
    });
    expect(result.current.drucksachen).toEqual([]);
    expect(result.current.rssItems).toEqual([]);
    expect(result.current.loadingDrucksachen).toBe(true);
  });

  it("returns political data after fetch", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url) => {
        if (url.includes("drucksachen")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({ documents: [{ id: 1, title: "Test" }] }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ items: [{ title: "News" }] }),
        });
      }),
    );
    const { result } = renderHook(() => usePoliticalData(), {
      wrapper: Wrapper,
    });
    await waitFor(() => expect(result.current.drucksachen.length).toBe(1));
    expect(result.current.drucksachen[0].title).toBe("Test");
    expect(result.current.rssItems[0].title).toBe("News");
    vi.unstubAllGlobals();
  });
});

// SPDX-License-Identifier: MIT
import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import { usePoliticians } from "./usePoliticians";

const Wrapper = ({ children }) => (
  <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
    {children}
  </SWRConfig>
);

describe("usePoliticians", () => {
  it("returns empty array initially", () => {
    const { result } = renderHook(() => usePoliticians(), { wrapper: Wrapper });
    expect(result.current.politicians).toEqual([]);
    expect(result.current.loading).toBe(true);
    expect(result.current.filters.party).toBe("AfD");
  });

  it("returns politicians after fetch", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              politicians: [
                {
                  id: "aw-1",
                  firstName: "Alice",
                  lastName: "Test",
                  fullName: "Alice Test",
                  party: "AfD",
                  state: "Baden-Württemberg",
                  electoralDistrict: "Wahlkreis 1",
                  profileUrl: "https://example.com/profile",
                },
              ],
              total: 1,
            }),
        }),
      ),
    );
    const { result } = renderHook(() => usePoliticians(), {
      wrapper: Wrapper,
    });
    await waitFor(() => expect(result.current.politicians.length).toBe(1));
    expect(result.current.politicians[0].last_name).toBe("Test");
    expect(result.current.politicians[0].state).toBe("Baden-Württemberg");
    expect(result.current.politicians[0].abgeordnetenwatch_url).toBe(
      "https://example.com/profile",
    );
    vi.unstubAllGlobals();
  });

  it("includes party filter in the API query", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ politicians: [], total: 0 }),
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => usePoliticians(), {
      wrapper: Wrapper,
    });
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/politician/search?party=AfD"),
        expect.any(Object),
      ),
    );
    vi.unstubAllGlobals();
  });
});

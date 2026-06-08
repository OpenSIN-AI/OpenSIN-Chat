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
  });

  it("returns politicians after fetch", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [{ id: 1, last_name: "Test" }] }),
        }),
      ),
    );
    const { result } = renderHook(() => usePoliticians(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.politicians.length).toBe(1));
    expect(result.current.politicians[0].last_name).toBe("Test");
    vi.unstubAllGlobals();
  });
});

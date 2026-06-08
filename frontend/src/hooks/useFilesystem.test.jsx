// SPDX-License-Identifier: MIT
import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import { useFilesystem } from "./useFilesystem";

const Wrapper = ({ children }) => (
  <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
    {children}
  </SWRConfig>
);

describe("useFilesystem", () => {
  it("returns undefined initially", () => {
    const { result } = renderHook(() => useFilesystem(), { wrapper: Wrapper });
    expect(result.current.data).toBeUndefined();
    expect(result.current.loading).toBe(true);
  });

  it("returns filesystem data after fetch", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ platform: "linux", arch: "x64" }),
        }),
      ),
    );
    const { result } = renderHook(() => useFilesystem(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.data).toBeTruthy());
    expect(result.current.data.platform).toBe("linux");
    vi.unstubAllGlobals();
  });
});

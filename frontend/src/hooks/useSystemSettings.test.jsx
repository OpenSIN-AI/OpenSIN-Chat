// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

vi.mock("@/models/system", () => ({
  default: { keys: vi.fn() },
}));

import System from "@/models/system";
import useSystemSettings from "./useSystemSettings";

function wrapper({ children }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

describe("useSystemSettings", () => {
  beforeEach(() => vi.clearAllMocks());

  it("preserves the legacy { settings, loading, refresh } shape", async () => {
    System.keys.mockResolvedValue({ MultiUserMode: true });

    const { result } = renderHook(() => useSystemSettings(), { wrapper });

    expect(result.current.loading).toBe(true);
    expect(result.current.settings).toEqual({});
    expect(typeof result.current.refresh).toBe("function");

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.settings).toEqual({ MultiUserMode: true });
    expect(System.keys).toHaveBeenCalledTimes(1);
  });

  it("shares a single request between multiple consumers", async () => {
    System.keys.mockResolvedValue({});

    function sharedWrapper({ children }) {
      return (
        <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 2000 }}>
          {children}
        </SWRConfig>
      );
    }

    const { result } = renderHook(
      () => ({ a: useSystemSettings(), b: useSystemSettings() }),
      { wrapper: sharedWrapper },
    );

    await waitFor(() => expect(result.current.a.loading).toBe(false));
    expect(System.keys).toHaveBeenCalledTimes(1);
  });
});

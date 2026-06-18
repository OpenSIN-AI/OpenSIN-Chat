// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

vi.mock("@/models/system", () => ({
  default: { fetchAppVersion: vi.fn() },
}));

import System from "@/models/system";
import useAppVersion, { APP_VERSION_KEY } from "./useAppVersion";

function wrapper({ children }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

describe("useAppVersion", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches app version", async () => {
    vi.mocked(System.fetchAppVersion).mockResolvedValue("1.2.3");
    const { result } = renderHook(() => useAppVersion(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.version).toBe("1.2.3");
    expect(System.fetchAppVersion).toHaveBeenCalledTimes(1);
  });

  it("returns null on error", async () => {
    System.fetchAppVersion.mockRejectedValue(new Error("Network error"));
    const { result } = renderHook(() => useAppVersion(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.version).toBeNull();
    expect(result.current.error).toBeTruthy();
  });

  it("returns null initially while loading", () => {
    vi.mocked(System.fetchAppVersion).mockResolvedValue("1.0.0");
    const { result } = renderHook(() => useAppVersion(), { wrapper });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.version).toBeNull();
  });

  it("uses stable cache key", () => {
    expect(APP_VERSION_KEY).toBe("system/app-version");
  });
});

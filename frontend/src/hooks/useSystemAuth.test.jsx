// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

vi.mock("@/models/system", () => ({
  default: {
    keys: vi.fn(),
    isMultiUserMode: vi.fn(),
  },
}));

import System from "@/models/system";
import useSystemAuth, { SYSTEM_AUTH_KEY } from "./useSystemAuth";

function wrapper({ children }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

describe("useSystemAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns settings and multiUserMode from System", async () => {
    System.keys.mockResolvedValue({ MultiUserMode: true, RequiresAuth: true });
    System.isMultiUserMode.mockResolvedValue(true);

    const { result } = renderHook(() => useSystemAuth(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.settings).toEqual({});
    expect(result.current.multiUserMode).toBe(false);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.settings).toEqual({
      MultiUserMode: true,
      RequiresAuth: true,
    });
    expect(result.current.multiUserMode).toBe(true);
    expect(System.keys).toHaveBeenCalledTimes(1);
    expect(System.isMultiUserMode).toHaveBeenCalledTimes(1);
  });

  it("returns false for multiUserMode when System returns false", async () => {
    System.keys.mockResolvedValue({ RequiresAuth: false });
    System.isMultiUserMode.mockResolvedValue(false);

    const { result } = renderHook(() => useSystemAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.multiUserMode).toBe(false);
  });

  it("handles network errors gracefully", async () => {
    System.keys.mockRejectedValue(new Error("Network down"));
    System.isMultiUserMode.mockResolvedValue(false);

    const { result } = renderHook(() => useSystemAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeTruthy();
    expect(result.current.settings).toEqual({});
    expect(result.current.multiUserMode).toBe(false);
  });

  it("uses a stable cache key", () => {
    expect(SYSTEM_AUTH_KEY).toBe("system/auth");
  });

  it("de-duplicates concurrent requests into a single fetch", async () => {
    System.keys.mockResolvedValue({});
    System.isMultiUserMode.mockResolvedValue(false);

    function sharedWrapper({ children }) {
      return (
        <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 2000 }}>
          {children}
        </SWRConfig>
      );
    }

    const { result } = renderHook(
      () => ({ a: useSystemAuth(), b: useSystemAuth() }),
      { wrapper: sharedWrapper },
    );

    await waitFor(() => expect(result.current.a.isLoading).toBe(false));
    expect(System.keys).toHaveBeenCalledTimes(1);
    expect(System.isMultiUserMode).toHaveBeenCalledTimes(1);
  });
});

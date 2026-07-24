// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

vi.mock("@/models/system", () => ({
  default: {
    fetchCustomAppName: vi.fn(),
  },
}));

import System from "@/models/system";
import useCustomAppName, { CUSTOM_APP_NAME_KEY } from "./useCustomAppName";

function wrapper({ children }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

describe("useCustomAppName", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the custom app name", async () => {
    System.fetchCustomAppName.mockResolvedValue({ appName: "MyApp" });

    const { result } = renderHook(() => useCustomAppName(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.appName).toBe("");
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.appName).toBe("MyApp");
    expect(System.fetchCustomAppName).toHaveBeenCalledTimes(1);
  });

  it("returns empty string when the fetch fails", async () => {
    System.fetchCustomAppName.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useCustomAppName(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.appName).toBe("");
    expect(result.current.error).toBeTruthy();
  });

  it("uses a stable cache key", () => {
    expect(CUSTOM_APP_NAME_KEY).toBe("system/custom-app-name");
  });
});

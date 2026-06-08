// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

vi.mock("@/models/mobile", () => ({
  default: {
    getDevices: vi.fn(),
  },
}));

import MobileConnection from "@/models/mobile";
import useMobileConnections, { MOBILE_CONNECTIONS_KEY } from "./useMobileConnections";

function wrapper({ children }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

describe("useMobileConnections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns default value while loading", () => {
    MobileConnection.getDevices.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useMobileConnections(), { wrapper });
    expect(result.current.devices).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });

  it("returns data on success", async () => {
    const fakeDevices = [{ id: "1", name: "Phone" }];
    MobileConnection.getDevices.mockResolvedValue(fakeDevices);
    const { result } = renderHook(() => useMobileConnections(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.devices).toEqual(fakeDevices);
  });

  it("captures errors", async () => {
    MobileConnection.getDevices.mockRejectedValue(new Error("fail"));
    const { result } = renderHook(() => useMobileConnections(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeTruthy();
  });

  it("exposes a stable cache key", () => {
    expect(MOBILE_CONNECTIONS_KEY).toBe("mobile-connections");
  });
});

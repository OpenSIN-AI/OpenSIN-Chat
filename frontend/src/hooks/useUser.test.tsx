// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

vi.mock("@/models/system", () => ({
  default: {
    refreshUser: vi.fn(),
  },
}));

import System from "@/models/system";
import useUser, { userKey } from "./useUser";

// Each test gets a fresh, isolated SWR cache so calls are deterministic.
function wrapper({ children }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

describe("useUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts in loading state", () => {
    System.refreshUser.mockResolvedValue({ success: true, user: null });
    const { result } = renderHook(() => useUser(), { wrapper });
    expect(result.current.isLoading).toBe(true);
  });

  it("returns the user object when the fetch resolves", async () => {
    const fakeUser = { id: 1, username: "tester" };
    System.refreshUser.mockResolvedValue({
      success: true,
      user: fakeUser,
    });

    const { result } = renderHook(() => useUser(), { wrapper });
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.user).toEqual(fakeUser);
    expect(result.current.success).toBe(true);
  });

  it("returns null user on a failure response (e.g. logged out)", async () => {
    System.refreshUser.mockResolvedValue({
      success: false,
      user: null,
      message: "Token expired",
    });

    const { result } = renderHook(() => useUser(), { wrapper });
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.user).toBeNull();
    expect(result.current.success).toBe(false);
    expect(result.current.message).toBe("Token expired");
  });

  it("captures network errors and exposes them via `error`", async () => {
    System.refreshUser.mockRejectedValue(new Error("Network down"));

    const { result } = renderHook(() => useUser(), { wrapper });
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.error).toBeTruthy();
    expect(result.current.error.message).toBe("Network down");
  });

  it("uses a stable cache key so unrelated consumers share results", () => {
    expect(userKey).toBe("system/refresh-user");
  });
});

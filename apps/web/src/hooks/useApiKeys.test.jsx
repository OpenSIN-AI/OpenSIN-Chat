// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

vi.mock("@/models/admin", () => ({
  default: {
    getApiKeys: vi.fn(),
  },
}));

vi.mock("@/models/system", () => ({
  default: {
    getApiKeys: vi.fn(),
  },
}));

vi.mock("@/utils/request", () => ({
  userFromStorage: vi.fn(),
}));

import Admin from "@/models/admin";
import System from "@/models/system";
import { userFromStorage } from "@/utils/request";
import useApiKeys, { API_KEYS_KEY } from "./useApiKeys";

function wrapper({ children }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

describe("useApiKeys", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns empty apiKeys while loading", () => {
    userFromStorage.mockReturnValue(null);
    System.getApiKeys.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useApiKeys(), { wrapper });
    expect(result.current.apiKeys).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });

  it("uses Admin model when user exists", async () => {
    userFromStorage.mockReturnValue({ username: "admin" });
    Admin.getApiKeys.mockResolvedValue({
      apiKeys: [{ id: 1, key: "key1" }],
    });
    const { result } = renderHook(() => useApiKeys(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(Admin.getApiKeys).toHaveBeenCalled();
    expect(result.current.apiKeys).toEqual([{ id: 1, key: "key1" }]);
  });

  it("uses System model when no user", async () => {
    userFromStorage.mockReturnValue(null);
    System.getApiKeys.mockResolvedValue({
      apiKeys: [{ id: 2, key: "key2" }],
    });
    const { result } = renderHook(() => useApiKeys(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(System.getApiKeys).toHaveBeenCalled();
    expect(result.current.apiKeys).toEqual([{ id: 2, key: "key2" }]);
  });

  it("exposes a stable cache key", () => {
    expect(API_KEYS_KEY).toBe("system/api-keys");
  });
});

// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

vi.mock("@/models/admin", () => ({
  default: {
    users: vi.fn(),
  },
}));

import Admin from "@/models/admin";
import useUsers, { USERS_KEY } from "./useUsers";

function wrapper({ children }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

describe("useUsers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns users from Admin.users()", async () => {
    const fixture = [
      { id: 1, username: "alice", role: "admin" },
      { id: 2, username: "bob", role: "default" },
    ];
    Admin.users.mockResolvedValue(fixture);

    const { result } = renderHook(() => useUsers(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.users).toEqual([]);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.users).toEqual(fixture);
    expect(Admin.users).toHaveBeenCalledTimes(1);
  });

  it("returns empty array on failure and exposes error", async () => {
    Admin.users.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useUsers(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.users).toEqual([]);
    expect(result.current.error).toBeTruthy();
  });

  it("uses a stable cache key", () => {
    expect(USERS_KEY).toBe("admin/users");
  });

  it("de-duplicates concurrent requests", async () => {
    Admin.users.mockResolvedValue([]);

    function sharedWrapper({ children }) {
      return (
        <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 2000 }}>
          {children}
        </SWRConfig>
      );
    }

    const { result } = renderHook(
      () => ({ a: useUsers(), b: useUsers() }),
      { wrapper: sharedWrapper },
    );

    await waitFor(() => expect(result.current.a.isLoading).toBe(false));
    expect(Admin.users).toHaveBeenCalledTimes(1);
  });
});

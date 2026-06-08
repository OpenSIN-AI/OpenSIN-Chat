// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

vi.mock("@/models/admin", () => ({
  default: {
    invites: vi.fn(),
  },
}));

import Admin from "@/models/admin";
import useInvites, { INVITES_KEY } from "./useInvites";

function wrapper({ children }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

describe("useInvites", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns invites from Admin.invites()", async () => {
    const fixture = [
      { id: 1, status: "pending", acceptedBy: null },
      { id: 2, status: "accepted", acceptedBy: "alice" },
    ];
    Admin.invites.mockResolvedValue(fixture);

    const { result } = renderHook(() => useInvites(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.invites).toEqual([]);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.invites).toEqual(fixture);
    expect(Admin.invites).toHaveBeenCalledTimes(1);
  });

  it("returns empty array on failure and exposes error", async () => {
    Admin.invites.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useInvites(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.invites).toEqual([]);
    expect(result.current.error).toBeTruthy();
  });

  it("uses a stable cache key", () => {
    expect(INVITES_KEY).toBe("admin/invites");
  });

  it("de-duplicates concurrent requests", async () => {
    Admin.invites.mockResolvedValue([]);

    function sharedWrapper({ children }) {
      return (
        <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 2000 }}>
          {children}
        </SWRConfig>
      );
    }

    const { result } = renderHook(
      () => ({ a: useInvites(), b: useInvites() }),
      { wrapper: sharedWrapper },
    );

    await waitFor(() => expect(result.current.a.isLoading).toBe(false));
    expect(Admin.invites).toHaveBeenCalledTimes(1);
  });
});

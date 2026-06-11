// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

vi.mock("@/models/admin", () => ({
  default: {
    users: vi.fn(),
    workspaceUsers: vi.fn(),
    workspaces: vi.fn(),
  },
}));

import Admin from "@/models/admin";
import useWorkspaceMembers, {
  WORKSPACE_MEMBERS_KEY,
} from "./useWorkspaceMembers";

function wrapper({ children }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

describe("useWorkspaceMembers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns workspace members data", async () => {
    Admin.users.mockResolvedValue([{ id: 1, username: "alice" }]);
    Admin.workspaceUsers.mockResolvedValue([
      { id: 1, username: "alice", role: "admin" },
    ]);
    Admin.workspaces.mockResolvedValue([{ id: 5, name: "ws" }]);

    const { result } = renderHook(() => useWorkspaceMembers(5), { wrapper });

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.users).toHaveLength(1);
    expect(result.current.workspaceUsers).toHaveLength(1);
    expect(result.current.adminWorkspace).toEqual({ id: 5, name: "ws" });
  });

  it("returns defaults when workspaceId is null", () => {
    const { result } = renderHook(() => useWorkspaceMembers(null), { wrapper });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.users).toEqual([]);
    expect(result.current.workspaceUsers).toEqual([]);
  });

  it("uses a stable cache key", () => {
    expect(WORKSPACE_MEMBERS_KEY).toBe("workspace/members");
  });
});

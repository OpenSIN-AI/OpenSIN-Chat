// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

vi.mock("@/models/admin", () => ({
  default: {
    users: vi.fn(),
    workspaces: vi.fn(),
  },
}));

vi.mock("@/models/system", () => ({
  default: {
    keys: vi.fn(),
  },
}));

import Admin from "@/models/admin";
import System from "@/models/system";
import useAdminWorkspaces, {
  ADMIN_WORKSPACES_KEY,
} from "./useAdminWorkspaces";

function wrapper({ children }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

describe("useAdminWorkspaces", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns empty defaults while loading", () => {
    Admin.users.mockReturnValue(new Promise(() => {}));
    Admin.workspaces.mockReturnValue(new Promise(() => {}));
    System.keys.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useAdminWorkspaces(), { wrapper });
    expect(result.current.users).toEqual([]);
    expect(result.current.workspaces).toEqual([]);
    expect(result.current.deletionProtected).toBe(false);
    expect(result.current.isLoading).toBe(true);
  });

  it("returns users, workspaces, and deletionProtected", async () => {
    Admin.users.mockResolvedValue([{ id: 1, username: "alice" }]);
    Admin.workspaces.mockResolvedValue([{ id: 1, name: "ws1" }]);
    System.keys.mockResolvedValue({ WorkspaceDeletionProtection: true });
    const { result } = renderHook(() => useAdminWorkspaces(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.users).toEqual([{ id: 1, username: "alice" }]);
    expect(result.current.workspaces).toEqual([{ id: 1, name: "ws1" }]);
    expect(result.current.deletionProtected).toBe(true);
  });

  it("exposes a stable cache key", () => {
    expect(ADMIN_WORKSPACES_KEY).toBe("admin/workspaces");
  });
});

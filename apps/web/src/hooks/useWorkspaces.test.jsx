// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

vi.mock("@/models/workspace", () => ({
  default: {
    all: vi.fn(),
    orderWorkspaces: vi.fn((ws) => ws),
  },
}));

import Workspace from "@/models/workspace";
import useWorkspaces, { WORKSPACES_KEY } from "./useWorkspaces";

function wrapper({ children }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

describe("useWorkspaces", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches workspaces", async () => {
    const fixture = [{ id: 1, name: "WS" }];
    Workspace.all.mockResolvedValue(fixture);

    const { result } = renderHook(() => useWorkspaces(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.workspaces).toEqual(fixture);
    expect(Workspace.all).toHaveBeenCalledTimes(1);
  });

  it("returns ordered workspaces when requested", async () => {
    const fixture = [{ id: 2 }, { id: 1 }];
    Workspace.all.mockResolvedValue(fixture);
    Workspace.orderWorkspaces.mockReturnValue([fixture[1], fixture[0]]);

    const { result } = renderHook(() => useWorkspaces({ ordered: true }), {
      wrapper,
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(Workspace.orderWorkspaces).toHaveBeenCalledWith(fixture);
    expect(result.current.workspaces).toEqual([fixture[1], fixture[0]]);
  });

  it("uses a stable cache key", () => {
    expect(WORKSPACES_KEY).toBe("workspaces");
  });
});

// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

// Mock the model layer so the hook is tested in isolation.
vi.mock("@/models/workspace", () => ({
  default: {
    all: vi.fn(),
    orderWorkspaces: vi.fn((list) => list),
  },
}));

import Workspace from "@/models/workspace";
import useWorkspaces from "./useWorkspaces";

// Each test gets a fresh, isolated SWR cache and de-duping disabled so calls
// are deterministic.
function wrapper({ children }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

describe("useWorkspaces", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns workspaces from Workspace.all()", async () => {
    const fixture = [{ id: 1, slug: "a" }];
    Workspace.all.mockResolvedValue(fixture);

    const { result } = renderHook(() => useWorkspaces(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.workspaces).toEqual(fixture);
    expect(Workspace.all).toHaveBeenCalledTimes(1);
  });

  it("applies ordering when ordered:true is passed", async () => {
    const fixture = [{ id: 2 }, { id: 1 }];
    Workspace.all.mockResolvedValue(fixture);
    Workspace.orderWorkspaces.mockReturnValue([{ id: 1 }, { id: 2 }]);

    const { result } = renderHook(() => useWorkspaces({ ordered: true }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(Workspace.orderWorkspaces).toHaveBeenCalledWith(fixture);
    expect(result.current.workspaces).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it("de-duplicates concurrent identical requests into one fetch", async () => {
    Workspace.all.mockResolvedValue([]);

    // Two hooks sharing one cache + a non-zero deduping interval should result
    // in a single underlying request.
    function sharedWrapper({ children }) {
      return (
        <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 2000 }}>
          {children}
        </SWRConfig>
      );
    }

    const { result } = renderHook(
      () => ({ a: useWorkspaces(), b: useWorkspaces() }),
      { wrapper: sharedWrapper },
    );

    await waitFor(() => expect(result.current.a.isLoading).toBe(false));
    expect(Workspace.all).toHaveBeenCalledTimes(1);
  });
});

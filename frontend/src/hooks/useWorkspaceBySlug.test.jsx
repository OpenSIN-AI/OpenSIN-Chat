// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

vi.mock("@/models/workspace", () => ({
  default: { bySlug: vi.fn() },
}));

import Workspace from "@/models/workspace";
import useWorkspaceBySlug, { workspaceKey } from "./useWorkspaceBySlug";

function wrapper({ children }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

describe("useWorkspaceBySlug", () => {
  beforeEach(() => vi.clearAllMocks());

  it("builds a scoped cache key and returns null for a missing slug", () => {
    expect(workspaceKey("foo")).toEqual(["workspace", "foo"]);
    expect(workspaceKey(undefined)).toBeNull();
  });

  it("fetches a workspace by slug", async () => {
    const fixture = { id: 1, slug: "foo" };
    Workspace.bySlug.mockResolvedValue(fixture);

    const { result } = renderHook(() => useWorkspaceBySlug("foo"), { wrapper });

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.workspace).toEqual(fixture);
    expect(Workspace.bySlug).toHaveBeenCalledWith("foo");
  });

  it("does not fetch when slug is falsy (conditional fetching)", async () => {
    const { result } = renderHook(() => useWorkspaceBySlug(null), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.workspace).toBeNull();
    expect(Workspace.bySlug).not.toHaveBeenCalled();
  });
});

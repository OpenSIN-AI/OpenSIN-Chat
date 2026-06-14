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

  it("builds the workspace key", () => {
    expect(workspaceKey("slug")).toEqual(["workspace", "slug"]);
    expect(workspaceKey(null)).toBeNull();
  });

  it("fetches workspace by slug", async () => {
    Workspace.bySlug.mockResolvedValue({ slug: "slug", name: "WS" });
    const { result } = renderHook(() => useWorkspaceBySlug("slug"), {
      wrapper,
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.workspace).toEqual({ slug: "slug", name: "WS" });
    expect(Workspace.bySlug).toHaveBeenCalledWith("slug");
  });

  it("does not fetch when slug is missing", async () => {
    const { result } = renderHook(() => useWorkspaceBySlug(null), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.workspace).toBeNull();
    expect(Workspace.bySlug).not.toHaveBeenCalled();
  });
});

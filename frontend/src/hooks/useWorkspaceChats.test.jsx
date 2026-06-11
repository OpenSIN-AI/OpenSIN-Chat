// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

vi.mock("@/models/workspace", () => ({
  default: {
    bySlug: vi.fn(),
    getSuggestedMessages: vi.fn(),
    agentCommandAvailable: vi.fn(),
  },
}));

import Workspace from "@/models/workspace";
import useWorkspaceChats, { WORKSPACE_CHATS_KEY } from "./useWorkspaceChats";

function wrapper({ children }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

describe("useWorkspaceChats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null workspace for a missing slug", () => {
    const { result } = renderHook(() => useWorkspaceChats(null), { wrapper });
    expect(result.current.workspace).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.suggestedMessages).toEqual([]);
    expect(result.current.showAgentCommand).toBe(false);
  });

  it("fetches workspace chat data by slug", async () => {
    const workspace = { id: 1, slug: "test-workspace", name: "Test" };
    const suggestedMessages = ["Hello", "How can I help?"];
    Workspace.bySlug.mockResolvedValue(workspace);
    Workspace.getSuggestedMessages.mockResolvedValue(suggestedMessages);
    Workspace.agentCommandAvailable.mockResolvedValue({
      showAgentCommand: true,
    });

    const { result } = renderHook(() => useWorkspaceChats("test-workspace"), {
      wrapper,
    });

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.workspace).toEqual(workspace);
    expect(result.current.suggestedMessages).toEqual(suggestedMessages);
    expect(result.current.showAgentCommand).toBe(true);
    expect(Workspace.bySlug).toHaveBeenCalledWith("test-workspace");
    expect(Workspace.getSuggestedMessages).toHaveBeenCalledWith(
      "test-workspace",
    );
    expect(Workspace.agentCommandAvailable).toHaveBeenCalledWith(
      "test-workspace",
    );
  });

  it("returns empty values when workspace is not found", async () => {
    Workspace.bySlug.mockResolvedValue(null);
    Workspace.getSuggestedMessages.mockResolvedValue([]);
    Workspace.agentCommandAvailable.mockResolvedValue({
      showAgentCommand: false,
    });

    const { result } = renderHook(() => useWorkspaceChats("missing"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.workspace).toBeNull();
    expect(result.current.suggestedMessages).toEqual([]);
    expect(result.current.showAgentCommand).toBe(false);
  });

  it("exposes a stable cache key builder", () => {
    expect(WORKSPACE_CHATS_KEY("foo")).toEqual(["workspace-chats", "foo"]);
    expect(WORKSPACE_CHATS_KEY(null)).toBeNull();
  });
});

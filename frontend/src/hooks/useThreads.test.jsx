// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

vi.mock("@/models/workspace", () => ({
  default: { threads: { all: vi.fn() } },
}));

import Workspace from "@/models/workspace";
import useThreads, { threadsKey, invalidateThreads } from "./useThreads";

function wrapper({ children }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

describe("useThreads", () => {
  beforeEach(() => vi.clearAllMocks());

  it("builds a scoped key and skips fetch without a workspace slug", () => {
    expect(threadsKey("ws")).toEqual(["threads", "ws"]);
    expect(threadsKey(undefined)).toBeNull();
    expect(threadsKey(null)).toBeNull();
  });

  it("unwraps the { threads, folders, defaultThreadChatCount } response shape", async () => {
    Workspace.threads.all.mockResolvedValue({
      threads: [{ slug: "t1" }],
      folders: [{ id: 1, name: "F1" }],
      defaultThreadChatCount: 3,
    });

    const { result } = renderHook(() => useThreads("ws"), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.threads).toEqual([{ slug: "t1" }]);
    expect(result.current.folders).toEqual([{ id: 1, name: "F1" }]);
    expect(result.current.defaultThreadHasChats).toBe(true);
    expect(result.current.defaultThreadChatCount).toBe(3);
    expect(Workspace.threads.all).toHaveBeenCalledWith("ws");
  });

  it("returns defaults when response is empty", async () => {
    Workspace.threads.all.mockResolvedValue({
      threads: [],
      folders: [],
      defaultThreadChatCount: 0,
    });

    const { result } = renderHook(() => useThreads("ws"), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.threads).toEqual([]);
    expect(result.current.folders).toEqual([]);
    expect(result.current.defaultThreadHasChats).toBe(false);
    expect(result.current.defaultThreadChatCount).toBe(0);
  });

  it("does not fetch when slug is missing", async () => {
    const { result } = renderHook(() => useThreads(null), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.threads).toEqual([]);
    expect(result.current.folders).toEqual([]);
    expect(Workspace.threads.all).not.toHaveBeenCalled();
  });

  it("returns an empty array on error", async () => {
    Workspace.threads.all.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useThreads("ws"), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.threads).toEqual([]);
    expect(result.current.error).toBeDefined();
  });

  it("de-duplicates concurrent identical requests into one fetch", async () => {
    Workspace.threads.all.mockResolvedValue({
      threads: [],
      folders: [],
      defaultThreadChatCount: 0,
    });

    function sharedWrapper({ children }) {
      return (
        <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 2000 }}>
          {children}
        </SWRConfig>
      );
    }

    const { result } = renderHook(
      () => ({ a: useThreads("ws"), b: useThreads("ws") }),
      { wrapper: sharedWrapper },
    );

    await waitFor(() => expect(result.current.a.isLoading).toBe(false));
    expect(Workspace.threads.all).toHaveBeenCalledTimes(1);
  });
});

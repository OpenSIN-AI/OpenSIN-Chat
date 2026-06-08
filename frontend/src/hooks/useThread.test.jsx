// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

vi.mock("@/models/workspace", () => ({
  default: { threads: { all: vi.fn() } },
}));

import Workspace from "@/models/workspace";
import useThread from "./useThread";

function wrapper({ children }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

describe("useThread", () => {
  beforeEach(() => vi.clearAllMocks());

  it("finds a thread by slug from the workspace threads list", async () => {
    Workspace.threads.all.mockResolvedValue({
      threads: [
        { slug: "t1", name: "Thread 1" },
        { slug: "t2", name: "Thread 2" },
      ],
      folders: [],
      defaultThreadChatCount: 0,
    });

    const { result } = renderHook(() => useThread("ws", "t2"), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.thread).toEqual({ slug: "t2", name: "Thread 2" });
    expect(Workspace.threads.all).toHaveBeenCalledWith("ws");
  });

  it("returns null when the thread slug is not found", async () => {
    Workspace.threads.all.mockResolvedValue({
      threads: [{ slug: "t1", name: "Thread 1" }],
      folders: [],
      defaultThreadChatCount: 0,
    });

    const { result } = renderHook(() => useThread("ws", "missing"), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.thread).toBeNull();
  });

  it("returns null when workspace slug is missing", async () => {
    const { result } = renderHook(() => useThread(null, "t1"), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.thread).toBeNull();
    expect(Workspace.threads.all).not.toHaveBeenCalled();
  });

  it("returns null when thread slug is missing", async () => {
    Workspace.threads.all.mockResolvedValue({
      threads: [{ slug: "t1", name: "Thread 1" }],
      folders: [],
      defaultThreadChatCount: 0,
    });

    const { result } = renderHook(() => useThread("ws", null), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.thread).toBeNull();
  });

  it("shares the SWR cache with useThreads (no extra fetch)", async () => {
    Workspace.threads.all.mockResolvedValue({
      threads: [{ slug: "t1", name: "Thread 1" }],
      folders: [],
      defaultThreadChatCount: 0,
    });

    // Use a single component that renders both hooks so they share the same SWR provider.
    function useBoth() {
      const a = useThread("ws", "t1");
      const b = useThread("ws", "t1");
      return { a, b };
    }

    const { result } = renderHook(() => useBoth(), { wrapper });

    await waitFor(() => expect(result.current.a.isLoading).toBe(false));
    await waitFor(() => expect(result.current.b.isLoading).toBe(false));
    expect(Workspace.threads.all).toHaveBeenCalledTimes(1);
  });
});

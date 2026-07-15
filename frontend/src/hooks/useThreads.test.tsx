// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

vi.mock("@/models/workspace", () => ({
  default: {
    threads: {
      all: vi.fn(),
    },
  },
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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("threadsKey", () => {
    it("returns ['threads', slug] when slug is provided", () => {
      expect(threadsKey("my-workspace")).toEqual(["threads", "my-workspace"]);
    });

    it("returns null when no slug is provided", () => {
      expect(threadsKey(null)).toBeNull();
    });

    it("returns null for undefined slug", () => {
      expect(threadsKey(undefined)).toBeNull();
    });

    it("returns null for empty string slug", () => {
      expect(threadsKey("")).toBeNull();
    });
  });

  describe("useThreads hook", () => {
    it("returns empty arrays while loading", () => {
      (Workspace.threads.all as any).mockReturnValue(new Promise(() => {}));
      const { result } = renderHook(() => useThreads("ws"), { wrapper });
      expect(result.current.threads).toEqual([]);
      expect(result.current.folders).toEqual([]);
      expect(result.current.defaultThreadHasChats).toBe(false);
      expect(result.current.defaultThreadChatCount).toBe(0);
      expect(result.current.isLoading).toBe(true);
    });

    it("fetches and returns threads", async () => {
      const data = {
        threads: [{ slug: "t1", name: "Thread 1" }],
        folders: [{ id: 1, name: "Folder A" }],
        defaultThreadChatCount: 3,
      };
      (Workspace.threads.all as any).mockResolvedValue(data);

      const { result } = renderHook(() => useThreads("ws"), { wrapper });

      await waitFor(() => {
        expect(result.current.threads).toHaveLength(1);
        expect(result.current.folders).toHaveLength(1);
        expect(result.current.defaultThreadHasChats).toBe(true);
        expect(result.current.defaultThreadChatCount).toBe(3);
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("handles data without threads/folders keys (falls back to data as threads)", async () => {
      (Workspace.threads.all as any).mockResolvedValue([
        { slug: "t1", name: "Thread 1" },
      ]);

      const { result } = renderHook(() => useThreads("ws"), { wrapper });

      await waitFor(() => {
        expect(result.current.threads).toHaveLength(1);
        expect(result.current.folders).toEqual([]);
      });
    });

    it("handles data with zero defaultThreadChatCount", async () => {
      (Workspace.threads.all as any).mockResolvedValue({
        threads: [],
        folders: [],
        defaultThreadChatCount: 0,
      });

      const { result } = renderHook(() => useThreads("ws"), { wrapper });

      await waitFor(() => {
        expect(result.current.defaultThreadHasChats).toBe(false);
        expect(result.current.defaultThreadChatCount).toBe(0);
      });
    });

    it("returns empty data for null slug (SWR skip)", () => {
      const { result } = renderHook(() => useThreads(null), { wrapper });
      expect(result.current.threads).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(Workspace.threads.all).not.toHaveBeenCalled();
    });

    it("exposes error on fetch failure", async () => {
      (Workspace.threads.all as any).mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useThreads("ws"), { wrapper });

      await waitFor(() => {
        expect(result.current.error).toBeInstanceOf(Error);
      });
    });

    it("exposes refresh and mutate functions", async () => {
      (Workspace.threads.all as any).mockResolvedValue({ threads: [] });

      const { result } = renderHook(() => useThreads("ws"), { wrapper });

      await waitFor(() => {
        expect(typeof result.current.refresh).toBe("function");
        expect(typeof result.current.mutate).toBe("function");
      });
    });
  });

  describe("invalidateThreads", () => {
    it("is a function", () => {
      expect(typeof invalidateThreads).toBe("function");
    });
  });
});

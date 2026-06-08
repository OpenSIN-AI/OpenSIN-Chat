// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

// Mock the model layer so the hook is tested in isolation.
vi.mock("@/models/workspace", () => ({
  default: {
    chatHistory: vi.fn(),
    threads: {
      chatHistory: vi.fn(),
    },
  },
}));

import Workspace from "@/models/workspace";
import useChatHistory, {
  chatHistoryKey,
  invalidateChatHistory,
} from "./useChatHistory";

function wrapper({ children }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

describe("useChatHistory", () => {
  beforeEach(() => vi.clearAllMocks());

  it("builds a scoped key and skips fetch without a workspace slug", () => {
    expect(chatHistoryKey("ws", "thread")).toEqual([
      "chat-history",
      "ws",
      "thread",
    ]);
    expect(chatHistoryKey("ws")).toEqual(["chat-history", "ws"]);
    expect(chatHistoryKey(null)).toBeNull();
    expect(chatHistoryKey(undefined)).toBeNull();
  });

  it("fetches workspace chat history without thread", async () => {
    const fixture = [{ id: 1, role: "user", content: "hello" }];
    Workspace.chatHistory.mockResolvedValue(fixture);

    const { result } = renderHook(() => useChatHistory("ws"), { wrapper });

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.history).toEqual(fixture);
    expect(Workspace.chatHistory).toHaveBeenCalledWith("ws");
    expect(Workspace.threads.chatHistory).not.toHaveBeenCalled();
  });

  it("fetches thread chat history when threadSlug is provided", async () => {
    const fixture = [{ id: 2, role: "assistant", content: "hi" }];
    Workspace.threads.chatHistory.mockResolvedValue(fixture);

    const { result } = renderHook(() => useChatHistory("ws", "thread-1"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.history).toEqual(fixture);
    expect(Workspace.threads.chatHistory).toHaveBeenCalledWith("ws", "thread-1");
  });

  it("does not fetch when workspace slug is missing", async () => {
    const { result } = renderHook(() => useChatHistory(null), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.history).toEqual([]);
    expect(Workspace.chatHistory).not.toHaveBeenCalled();
    expect(Workspace.threads.chatHistory).not.toHaveBeenCalled();
  });

  it("returns an empty array on error", async () => {
    Workspace.chatHistory.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useChatHistory("ws"), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.history).toEqual([]);
    expect(result.current.error).toBeDefined();
  });

  it("de-duplicates concurrent identical requests into one fetch", async () => {
    Workspace.chatHistory.mockResolvedValue([]);

    function sharedWrapper({ children }) {
      return (
        <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 2000 }}>
          {children}
        </SWRConfig>
      );
    }

    const { result } = renderHook(
      () => ({ a: useChatHistory("ws"), b: useChatHistory("ws") }),
      { wrapper: sharedWrapper },
    );

    await waitFor(() => expect(result.current.a.isLoading).toBe(false));
    expect(Workspace.chatHistory).toHaveBeenCalledTimes(1);
  });
});

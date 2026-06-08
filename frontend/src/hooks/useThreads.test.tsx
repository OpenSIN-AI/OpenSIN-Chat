// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

vi.mock("@/models/workspace", () => ({
  default: { threads: { all: vi.fn() } },
}));

import Workspace from "@/models/workspace";
import useThreads, { threadsKey } from "./useThreads";

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
  });

  it("unwraps the { threads } response shape", async () => {
    Workspace.threads.all.mockResolvedValue({ threads: [{ slug: "t1" }] });

    const { result } = renderHook(() => useThreads("ws"), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.threads).toEqual([{ slug: "t1" }]);
    expect(Workspace.threads.all).toHaveBeenCalledWith("ws");
  });

  it("does not fetch when slug is missing", async () => {
    const { result } = renderHook(() => useThreads(null), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.threads).toEqual([]);
    expect(Workspace.threads.all).not.toHaveBeenCalled();
  });
});

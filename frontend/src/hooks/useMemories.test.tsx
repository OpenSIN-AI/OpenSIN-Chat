// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

vi.mock("@/models/memory", () => ({
  default: { forWorkspace: vi.fn() },
}));

import Memory from "@/models/memory";
import useMemories from "./useMemories";

function wrapper({ children }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

describe("useMemories", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does not fetch when slug is null", () => {
    const { result } = renderHook(() => useMemories(null), { wrapper });
    expect(result.current.isLoading).toBe(false);
    expect(Memory.forWorkspace).not.toHaveBeenCalled();
  });

  it("fetches memories for a workspace slug", async () => {
    Memory.forWorkspace.mockResolvedValue({
      global: [{ id: 1, content: "global mem" }],
      workspace: [{ id: 2, content: "ws mem" }],
    });
    const { result } = renderHook(() => useMemories("my-workspace"), {
      wrapper,
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.memories.global).toHaveLength(1);
    expect(result.current.memories.workspace).toHaveLength(1);
  });
});

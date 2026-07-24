// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

vi.mock("@/models/workspace", () => ({
  default: {
    getSuggestedMessages: vi.fn(),
  },
}));

import Workspace from "@/models/workspace";
import useSuggestedMessages, {
  SUGGESTED_MESSAGES_KEY,
} from "./useSuggestedMessages";

function wrapper({ children }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

describe("useSuggestedMessages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns suggested messages for a slug", async () => {
    Workspace.getSuggestedMessages.mockResolvedValue([
      { heading: "", message: "Hello" },
    ]);

    const { result } = renderHook(() => useSuggestedMessages("my-workspace"), {
      wrapper,
    });

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.suggestedMessages).toHaveLength(1);
  });

  it("returns empty array when slug is null", () => {
    const { result } = renderHook(() => useSuggestedMessages(null), {
      wrapper,
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.suggestedMessages).toEqual([]);
  });

  it("uses a stable cache key", () => {
    expect(SUGGESTED_MESSAGES_KEY).toBe("workspace/suggested-messages");
  });
});

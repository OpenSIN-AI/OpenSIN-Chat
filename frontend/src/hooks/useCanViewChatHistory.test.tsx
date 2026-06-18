// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

vi.mock("@/models/system", () => ({
  default: { fetchCanViewChatHistory: vi.fn() },
}));

import System from "@/models/system";
import useCanViewChatHistory from "./useCanViewChatHistory";

function wrapper({ children }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

describe("useCanViewChatHistory", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns viewable=false and loading=true initially", () => {
    System.fetchCanViewChatHistory.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useCanViewChatHistory(), { wrapper });
    expect(result.current.loading).toBe(true);
    expect(result.current.viewable).toBe(false);
  });

  it("resolves viewable from API response", async () => {
    vi.mocked(System.fetchCanViewChatHistory).mockResolvedValue({
      viewable: true,
      error: null,
    });
    const { result } = renderHook(() => useCanViewChatHistory(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.viewable).toBe(true);
    expect(System.fetchCanViewChatHistory).toHaveBeenCalledTimes(1);
  });

  it("defaults to viewable=false when API returns no viewable", async () => {
    vi.mocked(System.fetchCanViewChatHistory).mockResolvedValue({
      viewable: false,
      error: null,
    });
    const { result } = renderHook(() => useCanViewChatHistory(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.viewable).toBe(false);
  });
});

// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

vi.mock("@/models/system", () => ({
  default: { getSlashCommandPresets: vi.fn() },
}));

import System from "@/models/system";
import useSlashCommandPresets from "./useSlashCommandPresets";

function wrapper({ children }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

describe("useSlashCommandPresets", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns empty array initially", () => {
    System.getSlashCommandPresets.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useSlashCommandPresets(), { wrapper });
    expect(result.current.presets).toEqual([]);
  });

  it("fetches presets from API", async () => {
    vi.mocked(System.getSlashCommandPresets).mockResolvedValue([
      { id: 1, command: "/test", prompt: "hello" },
    ]);
    const { result } = renderHook(() => useSlashCommandPresets(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.presets).toHaveLength(1);
  });
});

// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

vi.mock("@/models/embed", () => ({
  default: { embeds: vi.fn() },
}));

import Embed from "@/models/embed";
import useEmbedConfigs, { EMBED_CONFIGS_KEY } from "./useEmbedConfigs";

function wrapper({ children }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

describe("useEmbedConfigs", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches embed configs", async () => {
    Embed.embeds.mockResolvedValue([
      { id: "1", name: "Embed 1" },
      { id: "2", name: "Embed 2" },
    ]);
    const { result } = renderHook(() => useEmbedConfigs(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.embeds).toHaveLength(2);
    expect(result.current.embeds[0].name).toBe("Embed 1");
    expect(Embed.embeds).toHaveBeenCalledTimes(1);
  });

  it("returns empty array on error", async () => {
    Embed.embeds.mockRejectedValue(new Error("Network error"));
    const { result } = renderHook(() => useEmbedConfigs(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.embeds).toEqual([]);
    expect(result.current.error).toBeTruthy();
  });

  it("uses stable cache key", () => {
    expect(EMBED_CONFIGS_KEY).toBe("embed-configs");
  });
});

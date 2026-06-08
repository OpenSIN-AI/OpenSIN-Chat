// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

vi.mock("@/models/embed", () => ({
  default: {
    embeds: vi.fn(),
  },
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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns default value while loading", () => {
    Embed.embeds.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useEmbedConfigs(), { wrapper });
    expect(result.current.embeds).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });

  it("returns data on success", async () => {
    const fakeEmbeds = [{ id: "1", name: "Test Embed" }];
    Embed.embeds.mockResolvedValue(fakeEmbeds);
    const { result } = renderHook(() => useEmbedConfigs(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.embeds).toEqual(fakeEmbeds);
  });

  it("captures errors", async () => {
    Embed.embeds.mockRejectedValue(new Error("fail"));
    const { result } = renderHook(() => useEmbedConfigs(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeTruthy();
  });

  it("exposes a stable cache key", () => {
    expect(EMBED_CONFIGS_KEY).toBe("embed-configs");
  });
});

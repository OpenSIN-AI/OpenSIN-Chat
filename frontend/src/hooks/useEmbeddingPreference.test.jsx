// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

vi.mock("@/models/system", () => ({
  default: {
    keys: vi.fn(),
  },
}));

import System from "@/models/system";
import useEmbeddingPreference, {
  EMBEDDING_PREFERENCE_KEY,
} from "./useEmbeddingPreference";

function wrapper({ children }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

describe("useEmbeddingPreference", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns null settings while loading", () => {
    System.keys.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useEmbeddingPreference(), { wrapper });
    expect(result.current.settings).toBeNull();
    expect(result.current.isLoading).toBe(true);
  });

  it("returns settings from System.keys", async () => {
    System.keys.mockResolvedValue({
      EmbeddingEngine: "openai",
      HasExistingEmbeddings: true,
    });
    const { result } = renderHook(() => useEmbeddingPreference(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.settings.EmbeddingEngine).toBe("openai");
  });

  it("exposes a stable cache key", () => {
    expect(EMBEDDING_PREFERENCE_KEY).toBe("system/embedding-preference");
  });
});

// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

vi.mock("@/models/admin", () => ({
  default: {
    systemPreferencesByFields: vi.fn(),
  },
}));

import Admin from "@/models/admin";
import useEmbeddingTextSplitterPreference, {
  EMBEDDING_TEXT_SPLITTER_KEY,
} from "./useEmbeddingTextSplitterPreference";

function wrapper({ children }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

describe("useEmbeddingTextSplitterPreference", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns empty settings while loading", () => {
    Admin.systemPreferencesByFields.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useEmbeddingTextSplitterPreference(), {
      wrapper,
    });
    expect(result.current.settings).toEqual({});
    expect(result.current.isLoading).toBe(true);
  });

  it("returns text splitter settings", async () => {
    Admin.systemPreferencesByFields.mockResolvedValue({
      settings: {
        text_splitter_chunk_size: 1000,
        text_splitter_chunk_overlap: 20,
        max_embed_chunk_size: 2000,
      },
    });
    const { result } = renderHook(() => useEmbeddingTextSplitterPreference(), {
      wrapper,
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.settings.text_splitter_chunk_size).toBe(1000);
  });

  it("exposes a stable cache key", () => {
    expect(EMBEDDING_TEXT_SPLITTER_KEY).toBe("admin/embedding-text-splitter");
  });
});

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
import useVectorDBs, { VECTOR_DBS_KEY } from "./useVectorDBs";

function wrapper({ children }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

describe("useVectorDBs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns default values while loading", () => {
    const { result } = renderHook(() => useVectorDBs(), { wrapper });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.settings).toEqual({});
    expect(result.current.vectorDB).toBe("lancedb");
    expect(result.current.hasEmbeddings).toBe(false);
  });

  it("fetches vector DB settings from System.keys()", async () => {
    System.keys.mockResolvedValue({
      VectorDB: "pinecone",
      HasExistingEmbeddings: true,
      PineConeKey: "secret",
    });

    const { result } = renderHook(() => useVectorDBs(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.settings.VectorDB).toBe("pinecone");
    expect(result.current.vectorDB).toBe("pinecone");
    expect(result.current.hasEmbeddings).toBe(true);
    expect(System.keys).toHaveBeenCalledTimes(1);
  });

  it("uses a stable cache key", () => {
    expect(VECTOR_DBS_KEY).toBe("system/vectordbs");
  });

  it("de-duplicates concurrent requests", async () => {
    System.keys.mockResolvedValue({ VectorDB: "lancedb" });

    function sharedWrapper({ children }) {
      return (
        <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 2000 }}>
          {children}
        </SWRConfig>
      );
    }

    const { result } = renderHook(
      () => ({ a: useVectorDBs(), b: useVectorDBs() }),
      { wrapper: sharedWrapper },
    );

    await waitFor(() => expect(result.current.a.isLoading).toBe(false));
    expect(System.keys).toHaveBeenCalledTimes(1);
  });
});

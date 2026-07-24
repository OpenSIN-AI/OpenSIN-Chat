// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

vi.mock("@/models/system", () => ({
  default: {
    totalIndexes: vi.fn(),
  },
}));

import System from "@/models/system";
import useVectorCount, { VECTOR_COUNT_KEY } from "./useVectorCount";

function wrapper({ children }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

describe("useVectorCount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the vector count", async () => {
    System.totalIndexes.mockResolvedValue(42);

    const { result } = renderHook(() => useVectorCount("my-workspace"), {
      wrapper,
    });

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.vectorCount).toBe(42);
  });

  it("returns null when slug is null", () => {
    const { result } = renderHook(() => useVectorCount(null), { wrapper });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.vectorCount).toBe(null);
  });

  it("uses a stable cache key", () => {
    expect(VECTOR_COUNT_KEY).toBe("system/vector-count");
  });
});

// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

vi.mock("@/models/system", () => ({
  default: {
    checkDocumentProcessorOnline: vi.fn(),
  },
}));

import System from "@/models/system";
import useDocumentProcessorOnline, { CACHE_KEY } from "./useDocumentProcessorOnline";

function wrapper({ children }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

describe("useDocumentProcessorOnline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns isOnline from SWR data", async () => {
    System.checkDocumentProcessorOnline.mockResolvedValue(true);

    const { result } = renderHook(() => useDocumentProcessorOnline(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isOnline).toBe(true);
  });

  it("exports CACHE_KEY", () => {
    expect(CACHE_KEY).toBe("document_processor_online");
  });
});

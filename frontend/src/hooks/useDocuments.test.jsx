// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

// Mock the model layer so the hook is tested in isolation.
vi.mock("@/models/system", () => ({
  default: {
    localFiles: vi.fn(),
  },
}));

import System from "@/models/system";
import useDocuments from "./useDocuments";

// Each test gets a fresh, isolated SWR cache and de-duping disabled so calls
// are deterministic.
function wrapper({ children }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

describe("useDocuments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns documents from System.localFiles()", async () => {
    const fixture = {
      items: [
        {
          name: "custom-documents",
          type: "folder",
          items: [{ id: 1, name: "doc1.txt", type: "file" }],
        },
      ],
    };
    System.localFiles.mockResolvedValue(fixture);

    const { result } = renderHook(() => useDocuments(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.documents).toEqual(fixture);
    expect(System.localFiles).toHaveBeenCalledTimes(1);
  });

  it("returns null documents when localFiles returns null", async () => {
    System.localFiles.mockResolvedValue(null);

    const { result } = renderHook(() => useDocuments(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.documents).toBeNull();
  });

  it("de-duplicates concurrent identical requests into one fetch", async () => {
    System.localFiles.mockResolvedValue({ items: [] });

    // Two hooks sharing one cache + a non-zero deduping interval should result
    // in a single underlying request.
    function sharedWrapper({ children }) {
      return (
        <SWRConfig
          value={{ provider: () => new Map(), dedupingInterval: 2000 }}
        >
          {children}
        </SWRConfig>
      );
    }

    const { result } = renderHook(
      () => ({ a: useDocuments(), b: useDocuments() }),
      { wrapper: sharedWrapper },
    );

    await waitFor(() => expect(result.current.a.isLoading).toBe(false));
    expect(System.localFiles).toHaveBeenCalledTimes(1);
  });
});

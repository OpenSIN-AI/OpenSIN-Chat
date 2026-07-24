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
import useLLMProviders, { llmProvidersKey } from "./useLLMProviders";

function wrapper({ children }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

describe("useLLMProviders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exports the SWR cache key", () => {
    expect(llmProvidersKey).toBe("system/llm-providers");
  });

  it("returns null keys while loading", () => {
    (System.keys as any).mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useLLMProviders(), { wrapper });
    expect(result.current.keys).toBeNull();
    expect(result.current.isLoading).toBe(true);
  });

  it("fetches and returns system keys", async () => {
    const keys = {
      LLMProvider: "openai",
      VectorDB: "chroma",
      setup_complete: true,
    };
    (System.keys as any).mockResolvedValue(keys);

    const { result } = renderHook(() => useLLMProviders(), { wrapper });

    await waitFor(() => {
      expect(result.current.keys).toEqual(keys);
      expect(result.current.isLoading).toBe(false);
    });
  });

  it("returns null when keys is null", async () => {
    (System.keys as any).mockResolvedValue(null);

    const { result } = renderHook(() => useLLMProviders(), { wrapper });

    await waitFor(() => {
      expect(result.current.keys).toBeNull();
    });
  });

  it("exposes error on fetch failure", async () => {
    (System.keys as any).mockRejectedValue(new Error("Server unreachable"));

    const { result } = renderHook(() => useLLMProviders(), { wrapper });

    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error.message).toBe("Server unreachable");
    });
  });

  it("exposes refresh and mutate functions", async () => {
    (System.keys as any).mockResolvedValue({ foo: "bar" });

    const { result } = renderHook(() => useLLMProviders(), { wrapper });

    await waitFor(() => {
      expect(typeof result.current.refresh).toBe("function");
      expect(typeof result.current.mutate).toBe("function");
    });
  });

  it("calls System.keys() on mount", async () => {
    (System.keys as any).mockResolvedValue({});

    renderHook(() => useLLMProviders(), { wrapper });

    await waitFor(() => {
      expect(System.keys).toHaveBeenCalledTimes(1);
    });
  });
});

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

  it("returns null keys while loading", () => {
    System.keys.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useLLMProviders(), { wrapper });
    expect(result.current.keys).toBeNull();
    expect(result.current.isLoading).toBe(true);
  });

  it("returns the system keys payload on success", async () => {
    const fakeKeys = {
      LLMProvider: "openai",
      LLMModel: "gpt-4",
      embeddingProvider: "openai",
    };
    System.keys.mockResolvedValue(fakeKeys);

    const { result } = renderHook(() => useLLMProviders(), { wrapper });
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.keys).toEqual(fakeKeys);
  });

  it("captures errors from System.keys()", async () => {
    System.keys.mockRejectedValue(new Error("Forbidden"));

    const { result } = renderHook(() => useLLMProviders(), { wrapper });
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.error).toBeTruthy();
    expect(result.current.error.message).toBe("Forbidden");
  });

  it("exposes a stable cache key", () => {
    expect(llmProvidersKey).toBe("system/llm-providers");
  });
});

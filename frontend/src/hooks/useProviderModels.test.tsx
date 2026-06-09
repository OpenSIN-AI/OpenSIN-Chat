// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

vi.mock("@/models/system", () => ({
  default: { customModels: vi.fn() },
}));

import System from "@/models/system";
import useProviderModels from "./useProviderModels";

function wrapper({ children }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

describe("useProviderModels", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does not fetch when provider is null", () => {
    const { result } = renderHook(() => useProviderModels(null), { wrapper });
    expect(result.current.isLoading).toBe(false);
    expect(System.customModels).not.toHaveBeenCalled();
  });

  it("fetches models for a provider", async () => {
    System.customModels.mockResolvedValue({
      models: [{ id: "gpt-4", name: "GPT-4", organization: "OpenAI" }],
    });
    const { result } = renderHook(() => useProviderModels("openai", "key123"), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.customModels).toEqual({
      OpenAI: [{ id: "gpt-4", name: "GPT-4", organization: "OpenAI" }],
    });
  });

  it("returns flat array for non-grouped provider", async () => {
    System.customModels.mockResolvedValue({
      models: [{ id: "llama3", name: "Llama 3" }],
    });
    const { result } = renderHook(() => useProviderModels("ollama", null, "http://localhost:11434"), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(Array.isArray(result.current.customModels)).toBe(true);
  });
});

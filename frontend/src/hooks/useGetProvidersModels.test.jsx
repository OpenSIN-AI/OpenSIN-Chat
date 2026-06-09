// SPDX-License-Identifier: MIT
import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import useGetProviderModels, {
  PROVIDER_DEFAULT_MODELS,
  PROVIDER_MODELS_KEY,
  DISABLED_PROVIDERS,
} from "./useGetProvidersModels";

vi.mock("@/hooks/useProviderModels", () => ({
  default: vi.fn(),
  GROUPED_PROVIDERS: ["togetherai", "fireworksai", "openai"],
  PROVIDER_DEFAULT_MODELS: {
    openai: ["gpt-4", "gpt-3.5-turbo"],
    anthropic: ["claude-3"],
    gemini: ["gemini-pro"],
    azure: [],
    bedrock: [],
  },
  PROVIDER_MODELS_KEY: "system/custom-models",
}));

import useProviderModels from "@/hooks/useProviderModels";

describe("useGetProviderModels", () => {
  it("returns defaultModels for a known provider", () => {
    useProviderModels.mockReturnValue({
      defaultModels: ["gpt-4", "gpt-3.5-turbo"],
      customModels: [],
      isLoading: false,
      error: null,
      refresh: vi.fn(),
      mutate: vi.fn(),
    });
    const { result } = renderHook(() => useGetProviderModels("openai"));
    expect(result.current.defaultModels).toEqual(["gpt-4", "gpt-3.5-turbo"]);
  });

  it("returns empty array for unknown provider", () => {
    useProviderModels.mockReturnValue({
      defaultModels: [],
      customModels: [],
      isLoading: false,
      error: null,
      refresh: vi.fn(),
      mutate: vi.fn(),
    });
    const { result } = renderHook(() =>
      useGetProviderModels("unknown-provider"),
    );
    expect(result.current.defaultModels).toEqual([]);
  });

  it("returns empty array when provider is null", () => {
    useProviderModels.mockReturnValue({
      defaultModels: [],
      customModels: [],
      isLoading: false,
      error: null,
      refresh: vi.fn(),
      mutate: vi.fn(),
    });
    const { result } = renderHook(() => useGetProviderModels(null));
    expect(result.current.defaultModels).toEqual([]);
  });

  it("maps isLoading to loading", () => {
    useProviderModels.mockReturnValue({
      defaultModels: [],
      customModels: [],
      isLoading: true,
      error: null,
      refresh: vi.fn(),
      mutate: vi.fn(),
    });
    const { result } = renderHook(() => useGetProviderModels("openai"));
    expect(result.current.loading).toBe(true);
  });

  it("passes through customModels, error, refresh, mutate", () => {
    const mockRefresh = vi.fn();
    const mockMutate = vi.fn();
    useProviderModels.mockReturnValue({
      defaultModels: [],
      customModels: [{ id: 1, name: "custom" }],
      isLoading: false,
      error: new Error("test error"),
      refresh: mockRefresh,
      mutate: mockMutate,
    });
    const { result } = renderHook(() => useGetProviderModels("openai"));
    expect(result.current.customModels).toEqual([{ id: 1, name: "custom" }]);
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.refresh).toBe(mockRefresh);
    expect(result.current.mutate).toBe(mockMutate);
  });

  it("re-exports PROVIDER_DEFAULT_MODELS", () => {
    expect(PROVIDER_DEFAULT_MODELS).toBeDefined();
    expect(PROVIDER_DEFAULT_MODELS.openai).toEqual(["gpt-4", "gpt-3.5-turbo"]);
  });

  it("re-exports PROVIDER_MODELS_KEY", () => {
    expect(PROVIDER_MODELS_KEY).toBe("system/custom-models");
  });

  it("re-exports GROUPED_PROVIDERS as DISABLED_PROVIDERS", () => {
    expect(DISABLED_PROVIDERS).toBeDefined();
    expect(Array.isArray(DISABLED_PROVIDERS)).toBe(true);
    expect(DISABLED_PROVIDERS).toContain("togetherai");
  });
});

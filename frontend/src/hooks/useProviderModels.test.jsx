// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

vi.mock("@/models/system", () => ({
  default: {
    customModels: vi.fn(),
  },
}));

import System from "@/models/system";
import useProviderModels, { PROVIDER_MODELS_KEY } from "./useProviderModels";

function wrapper({ children }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

describe("useProviderModels", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty customModels when provider is null", () => {
    const { result } = renderHook(() => useProviderModels(null), { wrapper });
    expect(result.current.customModels).toEqual([]);
  });

  it("returns customModels when provider is provided", async () => {
    System.customModels.mockResolvedValue({
      models: [{ id: "model-1", organization: "test" }],
      error: null,
    });

    const { result } = renderHook(
      () => useProviderModels("ollama", null, "http://localhost:11434"),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.customModels).toEqual([{ id: "model-1", organization: "test" }]);
  });

  it("exports PROVIDER_MODELS_KEY", () => {
    expect(PROVIDER_MODELS_KEY).toBe("system/custom-models");
  });
});

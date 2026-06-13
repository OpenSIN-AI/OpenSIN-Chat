// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

vi.mock("@/models/system", () => ({
  default: { customModels: vi.fn() },
}));

import System from "@/models/system";
import useProviderEndpointAutoDiscovery from "./useProviderEndpointAutoDiscovery";

describe("useProviderEndpointAutoDiscovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("auto-detects an endpoint on mount", async () => {
    System.customModels.mockResolvedValue({ models: ["m1"] });
    const { result } = renderHook(() =>
      useProviderEndpointAutoDiscovery({
        provider: "ollama",
        ENDPOINTS: ["http://a", "http://b"],
      }),
    );
    await waitFor(() => expect(result.current.autoDetecting).toBe(false));
    expect(result.current.autoDetectAttempted).toBe(true);
    expect(result.current.basePath.value).toBe("http://a");
    expect(result.current.showAdvancedControls).toBe(false);
  });

  it("shows advanced controls when no endpoint resolves", async () => {
    System.customModels.mockResolvedValue({ models: [] });
    const { result } = renderHook(() =>
      useProviderEndpointAutoDiscovery({
        provider: "ollama",
        ENDPOINTS: ["http://a"],
      }),
    );
    await waitFor(() => expect(result.current.autoDetecting).toBe(false));
    expect(result.current.showAdvancedControls).toBe(true);
  });

  it("handles base path and auth token changes", () => {
    const { result } = renderHook(() =>
      useProviderEndpointAutoDiscovery({
        initialBasePath: "",
        initialAuthToken: null,
        ENDPOINTS: [],
      }),
    );

    act(() => result.current.basePath.set("http://new"));
    act(() => result.current.basePath.onBlur());
    expect(result.current.basePath.value).toBe("http://new");

    act(() => result.current.authToken.set("token"));
    act(() => result.current.authToken.onBlur());
    expect(result.current.authToken.value).toBe("token");
  });

  it("runs autoDetect on button click", async () => {
    System.customModels.mockResolvedValue({ models: ["m1"] });
    const { result } = renderHook(() =>
      useProviderEndpointAutoDiscovery({
        provider: "ollama",
        ENDPOINTS: ["http://a"],
      }),
    );
    await waitFor(() => expect(result.current.autoDetecting).toBe(false));

    act(() => result.current.handleAutoDetectClick({ preventDefault: vi.fn() }));
    await waitFor(() => expect(result.current.autoDetecting).toBe(false));
    expect(result.current.basePath.value).toBe("http://a");
  });
});

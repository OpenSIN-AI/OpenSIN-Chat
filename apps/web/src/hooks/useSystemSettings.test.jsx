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
import useSystemSettings, { SYSTEM_SETTINGS_KEY } from "./useSystemSettings";

function wrapper({ children }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

describe("useSystemSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exports the SWR cache key", () => {
    expect(SYSTEM_SETTINGS_KEY).toBe("system/settings");
  });

  it("returns empty settings and loading=true while fetching", () => {
    System.keys.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useSystemSettings(), { wrapper });
    expect(result.current.settings).toEqual({});
    expect(result.current.loading).toBe(true);
  });

  it("fetches and returns system settings", async () => {
    const settings = { LLMProvider: "openai", VectorDB: "chroma" };
    System.keys.mockResolvedValue(settings);

    const { result } = renderHook(() => useSystemSettings(), { wrapper });

    await waitFor(() => {
      expect(result.current.settings).toEqual(settings);
      expect(result.current.loading).toBe(false);
    });
  });

  it("returns empty object when data is null", async () => {
    System.keys.mockResolvedValue(null);

    const { result } = renderHook(() => useSystemSettings(), { wrapper });

    await waitFor(() => {
      expect(result.current.settings).toEqual({});
    });
  });

  it("exposes error on fetch failure", async () => {
    System.keys.mockRejectedValue(new Error("Server down"));

    const { result } = renderHook(() => useSystemSettings(), { wrapper });

    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error.message).toBe("Server down");
    });
  });

  it("exposes a refresh (mutate) function", async () => {
    System.keys.mockResolvedValue({ foo: "bar" });

    const { result } = renderHook(() => useSystemSettings(), { wrapper });

    await waitFor(() => {
      expect(result.current.settings).toEqual({ foo: "bar" });
    });

    expect(typeof result.current.refresh).toBe("function");
  });
});

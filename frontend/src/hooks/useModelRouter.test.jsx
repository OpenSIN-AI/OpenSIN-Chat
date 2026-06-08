// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

vi.mock("@/models/modelRouter", () => ({
  default: {
    get: vi.fn(),
  },
}));

import ModelRouter from "@/models/modelRouter";
import useModelRouter, { MODEL_ROUTER_KEY } from "./useModelRouter";

function wrapper({ children }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

describe("useModelRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns default value while loading", () => {
    ModelRouter.get.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useModelRouter("1"), { wrapper });
    expect(result.current.router).toBeNull();
    expect(result.current.isLoading).toBe(true);
  });

  it("returns data on success", async () => {
    const fakeData = { router: { id: "1", name: "Test" } };
    ModelRouter.get.mockResolvedValue(fakeData);
    const { result } = renderHook(() => useModelRouter("1"), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.router).toEqual({ id: "1", name: "Test" });
  });

  it("skips fetch when id is null", () => {
    const { result } = renderHook(() => useModelRouter(null), { wrapper });
    expect(ModelRouter.get).not.toHaveBeenCalled();
    expect(result.current.router).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("captures errors", async () => {
    ModelRouter.get.mockRejectedValue(new Error("fail"));
    const { result } = renderHook(() => useModelRouter("1"), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeTruthy();
  });

  it("exposes a stable cache key", () => {
    expect(MODEL_ROUTER_KEY).toBe("model-router");
  });
});

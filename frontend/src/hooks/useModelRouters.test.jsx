// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

vi.mock("@/models/modelRouter", () => ({
  default: {
    getAll: vi.fn(),
  },
}));

import ModelRouter from "@/models/modelRouter";
import useModelRouters, { MODEL_ROUTERS_KEY } from "./useModelRouters";

function wrapper({ children }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

describe("useModelRouters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns default value while loading", () => {
    ModelRouter.getAll.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useModelRouters(), { wrapper });
    expect(result.current.routers).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });

  it("returns data on success", async () => {
    const fakeData = { routers: [{ id: "1", name: "Test Router" }] };
    ModelRouter.getAll.mockResolvedValue(fakeData);
    const { result } = renderHook(() => useModelRouters(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.routers).toEqual(fakeData);
  });

  it("captures errors", async () => {
    ModelRouter.getAll.mockRejectedValue(new Error("fail"));
    const { result } = renderHook(() => useModelRouters(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeTruthy();
  });

  it("exposes a stable cache key", () => {
    expect(MODEL_ROUTERS_KEY).toBe("model-routers/all");
  });
});
